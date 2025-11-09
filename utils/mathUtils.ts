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
 * Transposes a 2D array (matrix).
 * @param matrix The matrix to transpose.
 * @returns The transposed matrix.
 */
export function transpose<T>(matrix: T[][]): T[][] {
  if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
    return [];
  }
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
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