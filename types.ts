export type AnalysisMode = 'cross-sectional' | 'time-series' | 'time-series-ensemble';

export interface CsvData {
  headers: string[];
  rows: (string | number)[][];
}

export interface VariableDef {
  name: string;
  states: string;
}

export interface ProbabilityModelItem {
    states: Record<string, string | number>;
    probability: number;
}
export type ProbabilityModel = ProbabilityModelItem[];


export interface ModelDef {
  id: string;
  name: string;
  variables: VariableDef[];
  probabilities: Record<string, number>;
  error: string | null;
  modelString: string;
}

export interface TransitionMatrixModelDef {
  id: string;
  name: string;
  variableName: string;
  states: (string|number)[];
  matrix: (number|null)[][];
  error: string | null;
}

export interface Distribution {
  [state: string]: number;
}

export interface Moments {
    mean: number;
    variance: number;
}

export interface EmpiricalData {
  marginals: { [variable: string]: Distribution };
  cmf: Distribution;
  moments?: { [variable: string]: Moments };
}

export interface ModelComparisonMetric {
    value: number;
    isWinner: boolean;
}

export interface ModelAnalysisResult {
    name: string;
    distributions?: EmpiricalData;
    comparisonMetrics?: { [metricName: string]: ModelComparisonMetric };
    wins?: number;
    matrix?: (number|null)[][];
}

export interface MarkovResult {
  [variable: string]: {
    states: (string | number)[];
    transitionMatrix: number[][];
    stationaryDistribution: Distribution;
  };
}

export interface StatisticalTestResult {
    pValue: number;
    details: string;
    isSignificant: boolean;
    evolution?: {
        timeSteps: (string|number)[];
        data: { [fromState: string]: (number|null)[] };
        states: (string|number)[];
    }
}

export interface AdvancedTestResult {
    markovOrderTest?: { [variable: string]: StatisticalTestResult };
    timeHomogeneityTest?: { [variable: string]: StatisticalTestResult };
}

export interface ConditionalDistributionTable {
    targetVariable: string;
    conditionedVariable: string;
    targetStates: (string | number)[];
    conditionedStates: (string | number)[];
    matrix: number[][];
}

export interface TimeBasedConditionalDistributionTable {
  title: string;
  targetTime: string;
  conditionedTimes: string[];
  targetStates: (string | number)[];
  conditionedStatesCombinations: (string | number)[][];
  matrix: number[][];
}


export interface SelfDependenceOrderResult {
    order: number;
    hellingerDistance: number;
    jensenShannonDistance: number;
}

export interface JointDistribution {
  [sequence: string]: number;
}

export interface SelfDependenceAnalysis {
    orders: SelfDependenceOrderResult[];
    conclusion: string;
    conditionalDistributionSets?: {
        order: number;
        distributions: TimeBasedConditionalDistributionTable[];
        jointDistribution?: JointDistribution;
    }[];
    timeSteps?: string[];
}


export interface AnalysisResult {
  headers: string[];
  isEnsemble: boolean;
  empirical: EmpiricalData;
  modelResults?: ModelAnalysisResult[];
  bestModelName?: string;
  markovResults?: MarkovResult;
  advancedTestResults?: AdvancedTestResult;
  conditionalDistributions?: ConditionalDistributionTable[];
  ensembleStates?: (string|number)[];
  empiricalTransitionMatrix?: (number|null)[][];
  selfDependenceAnalysis?: SelfDependenceAnalysis;
}

export interface AnalysisOptions {
  runMarkovOrderTest: boolean;
}
