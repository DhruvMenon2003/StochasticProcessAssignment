
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// FIX: Initialize the GoogleGenAI client. The API key must be read from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

function formatAnalysisForPrompt(analysis: AnalysisResult): string {
  // Simplified string representation for the prompt.
  // In a real scenario, this would be more detailed.
  let prompt = `
    Analyze the following stochastic process analysis results and provide an expert summary.
    The summary should be concise, easy to understand for a non-expert, and highlight the key findings.
    
    Variables: ${analysis.headers.join(', ')}
    
    Empirical Data Summary:
    - Marginal Distributions: ${JSON.stringify(analysis.empirical.marginals, null, 2)}
    - Moments (Mean/Variance): ${JSON.stringify(analysis.empirical.moments, null, 2)}
  `;

  if (analysis.modelResults && analysis.modelResults.length > 0) {
    prompt += `
      Model Comparison:
      - Models Analyzed: ${analysis.modelResults.map(m => m.name).join(', ')}
      - Best Fitting Model: ${analysis.bestModelName || 'N/A'}
      - Key Metrics: ${JSON.stringify(analysis.modelResults.map(m => ({ name: m.name, metrics: m.comparisonMetrics, wins: m.wins })), null, 2)}
    `;
  }

  if (analysis.dependenceAnalysis && analysis.dependenceAnalysis.length > 0) {
    prompt += `
      Dependence Analysis:
      - Higher values mean stronger dependence.
      ${JSON.stringify(analysis.dependenceAnalysis, null, 2)}
    `;
  }
  
  if (analysis.markovResults) {
    prompt += `
      Markov Chain Analysis:
      - Stationary Distributions: Found long-run probabilities for being in each state.
    `;
  }

  if (analysis.advancedTests) {
    prompt += `
      Advanced Tests:
      - Markov Order Test: ${JSON.stringify(analysis.advancedTests.markovOrderTest, null, 2)}
      - Time Homogeneity Test: ${JSON.stringify(analysis.advancedTests.timeHomogeneityTest, null, 2)}
    `;
  }

  prompt += `
    Based on this, what are the key characteristics of the stochastic process?
    Is there a model that fits well? What does the dependence and Markov analysis tell us?
  `;

  return prompt.replace(/\s+/g, ' ').trim();
}


export async function getAnalysisExplanation(analysis: AnalysisResult | null): Promise<string> {
  if (!analysis) {
    return "No analysis results available to generate an explanation.";
  }

  try {
    const prompt = formatAnalysisForPrompt(analysis);
    
    // FIX: Use the 'gemini-2.5-flash' model for basic text tasks.
    // FIX: Use ai.models.generateContent to generate content.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // FIX: Extract text directly from the response object.
    return response.text;
  } catch (error) {
    console.error("Error fetching explanation from Gemini API:", error);
    return "Could not generate an explanation due to an API error. Please check the console for details.";
  }
}
