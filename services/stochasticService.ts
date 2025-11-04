import { CsvData, ProbabilityModel, Distribution, AnalysisOptions, CalculatedDistributions, ModelAnalysisResult, ConditionalDistributionTable, DependenceAnalysisPair, DependenceMetrics, ModelDependenceMetrics, ConditionalMomentsTable } from '../types';
import { cartesianProduct } from '../utils/mathUtils';

// --- Interfaces for analysis results ---
export interface MarkovAnalysis {
  states: (string | number)[];
  transitionMatrix: number[][];
  stationaryDistribution: Distribution;
}

export interface MarkovResult {
  [header: string]: MarkovAnalysis;
}

export interface TimeHomogeneityResult {
    [header: string]: {
        isHomogeneous: boolean;
        maxDistance: number;
    }
}

export interface MarkovOrderResult {
    [header: string]: {
        order: number;
        meanDistance: number;
        isMarkovian: boolean;
    }[];
}

export interface AnalysisResult {
  headers: string[];
  isSingleVariable: boolean;
  empirical: CalculatedDistributions;
  modelResults?: ModelAnalysisResult[];
  bestModelName?: string;
  dependence?: { // Note: this is now superseded by dependenceAnalysis but kept for single MI value
    mutualInformation: number | null;
  };
  markov?: MarkovResult;
  timeHomogeneityTest?: TimeHomogeneityResult;
  markovOrderTest?: MarkovOrderResult;
  dependenceAnalysis?: DependenceAnalysisPair[];
}

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
  
  // Find all unique states for each variable to define the complete state space, and sort them.
  const uniqueStatesPerVariable = data.headers.map((_, colIndex) =>
    Array.from(new Set(data.rows.map(row => row[colIndex])))
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  );
  
  const allPossibleStateCombinations = cartesianProduct(...uniqueStatesPerVariable);

  // Initialize all possible outcomes with a count of 0
  allPossibleStateCombinations.forEach(combo => {
      const key = getKeyFromStates(combo);
      jointCounts[key] = 0;
  });

  // Count occurrences from the actual data
  data.rows.forEach(row => {
    const key = getKeyFromStates(row);
    // This check ensures we only count combinations that are part of our defined state space.
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
    
    // First pass to calculate mean
    for (const state in dist) {
        const numState = Number(state);
        if (!isNaN(numState)) {
            mean += numState * dist[state];
        }
    }

    let variance = 0;
    // Second pass to calculate variance
    for (const state in dist) {
        const numState = Number(state);
        if (!isNaN(numState)) {
            variance += ((numState - mean) ** 2) * dist[state];
        }
    }
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

// --- Metric Functions ---
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
    const epsilon = 1e-10; // Small value to avoid log(0)
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let divergence = 0;

    for (const key of allKeys) {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;

        if (pVal > 0) {
            // Use epsilon for qVal if it's zero, to avoid infinity.
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

// --- Conditional Distribution ---
const getConditionalDistributions = (jointPMF: Distribution, marginals: { [key: string]: Distribution }, headers: string[]): ConditionalDistributionTable[] => {
    if (headers.length < 2) {
        return [];
    }

    const conditionals: ConditionalDistributionTable[] = [];
    
    // Get sorted states for each variable to ensure consistent ordering
    const allStates: { [key: string]: (string | number)[] } = {};
    headers.forEach(h => {
        allStates[h] = Object.keys(marginals[h]).sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
    });

    for (let i = 0; i < headers.length; i++) { // Target variable
        for (let j = 0; j < headers.length; j++) { // Conditioned variable
            if (i === j) continue;

            const targetVariable = headers[i];
            const conditionedVariable = headers[j];

            const targetStates = allStates[targetVariable];
            const conditionedStates = allStates[conditionedVariable];

            const matrix: number[][] = [];

            for (const condState of conditionedStates) {
                const row: number[] = [];
                const p_conditioned = marginals[conditionedVariable][condState];

                for (const targetState of targetStates) {
                    // Calculate P(target=targetState, conditioned=condState) by summing over all other variables
                    let p_joint_pair = 0;
                    for (const fullJointKey in jointPMF) {
                        const fullStates = fullJointKey.split('|');
                        // Use '==' for type coercion as states can be number or string
                        if (fullStates[i] == targetState && fullStates[j] == condState) {
                            p_joint_pair += jointPMF[fullJointKey];
                        }
                    }

                    const conditionalProb = (p_conditioned > 1e-9) ? p_joint_pair / p_conditioned : 0;
                    row.push(conditionalProb);
                }
                matrix.push(row);
            }

            conditionals.push({
                targetVariable,
                conditionedVariable,
                targetStates,
                conditionedStates,
                matrix
            });
        }
    }
    return conditionals;
};

const getConditionalMoments = (conditionalProbs: ConditionalDistributionTable[]): ConditionalMomentsTable[] => {
    const conditionalMoments: ConditionalMomentsTable[] = [];

    for (const condProbTable of conditionalProbs) {
        const {
            targetVariable,
            conditionedVariable,
            targetStates,
            conditionedStates,
            matrix, // matrix[i][j] = P(target=targetStates[j] | conditioned=conditionedStates[i])
        } = condProbTable;

        // Check if target states are numeric. If not, we can't calculate moments.
        const numericTargetStates = targetStates.map(Number);
        if (numericTargetStates.some(isNaN)) {
            continue;
        }

        const expectations: number[] = [];
        const variances: number[] = [];

        // Iterate over each state of the conditioned variable (each row of the matrix)
        for (let i = 0; i < conditionedStates.length; i++) {
            const conditionalDistribution = matrix[i]; // This is P(target | conditioned = conditionedStates[i])

            // Calculate E(X | Y=y_i)
            let expectation = 0;
            for (let j = 0; j < numericTargetStates.length; j++) {
                expectation += numericTargetStates[j] * conditionalDistribution[j];
            }

            // Calculate E(X^2 | Y=y_i)
            let expectationSq = 0;
            for (let j = 0; j < numericTargetStates.length; j++) {
                expectationSq += (numericTargetStates[j] ** 2) * conditionalDistribution[j];
            }

            // Calculate Var(X | Y=y_i)
            const variance = expectationSq - (expectation ** 2);

            expectations.push(expectation);
            variances.push(variance);
        }

        conditionalMoments.push({
            targetVariable,
            conditionedVariable,
            conditionedStates,
            expectations,
            variances,
        });
    }

    return conditionalMoments;
};

// --- Markov Analysis Functions ---
const getTransitionMatrix = (series: (string | number)[]): { states: (string | number)[], matrix: number[][] } => {
    const states = Array.from(new Set(series)).sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < series.length - 1; i++) {
        const from = stateIndex.get(series[i]);
        const to = stateIndex.get(series[i+1]);
        if (from !== undefined && to !== undefined) {
          counts[from][to]++;
        }
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
    
    let p = Array(n).fill(1 / n); // Start with uniform distribution
    
    for (let iter = 0; iter < 1000; iter++) {
        const pNext = Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                pNext[j] += p[i] * transitionMatrix[i][j];
            }
        }
        
        let diff = 0;
        for (let i = 0; i < n; i++) {
            diff += Math.abs(pNext[i] - p[i]);
        }
        if (diff < 1e-9) break;

        p = pNext;
    }
    
    const dist: Distribution = {};
    states.forEach((state, i) => {
        dist[String(state)] = p[i];
    });

    return dist;
};

// --- New Advanced Analysis Functions ---
const testTimeHomogeneity = (series: (string | number)[], numSegments: number = 2): { isHomogeneous: boolean; maxDistance: number } => {
    const segmentLength = Math.floor(series.length / numSegments);
    if (segmentLength < 20) return { isHomogeneous: true, maxDistance: 0 }; // Not enough data

    const matrices = [];
    for (let i = 0; i < numSegments; i++) {
        const segment = series.slice(i * segmentLength, (i + 1) * segmentLength);
        matrices.push(getTransitionMatrix(segment).matrix);
    }
    
    let maxDist = 0;
    for (let i = 0; i < numSegments; i++) {
        for (let j = i + 1; j < numSegments; j++) {
            const m1 = matrices[i].flat();
            const m2 = matrices[j].flat();
            if(m1.length !== m2.length) continue;

            const dist = hellingerDistance(
                Object.fromEntries(m1.map((p, k) => [k, p])),
                Object.fromEntries(m2.map((p, k) => [k, p]))
            );
            if (dist > maxDist) maxDist = dist;
        }
    }

    return {
        isHomogeneous: maxDist < 0.1, // Threshold from MATLAB example
        maxDistance: maxDist
    };
};

const analyzeMarkovOrder = (series: (string | number)[], maxOrder: number = 1): MarkovOrderResult[string] => {
    const results = [];
    if (series.length < 20) return [];

    // Order 1 test
    const { matrix: tMatrix, states } = getTransitionMatrix(series);
    const stationaryDist = getStationaryDistribution(tMatrix, states);

    let totalDist = 0;
    for(let i = 0; i < tMatrix.length; i++) {
        const rowDist = Object.fromEntries(tMatrix[i].map((p, k) => [states[k], p]));
        totalDist += hellingerDistance(rowDist, stationaryDist);
    }

    const meanDist = tMatrix.length > 0 ? totalDist / tMatrix.length : 0;
    
    results.push({
        order: 1,
        meanDistance: meanDist,
        isMarkovian: meanDist > 0.1, // If dist is high, it's NOT independent, so it IS Markovian
    });

    // Higher orders are complex, so we'll stick to a simplified 1st order test.
    return results;
};

// --- Stochastic Dependence Analysis ---
const createDistanceMatrix = (series: number[]): number[][] => {
    const n = series.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const dist = Math.abs(series[i] - series[j]);
            matrix[i][j] = dist;
            matrix[j][i] = dist;
        }
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
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            centered[i][j] = matrix[i][j] - rowMeans[i] - colMeans[j] + totalMean;
        }
    }
    return centered;
};

