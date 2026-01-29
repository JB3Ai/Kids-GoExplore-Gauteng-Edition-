
import { GoogleGenAI } from "@google/genai";
import { Venue } from "../types";

/**
 * Fetches a deep dive into a specific venue using Google Search grounding.
 * Strictly follows initialization guidelines for GoogleGenAI.
 */
export async function getVenueDeepDive(venue: Venue) {
  // Use Gemini 3 Pro for high-quality complex reasoning tasks
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Provide a detailed, helpful summary for parents about the venue "${venue.name}" in "${venue.location}".
    Current Description: ${venue.description}
    Current Notes: ${venue.notes}
    
    Tasks:
    1. If the current description is short or missing, provide a descriptive overview based on search results.
    2. Add specific "Parent Tips" (e.g., pram accessibility, diaper changing facilities, safety).
    3. Mention best times to visit and any cost/entry details if found.
    4. Keep the tone encouraging, practical, and exciting for families.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || '',
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error: any) {
    const errStr = error.toString();
    if (errStr.includes("Requested entity was not found")) {
      window.dispatchEvent(new CustomEvent('gemini-reauth-required'));
    }
    if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted')) {
      window.dispatchEvent(new CustomEvent('gemini-quota-error', { detail: { type: 'text' } }));
    }
    throw error;
  }
}
