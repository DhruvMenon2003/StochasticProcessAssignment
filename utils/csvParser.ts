import { CsvData, AnalysisMode, VariableInfo } from '../types';

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

export function analyzeCsvStructure(data: CsvData): VariableInfo[] {
  if (data.headers.length === 0) return [];
  
  const infos: Omit<VariableInfo, 'states'>[] = data.headers.map(h => ({
      name: h,
      type: 'numerical', // Assume numerical first
  }));

  const uniqueStates: { [key: string]: Set<string | number> } = {};
  data.headers.forEach(h => {
    uniqueStates[h] = new Set();
  });
  
  const headerIndexMap = new Map(data.headers.map((h, i) => [h, i]));

  data.rows.forEach(row => {
    data.headers.forEach((h, index) => {
      const value = row[index];
      if (value !== undefined && value !== '') {
        uniqueStates[h].add(value);
        // If we find a non-numeric value that is not an empty string, it's categorical (nominal)
        if (typeof value === 'string' && isNaN(Number(value))) {
            infos[index].type = 'nominal';
        }
      }
    });
  });

  return infos.map(info => ({
    ...info,
    states: Array.from(uniqueStates[info.name]).sort().join(', '),
  }));
}


export function detectAnalysisMode(data: CsvData): AnalysisMode {
  if (data.headers.length < 1 || data.rows.length < 1) {
    return 'joint'; // Default for empty/invalid data
  }
  
  const headers = data.headers.map(h => h.toLowerCase().trim());
  const firstHeader = headers[0];

  // Stricter check for Ensemble data format.
  // The first column header must be 'time', and ALL subsequent headers must start with 'instance'.
  // This prevents misclassification of regular time-series data and avoids downstream errors.
  const isEnsemble = headers.length >= 2 && 
                     firstHeader === 'time' && 
                     headers.slice(1).every(h => h.startsWith('instance'));

  if (isEnsemble) {
    return 'timeSeriesEnsemble';
  }
  
  // A single 'time' column indicates a standard time series.
  // This check MUST come after the more specific ensemble check.
  if (firstHeader === 'time') {
    return 'timeSeries';
  }

  // Default to cross-sectional analysis for all other data structures.
  return 'joint';
}