export interface CsvData {
  headers: string[];
  rows: (string | number)[][];
}

export type State = string | number;

// Represents a single outcome (row) in a PMF
export interface PmfEntry {
  states: Record<string, State>;
  probability: number;
}

// Represents a full Probability Mass Function
export type ProbabilityModel = PmfEntry[];

export interface Distribution {
  [key: string]: number;
}

export interface VariableDef {
  name: string;
  states: string; // Comma-separated string of states
}
