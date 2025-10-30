import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from './stochasticService';

// This is a placeholder for the actual API key, which should be
// handled via environment variables in a real application.
const API_KEY = process.env.API_KEY;

// A guard to ensure the API is only used when a key is provided.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function formatObjectForPrompt(obj: any): string {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'number' ? parseFloat(value.toFixed(4)) : value, 2);
}

export async function getAnalysisExplanation(results: AnalysisResult): Promise<string> {
  if (!ai) {
    console.warn("Gemini API key not found. Returning a default explanation.");
    return `Analysis Complete.
- Hellinger Distance: ${results.modelComparison?.hellingerDistance.toFixed(4) ?? 'N/A'}
- Mean Squared Error: ${results.modelComparison?.meanSquaredError.toFixed(4) ?? 'N/A'}

This is a placeholder summary. To get an AI-powered explanation, please configure your Gemini API key. The analysis metrics provide a quantitative measure of how well the provided model fits the empirical data from your dataset. Lower values for Hellinger Distance and MSE generally indicate a better fit.`;
  }

  // Select the first variable for Markov analysis explanation to keep prompt concise
  const firstVar = results.headers[0];
  const markovData = results.markov ? results.markov[firstVar] : null;

  const prompt = `
    You are an expert in stochastic processes and data analysis, acting as a teaching assistant for a university course.
    Your tone should be helpful, insightful, and clear.
    A student has performed an analysis on their dataset. Here are the results:

    - Empirical Joint Distribution: ${formatObjectForPrompt(results.empirical.joint)}
    ${results.model ? `- Model Joint Distribution: ${formatObjectForPrompt(results.model.joint)}` : ''}
    ${results.modelComparison ? `- Model Fit Metrics:
        - Hellinger Distance: ${results.modelComparison.hellingerDistance.toFixed(5)}
        - Mean Squared Error: ${results.modelComparison.meanSquaredError.toFixed(5)}
        - KL Divergence: ${results.modelComparison.kullbackLeiblerDivergence.toFixed(5)}` : ''}
    ${results.dependence ? `- Dependence Metrics:
        - Mutual Information: ${results.dependence.mutualInformation?.toFixed(5) ?? 'N/A (not applicable for >2 variables)'}` : ''}
    ${markovData ? `- First-Order Markov Analysis (for variable '${firstVar}'):
        - Transition Matrix: ${formatObjectForPrompt(markovData.transitionMatrix)}
        - Stationary Distribution: ${formatObjectForPrompt(markovData.stationaryDistribution)}` : ''}
    
    Based on these results, provide a concise summary and interpretation for the student in separate sections.
    1.  **Model Fit:** Start with a clear, top-level conclusion about the model's fit, if a model was provided. Explain what Hellinger Distance, MSE, and KL Divergence signify. A value closer to 0 is better. Mention if the fit is good, moderate, or poor.
    2.  **Variable Dependence:** If applicable, explain what the Mutual Information value means. A value of 0 implies independence; higher values indicate stronger dependence. Explain what this reveals about the dataset variables.
    3.  **Markov Properties:** Explain the Transition Matrix for the '${firstVar}' variable. Pick one or two interesting transition probabilities to highlight. Then, explain the Stationary Distribution, describing the long-term behavior of the process.
    4.  **Conclusion:** Conclude with a final summary and recommendation, such as whether the model is appropriate or if the student should consider refining it based on the analysis.
    Keep the entire response well-structured and easy to read.
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