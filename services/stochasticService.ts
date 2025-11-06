import { CsvData, ProbabilityModel, Distribution, CalculatedDistributions, ModelAnalysisResult, ConditionalDistributionTable, DependenceAnalysisPair, DependenceMetrics, ModelDependenceMetrics, ConditionalMomentsTable, StandardAnalysisResult, TimeSeriesEnsembleAnalysis, MarkovOrderResult, TimeHomogeneityResult, TransitionProbabilitiesOverTime, AnalysisResult as AnalysisResultType } from '../types';
import { cartesianProduct, transpose } from '../utils/mathUtils';

// --- Interfaces for analysis results ---
export interface MarkovAnalysis {
  states: (string | number)[];
  transitionMatrix: number[][];
  stationaryDistribution: Distribution;
}

export interface MarkovResult {
  [header: string]: MarkovAnalysis;
}

// Re-export AnalysisResult type for convenience
export type AnalysisResult = AnalysisResultType;

// --- Helper Functions ---
const getKeyFromStates = (states: (string | number)[]): string => states.join('|');

const getCombinations = <T>(array: T[], k: number): T[][] => {
    const result: T[][] = [];
    function backtrack(combination: T[], start: number) {
        if (combination.length === k) {
            result.push([...combination]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combination.push(array[i]);
            backtrack(combination, i + 1);
            combination.pop();
        }
    }
    backtrack([], 0);
    return result;
};


const getJointPMF = (data: CsvData): Distribution => {
  const jointCounts: { [key: string]: number } = {};
  const totalRows = data.rows.length;

  if (totalRows === 0) {
    return {};
  }
  
  const uniqueStatesPerVariable = data.headers.map((_, colIndex) =>
    Array.from(new Set(data.rows.map(row => row[colIndex])))
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  );
  
  const allPossibleStateCombinations = cartesianProduct(...uniqueStatesPerVariable);

  allPossibleStateCombinations.forEach(combo => {
      const key = getKeyFromStates(combo);
      jointCounts[key] = 0;
  });

  data.rows.forEach(row => {
    const key = getKeyFromStates(row);
    if (jointCounts.hasOwnProperty(key)) {
        jointCounts[key]++;
    }
  });

  const jointPMF: Distribution = {};
  for (const key in jointCounts) {
    jointPMF[key] = jointCounts[key] / totalRows;
  }
  return jointPMF;
};

const getModelJointPMF = (model: ProbabilityModel, headers: string[]): Distribution => {
    const jointPMF: Distribution = {};
    model.forEach(entry => {
        const stateValues = headers.map(h => entry.states[h]);
        const key = getKeyFromStates(stateValues);
        jointPMF[key] = entry.probability;
    });
    return jointPMF;
};

const getMarginals = (jointPMF: Distribution, headers: string[]): { [key: string]: Distribution } => {
  const marginals: { [key: string]: Distribution } = {};
  headers.forEach((header, index) => {
    const marginal: Distribution = {};
    for (const jointKey in jointPMF) {
      const states = jointKey.split('|');
      const marginalKey = states[index];
      marginal[marginalKey] = (marginal[marginalKey] || 0) + jointPMF[jointKey];
    }
    marginals[header] = marginal;
  });
  return marginals;
};

const calculateMoments = (dist: Distribution): { mean: number; variance: number } => {
    let mean = 0;
    let weightSum = 0;
    const numericStates: { value: number, prob: number }[] = [];

    for (const state in dist) {
        const numState = Number(state);
        if (!isNaN(numState)) {
            numericStates.push({ value: numState, prob: dist[state] });
            weightSum += dist[state];
        }
    }

    if (numericStates.length === 0 || weightSum < 1e-9) {
        return { mean: NaN, variance: NaN };
    }

    for (const { value, prob } of numericStates) {
        mean += value * prob;
    }
    mean /= weightSum;

    let variance = 0;
    for (const { value, prob } of numericStates) {
        variance += ((value - mean) ** 2) * prob;
    }
    variance /= weightSum;
    
    return { mean, variance };
};

const calculateCmf = (dist: Distribution): Distribution => {
    const sortedStates = Object.keys(dist).sort((a, b) => Number(a) - Number(b));
    const cmf: Distribution = {};
    let cumulative = 0;
    for (const state of sortedStates) {
        cumulative += dist[state];
        cmf[state] = cumulative;
    }
    return cmf;
};

const hellingerDistance = (p: Distribution, q: Distribution): number => {
    if (!p || !q) return 1;
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let sum = 0;
    allKeys.forEach(key => {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;
        sum += (Math.sqrt(pVal) - Math.sqrt(qVal))**2;
    });
    return Math.sqrt(sum) / Math.sqrt(2);
};

const kullbackLeiblerDivergence = (p: Distribution, q: Distribution): number => {
    const epsilon = 1e-10;
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let divergence = 0;

    for (const key of allKeys) {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;

        if (pVal > 0) {
            const qValAdjusted = qVal === 0 ? epsilon : qVal;
            divergence += pVal * Math.log2(pVal / qValAdjusted);
        }
    }
    return divergence;
};

const getPairwiseJointPMF = (fullJointPMF: Distribution, allHeaders: string[], pair: [string, string]): Distribution => {
    const pairwisePMF: Distribution = {};
    const [h1, h2] = pair;
    const h1Index = allHeaders.indexOf(h1);
    const h2Index = allHeaders.indexOf(h2);

    for (const fullKey in fullJointPMF) {
        const fullStates = fullKey.split('|');
        const s1 = fullStates[h1Index];
        const s2 = fullStates[h2Index];
        const pairKey = getKeyFromStates([s1, s2]);
        pairwisePMF[pairKey] = (pairwisePMF[pairKey] || 0) + fullJointPMF[fullKey];
    }
    return pairwisePMF;
};

const calculatePairwiseMutualInformation = (pairwiseJointPMF: Distribution, marginal1: Distribution, marginal2: Distribution): number => {
    let mi = 0;
    for (const jointKey in pairwiseJointPMF) {
        const states = jointKey.split('|');
        const s1 = states[0];
        const s2 = states[1];
        const p_xy = pairwiseJointPMF[jointKey];
        const p_x = marginal1[s1];
        const p_y = marginal2[s2];
        if (p_xy > 0 && p_x > 0 && p_y > 0) {
            mi += p_xy * Math.log2(p_xy / (p_x * p_y));
        }
    }
    return mi;
};

const calculatePearsonCorrelation = (
    pairwiseJointPMF: Distribution,
    marginal1: Distribution,
    marginal2: Distribution
): number | null => {
    const allStates1 = Object.keys(marginal1);
    const allStates2 = Object.keys(marginal2);

    if (allStates1.some(s => isNaN(Number(s))) || allStates2.some(s => isNaN(Number(s)))) {
        return null;
    }

    let e_x = 0, e_y = 0, e_x2 = 0, e_y2 = 0;

    for (const state in marginal1) {
        const numState = Number(state);
        const prob = marginal1[state];
        e_x += numState * prob;
        e_x2 += (numState ** 2) * prob;
    }

    for (const state in marginal2) {
        const numState = Number(state);
        const prob = marginal2[state];
        e_y += numState * prob;
        e_y2 += (numState ** 2) * prob;
    }

    const var_x = e_x2 - (e_x ** 2);
    const var_y = e_y2 - (e_y ** 2);

    const std_dev_x = Math.sqrt(var_x);
    const std_dev_y = Math.sqrt(var_y);

    if (std_dev_x < 1e-9 || std_dev_y < 1e-9) return 0;
    
    let e_xy = 0;
    for (const jointKey in pairwiseJointPMF) {
        const states = jointKey.split('|');
        const x = Number(states[0]);
        const y = Number(states[1]);
        const prob = pairwiseJointPMF[jointKey];
        e_xy += x * y * prob;
    }
    
    const cov_xy = e_xy - (e_x * e_y);
    const correlation = cov_xy / (std_dev_x * std_dev_y);
    return Math.max(-1, Math.min(1, correlation));
};

const getConditionalDistributions = (jointPMF: Distribution, marginals: { [key: string]: Distribution }, headers: string[]): ConditionalDistributionTable[] => {
    if (headers.length < 2) return [];

    const conditionals: ConditionalDistributionTable[] = [];
    const allStates: { [key: string]: (string | number)[] } = {};
    headers.forEach(h => {
        allStates[h] = Object.keys(marginals[h]).sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
    });

    for (let i = 0; i < headers.length; i++) {
        for (let j = 0; j < headers.length; j++) {
            if (i === j) continue;
            const targetVariable = headers[i], conditionedVariable = headers[j];
            const targetStates = allStates[targetVariable], conditionedStates = allStates[conditionedVariable];
            const matrix: number[][] = [];
            for (const condState of conditionedStates) {
                const row: number[] = [];
                const p_conditioned = marginals[conditionedVariable][condState];
                for (const targetState of targetStates) {
                    let p_joint_pair = 0;
                    for (const fullJointKey in jointPMF) {
                        const fullStates = fullJointKey.split('|');
                        if (fullStates[i] == targetState && fullStates[j] == condState) {
                            p_joint_pair += jointPMF[fullJointKey];
                        }
                    }
                    const conditionalProb = (p_conditioned > 1e-9) ? p_joint_pair / p_conditioned : 0;
                    row.push(conditionalProb);
                }
                matrix.push(row);
            }
            conditionals.push({ targetVariable, conditionedVariable, targetStates, conditionedStates, matrix });
        }
    }
    return conditionals;
};

const getConditionalMoments = (conditionalProbs: ConditionalDistributionTable[]): ConditionalMomentsTable[] => {
    const conditionalMoments: ConditionalMomentsTable[] = [];
    for (const condProbTable of conditionalProbs) {
        const { targetVariable, conditionedVariable, targetStates, conditionedStates, matrix } = condProbTable;
        const numericTargetStates = targetStates.map(Number);
        if (numericTargetStates.some(isNaN)) continue;
        const expectations: number[] = [], variances: number[] = [];
        for (let i = 0; i < conditionedStates.length; i++) {
            const conditionalDistribution = matrix[i];
            let expectation = 0;
            for (let j = 0; j < numericTargetStates.length; j++) expectation += numericTargetStates[j] * conditionalDistribution[j];
            let expectationSq = 0;
            for (let j = 0; j < numericTargetStates.length; j++) expectationSq += (numericTargetStates[j] ** 2) * conditionalDistribution[j];
            const variance = expectationSq - (expectation ** 2);
            expectations.push(expectation);
            variances.push(variance);
        }
        conditionalMoments.push({ targetVariable, conditionedVariable, conditionedStates, expectations, variances });
    }
    return conditionalMoments;
};

const getTransitionMatrix = (series: (string | number)[]): { states: (string | number)[], matrix: number[][] } => {
    const states = Array.from(new Set(series)).sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < series.length - 1; i++) {
        const from = stateIndex.get(series[i]);
        const to = stateIndex.get(series[i+1]);
        if (from !== undefined && to !== undefined) counts[from][to]++;
    }
    const matrix = counts.map(row => {
        const total = row.reduce((a, b) => a + b, 0);
        return total > 0 ? row.map(count => count / total) : row;
    });
    return { states, matrix };
};

