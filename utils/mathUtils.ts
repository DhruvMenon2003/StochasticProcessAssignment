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
 * @returns The KL divergence value.
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
      divergence += p1 * Math.log(p1 / p2);
    }
  }

  return divergence;
}