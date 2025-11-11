import {
  AnalysisMode,
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
  VariableInfo,
  Moments,
} from '../types';
import { transpose, cartesianProduct, jensenShannonDistance, jensenShannonDivergence } from '../utils/mathUtils';

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

function calculateMoments(dist: Distribution, variable: VariableInfo): Moments {
    const moments: Moments = { mean: null, variance: null, median: null, mode: null };
    const entries = Object.entries(dist);

    if (entries.length === 0) {
        return moments;
    }

    // --- Mode (calculated for all types) ---
    let maxProb = -1;
    let modes: (string | number)[] = [];
    entries.forEach(([state, prob]) => {
        if (prob > maxProb) {
            maxProb = prob;
            modes = [state]; // Start a new list of modes
        } else if (prob === maxProb) {
            modes.push(state);
        }
    });

    // Try to convert modes to numbers if the variable is numerical
    const typedModes = modes.map(m => {
        const num = Number(m);
        return variable.type === 'numerical' && !isNaN(num) ? num : m;
    });
    moments.mode = typedModes;

    // --- Return for Nominal ---
    if (variable.type === 'nominal') {
        return moments;
    }

    // --- Median (calculated for Ordinal and Numerical) ---
    let sortedStatesForMedian: (string | number)[];
    if (variable.type === 'numerical') {
        sortedStatesForMedian = Object.keys(dist).map(Number).sort((a, b) => a - b);
    } else { // 'ordinal'
        const stateOrder = variable.states.split(',').map(s => s.trim());
        sortedStatesForMedian = Object.keys(dist).sort((a, b) => {
            const indexA = stateOrder.indexOf(a);
            const indexB = stateOrder.indexOf(b);
            // Handle cases where a state might not be in the defined order
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }

    let cumulativeProb = 0;
    for (const state of sortedStatesForMedian) {
        cumulativeProb += dist[String(state)] || 0;
        if (cumulativeProb >= 0.5) {
            const numState = Number(state);
            moments.median = variable.type === 'numerical' && !isNaN(numState) ? numState : state;
            break;
        }
    }
    
    // --- Return for Ordinal ---
    if (variable.type === 'ordinal') {
        return moments;
    }

    // --- Mean & Variance (calculated for Numerical only) ---
    const numEntries = Object.entries(dist)
        .map(([state, prob]) => ({ value: parseFloat(state), prob }))
        .filter(e => !isNaN(e.value));

    if (numEntries.length > 0) {
        const mean = numEntries.reduce((sum, { value, prob }) => sum + value * prob, 0);
        moments.mean = mean;
        
        const variance = numEntries.reduce((sum, { value, prob }) => sum + Math.pow(value - mean, 2) * prob, 0);
        moments.variance = variance;
    }
    
    return moments;
}

function calculateCmf(pmf: Distribution, variable: VariableInfo): Distribution {
    if (Object.keys(pmf).length === 0) {
        return {};
    }

    // Determine the order of states for cumulation based on variable type
    let sortedStates: (string|number)[];
    
    switch (variable.type) {
        case 'numerical':
            // Sort numerically
            sortedStates = Object.keys(pmf).map(Number).sort((a, b) => a - b);
            break;
        case 'ordinal':
            // Sort based on the predefined order in variable.states
            const stateOrder = variable.states.split(',').map(s => s.trim());
            sortedStates = Object.keys(pmf).sort((a, b) => {
                const indexA = stateOrder.indexOf(a);
                const indexB = stateOrder.indexOf(b);
                if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
            break;
        case 'nominal':
        default:
            // For nominal, sort alphabetically as a standard convention
            sortedStates = Object.keys(pmf).sort((a, b) => a.localeCompare(b));
            break;
    }
    
    const cmf: Distribution = {};
    let cumulativeProb = 0;
    
    for (const state of sortedStates) {
        const stateKey = String(state);
        const prob = pmf[stateKey] || 0;
        cumulativeProb += prob;
        // Round to avoid floating point issues in display
        cmf[stateKey] = parseFloat(cumulativeProb.toPrecision(15));
    }

    return cmf;
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

function analyzeEmpiricalData(data: CsvData, mode: AnalysisMode, variableInfo: VariableInfo[]): DistributionAnalysis {
  const { headers, rows } = data;
  const transposedData = transpose(rows);
  
  const jointDist = normalize(getJointCounts(rows, headers));

  const marginals: { [variable: string]: Distribution } = {};
  headers.forEach((header, i) => {
    if (mode === 'joint') {
        marginals[header] = getMarginal(jointDist, headers, i);
    } else { // timeSeries
        // The transposed column may contain `undefined`. Filter these out before calculating counts.
        const columnData = transposedData[i].filter(v => v !== undefined);
        marginals[header] = normalize(getCounts(columnData as (string | number)[]));
    }
  });

  const moments: { [key: string]: Moments } = {};
  const cmfs: { [key: string]: Distribution } = {};

  variableInfo.forEach(v => {
      const marginal = marginals[v.name];
      if (marginal) {
        moments[v.name] = calculateMoments(marginal, v);
        cmfs[v.name] = calculateCmf(marginal, v);
      }
  });
  
  return {
    marginals,
    joint: jointDist,
    cmfs,
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
  
  const moments: { [key: string]: Moments } = {};
  const cmfs: { [key: string]: Distribution } = {};

  modelDef.variables.forEach(v => {
      const marginal = marginals[v.name];
      if (marginal) {
        moments[v.name] = calculateMoments(marginal, v);
        cmfs[v.name] = calculateCmf(marginal, v);
      }
  });

  return { marginals, joint: jointDist, cmfs, moments };
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

  return { 
    'Hellinger Distance': hellinger, 
    'Jensen-Shannon Distance': jensenShannonDistance(dist1, dist2)
  };
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
): AnalysisResult {
    const transposedData = transpose(data.rows.map(row => row.slice(1)));
    
    // FIX: Type 'unknown[][]' is not assignable to type '(string | number)[][]'.
    // The 'transpose' function can return undefined for uneven rows, and type inference
    // can fail in some environments. Replaced the complex `reduce` with a `map` for simpler and more robust type inference.
    const instanceData = transposedData.map(trace =>
        trace.filter((point): point is string | number => point != null)
    );

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
    const empirical: DistributionAnalysis = { marginals: {}, joint: {}, cmfs: {}, moments: {} };
    
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

    const selfDependenceAnalysis = analyzeSelfDependence(instanceData, allStates, timeSteps);


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
  variableInfo: VariableInfo[]
): AnalysisResult {

  if (mode === 'timeSeriesEnsemble') {
      return analyzeTimeSeriesEnsemble(data, transitionMatrixModels);
  }

  const empirical = analyzeEmpiricalData(data, mode, variableInfo);
  const transposedData = transpose(data.rows);

  const modelResults: ModelAnalysisResult[] = models
    .filter(m => m.modelString && !m.error)
    .map(m => {
        const distributions = analyzeModel(m);
        
        // Calculate base metrics from joint distributions, which no longer includes MSE.
        const baseMetrics = compareDistributions(empirical.joint, distributions.joint);
        
        const rawMetrics: { [key: string]: number } = {
            'Hellinger Distance': baseMetrics['Hellinger Distance'],
            'Jensen-Shannon Distance': baseMetrics['Jensen-Shannon Distance'],
        };

        // --- Conditionally calculate and add MSE if and only if numerical variables are present ---
        const numericalVars = variableInfo.filter(v => v.type === 'numerical');
        if (numericalVars.length > 0) {
            let totalMse = 0;
            let varsCounted = 0;

            numericalVars.forEach(vInfo => {
                const varIndex = data.headers.indexOf(vInfo.name);
                const modelMean = distributions.moments?.[vInfo.name]?.mean;

                if (varIndex !== -1 && modelMean !== null && typeof modelMean !== 'undefined') {
                    // Robustly filter for finite numbers without type assertions
                    const variableData = (transposedData[varIndex] || []).filter(
                        (val): val is number => typeof val === 'number' && isFinite(val)
                    );
                    const n = variableData.length;
                    if (n > 0) {
                        const squaredErrors = variableData.map(val => Math.pow(val - modelMean, 2));
                        const varMse = squaredErrors.reduce((a, b) => a + b, 0) / n;
                        totalMse += varMse;
                        varsCounted++;
                    }
                }
            });

            // Add MSE to the metrics object only if it could be calculated for at least one variable.
            if (varsCounted > 0) {
                rawMetrics['Mean Squared Error'] = totalMse / varsCounted;
            }
        }

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
        const columnData = (transposedData[i] || []).filter(v => v !== undefined);
        const {matrix, states} = calculateTransitionMatrix(columnData as (string | number)[]);
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