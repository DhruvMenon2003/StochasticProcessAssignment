import { Distribution } from "../types";

/**
 * Computes the Cartesian product of the given arrays.
 * @param arrays A variable number of arrays.
 * @returns An array of arrays, where each inner array is a combination.
 */
export function cartesianProduct<T>(...arrays: T[][]): T[][] {
  if (arrays.length === 0 || arrays.some(arr => arr.length === 0)) {
    return [];
  }

  return arrays.reduce<T[][]>(
    (acc, curr) => {
      return acc.flatMap(a => curr.map(c => [...a, c]));
    },
    [[]]
  );
}

/**
 * Transposes a 2D array (matrix). If the matrix rows are of unequal length,
 * the resulting columns will be padded with `undefined` to match the length
 * of the longest row.
 * @param matrix The matrix to transpose.
 * @returns The transposed matrix, which may contain `undefined` values.
 */
export function transpose<T>(matrix: T[][]): (T | undefined)[][] {
  if (!matrix || matrix.length === 0) {
    return [];
  }
  const numRows = matrix.length;
  const numCols = Math.max(...matrix.map(row => row.length));

  const transposed: (T | undefined)[][] = [];
  for (let j = 0; j < numCols; j++) {
    transposed[j] = Array(numRows);
    for (let i = 0; i < numRows; i++) {
      transposed[j][i] = matrix[i][j];
    }
  }
  return transposed;
}


/**
 * Calculates the Kullback-Leibler (KL) divergence between two distributions.
 * D_KL(P || Q)
 * @param dist1 The first distribution (P).
 * @param dist2 The second distribution (Q).
 * @returns The KL divergence value in bits.
 */
export function klDivergence(dist1: Distribution, dist2: Distribution): number {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  let divergence = 0;

  for (const key of allKeys) {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;

    if (p1 > 0) {
      if (p2 === 0) {
        return Infinity; // p1 > 0 and p2 = 0 results in infinite divergence
      }
      divergence += p1 * Math.log2(p1 / p2);
    }
  }

  return divergence;
}

/**
 * Calculates the Jensen-Shannon Divergence between two distributions.
 * It is symmetric and bounded. JS(P || Q) = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
 * @param dist1 The first distribution (P).
 * @param dist2 The second distribution (Q).
 * @returns The Jensen-Shannon Divergence in bits.
 */
export function jensenShannonDivergence(dist1: Distribution, dist2: Distribution): number {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  const m: Distribution = {};

  // Calculate midpoint distribution M
  for (const key of allKeys) {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;
    m[key] = (p1 + p2) / 2;
  }

  const kl1 = klDivergence(dist1, m);
  const kl2 = klDivergence(dist2, m);
  
  // kl1 and kl2 will not be Infinity because if dist1[key] > 0, then m[key] must be > 0.
  const jsd = 0.5 * kl1 + 0.5 * kl2;
  return jsd;
}


/**
 * Calculates the square root of the Jensen-Shannon Divergence, which is a true metric.
 * It is symmetric and bounded.
 * @param dist1 The first distribution.
 * @param dist2 The second distribution.
 * @returns The Jensen-Shannon Distance.
 */
export function jensenShannonDistance(dist1: Distribution, dist2: Distribution): number {
  const jsd = jensenShannonDivergence(dist1, dist2);
  // The result is the square root of the JSD.
  return Math.sqrt(jsd);
}

/**
 * Calculates Shannon entropy of a distribution.
 * H(X) = -Σ p(x) * log2(p(x))
 * @param dist The probability distribution.
 * @returns The entropy in bits.
 */
export function entropy(dist: Distribution): number {
  let h = 0;
  for (const key of Object.keys(dist)) {
    const p = dist[key];
    if (p > 0) {
      h -= p * Math.log2(p);
    }
  }
  return h;
}

/**
 * Calculates Mutual Information between two variables.
 * I(X;Y) = H(X) + H(Y) - H(X,Y)
 * @param marginalX Marginal distribution of X.
 * @param marginalY Marginal distribution of Y.
 * @param jointDist Joint distribution of X and Y.
 * @returns The mutual information in bits.
 */
