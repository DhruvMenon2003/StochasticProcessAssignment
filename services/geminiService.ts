import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from './stochasticService';

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function formatObjectForPrompt(obj: any): string {
  if (!obj) return 'N/A';
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'number' ? parseFloat(value.toFixed(4)) : value, 2);
}

function formatModelResultsForPrompt(results: AnalysisResult): string {
    if (!results.modelResults || results.modelResults.length === 0) {
        return "No models were provided for comparison.";
    }
    
    if (results.isSingleVariable) {
        const summary = results.modelResults.map(res => {
            const wins = res.wins ?? 0;
            const mseValue = res.comparisonMetrics?.meanSquaredError?.value;
            const mseString = (mseValue !== undefined && isFinite(mseValue)) ? mseValue.toFixed(4) : 'N/A';
            const hellingerValue = res.comparisonMetrics?.hellingerDistance?.value;
            const hellingerString = (hellingerValue !== undefined) ? hellingerValue.toFixed(4) : 'N/A';

            const metrics = `Hellinger: ${hellingerString}, MSE: ${mseString}`;
            return `- Model "${res.name}": Won ${wins} metric comparison${wins === 1 ? '' : 's'}. (${metrics})`;
        }).join('\n');
        return `Model Comparison Summary (Best model has most wins):\n${summary}\n- Best fitting model: ${results.bestModelName || 'N/A'}`;
    
    } else { // Multi-variable
        const summary = results.modelResults.map(res => {
            const mseValue = res.comparison.meanSquaredError;
            const mseString = isFinite(mseValue) ? mseValue.toFixed(4) : 'N/A';
            return `- Model "${res.name}": Composite Score=${res.comparison.score?.toFixed(4)} (Hellinger=${res.comparison.hellingerDistance.toFixed(4)}, MSE=${mseString})`
        }).join('\n');
        return `Model Comparison Summary (Lower score is better):\n${summary}\n- Best fitting model: ${results.bestModelName || 'N/A'}`;
    }
}

export async function getAnalysisExplanation(results: AnalysisResult): Promise<string> {
  if (!ai) {
    console.warn("Gemini API key not found. Returning a default explanation.");
    return `Analysis Complete. This is a placeholder summary. To get an AI-powered explanation, please configure your Gemini API key. The analysis metrics provide a quantitative measure of how well any provided models fit the empirical data.`;
  }

  const firstVar = results.headers[0];
  const markovData = results.markov ? results.markov[firstVar] : null;
  const empiricalMoment = results.empirical.moments?.[firstVar];

  const empiricalDetails = results.isSingleVariable
    ? `Mean=${empiricalMoment && !isNaN(empiricalMoment.mean) ? empiricalMoment.mean.toFixed(4) : 'N/A'}, Variance=${empiricalMoment && !isNaN(empiricalMoment.variance) ? empiricalMoment.variance.toFixed(4) : 'N/A'}`
    : `Joint Distribution (Sample): ${formatObjectForPrompt(Object.fromEntries(Object.entries(results.empirical.joint).slice(0, 5)))}`;

  const prompt = `
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
    1.  **Model Fit Evaluation:** If models were provided, start with a clear conclusion about which model fits best.
        - If it's a **multi-variable** analysis, explain that the best model is chosen based on the lowest **composite score**.
        - If it's a **single-variable** analysis, explain that the best model is the one that performs best on the highest number of individual metrics (most **wins**).
        - Justify the choice by explaining the metrics:
            - **Hellinger Distance & KL Divergence:** Explain these as measures of the difference between the model's probability distribution and the data's real distribution. Lower is better.
            - **Mean Squared Error (MSE):** Explain that this is calculated using the bias-variance decomposition (MSE = Bias² + Model Variance). This measures not just error but the model's own internal variance plus its systematic bias (how far its average prediction is from the data's average). For multi-variable cases, the reported MSE is the average of this value across all variables. Lower is better. If it is 'N/A', it's because the variable was not numeric.
    2.  **Variable Dependence:** If it's a multi-variable analysis, explain what the Mutual Information value means. A value near 0 implies independence; higher values indicate stronger dependence.
    3.  **Process Characteristics (Advanced Analysis):**
        - **Time Homogeneity:** Explain the test result. If a variable is 'non-homogeneous' (maxDistance > 0.1), it means its behavior changes over time. If 'homogeneous', its properties are stable.
        - **Self-Dependence:** Explain the Markov Order test. For a variable to be 'Markovian' (based on our 1st order test), its future state depends on its present state, not just random chance. Explain what this implies about the data's memory.
    4.  **Long-Term Behavior (Markov Analysis):** If the Markov analysis was performed, explain the Stationary Distribution for the '${firstVar}' variable, describing the long-term probabilities of the process being in each state.
    5.  **Conclusion:** Conclude with a final summary and recommendation.

    Keep the entire response well-structured, easy to read, and focused on interpreting the provided numbers.
    `;
    
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