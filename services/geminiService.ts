import { GoogleGenAI } from "@google/genai";
// FIX: To resolve issues with discriminated union type narrowing, all related types are now imported directly from the `types` file.
import { AnalysisResult, StandardAnalysisResult, TimeSeriesEnsembleAnalysis } from '../types';

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function formatObjectForPrompt(obj: any): string {
  if (!obj) return 'N/A';
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'number' ? parseFloat(value.toFixed(4)) : value, 2);
}

function formatModelResultsForPrompt(results: AnalysisResult): string {
    // FIX: Restructure with an explicit if/else block to help TypeScript correctly narrow the discriminated union type.
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
    const secondState = results.states[1] || results.states[0];
    const firstTimeStepIndex = results.transitionProbabilitiesOverTime[firstState]?.[secondState]?.findIndex(p => p !== null) ?? -1;
    const firstTimeStep = firstTimeStepIndex !== -1 ? results.timeSteps[firstTimeStepIndex] : 'N/A';
    const exampleProb = firstTimeStepIndex !== -1 ? results.transitionProbabilitiesOverTime[firstState][secondState][firstTimeStepIndex] : null;

    const prompt = `
    You are an expert in stochastic processes and data analysis, acting as a teaching assistant for a university course.
    Your tone should be helpful, insightful, and clear.
    A student has performed a time-series ensemble analysis. Here are the results:

    - Analysis Type: Time-Series Ensemble Analysis, focusing on the evolution of transition probabilities.
    - Process States: ${results.states.join(', ')}
    - Example Data Point: At time '${firstTimeStep}', the probability of transitioning to state '${firstState}' from state '${secondState}' was ${exampleProb?.toFixed(4)}.
    - Time Homogeneity Test Results (on Instance1): ${formatObjectForPrompt(results.timeHomogeneityTest)}
    - Self-Dependence (Markov Order) Test Results (on Instance1): ${formatObjectForPrompt(results.markovOrderTest)}
    
    The main output is a set of charts, one for each state, showing how the probability of transitioning TO that state evolves over time.
    Based on these results, provide a concise summary and interpretation for the student. Structure your response with the following sections:
    1.  **Transition Probability Evolution (The Charts):** Explain the purpose of the charts. Each chart focuses on a single "destination" state and shows the probability of arriving there.
        - Explain what each line represents: Each colored line shows the probability of transitioning TO the destination state FROM a specific "source" state in the previous time step. For example, in the chart for "State A", the blue line might show P(Xt = A | Xt-1 = A), the green line P(Xt = A | Xt-1 = B), and so on.
    2.  **How to Interpret the Charts:** This is the most important part.
        - **Dependence on Previous State:** If the lines for different "from" states are far apart, it means the previous state has a strong influence on the next state. If the lines are all clustered together, the process is less dependent on its immediate past.
        - **Time Homogeneity:** If the lines are relatively flat, it means the transition probabilities are stable over time (time-homogeneous). If the lines show clear trends (upward, downward) or are very volatile, it suggests the process's underlying rules are changing over time (non-homogeneous). This visual finding can be confirmed with the formal "Time Homogeneity Test".
        - **State Attractors/Repellers:** A consistently high line for P(Xt = A | Xt-1 = A) suggests that state A is "sticky" or an attractor. A consistently low line for P(Xt = A | Xt-1 = B) suggests that state B tends to transition away from A.
    3.  **Process Characteristics (Advanced Analysis):**
        - **Time Homogeneity Test:** Briefly explain the formal test result and how it confirms or contradicts the visual evidence from the charts. If 'non-homogeneous', the transition rules are changing.
        - **Self-Dependence Test:** Explain what the "Has Memory" (Markovian) result means. It confirms that the process's states are not just random, but that the past state influences the future state, which is the very thing being visualized in the charts.
    4.  **Conclusion:** Conclude with a final summary. Tell the student to look for patterns across all charts to understand the overall dynamics of the system. For example, is one state an attractor for all other states? Does the whole system's behavior change after a certain point in time?

    Keep the entire response well-structured and focused on teaching the student how to interpret their specific results.
    `;
    return prompt;
}

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

  // FIX: Use an if/else block instead of a ternary operator to ensure proper type narrowing of the 'AnalysisResult' discriminated union.
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