const getStationaryDistribution = (transitionMatrix: number[][], states: (string | number)[]): Distribution => {
    const n = transitionMatrix.length;
    if (n === 0) return {};
    let p = Array(n).fill(1 / n);
    for (let iter = 0; iter < 1000; iter++) {
        const pNext = Array(n).fill(0);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pNext[j] += p[i] * transitionMatrix[i][j];
        let diff = 0;
        for (let i = 0; i < n; i++) diff += Math.abs(pNext[i] - p[i]);
        if (diff < 1e-9) break;
        p = pNext;
    }
    const dist: Distribution = {};
    states.forEach((state, i) => { dist[String(state)] = p[i]; });
    return dist;
};

const testTimeHomogeneity = (series: (string | number)[], numSegments: number = 2): TimeHomogeneityResult[string] => {
    const segmentLength = Math.floor(series.length / numSegments);
    if (segmentLength < 20) return { isHomogeneous: true, maxDistance: 0 };
    const matrices = [];
    for (let i = 0; i < numSegments; i++) {
        const segment = series.slice(i * segmentLength, (i + 1) * segmentLength);
        matrices.push(getTransitionMatrix(segment).matrix);
    }
    let maxDist = 0;
    for (let i = 0; i < numSegments; i++) {
        for (let j = i + 1; j < numSegments; j++) {
            const m1 = matrices[i].flat(), m2 = matrices[j].flat();
            if(m1.length !== m2.length) continue;
            const dist = hellingerDistance(Object.fromEntries(m1.map((p, k) => [k, p])), Object.fromEntries(m2.map((p, k) => [k, p])));
            if (dist > maxDist) maxDist = dist;
        }
    }
    return { isHomogeneous: maxDist < 0.1, maxDistance: maxDist };
};

