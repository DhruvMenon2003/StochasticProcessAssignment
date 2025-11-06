import { GoogleGenAI } from "@google/genai";
// FIX: TimeSeriesEnsembleAnalysis is not exported from stochasticService. Import it and StandardAnalysisResult from types.
import { AnalysisResult } from './stochasticService';
import { StandardAnalysisResult, TimeSeriesEnsembleAnalysis } from '../types';

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function formatObjectForPrompt(obj: any): string {
  if (!obj) return 'N/A';
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'number' ? parseFloat(value.toFixed(4)) : value, 2);
}

function formatModelResultsForPrompt(results: AnalysisResult): string {
    // FIX: Type-guard for TimeSeriesEnsembleAnalysis before accessing properties of StandardAnalysisResult to prevent type errors.
    if (results.isTimeSeriesEnsemble) {
        return "No models were provided for comparison.";
    }
    if (!results.modelResults || results.modelResults.length === 0) {
        return "No models were provided for comparison.";
    }
    
    const summary = results.modelResults.map(res => {
        const wins = res.wins ?? 0;
        const hellingerValue = res.comparisonMetrics['Hellinger Distance']?.value;
        const hellingerString = (hellingerValue !== undefined) ? hellingerValue.toFixed(4) : 'N/A';
        
        const mseMetricKey = Object.keys(res.comparisonMetrics).find(k => k.startsWith('MSE'));
        const mseValue = mseMetricKey ? res.comparisonMetrics[mseMetricKey].value : undefined;
        const mseString = (mseValue !== undefined && isFinite(mseValue)) ? mseValue.toFixed(4) : 'N/A';

        const metrics = `e.g., Hellinger: ${hellingerString}, an MSE: ${mseString}`;
        return `- Model "${res.name}": Won ${wins} metric comparison${wins === 1 ? '' : 's'}. (${metrics})`;
    }).join('\n');
    return `Model Comparison Summary (Best model has most wins):\n${summary}\n- Best fitting model: ${results.bestModelName || 'N/A'}`;
}

function generateTimeSeriesPrompt(results: TimeSeriesEnsembleAnalysis): string {
    const firstState = results.states[0];
    const firstTimeStep = results.timeSteps[0];
    const firstUnconditionalProb = results.plotData[String(firstState)]?.unconditional[0];

    const prompt = `
    You are an expert in stochastic processes and data analysis, acting as a teaching assistant for a university course.
    Your tone should be helpful, insightful, and clear.
    A student has performed a specialized time-series ensemble analysis on their dataset. Here are the results:

    - Analysis Type: Time-Series Ensemble Analysis on multiple instances of a process.
    - Process States: ${results.states.join(', ')}
    - Example Data Point: The unconditional probability of being in state '${firstState}' at time '${firstTimeStep}' is approx ${firstUnconditionalProb?.toFixed(4)}.
    - Time Homogeneity Test Results (on Instance1): ${formatObjectForPrompt(results.timeHomogeneityTest)}
    - Self-Dependence (Markov Order) Test Results (on Instance1): ${formatObjectForPrompt(results.markovOrderTest)}
    
    The primary output is a set of charts, one for each state, showing how different probability estimates evolve over time. The key is to compare the lines on these charts.
    Based on the analysis concept, provide a concise summary and interpretation for the student. Structure your response with the following sections:
    1.  **Self-Dependence Analysis (The Charts):** Explain the purpose of the charts. They are designed to visually test for the Markov property and understand the "memory" of the process. Explain each line:
        - **P(Xt) (Unconditional):** The baseline probability of being in a state at a given time, ignoring all history.
        - **P(Xt|Xt-1) (First-Order Conditional):** The probability estimated using only the immediately preceding state.
        - **P(Xt|Xt-1, Xt-2) (Second-Order Conditional):** Probability estimated using the two preceding states.
        - **P(Xt|X1...Xt-1) (Full Past Conditional):** The "true" conditional probability estimated using the entire history up to that point. This line represents the most accurate prediction based on the available data.
    2.  **How to Interpret the Charts:** This is the most important part.
        - If all lines are very close together, it suggests the process is **memoryless** (or independent), as knowing the history doesn't change the probability estimate.
        - If the **P(Xt|Xt-1)** line is very close to the **Full Past** line, it's strong evidence that the process is **First-Order Markov**. This means only the most recent state matters for predicting the future.
        - If the **P(Xt|Xt-2, Xt-1)** line is close to the **Full Past** line, but the first-order line is not, it suggests a **Second-Order Markov** process.
        - Divergence between the lines indicates the importance of history. The more the simpler conditional lines (like P(Xt|Xt-1)) deviate from the Full Past line, the more complex the process's memory is.
    3.  **Process Characteristics (Advanced Analysis):**
        - **Time Homogeneity:** Explain the test result for Instance1. If 'non-homogeneous', it means the process's transition rules may be changing over time. If 'homogeneous', its properties are stable.
        - **Self-Dependence:** Explain the Markov Order test for Instance1. If 'Has Memory' (Markovian), it confirms that its future state depends on its present state, supporting the visual findings from the chart.
    4.  **Conclusion:** Conclude with a final summary and tell the student to examine the charts for each state to see if the Markovian properties are consistent across the entire state space.

    Keep the entire response well-structured and focused on teaching the student how to interpret their specific results.
    `;
    return prompt;
}

