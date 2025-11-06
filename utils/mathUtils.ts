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
