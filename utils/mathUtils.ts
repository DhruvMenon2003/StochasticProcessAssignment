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
 * Calculates the Hellinger Distance between two probability distributions.
 * @param dist1 The first distribution.
 * @param dist2 The second distribution.
 * @returns The Hellinger Distance (0 = identical, 1 = completely different).
 */
export function hellingerDistance(dist1: Distribution, dist2: Distribution): number {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  let sum = 0;

  for (const key of allKeys) {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;
    sum += Math.pow(Math.sqrt(p1) - Math.sqrt(p2), 2);
  }

  return (1 / Math.sqrt(2)) * Math.sqrt(sum);
}

/**
 * Calculates the Mean Squared Error between two distributions.
 * @param dist1 The first distribution.
 * @param dist2 The second distribution.
 * @returns The MSE value.
 */
export function meanSquaredError(dist1: Distribution, dist2: Distribution): number {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  let sumSquaredDiff = 0;

  for (const key of allKeys) {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;
    sumSquaredDiff += Math.pow(p1 - p2, 2);
  }

  return sumSquaredDiff / allKeys.length;
}

/**
 * Calculates the Mutual Information between two discrete random variables.
 * I(X;Y) = H(X) + H(Y) - H(X,Y)
 * @param jointDist Joint distribution P(X,Y) as a Distribution object with keys "x|y".
 * @param marginalX Marginal distribution P(X).
 * @param marginalY Marginal distribution P(Y).
 * @returns The mutual information in bits.
 */
export function mutualInformation(
  jointDist: Distribution,
  marginalX: Distribution,
  marginalY: Distribution
): number {
  let mi = 0;

  for (const jointKey in jointDist) {
    const pXY = jointDist[jointKey];
    if (pXY === 0) continue;

    const [x, y] = jointKey.split('|');
    const pX = marginalX[x] || 0;
    const pY = marginalY[y] || 0;

    if (pX > 0 && pY > 0) {
      mi += pXY * Math.log2(pXY / (pX * pY));
    }
  }

  return mi;
}

/**
 * Calculates the Pearson Correlation Coefficient between two numerical variables.
 * @param data Array of [x, y] pairs.
 * @returns The Pearson correlation coefficient (-1 to 1), or null if not applicable.
 */
export function pearsonCorrelation(data: [number, number][]): number | null {
  if (data.length < 2) return null;

  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Calculates the Distance Correlation between two variables.
 * This is a measure of dependence that can detect nonlinear relationships.
 * @param data Array of [x, y] pairs (can be numerical or categorical coded as numbers).
 * @returns The distance correlation (0 to 1), or null if not computable.
 */
export function distanceCorrelation(data: [number, number][]): number | null {
  if (data.length < 2) return null;

  const n = data.length;

  // Calculate distance matrices
  const distX: number[][] = [];
  const distY: number[][] = [];

  for (let i = 0; i < n; i++) {
    distX[i] = [];
    distY[i] = [];
    for (let j = 0; j < n; j++) {
      distX[i][j] = Math.abs(data[i][0] - data[j][0]);
      distY[i][j] = Math.abs(data[i][1] - data[j][1]);
    }
  }

  // Double-center the distance matrices
  const centerMatrix = (dist: number[][]): number[][] => {
    const rowMeans = dist.map(row => row.reduce((sum, val) => sum + val, 0) / n);
    const colMeans: number[] = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        colMeans[j] += dist[i][j];
      }
      colMeans[j] /= n;
    }
    const grandMean = rowMeans.reduce((sum, val) => sum + val, 0) / n;

    const centered: number[][] = [];
    for (let i = 0; i < n; i++) {
      centered[i] = [];
      for (let j = 0; j < n; j++) {
        centered[i][j] = dist[i][j] - rowMeans[i] - colMeans[j] + grandMean;
      }
    }
    return centered;
  };

  const A = centerMatrix(distX);
  const B = centerMatrix(distY);

  // Calculate dCov^2(X,Y)
  let dCovXY = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      dCovXY += A[i][j] * B[i][j];
    }
  }
  dCovXY /= (n * n);

  // Calculate dVar^2(X) and dVar^2(Y)
  let dVarX = 0;
  let dVarY = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      dVarX += A[i][j] * A[i][j];
      dVarY += B[i][j] * B[i][j];
    }
  }
  dVarX /= (n * n);
  dVarY /= (n * n);

  // Distance correlation
  if (dVarX === 0 || dVarY === 0) return null;
  const dCor = Math.sqrt(dCovXY) / Math.sqrt(Math.sqrt(dVarX) * Math.sqrt(dVarY));

  return Math.max(0, Math.min(1, dCor)); // Clamp to [0, 1]
}