// FIX: Change parameter type to StandardAnalysisResult to allow access to its properties without type errors.
function generateStandardPrompt(results: StandardAnalysisResult): string {
    const firstVar = results.headers[0];
    const markovData = results.markov ? results.markov[firstVar] : null;
    const empiricalMoment = results.empirical.moments?.[firstVar];

    const empiricalDetails = results.isSingleVariable
        ? `Mean=${empiricalMoment && !isNaN(empiricalMoment.mean) ? empiricalMoment.mean.toFixed(4) : 'N/A'}, Variance=${empiricalMoment && !isNaN(empiricalMoment.variance) ? empiricalMoment.variance.toFixed(4) : 'N/A'}`
        : `Joint Distribution (Sample): ${formatObjectForPrompt(Object.fromEntries(Object.entries(results.empirical.joint).slice(0, 5)))}`;

    return `
        You are an expert in stochastic processes and data analysis, acting as a teaching assistant for a university course.
        Your tone should be helpful, insightful, and clear.
        A student has performed an analysis on their dataset. Here are the results:

        - Analysis Type: ${results.isSingleVariable ? 'Single-Variable' : 'Multi-Variable'} Analysis
        - Empirical Data Details: ${empiricalDetails}
        - Model Fit & Comparison: ${formatModelResultsForPrompt(results)}
        - Dependence (Mutual Information): ${results.dependence?.mutualInformation?.toFixed(5) ?? 'N/A'}
        - First-Order Markov Analysis (for '${firstVar}', if performed):
            - Stationary Distribution: ${formatObjectForPrompt(markovData?.stationaryDistribution)}
        - Time Homogeneity Test Results: ${formatObjectForPrompt(results.timeHomogeneityTest)}
        - Self-Dependence (Markov Order) Test Results: ${formatObjectForPrompt(results.markovOrderTest)}
        
        Based on these results, provide a concise summary and interpretation for the student. Structure your response with the following sections:
        1.  **Model Fit Evaluation:** If models were provided, start with a clear conclusion about which model fits best. Explain that the best model is the one that performs best on the highest number of individual metrics (most **wins**). A "win" is awarded to the model with the best value (lowest error) for each metric. The metrics include Hellinger Distance, KL Divergence, and a Mean Squared Error (MSE) for each numeric variable.
            - Justify the choice by explaining the metrics:
                - **Hellinger Distance & KL Divergence:** Explain these as measures of the difference between the model's probability distribution and the data's real distribution. Lower is better.
                - **Mean Squared Error (MSE):** Explain that this is calculated for each numeric variable using the bias-variance decomposition (MSE = Bias² + Model Variance). This measures not just error but the model's own internal variance plus its systematic bias (how far its average prediction is from the data's average). Lower is better. If it is 'N/A' for a variable, it's because that variable was not numeric.
        2.  **Variable Dependence:** If it's a multi-variable analysis, explain what the Mutual Information value means. A value near 0 implies independence; higher values indicate stronger dependence.
        3.  **Process Characteristics (Advanced Analysis):**
            - **Time Homogeneity:** Explain the test result. If a variable is 'non-homogeneous' (maxDistance > 0.1), it means its behavior changes over time. If 'homogeneous', its properties are stable.
            - **Self-Dependence:** Explain the Markov Order test. For a variable to be 'Markovian' (based on our 1st order test), its future state depends on its present state, not just random chance. Explain what this implies about the data's memory.
        4.  **Long-Term Behavior (Markov Analysis):** If the Markov analysis was performed, explain the Stationary Distribution for the '${firstVar}' variable, describing the long-term probabilities of the process being in each state.
        5.  **Conclusion:** Conclude with a final summary and recommendation.

        Keep the entire response well-structured, easy to read, and focused on interpreting the provided numbers.
        `;
}


export async function getAnalysisExplanation(results: AnalysisResult): Promise<string> {
  if (!ai) {
    console.warn("Gemini API key not found. Returning a default explanation.");
    return `Analysis Complete. This is a placeholder summary. To get an AI-powered explanation, please configure your Gemini API key. The analysis metrics provide a quantitative measure of how well any provided models fit the empirical data.`;
  }

  const prompt = results.isTimeSeriesEnsemble
    ? generateTimeSeriesPrompt(results)
    : generateStandardPrompt(results);
    
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Could not generate an AI-powered explanation due to an API error. Please check the console for details.";
  }
}
