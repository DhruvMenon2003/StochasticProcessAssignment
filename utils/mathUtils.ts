export const cartesianProduct = <T>(...arrays: T[][]): T[][] => {
  if (arrays.length === 0) {
    return [[]];
  }
  return arrays.reduce<T[][]>(
    (acc, array) => {
      const res: T[][] = [];
      acc.forEach(a => {
        array.forEach(b => {
          res.push(a.concat(b));
        });
      });
      return res;
    },
    [[]]
  );
};
