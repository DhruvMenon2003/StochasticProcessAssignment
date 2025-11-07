import { CsvData, AnalysisMode } from '../types';

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

export function detectAnalysisMode(data: CsvData): AnalysisMode {
  if (data.headers.length === 0) {
    return 'joint'; // Default for empty/invalid data
  }
  
  const firstHeader = data.headers[0]?.toLowerCase().trim();
  const secondHeader = data.headers[1]?.toLowerCase().trim();

  // Rule 1: Ensemble
  if (data.headers.length >= 2 && firstHeader === 'time' && secondHeader?.startsWith('instance')) {
    return 'timeSeriesEnsemble';
  }
  
  // Rule 2: Single Time Series
  if (firstHeader === 'time') {
    return 'timeSeries';
  }

  // Rule 3: Cross-Sectional
  return 'joint';
}
