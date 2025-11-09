export interface CsvData {
  headers: string[];
  rows: (string | number)[][];
}

export interface VariableInfo {
  name: string;
  states: string;
  type: 'numerical' | 'nominal' | 'ordinal';
}

export interface Distribution {
  [state: string]: number;
}

export interface ProbabilityModelEntry {
  states: { [variable: string]: string | number };
  probability: number;
}

export type ProbabilityModel = ProbabilityModelEntry[];

export interface ModelDef {
  id: string;
  name: string;
  variables: VariableInfo[];
  probabilities: Record<string, number>;
  error: string | null;
  modelString: string;
}

// For Transition Matrix Models
export interface TransitionMatrixModelDef {
  id: string;
  name: string;
  variableName: string; // The variable this matrix applies to
  states: (string | number)[];
  matrix: (number | null)[][];
  error: string | null;
}

export type AnalysisMode = 'joint' | 'timeSeries' | 'timeSeriesEnsemble';

export interface Moments {
  mean: number;
  variance: number;
}

export interface DistributionAnalysis {
  marginals: { [variable: string]: Distribution };
  joint: Distribution;
  cmf: Distribution; // Cumulative Mass Function, for single variable case
  moments?: { [variable: string]: Moments };
}

export interface ComparisonMetric {
  value: number;
  isWinner?: boolean;
}

export interface ModelAnalysisResult {
  name: string;
  distributions?: DistributionAnalysis; // Optional for TM models
  comparisonMetrics?: { [metricName: string]: ComparisonMetric };
  wins?: number;
  matrix?: (number|null)[][]; // For showing theoretical TM
}

export interface OrderResult {
  order: number;
  hellingerDistance: number;
  jensenShannonDistance: number;
  marginals: { [time: string]: Distribution };
}

export interface TimeBasedConditionalDistributionTable {
  title: string;
  targetTime: string;
  conditionedTimes: string[];
  targetStates: (string | number)[];
  conditionedStatesCombinations: (string | number)[][];
  matrix: number[][];
}

export interface TimeBasedConditionalDistributionSet {
  order: number;
  distributions: TimeBasedConditionalDistributionTable[];
  jointDistribution?: Distribution;
}


export interface SelfDependenceAnalysis {
  orders: OrderResult[];
  conclusion: string;
  conditionalDistributionSets?: TimeBasedConditionalDistributionSet[];
  timeSteps?: string[];
}

export interface AnalysisResult {
  headers: string[];
  empirical: DistributionAnalysis;
  modelResults?: ModelAnalysisResult[];
  bestModelName?: string;
  dependenceAnalysis?: DependenceAnalysisPair[];
  conditionalDistributions?: ConditionalDistributionTable[];
  conditionalMoments?: ConditionalMomentsTable[];
  markovResults?: MarkovResult;
  advancedTests?: AdvancedTestResult;
  // Fields specific to time-series ensemble analysis
  isEnsemble?: boolean;
  ensembleStates?: (string | number)[];
  empiricalTransitionMatrix?: number[][];
  selfDependenceAnalysis?: SelfDependenceAnalysis;
}

export interface DependenceMetrics {
    mutualInformation: number | null;
    distanceCorrelation: number | null;
    pearsonCorrelation: number | null;
}

export interface DependenceAnalysisPair {
    variablePair: [string, string];
    empiricalMetrics: DependenceMetrics;
    modelMetrics: (DependenceMetrics & { modelName: string })[];
}

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

export interface MarkovResult {
  [variableName: string]: {
    states: (string | number)[];
    transitionMatrix: number[][];
    stationaryDistribution?: Distribution; // Made optional
  };
}

export interface AdvancedTestResult {
  markovOrderTest?: { [variable: string]: { isFirstOrder: boolean; pValue: number; details: string } };
  timeHomogeneityTest?: { [variable: string]: { isHomogeneous: boolean; pValue: number; details: string, evolution?: SelfDependenceData } };
}

export interface AnalysisOptions {
  runMarkovOrderTest: boolean;
}

export interface SelfDependenceData {
  timeSteps: (string|number)[];
  data: { [fromState: string]: (number|null)[] };
  states: (string|number)[];
}