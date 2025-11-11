
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// FIX: Initialize the GoogleGenAI client. The API key must be read from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

function formatAnalysisForPrompt(analysis: AnalysisResult): string {
  if (analysis.isEnsemble) {
    let ensemblePrompt = `
        Analyze the following results for a **time-series ensemble dataset** and provide an expert summary.
        The summary should be concise, easy for a non-expert to understand, and highlight key findings. Focus on explaining the process's dynamics and memory.
        
        **Analysis Context:**
        - Type: Time-Series Ensemble
        - States: ${analysis.ensembleStates?.join(', ')}
        
        **Empirical Transition Matrix (Time-Averaged):**
        This matrix shows the probability of moving from a state in one time step to another in the next, averaged across all instances and time steps.
        - Rows are 'From' states, Columns are 'To' states.
        - Matrix: ${JSON.stringify({states: analysis.ensembleStates, matrix: analysis.empiricalTransitionMatrix}, null, 2)}
    `;

    if (analysis.modelResults && analysis.modelResults.length > 0) {
        ensemblePrompt += `
            **Theoretical Model Comparison:**
            The user provided theoretical transition matrix models. Here's how they compared to the empirical matrix based on the average Hellinger Distance per row:
            ${JSON.stringify(analysis.modelResults.map(m => ({ name: m.name, comparison: m.comparisonMetrics })), null, 2)}
        `;
    }

    if (analysis.selfDependenceAnalysis) {
        ensemblePrompt += `
            **Self-Dependence Order Analysis (Process Memory):**
            This analysis determines if the process's future depends only on the immediate past (Markovian, 1st-order) or on a longer history.
            - We compare joint probability distributions of different order models against the empirical (full past) distribution.
            - Hellinger Distance and Jensen-Shannon Distance measure the difference. Lower is better.
            
            - **Results Table:**
            ${analysis.selfDependenceAnalysis.orders.map(o => `  - Order ${o.order}: Hellinger Distance = ${o.hellingerDistance.toFixed(5)}, Jensen-Shannon Distance = ${o.jensenShannonDistance.toFixed(5)}`).join('\n')}
            
            - **Analysis Conclusion:** "${analysis.selfDependenceAnalysis.conclusion.replace(/<[^>]*>?/gm, '')}" 
        `;
    }

    ensemblePrompt += `
        **Your Task:**
        1.  **Interpret the Empirical Transition Matrix:** What are the most and least likely transitions? Are there any states that are particularly "sticky" (high probability of staying in the same state) or transient?
        2.  **Explain the Self-Dependence Results:** Based on the results table and the provided conclusion, elaborate on the process's memory. Is it Markovian? If not, what does that imply? Explain this in simple terms.
        3.  **Synthesize Everything:** Provide a clear, high-level summary of the stochastic process's behavior. What is its nature? Is it predictable? What are its key dynamic features?
    `;
    return ensemblePrompt.replace(/\s+/g, ' ').trim();
  }

  // Fallback for non-ensemble data (Cross-sectional or single time series)
  let standardPrompt = `
    Analyze the following stochastic process analysis results and provide an expert summary.
    The summary should be concise, easy to understand for a non-expert, and highlight the key findings.
    
    **Analysis Context:**
    - Type: ${analysis.markovResults ? 'Time-Series (Single Trace)' : 'Cross-Sectional Data'}
    - Variables: ${analysis.headers.join(', ')}
    
    **Empirical Data Summary:**
    This is the distribution of states observed in the dataset.
    - Marginal Distributions: ${JSON.stringify(analysis.empirical.marginals, null, 2)}
    - Moments (Mean/Variance): ${JSON.stringify(analysis.empirical.moments, null, 2)}
  `;

  if (analysis.modelResults && analysis.modelResults.length > 0) {
      standardPrompt += `
        **Model Comparison:**
        Theoretical models were compared against the empirical data's joint distribution.
        - Best Fitting Model: ${analysis.bestModelName || 'N/A'} based on Hellinger Distance and Jensen-Shannon Distance. Lower is better.
        - Metrics: ${JSON.stringify(analysis.modelResults.map(m => ({ name: m.name, metrics: m.comparisonMetrics })), null, 2)}
      `;
  }

  if (analysis.markovResults) {
      standardPrompt += `
        **Markov Chain Analysis (for each variable):**
        - Transition Matrices: Calculated based on the sequence of states in the data.
        ${JSON.stringify(analysis.markovResults, null, 2)}
      `;
  }

  standardPrompt += `
    **Your Task:**
    1.  **Describe the Empirical Data:** What are the most common states for each variable?
    2.  **Evaluate Model Fit:** If models were provided, how well did the best model capture the data's structure?
    3.  **Interpret Markov Analysis (if present):** Based on the transition matrices, what are the dynamics of the system? Are states likely to change or remain the same?
    4.  **Provide a High-Level Summary:** What are the key characteristics of this stochastic process based on all the available information?
  `;
  return standardPrompt.replace(/\s+/g, ' ').trim();
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