const calculateDistanceCorrelation = (seriesX: (string | number)[], seriesY: (string | number)[]): number | null => {
    const numericX = seriesX.map(Number);
    const numericY = seriesY.map(Number);
    if (numericX.some(isNaN) || numericY.some(isNaN)) {
        return null;
    }

    const n = numericX.length;
    if (n === 0) return null;

    const distMatrixX = createDistanceMatrix(numericX);
    const distMatrixY = createDistanceMatrix(numericY);

    const centeredX = doubleCenterMatrix(distMatrixX);
    const centeredY = doubleCenterMatrix(distMatrixY);

    let dCovSq = 0;
    let dVarXSq = 0;
    let dVarYSq = 0;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            dCovSq += centeredX[i][j] * centeredY[i][j];
            dVarXSq += centeredX[i][j] * centeredX[i][j];
            dVarYSq += centeredY[i][j] * centeredY[i][j];
        }
    }
    
    dCovSq /= (n * n);
    dVarXSq /= (n * n);
    dVarYSq /= (n * n);

    if (dVarXSq <= 1e-9 || dVarYSq <= 1e-9) {
        return 0;
    }

    const dCor = Math.sqrt(Math.max(0, dCovSq)) / Math.sqrt(Math.sqrt(dVarXSq) * Math.sqrt(dVarYSq));
    return dCor;
};