const analyzeMarkovOrder = (series: (string | number)[]): MarkovOrderResult[string] => {
    if (series.length < 20) return [];
    const { matrix: tMatrix, states } = getTransitionMatrix(series);
    const stationaryDist = getStationaryDistribution(tMatrix, states);
    let totalDist = 0;
    for(let i = 0; i < tMatrix.length; i++) {
        const rowDist = Object.fromEntries(tMatrix[i].map((p, k) => [states[k], p]));
        totalDist += hellingerDistance(rowDist, stationaryDist);
    }
    const meanDist = tMatrix.length > 0 ? totalDist / tMatrix.length : 0;
    return [{ order: 1, meanDistance: meanDist, isMarkovian: meanDist > 0.1 }];
};

const createDistanceMatrix = (series: number[]): number[][] => {
    const n = series.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
        const dist = Math.abs(series[i] - series[j]);
        matrix[i][j] = dist; matrix[j][i] = dist;
    }
    return matrix;
};

const doubleCenterMatrix = (matrix: number[][]): number[][] => {
    const n = matrix.length;
    if (n === 0) return [];
    const rowMeans = matrix.map(row => row.reduce((a, b) => a + b, 0) / n);
    const colMeans = Array(n).fill(0).map((_, j) => matrix.reduce((sum, row) => sum + row[j], 0) / n);
    const totalMean = rowMeans.reduce((a, b) => a + b, 0) / n;
    const centered: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        centered[i][j] = matrix[i][j] - rowMeans[i] - colMeans[j] + totalMean;
    }
    return centered;
};

