
import {
  AnalysisMode,
  AnalysisOptions,
  AnalysisResult,
  ComparisonMetric,
  ConditionalDistributionTable,
  ConditionalMomentsTable,
  CsvData,
  Distribution,
  DistributionAnalysis,
  ModelAnalysisResult,
  ModelDef,
  ProbabilityModel,
  MarkovResult,
  AdvancedTestResult,
  DependenceAnalysisPair,
  TransitionMatrixModelDef,
  SelfDependenceAnalysis,
  OrderResult,
  TimeBasedConditionalDistributionSet,
  TimeBasedConditionalDistributionTable,
} from '../types';
import { transpose, cartesianProduct, jensenShannonDistance } from '../utils/mathUtils';

// --- Helper Functions ---

function getCounts(data: (string | number)[]): Distribution {
  const counts: Distribution = {};
  data.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return counts;
}

function normalize(counts: Distribution): Distribution {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return {};
  const dist: Distribution = {};
  for (const key in counts) {
    dist[key] = counts[key] / total;
  }
  return dist;
}

function getJointCounts(data: (string | number)[][], headers: string[]): Distribution {
  const counts: Distribution = {};
  data.forEach(row => {
    const key = headers.map((_, i) => row[i]).join('|');
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function getMarginal(jointDist: Distribution, headers: string[], varIndex: number): Distribution {
  const marginal: Distribution = {};
  for (const key in jointDist) {
    const states = key.split('|');
    const state = states[varIndex];
    marginal[state] = (marginal[state] || 0) + jointDist[key];
  }
  return marginal;
}

function getMoments(dist: Distribution): { mean: number; variance: number } {
    let mean = 0;
    let variance = 0;
    const entries = Object.entries(dist).map(([state, prob]) => ({
      value: parseFloat(state),
      prob: prob,
    })).filter(e => !isNaN(e.value));

    if (entries.length === 0) return { mean: NaN, variance: NaN };
    
    entries.forEach(({ value, prob }) => {
      mean += value * prob;
    });

    entries.forEach(({ value, prob }) => {
      variance += Math.pow(value - mean, 2) * prob;
    });

    return { mean, variance };
}

function calculateTransitionMatrix(trace: (string|number)[]): {matrix: number[][], states: (string|number)[]} {
    const states = Array.from(new Set(trace)).sort();
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));
    const totals = Array(n).fill(0);

    for (let i = 0; i < trace.length - 1; i++) {
        const from = trace[i];
        const to = trace[i+1];
        const fromIdx = stateIndex.get(from);
        const toIdx = stateIndex.get(to);

        if(fromIdx !== undefined && toIdx !== undefined) {
            counts[fromIdx][toIdx]++;
            totals[fromIdx]++;
        }
    }
    
    const matrix = counts.map((row, i) => {
        return row.map(count => totals[i] > 0 ? count / totals[i] : 0)
    });

    return { matrix, states };
}

// --- Analysis Functions ---

function analyzeEmpiricalData(data: CsvData, mode: AnalysisMode): DistributionAnalysis {
  const { headers, rows } = data;
  const transposedData = transpose(rows);
  
  const jointDist = normalize(getJointCounts(rows, headers));

  const marginals: { [variable: string]: Distribution } = {};
  headers.forEach((header, i) => {
    if (mode === 'joint') {
        marginals[header] = getMarginal(jointDist, headers, i);
    } else { // timeSeries
        marginals[header] = normalize(getCounts(transposedData[i]));
    }
  });

  const moments: { [key: string]: { mean: number, variance: number } } = {};
  headers.forEach(h => {
      moments[h] = getMoments(marginals[h]);
  });
  
  return {
    marginals,
    joint: jointDist,
    cmf: {}, // Simplified
    moments,
  };
}

function analyzeModel(modelDef: ModelDef): DistributionAnalysis {
  const model: ProbabilityModel = JSON.parse(modelDef.modelString || '[]');
  const jointDist: Distribution = {};
  model.forEach(entry => {
    const key = modelDef.variables.map(v => entry.states[v.name]).join('|');
    jointDist[key] = entry.probability;
  });

  const marginals: { [variable: string]: Distribution } = {};
  modelDef.variables.forEach((v, i) => {
    marginals[v.name] = getMarginal(jointDist, modelDef.variables.map(v => v.name), i);
  });
  
  const moments: { [key: string]: { mean: number, variance: number } } = {};
  modelDef.variables.forEach(v => {
      moments[v.name] = getMoments(marginals[v.name]);
  });

  return { marginals, joint: jointDist, cmf: {}, moments };
}

function compareDistributions(dist1: Distribution, dist2: Distribution): { [metric: string]: number } {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  let hellinger = 0;
  
  allKeys.forEach(key => {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;
    hellinger += Math.pow(Math.sqrt(p1) - Math.sqrt(p2), 2);
  });

  hellinger = (1 / Math.sqrt(2)) * Math.sqrt(hellinger);

  return { 'Hellinger Distance': hellinger, 'Jensen-Shannon Distance': jensenShannonDistance(dist1, dist2) };
}


// --- Self-Dependence Order Analysis ---

// Memoization cache for conditional distributions to avoid re-computation
const memo = new Map<string, Map<string, Distribution>>();

function getConditionalDistribution(
    instanceData: (string|number)[][],
    targetTimeIndex: number,
    conditionTimeIndices: number[]
): Map<string, Distribution> {
    const memoKey = `${targetTimeIndex}:${conditionTimeIndices.join(',')}`;
    if (memo.has(memoKey)) {
        return memo.get(memoKey)!;
    }
    
    const conditionalCounts = new Map<string, Distribution>();
    const conditionTotals = new Map<string, number>();

    instanceData.forEach(trace => {
        if (conditionTimeIndices.some(i => trace[i] === undefined) || trace[targetTimeIndex] === undefined) {
          return; // Skip traces that are too short for this condition
        }
        const conditionKey = conditionTimeIndices.map(i => trace[i]).join('|');
        const targetValue = trace[targetTimeIndex];
        
        if (!conditionalCounts.has(conditionKey)) {
            conditionalCounts.set(conditionKey, {});
            conditionTotals.set(conditionKey, 0);
        }
        
        const counts = conditionalCounts.get(conditionKey)!;
        const targetValueKey = String(targetValue);
        counts[targetValueKey] = (counts[targetValueKey] || 0) + 1;
        conditionTotals.set(conditionKey, conditionTotals.get(conditionKey)! + 1);
    });

    const conditionalDist = new Map<string, Distribution>();
    for (const [key, counts] of conditionalCounts.entries()) {
        const total = conditionTotals.get(key)!;
        conditionalDist.set(key, normalize(counts));
    }

    memo.set(memoKey, conditionalDist);
    return conditionalDist;
}


function analyzeSelfDependence(
    instanceData: (string|number)[][], 
    states: (string|number)[],
    timeSteps: (string|number)[]
): SelfDependenceAnalysis {
    memo.clear();
    const numTimePoints = instanceData[0].length;
    const jointDistributionsByOrder = new Map<number, Distribution>();

    // Pre-calculate all necessary conditional distributions
    const conditionalDistributions = new Map<string, Map<string, Distribution>>();
    for (let t = 1; t < numTimePoints; t++) {
        for (let k = 1; k < numTimePoints; k++) {
            if (t-k < 0) break;
            const conditionIndices = Array.from({length: k}, (_, i) => t - (i + 1)).reverse();
            const key = `${t}:${conditionIndices.join(',')}`;
            conditionalDistributions.set(key, getConditionalDistribution(instanceData, t, conditionIndices));
        }
    }
    const marginalT0 = normalize(getCounts(instanceData.map(trace => trace[0])));

    const allPossibleSequences = cartesianProduct(...Array(numTimePoints).fill(states));

    // Calculate joint distribution for each order model
    for (let order = 1; order <= numTimePoints - 1; order++) {
        const jointDist: Distribution = {};
        
        allPossibleSequences.forEach(sequence => {
            let prob = marginalT0[String(sequence[0])] || 0;
            if (prob === 0) return;

            for (let t = 1; t < numTimePoints; t++) {
                const maxLookback = Math.min(t, order);
                const conditionIndices = Array.from({length: maxLookback}, (_, i) => t - (i + 1)).reverse();
                const condKey = `${t}:${conditionIndices.join(',')}`;
                const condDistMap = conditionalDistributions.get(condKey)!;

                const conditionValueKey = conditionIndices.map(i => sequence[i]).join('|');
                const targetProb = condDistMap.get(conditionValueKey)?.[String(sequence[t])] || 0;
                
                prob *= targetProb;
                if (prob === 0) break;
            }

            if (prob > 0) {
                 jointDist[sequence.join('|')] = prob;
            }
        });
        jointDistributionsByOrder.set(order, jointDist);
    }
    
    // Compare each order's JOINT distribution to the full past (empirical) joint distribution
    const orderResults: OrderResult[] = [];
    const fullPastJointDist = jointDistributionsByOrder.get(numTimePoints - 1)!;

    for (let order = 1; order < numTimePoints - 1; order++) {
        const modelJointDist = jointDistributionsByOrder.get(order)!;
        const metrics = compareDistributions(modelJointDist, fullPastJointDist);

        orderResults.push({ 
            order, 
            hellingerDistance: metrics['Hellinger Distance'], 
            jensenShannonDistance: metrics['Jensen-Shannon Distance'],
            marginals: {} // Not used for comparison anymore, but kept for type consistency
        });
    }

    // Generate conclusion based on a simple distance threshold for the Markovian property
    let conclusion: string;
    if (orderResults.length > 0) {
        const markovResult = orderResults[0]; // order 1
        const hd = markovResult.hellingerDistance;
        const jsd = markovResult.jensenShannonDistance;

        if (hd >= 0 && hd <= 0.5 && jsd >= 0 && jsd <= 0.5) {
            conclusion = `The process appears to be **Markovian (1st-order)**. The Hellinger Distance (${hd.toFixed(4)}) and Jensen-Shannon Distance (${jsd.toFixed(4)}) between the 1st-order model and the empirical data are both within the 0 to 0.5 range, suggesting the Markovian assumption is a reasonable fit. This means the future state of the process depends primarily on its current state, not its distant past.`;
        } else {
            conclusion = `The Markovian assumption likely **does not hold**. At least one distance metric falls outside the 0 to 0.5 range (Hellinger: ${hd.toFixed(4)}, Jensen-Shannon: ${jsd.toFixed(4)}). This indicates that the process has longer-term memory, and past states beyond the most recent one are important for predicting the future.`;
        }
    } else {
        conclusion = "The analysis could not be completed. This may be due to insufficient data or too few time points to test the Markovian assumption.";
    }


    // Format conditional distributions for display
    const conditionalDistributionSets: TimeBasedConditionalDistributionSet[] = [];
    for (let order = 1; order < numTimePoints; order++) {
        const distributionsForThisOrder: TimeBasedConditionalDistributionTable[] = [];
        for (let t = 1; t < numTimePoints; t++) {
            const lookback = Math.min(t, order);
            const conditionIndices = Array.from({length: lookback}, (_, i) => t - (i + 1)).reverse();
            
            if (conditionIndices.length === 0) continue;

            const key = `${t}:${conditionIndices.join(',')}`;
            const condDistMap = conditionalDistributions.get(key);
            if (!condDistMap) continue;

            const conditionedTimes = conditionIndices.map(i => timeSteps[i] as string);
            const conditionedStateSpaces = Array(conditionIndices.length).fill(states);
            const conditionedStatesCombinations = cartesianProduct(...conditionedStateSpaces);
            const matrix: number[][] = [];

            conditionedStatesCombinations.forEach(combo => {
                const conditionValueKey = combo.join('|');
                const dist = condDistMap.get(conditionValueKey) || {};
                const row = states.map(targetState => dist[String(targetState)] || 0);
                matrix.push(row);
            });
            
            distributionsForThisOrder.push({
                title: `P(${timeSteps[t]} | ${conditionedTimes.join(', ')})`,
                targetTime: timeSteps[t] as string,
                conditionedTimes,
                targetStates: states,
                conditionedStatesCombinations,
                matrix
            });
        }
        conditionalDistributionSets.push({ 
            order, 
            distributions: distributionsForThisOrder,
            jointDistribution: jointDistributionsByOrder.get(order)
        });
    }


    return { orders: orderResults, conclusion, conditionalDistributionSets, timeSteps: timeSteps.map(String) };
}


function analyzeTimeSeriesEnsemble(
    data: CsvData,
    models: TransitionMatrixModelDef[],
    options: AnalysisOptions
): AnalysisResult {
    // FIX: Add explicit type for `row` to prevent `unknown` type inference in `map`. This ensures `instanceData` is correctly typed as `(string | number)[][]` and resolves the assignment error.
    const instanceData = transpose(data.rows.map((row: (string | number)[]) => row.slice(1)));
    if (instanceData.length === 0 || instanceData[0].length < 2) {
        throw new Error("Ensemble data must have at least 2 time points and 1 instance.");
    }
    const allStates = Array.from(new Set(instanceData.flat())).sort();
    const timeSteps = data.rows.map(r => r[0]);
    const stateIndex = new Map(allStates.map((s, i) => [s, i]));
    const n = allStates.length;
    const transitionCounts = Array(n).fill(0).map(() => Array(n).fill(0));
    const fromStateTotals = Array(n).fill(0);

    instanceData.forEach(trace => {
        for(let t = 0; t < trace.length - 1; t++) {
            const from = trace[t];
            const to = trace[t+1];
            const fromIdx = stateIndex.get(from);
            const toIdx = stateIndex.get(to);

            if(fromIdx !== undefined && toIdx !== undefined) {
                transitionCounts[fromIdx][toIdx]++;
                fromStateTotals[fromIdx]++;
            }
        }
    });

    const empiricalMatrix = transitionCounts.map((row, i) => 
        row.map(count => fromStateTotals[i] > 0 ? count / fromStateTotals[i] : 0)
    );

    // Dummy empirical analysis for consistency
    const empirical: DistributionAnalysis = { marginals: {}, joint: {}, cmf: {}, moments: {} };
    
    // Compare models
    const modelResults: ModelAnalysisResult[] = models.map(model => {
        let totalHellinger = 0;
        let validRows = 0;
        empiricalMatrix.forEach((empiricalRow, i) => {
            const modelRow = model.matrix[i];
            if (modelRow.every(p => p !== null && isFinite(p as number))) {
                 const empiricalDist = Object.fromEntries(empiricalRow.map((p, j) => [allStates[j], p]));
                 const modelDist = Object.fromEntries((modelRow as number[]).map((p, j) => [allStates[j], p]));
                 totalHellinger += compareDistributions(empiricalDist, modelDist)['Hellinger Distance'];
                 validRows++;
            }
        });
        const avgHellinger = validRows > 0 ? totalHellinger / validRows : Infinity;
        return {
            name: model.name,
            comparisonMetrics: { 'Avg Hellinger Distance': { value: avgHellinger } },
            matrix: model.matrix,
            wins: 0
        }
    });

    const selfDependenceAnalysis = options.runMarkovOrderTest 
        ? analyzeSelfDependence(instanceData, allStates, timeSteps) 
        : undefined;


    return {
        headers: ["Ensemble"],
        empirical,
        modelResults,
        isEnsemble: true,
        ensembleStates: allStates,
        empiricalTransitionMatrix: empiricalMatrix,
        selfDependenceAnalysis,
    }
}


// --- Main Service Function ---

export function analyzeStochasticProcess(
  data: CsvData,
  models: ModelDef[],
  transitionMatrixModels: TransitionMatrixModelDef[],
  mode: AnalysisMode,
  options: AnalysisOptions
): AnalysisResult {

  if (mode === 'timeSeriesEnsemble') {
      return analyzeTimeSeriesEnsemble(data, transitionMatrixModels, options);
  }

  const empirical = analyzeEmpiricalData(data, mode);
  const transposedData = transpose(data.rows);

  const modelResults: ModelAnalysisResult[] = models
    .filter(m => m.modelString && !m.error)
    .map(m => {
        const distributions = analyzeModel(m);
        const rawMetrics = compareDistributions(empirical.joint, distributions.joint);
        const comparisonMetrics: { [metricName: string]: ComparisonMetric } = {};
        Object.keys(rawMetrics).forEach(key => {
            comparisonMetrics[key] = { value: rawMetrics[key] };
        });
        return { name: m.name, distributions, comparisonMetrics, wins: 0 };
    });
  
  let bestModelName: string | undefined = undefined;
  if(modelResults.length > 0) {
      const wins: {[name: string]: number} = {};
      modelResults.forEach(m => wins[m.name] = 0);
      const metrics = Object.keys(modelResults[0].comparisonMetrics || {});
      metrics.forEach(metric => {
          let winner = '';
          let minVal = Infinity;
          modelResults.forEach(m => {
              const val = m.comparisonMetrics![metric].value;
              if (val < minVal) {
                  minVal = val;
                  winner = m.name;
              }
          });
          if(winner) wins[winner]++;
      });
      
      modelResults.forEach(m => {
          m.wins = wins[m.name];
           Object.keys(m.comparisonMetrics!).forEach(metric => {
               let isWinner = true;
               for(const otherM of modelResults) {
                   if(otherM.comparisonMetrics![metric].value < m.comparisonMetrics![metric].value) {
                       isWinner = false;
                       break;
                   }
               }
               m.comparisonMetrics![metric].isWinner = isWinner;
           })
      });

      bestModelName = Object.keys(wins).reduce((a, b) => wins[a] > wins[b] ? a : b);
  }


  let markovResult: MarkovResult | undefined = undefined;
  if(mode === 'timeSeries') {
    markovResult = {};
    data.headers.forEach((h, i) => {
        const {matrix, states} = calculateTransitionMatrix(transposedData[i]);
        markovResult![h] = { states, transitionMatrix: matrix };
    });
  }

  // Add placeholder data structures for joint multivariate analysis
  let dependenceAnalysis: DependenceAnalysisPair[] | undefined = undefined;
  let conditionalDistributions: ConditionalDistributionTable[] | undefined = undefined;
  let conditionalMoments: ConditionalMomentsTable[] | undefined = undefined;

  if (mode === 'joint' && data.headers.length > 1) {
      // Note: Full implementation of these calculations is pending.
      // This provides the necessary structure for the UI to render correctly.
      dependenceAnalysis = [];
      conditionalDistributions = [];
      conditionalMoments = [];
  }

  return {
    headers: data.headers,
    empirical,
    modelResults,
    bestModelName,
    markovResults: markovResult,
    dependenceAnalysis,
    conditionalDistributions,
    conditionalMoments,
  };
}