const getDecimalPlaces = (num: number): number => {
    if (Math.floor(num) === num || !isFinite(num)) return 0;
    const str = num.toString();
    const decimalPart = str.split('.')[1];
    return decimalPart ? decimalPart.length : 0;
};

/**
 * Generates a dataset that deterministically represents the exact proportions of a given model PMF.
 * The size of the dataset is determined by the precision of the probabilities.
 * e.g., probabilities with 2 decimal places (0.25) will result in a dataset of 100 points.
 * @param jointPMF The model's joint probability mass function.
 * @param headers The headers for the variables.
 * @returns A CsvData object representing the model.
 */
const generateDataFromProportions = (jointPMF: Distribution, headers: string[]): CsvData => {
    const probabilities = Object.values(jointPMF).filter(p => p > 0);
    if (probabilities.length === 0) {
        return { headers, rows: [] };
    }

    // Find the maximum number of decimal places to determine the scale factor 'n'
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

            for (let i = 0; i < numRows; i++) {
                generatedRows.push([...row]);
            }
        }
    }
    
    // Shuffling is good practice, though dCor is order-insensitive.
    for (let i = generatedRows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [generatedRows[i], generatedRows[j]] = [generatedRows[j], generatedRows[i]];
    }

    return { headers, rows: generatedRows };
};