const calculateDistanceCorrelation = (seriesX: (string | number)[], seriesY: (string | number)[]): number | null => {
    const numericX = seriesX.map(Number), numericY = seriesY.map(Number);
    if (numericX.some(isNaN) || numericY.some(isNaN)) return null;
    const n = numericX.length;
    if (n === 0) return null;
    const distMatrixX = createDistanceMatrix(numericX), distMatrixY = createDistanceMatrix(numericY);
    const centeredX = doubleCenterMatrix(distMatrixX), centeredY = doubleCenterMatrix(distMatrixY);
    let dCovSq = 0, dVarXSq = 0, dVarYSq = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        dCovSq += centeredX[i][j] * centeredY[i][j];
        dVarXSq += centeredX[i][j] * centeredX[i][j];
        dVarYSq += centeredY[i][j] * centeredY[i][j];
    }
    dCovSq /= (n * n); dVarXSq /= (n * n); dVarYSq /= (n * n);
    if (dVarXSq <= 1e-9 || dVarYSq <= 1e-9) return 0;
    return Math.sqrt(Math.max(0, dCovSq)) / Math.sqrt(Math.sqrt(dVarXSq) * Math.sqrt(dVarYSq));
};

const getDecimalPlaces = (num: number): number => {
    if (Math.floor(num) === num || !isFinite(num)) return 0;
    const str = num.toString();
    const decimalPart = str.split('.')[1];
    return decimalPart ? decimalPart.length : 0;
};

