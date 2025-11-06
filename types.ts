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

// FIX: Add and export AnalysisOptions type for AnalysisOptions.tsx component.
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

export interface ConditionalMomentsTable {
  targetVariable: string;
  conditionedVariable: string;
  conditionedStates: (string | number)[];
  expectations: number[];
  variances: number[];
}

export interface CalculatedDistributions {
  joint: Distribution;
  marginals: { [key: string]: Distribution };
  conditionals?: ConditionalDistributionTable[];
  conditionalMoments?: ConditionalMomentsTable[];
  moments?: { [key: string]: { mean: number; variance: number } };
  cmf?: Distribution; // For single variable
}

export interface ModelAnalysisResult {
    name: string;
    distributions: CalculatedDistributions;
    comparison: {
        hellingerDistance: number;
        meanSquaredErrors: { [key: string]: number }; // Key is variable name
        kullbackLeiblerDivergence: number;
    };
    comparisonMetrics: {
        [metricName: string]: { // e.g., 'Hellinger Distance', 'KL Divergence', 'MSE (VarX)'
            value: number;
            isWinner: boolean;
        };
    };
    wins: number;
}


export interface DependenceMetrics {
    mutualInformation: number | null;
    distanceCorrelation: number | null;
    pearsonCorrelation: number | null;
}

export interface ModelDependenceMetrics extends DependenceMetrics {
    modelName: string;
}

export interface DependenceAnalysisPair {
    variablePair: [string, string];
    empiricalMetrics: DependenceMetrics;
    modelMetrics: ModelDependenceMetrics[];
}

// --- New Types for Time-Series Ensemble Analysis ---

export interface TransitionProbabilitiesOverTime {
    [targetState: string]: {
        [fromState: string]: (number | null)[];
    };
}

export interface TimeHomogeneityResult {
    [header: string]: {
        isHomogeneous: boolean;
        maxDistance: number;
    }
}

export interface MarkovOrderResult {
    [header: string]: {
        order: number;
        meanDistance: number;
        isMarkovian: boolean;
    }[];
}

export interface TimeSeriesEnsembleAnalysis {
  isTimeSeriesEnsemble: true;
  headers: string[]; // ['Time', 'Instances']
  timeSteps: (string|number)[];
  states: (string|number)[];
  transitionProbabilitiesOverTime: TransitionProbabilitiesOverTime;
  timeHomogeneityTest: TimeHomogeneityResult;
  markovOrderTest: MarkovOrderResult;
}

export interface StandardAnalysisResult {
  isTimeSeriesEnsemble?: false;
  headers: string[];
  isSingleVariable: boolean;
  empirical: CalculatedDistributions;
  modelResults?: ModelAnalysisResult[];
  bestModelName?: string;
  dependence?: {
    mutualInformation: number | null;
  };
  markov?: any; // Using `any` to avoid circular dependency with stochasticService types
  dependenceAnalysis?: DependenceAnalysisPair[];
  // FIX: Add optional properties to align with usage in components and services.
  timeHomogeneityTest?: TimeHomogeneityResult;
  markovOrderTest?: MarkovOrderResult;
}

export type AnalysisResult = StandardAnalysisResult | TimeSeriesEnsembleAnalysis;