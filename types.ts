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

export interface ModelDef {
  id: string;
  name: string;
  variables: VariableDef[];
  probabilities: Record<string, number>;
  error: string | null;
  modelString: string;
}

export interface AnalysisOptions {
  runMarkovOrderTest: boolean;
  runTimeHomogeneityTest: boolean;
}

// --- Analysis Result Types ---

export interface ConditionalDistributionTable {
  targetVariable: string;
  conditionedVariable: string;
  targetStates: (string | number)[];
  conditionedStates: (string | number)[];
  matrix: number[][];
}

export interface CalculatedDistributions {
  joint: Distribution;
  marginals: { [key: string]: Distribution };
  conditionals?: ConditionalDistributionTable[];
  moments?: { mean: number; variance: number }; // For single variable
  cmf?: Distribution; // For single variable
}

export interface ModelAnalysisResult {
    name: string;
    distributions: CalculatedDistributions;
    comparison: {
        hellingerDistance: number;
        meanSquaredError: number;
        kullbackLeiblerDivergence: number;
        score?: number; // Optional for multi-variable
    };
    // For single variable comparison
    comparisonMetrics?: {
        [metricName: string]: {
            value: number;
            isWinner: boolean;
        };
    };
    wins?: number;
}

export interface DependenceMetrics {
    mutualInformation: number | null;
    distanceCorrelation: number | null;
}

export interface ModelDependenceMetrics extends DependenceMetrics {
    modelName: string;
}

export interface DependenceAnalysisPair {
    variablePair: [string, string];
    empiricalMetrics: DependenceMetrics;
    modelMetrics: ModelDependenceMetrics[];
}