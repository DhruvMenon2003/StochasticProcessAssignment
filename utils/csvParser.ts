import { CsvData } from '../types';

export function parseCsvData(csvString: string): CsvData {
  const lines = csvString.trim().split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    return line.split(',').map(cell => {
      const trimmedCell = cell.trim();
      // Attempt to convert to number, otherwise keep as string
      return isNaN(Number(trimmedCell)) || trimmedCell === '' ? trimmedCell : Number(trimmedCell);
    });
  });

  return { headers, rows };
}