// --- Main Analysis Function ---
export function analyzeData(
    data: CsvData, 
    models: {name: string, model: ProbabilityModel}[],
    options: AnalysisOptions
): AnalysisResult {
  if (data.rows.length === 0) throw new Error("Dataset has no rows to analyze.");

  const isSingleVariable = data.headers.length === 1;
  const empiricalJoint = getJointPMF(data);
  const empiricalMarginals = getMarginals(empiricalJoint, data.headers);
  const empiricalDists: CalculatedDistributions = { joint: empiricalJoint, marginals: empiricalMarginals };

  if (isSingleVariable) {
      const singleVarHeader = data.headers[0];
      const singleVarDist = empiricalMarginals[singleVarHeader];
      empiricalDists.moments = calculateMoments(singleVarDist);
      empiricalDists.cmf = calculateCmf(singleVarDist);
  } else {
      empiricalDists.conditionals = getConditionalDistributions(empiricalJoint, empiricalMarginals, data.headers);
      if (empiricalDists.conditionals) {
        empiricalDists.conditionalMoments = getConditionalMoments(empiricalDists.conditionals);
      }
  }

  let result: AnalysisResult = { 
    headers: data.headers, 
    isSingleVariable,
    empirical: empiricalDists 
  };
  
  // --- Stochastic Dependence analysis ---
  const dependenceAnalyses: DependenceAnalysisPair[] = [];
  if (data.headers.length >= 2) {
      const headerPairs = getCombinations(data.headers, 2) as [string, string][];

      // Populate legacy dependence object with first pair's MI
      const firstPair = headerPairs[0];
      const firstPairPMF = getPairwiseJointPMF(empiricalJoint, data.headers, firstPair);
      result.dependence = {
          mutualInformation: calculatePairwiseMutualInformation(firstPairPMF, empiricalMarginals[firstPair[0]], empiricalMarginals[firstPair[1]])
      };
      
      for (const pair of headerPairs) {
          const [h1, h2] = pair;
          const h1Index = data.headers.indexOf(h1);
          const h2Index = data.headers.indexOf(h2);

          // --- Empirical Calculation ---
          const pairwiseEmpiricalJoint = getPairwiseJointPMF(empiricalJoint, data.headers, pair);
          const empiricalMI = calculatePairwiseMutualInformation(pairwiseEmpiricalJoint, empiricalMarginals[h1], empiricalMarginals[h2]);
          const seriesX = data.rows.map(r => r[h1Index]);
          const seriesY = data.rows.map(r => r[h2Index]);
          const empiricalDC = calculateDistanceCorrelation(seriesX, seriesY);
          
          const empiricalMetrics: DependenceMetrics = {
              mutualInformation: empiricalMI,
              distanceCorrelation: empiricalDC,
          };

          // --- Model Calculations ---
          const modelMetrics: ModelDependenceMetrics[] = models.map(({ name, model }) => {
              const modelJoint = getModelJointPMF(model, data.headers);
              const modelMarginals = getMarginals(modelJoint, data.headers);
              const pairwiseModelJoint = getPairwiseJointPMF(modelJoint, data.headers, pair);
              const modelMI = calculatePairwiseMutualInformation(pairwiseModelJoint, modelMarginals[h1], modelMarginals[h2]);

              const generatedData = generateDataFromProportions(modelJoint, data.headers);
              const simSeriesX = generatedData.rows.map(r => r[h1Index]);
              const simSeriesY = generatedData.rows.map(r => r[h2Index]);
              const modelDC = calculateDistanceCorrelation(simSeriesX, simSeriesY);

              return {
                  modelName: name,
                  mutualInformation: modelMI,
                  distanceCorrelation: modelDC,
              };
          });

          dependenceAnalyses.push({
              variablePair: pair,
              empiricalMetrics,
              modelMetrics,
          });
      }
  }
  result.dependenceAnalysis = dependenceAnalyses;

  
  // Advanced analysis if requested
  if (options.runTimeHomogeneityTest) {
      const thResults: TimeHomogeneityResult = {};
      data.headers.forEach((h, i) => {
          thResults[h] = testTimeHomogeneity(data.rows.map(r => r[i]));
      });
      result.timeHomogeneityTest = thResults;
  }
   if (options.runMarkovOrderTest) {
      const moResults: MarkovOrderResult = {};
      data.headers.forEach((h, i) => {
          moResults[h] = analyzeMarkovOrder(data.rows.map(r => r[i]));
      });
      result.markovOrderTest = moResults;
      
      // Perform Markov Chain analysis ONLY if this option is on
      if (data.rows.length > 1) {
        const markovResult: MarkovResult = {};
        data.headers.forEach((header, index) => {
            const series = data.rows.map(row => row[index]);
            const { states, matrix } = getTransitionMatrix(series);
            if (states.length > 0) {
                const stationaryDistribution = getStationaryDistribution(matrix, states);
                markovResult[header] = { states, transitionMatrix: matrix, stationaryDistribution };
            }
        });
        result.markov = markovResult;
      }
  }

  if (models.length > 0) {
    const modelResults: ModelAnalysisResult[] = models.map(({name, model}) => {
        const modelJoint = getModelJointPMF(model, data.headers);
        const modelMarginals = getMarginals(modelJoint, data.headers);
        const modelDists: CalculatedDistributions = { joint: modelJoint, marginals: modelMarginals };
        if (!isSingleVariable) {
            modelDists.conditionals = getConditionalDistributions(modelJoint, modelMarginals, data.headers);
            if (modelDists.conditionals) {
                modelDists.conditionalMoments = getConditionalMoments(modelDists.conditionals);
            }
        }

        const empiricalMetricDist = isSingleVariable ? empiricalDists.marginals[data.headers[0]] : empiricalJoint;
        const modelMetricDist = isSingleVariable ? modelDists.marginals[data.headers[0]] : modelJoint;
        
        let mse;
        if (isSingleVariable) {
            const singleVarHeader = data.headers[0];
            const empMoments = calculateMoments(empiricalDists.marginals[singleVarHeader]);
            const modMoments = calculateMoments(modelDists.marginals[singleVarHeader]);
            modelDists.moments = modMoments;
            modelDists.cmf = calculateCmf(modelDists.marginals[singleVarHeader]);

            const bias = modMoments.mean - empMoments.mean;
            mse = (bias ** 2) + modMoments.variance;
        } else {
            let totalMse = 0;
            data.headers.forEach(header => {
                const empDist = empiricalDists.marginals[header];
                const modDist = modelDists.marginals[header];

                if (empDist && modDist) {
                    const empMoments = calculateMoments(empDist);
                    const modMoments = calculateMoments(modDist);

                    const bias = modMoments.mean - empMoments.mean;
                    const marginalMse = (bias ** 2) + modMoments.variance;
                    totalMse += marginalMse;
                }
            });
            mse = data.headers.length > 0 ? totalMse / data.headers.length : 0;
        }

        return {
            name,
            distributions: modelDists,
            comparison: {
                hellingerDistance: hellingerDistance(empiricalMetricDist, modelMetricDist),
                meanSquaredError: mse,
                kullbackLeiblerDivergence: kullbackLeiblerDivergence(empiricalMetricDist, modelMetricDist),
            }
        };
    });
    
    // Perform comparison and find best model
    if (isSingleVariable && modelResults.length > 1) {
        const metrics: (keyof ModelAnalysisResult['comparison'])[] = ['hellingerDistance', 'meanSquaredError', 'kullbackLeiblerDivergence'];
        const winners: { [metric: string]: { name: string, value: number } } = {};

        metrics.forEach(metric => {
            let bestModel: ModelAnalysisResult | null = null;
            let bestValue = Infinity;
            modelResults.forEach(res => {
                const value = res.comparison[metric];
                if (isFinite(value) && value < bestValue) {
                    bestValue = value;
                    bestModel = res;
                }
            });
            if (bestModel) {
                winners[metric] = { name: bestModel.name, value: bestValue };
            }
        });
        
        modelResults.forEach(res => {
            res.comparisonMetrics = {};
            res.wins = 0;
            metrics.forEach(metric => {
                const value = res.comparison[metric];
                const isWinner = winners[metric]?.name === res.name && winners[metric]?.value === value;
                if (isWinner) res.wins!++;
                res.comparisonMetrics![metric] = { value, isWinner };
            });
        });
        
        result.bestModelName = modelResults.reduce((best, current) => (current.wins ?? 0) > (best.wins ?? 0) ? current : best).name;

    } else if (!isSingleVariable && modelResults.length > 0) {
        // Multi-variable composite score logic
        modelResults.forEach(res => {
            const { hellingerDistance: hd, meanSquaredError: mse, kullbackLeiblerDivergence: kl } = res.comparison;
            res.comparison.score = (hd + mse + (isFinite(kl) ? kl / 10 : 1));
        });
        result.bestModelName = modelResults.reduce((best, current) => (current.comparison.score ?? Infinity) < (best.comparison.score ?? Infinity) ? current : best).name;
    } else if (modelResults.length > 0) {
        result.bestModelName = modelResults[0].name;
    }

    result.modelResults = modelResults;
  }

  return result;
}