const generateDataFromProportions = (jointPMF: Distribution, headers: string[]): CsvData => {
    const probabilities = Object.values(jointPMF).filter(p => p > 0);
    if (probabilities.length === 0) return { headers, rows: [] };
    const maxDecimalPlaces = Math.max(...probabilities.map(p => getDecimalPlaces(p)));
    const n = Math.pow(10, maxDecimalPlaces);
    const generatedRows: (string | number)[][] = [];
    for (const outcomeKey in jointPMF) {
        const probability = jointPMF[outcomeKey];
        if (probability > 0) {
            const numRows = Math.round(probability * n);
            const row = outcomeKey.split('|').map(cell => {
                const trimmedCell = cell.trim();
                return isNaN(Number(trimmedCell)) || trimmedCell === '' ? trimmedCell : Number(trimmedCell);
            });
            for (let i = 0; i < numRows; i++) generatedRows.push([...row]);
        }
    }
    for (let i = generatedRows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generatedRows[i], generatedRows[j]] = [generatedRows[j], generatedRows[i]];
    }
    return { headers, rows: generatedRows };
};


// --- New Time-Series Ensemble Functions ---

export function isTimeSeriesEnsemble(headers: string[]): boolean {
  if (headers.length < 2) return false;
  const firstHeader = headers[0]?.trim().toLowerCase();
  if (firstHeader !== 'time') return false;
  for (let i = 1; i < headers.length; i++) {
    const header = headers[i]?.trim().toLowerCase();
    if (!header.startsWith('instance')) return false;
  }
  return true;
}

function analyzeTimeSeriesEnsemble(data: CsvData): TimeSeriesEnsembleAnalysis {
    const timeSteps = data.rows.map(r => r[0]);
    const instanceData = data.rows.map(row => row.slice(1));
    const ensemble = transpose(instanceData); // Each row is an instance
    const numInstances = ensemble.length;
    const numTimes = timeSteps.length;
    
    if (numInstances === 0 || numTimes === 0) {
        throw new Error("Time-series data has no instances or no time steps.");
    }
    
    const allStates = Array.from(new Set(ensemble.flat())).sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));

    const transitionProbs: TransitionProbabilitiesOverTime = {};
    allStates.forEach(targetState => {
        transitionProbs[String(targetState)] = {};
        allStates.forEach(fromState => {
            // Transitions are from t-1 to t, so probs exist from time index 1 onwards.
            transitionProbs[String(targetState)][String(fromState)] = Array(numTimes).fill(null);
        });
    });

    // Calculate probabilities for each time step t > 0
    for (let t = 1; t < numTimes; t++) {
        const fromCounts: { [state: string]: number } = {};
        const transitionCounts: { [from: string]: { [to: string]: number } } = {};

        // Initialize counts for this time step
        allStates.forEach(s => {
            fromCounts[String(s)] = 0;
            transitionCounts[String(s)] = {};
            allStates.forEach(s2 => {
                transitionCounts[String(s)][String(s2)] = 0;
            });
        });

        // Aggregate counts across the ensemble for transition t-1 -> t
        for (let i = 0; i < numInstances; i++) {
            const fromState = String(ensemble[i][t-1]);
            const toState = String(ensemble[i][t]);
            fromCounts[fromState]++;
            transitionCounts[fromState][toState]++;
        }

        // Calculate probabilities and store them at index t
        allStates.forEach(targetState => {
            allStates.forEach(fromState => {
                const fromTotal = fromCounts[String(fromState)];
                if (fromTotal > 0) {
                    const count = transitionCounts[String(fromState)][String(targetState)];
                    transitionProbs[String(targetState)][String(fromState)][t] = count / fromTotal;
                }
            });
        });
    }
    
    const timeHomogeneityTest: TimeHomogeneityResult = {};
    const markovOrderTest: MarkovOrderResult = {};
    const representativeSeries = ensemble[0]; // Run tests on the first instance as a sample
    if (representativeSeries) {
        timeHomogeneityTest['Instance1'] = testTimeHomogeneity(representativeSeries);
        markovOrderTest['Instance1'] = analyzeMarkovOrder(representativeSeries);
    }

    return {
      isTimeSeriesEnsemble: true,
      headers: ['Time', 'Instances'],
      timeSteps,
      states: allStates,
      transitionProbabilitiesOverTime: transitionProbs,
      timeHomogeneityTest,
      markovOrderTest,
    };
}