export function mutualInformation(
  marginalX: Distribution,
  marginalY: Distribution,
  jointDist: Distribution
): number {
  const hX = entropy(marginalX);
  const hY = entropy(marginalY);
  const hXY = entropy(jointDist);
  return hX + hY - hXY;
}

/**
 * Calculates Pearson Correlation Coefficient between two numerical variables.
 * Returns null if variables are not numerical or if there's insufficient variance.
 * @param data1 First variable data (numerical values).
 * @param data2 Second variable data (numerical values).
 * @returns The Pearson correlation coefficient [-1, 1], or null if cannot be computed.
 */
export function pearsonCorrelation(data1: number[], data2: number[]): number | null {
  if (data1.length !== data2.length || data1.length === 0) {
    return null;
  }

  const n = data1.length;
  const mean1 = data1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = data2.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = data1[i] - mean1;
    const diff2 = data2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sumSq1 * sumSq2);
  if (denominator === 0) {
    return null; // No variance in one or both variables
  }

  return numerator / denominator;
}

/**
 * Calculates the Euclidean distance matrix for a set of points.
 * @param data Array of numerical values.
 * @returns Distance matrix where entry [i][j] is |data[i] - data[j]|.
 */
function euclideanDistanceMatrix(data: number[]): number[][] {
  const n = data.length;
  const distMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      distMatrix[i][j] = Math.abs(data[i] - data[j]);
    }
  }

  return distMatrix;
}

/**
 * Double centers a matrix (subtract row means, column means, and add grand mean).
 * @param matrix The input matrix.
 * @returns The double-centered matrix.
 */
function doubleCenterMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  if (n === 0) return [];

  // Calculate row means
  const rowMeans = matrix.map(row => row.reduce((sum, val) => sum + val, 0) / n);

  // Calculate grand mean
  const grandMean = rowMeans.reduce((sum, val) => sum + val, 0) / n;

  // Double center
  const centered: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const colMean = matrix.reduce((sum, row) => sum + row[j], 0) / n;
      centered[i][j] = matrix[i][j] - rowMeans[i] - colMean + grandMean;
    }
  }

  return centered;
}

/**
 * Calculates the V-statistic for distance covariance.
 * @param centeredMatrix The double-centered distance matrix.
 * @returns The V-statistic.
 */
function vStatistic(centeredMatrix: number[][]): number {
  const n = centeredMatrix.length;
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sum += centeredMatrix[i][j] * centeredMatrix[i][j];
    }
  }

  return sum / (n * n);
}

/**
 * Calculates Distance Correlation between two numerical variables.
 * Distance correlation measures both linear and nonlinear association.
 * Returns a value in [0, 1], where 0 means independence and 1 means perfect dependence.
 * @param data1 First variable data (numerical values).
 * @param data2 Second variable data (numerical values).
 * @returns The distance correlation coefficient [0, 1], or null if cannot be computed.
 */
export function distanceCorrelation(data1: number[], data2: number[]): number | null {
  if (data1.length !== data2.length || data1.length < 2) {
    return null;
  }

  // Calculate distance matrices
  const distX = euclideanDistanceMatrix(data1);
  const distY = euclideanDistanceMatrix(data2);

  // Double center the matrices
  const centeredX = doubleCenterMatrix(distX);
  const centeredY = doubleCenterMatrix(distY);

  // Calculate V-statistics
  const vXX = vStatistic(centeredX);
  const vYY = vStatistic(centeredY);

  // Calculate distance covariance
  const n = data1.length;
  let vXY = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      vXY += centeredX[i][j] * centeredY[i][j];
    }
  }
  vXY = vXY / (n * n);

  // Calculate distance correlation
  if (vXX === 0 || vYY === 0) {
    return null;
  }

  const dCor = vXY / Math.sqrt(vXX * vYY);

  // Ensure result is in [0, 1] (numerical errors might push it slightly outside)
  return Math.max(0, Math.min(1, dCor));
}