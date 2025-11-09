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
        // If we find a non-numeric value that is not an empty string, it's categorical
        if (typeof value === 'string' && isNaN(Number(value))) {
            infos[index].type = 'categorical';
        }
      }
    });
  });

  return infos.map(info => ({
    ...info,
    states: Array.from(uniqueStates[info.name]).sort().join(', '),
    type: info.type as 'numerical' | 'categorical',
  }));
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