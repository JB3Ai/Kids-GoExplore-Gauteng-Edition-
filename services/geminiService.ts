
import { GoogleGenAI } from "@google/genai";
import { Venue } from "../types";

const openAiApiKey = process.env.OPENAI_API_KEY || '';
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const geminiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

async function getVenueDeepDiveWithOpenAI(prompt: string): Promise<string> {
  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'You are a family activity research assistant. Keep results practical, concise, and parent-first.'
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Fetches a deep dive into a specific venue using Google Search grounding.
 * Strictly follows initialization guidelines for GoogleGenAI.
 */
export async function getVenueDeepDive(venue: Venue) {
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
    if (openAiApiKey) {
      const text = await getVenueDeepDiveWithOpenAI(prompt);
      return {
        text,
        sources: []
      };
    }

    if (!geminiClient) {
      throw new Error('No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
    }

    const response = await geminiClient.models.generateContent({
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