// --- Main Analysis Function ---
export function analyzeData(
    data: CsvData, 
    models: {name: string, model: ProbabilityModel}[]
): AnalysisResult {
  if (data.rows.length === 0) throw new Error("Dataset has no rows to analyze.");
  
  if (isTimeSeriesEnsemble(data.headers)) {
      return analyzeTimeSeriesEnsemble(data);
  }

  const isSingleVariable = data.headers.length === 1;
  const empiricalJoint = getJointPMF(data);
  const empiricalMarginals = getMarginals(empiricalJoint, data.headers);
  const empiricalDists: CalculatedDistributions = { joint: empiricalJoint, marginals: empiricalMarginals };

  const empiricalMoments: { [key: string]: { mean: number; variance: number } } = {};
  data.headers.forEach(header => {
    empiricalMoments[header] = calculateMoments(empiricalMarginals[header]);
  });
  empiricalDists.moments = empiricalMoments;

  if (isSingleVariable) {
      const singleVarHeader = data.headers[0];
      const singleVarDist = empiricalMarginals[singleVarHeader];
      empiricalDists.cmf = calculateCmf(singleVarDist);
  } else {
      empiricalDists.conditionals = getConditionalDistributions(empiricalJoint, empiricalMarginals, data.headers);
      if (empiricalDists.conditionals) {
        empiricalDists.conditionalMoments = getConditionalMoments(empiricalDists.conditionals);
      }
  }

  let result: StandardAnalysisResult = { 
    headers: data.headers, 
    isSingleVariable,
    empirical: empiricalDists 
  };
  
  const dependenceAnalyses: DependenceAnalysisPair[] = [];
  if (data.headers.length >= 2) {
      const headerPairs = getCombinations(data.headers, 2) as [string, string][];

      const firstPair = headerPairs[0];
      const firstPairPMF = getPairwiseJointPMF(empiricalJoint, data.headers, firstPair);
      result.dependence = {
          mutualInformation: calculatePairwiseMutualInformation(firstPairPMF, empiricalMarginals[firstPair[0]], empiricalMarginals[firstPair[1]])
      };
      
      for (const pair of headerPairs) {
          const [h1, h2] = pair;
          const h1Index = data.headers.indexOf(h1);
          const h2Index = data.headers.indexOf(h2);

          const pairwiseEmpiricalJoint = getPairwiseJointPMF(empiricalJoint, data.headers, pair);
          const empiricalMI = calculatePairwiseMutualInformation(pairwiseEmpiricalJoint, empiricalMarginals[h1], empiricalMarginals[h2]);
          const seriesX = data.rows.map(r => r[h1Index]);
          const seriesY = data.rows.map(r => r[h2Index]);
          const empiricalDC = calculateDistanceCorrelation(seriesX, seriesY);
          const empiricalPearson = calculatePearsonCorrelation(pairwiseEmpiricalJoint, empiricalMarginals[h1], empiricalMarginals[h2]);
          
          const empiricalMetrics: DependenceMetrics = { mutualInformation: empiricalMI, distanceCorrelation: empiricalDC, pearsonCorrelation: empiricalPearson };

          const modelMetrics: ModelDependenceMetrics[] = models.map(({ name, model }) => {
              const modelJoint = getModelJointPMF(model, data.headers);
              const modelMarginals = getMarginals(modelJoint, data.headers);
              const pairwiseModelJoint = getPairwiseJointPMF(modelJoint, data.headers, pair);
              const modelMI = calculatePairwiseMutualInformation(pairwiseModelJoint, modelMarginals[h1], modelMarginals[h2]);

              const generatedData = generateDataFromProportions(modelJoint, data.headers);
              const simSeriesX = generatedData.rows.map(r => r[h1Index]);
              const simSeriesY = generatedData.rows.map(r => r[h2Index]);
              const modelDC = calculateDistanceCorrelation(simSeriesX, simSeriesY);
              const modelPearson = calculatePearsonCorrelation(pairwiseModelJoint, modelMarginals[h1], modelMarginals[h2]);

              return { modelName: name, mutualInformation: modelMI, distanceCorrelation: modelDC, pearsonCorrelation: modelPearson };
          });
          dependenceAnalyses.push({ variablePair: pair, empiricalMetrics, modelMetrics });
      }
  }
  result.dependenceAnalysis = dependenceAnalyses;

  if (models.length > 0) {
    const rawModelResults = models.map(({name, model}) => {
        const modelJoint = getModelJointPMF(model, data.headers);
        const modelMarginals = getMarginals(modelJoint, data.headers);
        const modelDists: CalculatedDistributions = { joint: modelJoint, marginals: modelMarginals };
        
        const modelMoments: { [key: string]: { mean: number; variance: number } } = {};
        data.headers.forEach(header => {
            if (modelMarginals[header]) modelMoments[header] = calculateMoments(modelMarginals[header]);
        });
        modelDists.moments = modelMoments;
        
        if (isSingleVariable) {
            modelDists.cmf = calculateCmf(modelDists.marginals[data.headers[0]]);
        } else {
            modelDists.conditionals = getConditionalDistributions(modelJoint, modelMarginals, data.headers);
            if (modelDists.conditionals) modelDists.conditionalMoments = getConditionalMoments(modelDists.conditionals);
        }
        
        const meanSquaredErrors: { [key: string]: number } = {};
        data.headers.forEach(header => {
            const empMoments = empiricalDists.moments?.[header];
            const modMoments = modelDists.moments?.[header];
            if (empMoments && !isNaN(empMoments.mean) && modMoments && !isNaN(modMoments.mean)) {
                meanSquaredErrors[header] = ((modMoments.mean - empMoments.mean) ** 2) + modMoments.variance;
            } else {
                meanSquaredErrors[header] = NaN;
            }
        });

        const empiricalMetricDist = isSingleVariable ? empiricalDists.marginals[data.headers[0]] : empiricalJoint;
        const modelMetricDist = isSingleVariable ? modelDists.marginals[data.headers[0]] : modelJoint;

        return {
            name,
            distributions: modelDists,
            comparison: {
                hellingerDistance: hellingerDistance(empiricalMetricDist, modelMetricDist),
                meanSquaredErrors: meanSquaredErrors,
                kullbackLeiblerDivergence: kullbackLeiblerDivergence(empiricalMetricDist, modelMetricDist),
            }
        };
    });
    
    const metrics: string[] = ['Hellinger Distance', 'KL Divergence'];
    data.headers.forEach(h => {
        if (!isNaN(rawModelResults[0]?.comparison.meanSquaredErrors[h])) metrics.push(`MSE (${h})`);
    });

    const winners: { [metric: string]: { name: string, value: number } } = {};
    metrics.forEach(metric => {
        let bestModelName: string | null = null;
        let bestValue = Infinity;
        rawModelResults.forEach(res => {
            let value: number;
            if (metric.startsWith('MSE')) {
                const header = metric.match(/\(([^)]+)\)/)?.[1];
                value = header ? res.comparison.meanSquaredErrors[header] : NaN;
            } else if (metric === 'Hellinger Distance') {
                value = res.comparison.hellingerDistance;
            } else {
                value = res.comparison.kullbackLeiblerDivergence;
            }
            if (isFinite(value) && value < bestValue) {
                bestValue = value; bestModelName = res.name;
            }
        });
        if (bestModelName) winners[metric] = { name: bestModelName, value: bestValue };
    });

    const finalModelResults: ModelAnalysisResult[] = rawModelResults.map(res => {
        const comparisonMetrics: ModelAnalysisResult['comparisonMetrics'] = {};
        let wins = 0;
        metrics.forEach(metric => {
            let value: number;
            if (metric.startsWith('MSE')) {
                const header = metric.match(/\(([^)]+)\)/)?.[1];
                value = header ? res.comparison.meanSquaredErrors[header] : NaN;
            } else if (metric === 'Hellinger Distance') {
                value = res.comparison.hellingerDistance;
            } else {
                value = res.comparison.kullbackLeiblerDivergence;
            }
            const isWinner = winners[metric]?.name === res.name && winners[metric]?.value === value;
            if (isWinner) wins++;
            comparisonMetrics[metric] = { value, isWinner };
        });
        return { ...res, comparisonMetrics, wins };
    });

    if (finalModelResults.length > 0) {
        result.bestModelName = finalModelResults.reduce((best, current) => (current.wins > best.wins) ? current : best).name;
    }
    result.modelResults = finalModelResults;
  }

  return result;
}
