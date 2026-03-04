
import { GoogleGenAI } from "@google/genai";
import { Venue } from "../types";

const openAiApiKey = process.env.OPENAI_API_KEY || '';
const openAiBaseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const azureEndpoint = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/$/, '');
const azureKey = process.env.AZURE_OPENAI_KEY || '';
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

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
        { role: 'system', content: 'You are a family activity research assistant. Keep results practical, concise, and parent-first.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function getVenueDeepDiveWithAzure(prompt: string): Promise<string> {
  if (!azureEndpoint || !azureKey) throw new Error('Azure OpenAI not configured');
  const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': azureKey },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a family activity research assistant. Keep results practical, concise, and parent-first.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1500
    }),
  });
  if (!res.ok) throw new Error(`Azure OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Fetches a deep dive into a specific venue.
 * Cascade: OpenAI → Azure OpenAI → Gemini
 */
export async function getVenueDeepDive(venue: Venue) {
  const prompt = `
    Provide a detailed, helpful summary for parents about the venue "${venue.name}" in "${venue.location}".
    Current Description: ${venue.description}
    Current Notes: ${venue.notes}
    
    Tasks:
    1. If the current description is short or missing, provide a descriptive overview.
    2. Add specific "Parent Tips" (e.g., pram accessibility, diaper changing facilities, safety).
    3. Mention best times to visit and any cost/entry details if found.
    4. Keep the tone encouraging, practical, and exciting for families.
  `;

  // Tier 1: OpenAI
  if (openAiApiKey) {
    try {
      const text = await getVenueDeepDiveWithOpenAI(prompt);
      return { text, sources: [] };
    } catch (openAiErr) {
      console.warn('[GoExplore] OpenAI failed, trying Azure OpenAI:', openAiErr);
    }
  }

  // Tier 2: Azure OpenAI
  if (azureEndpoint && azureKey) {
    try {
      const text = await getVenueDeepDiveWithAzure(prompt);
      return { text, sources: [] };
    } catch (azureErr) {
      console.warn('[GoExplore] Azure OpenAI failed, trying Gemini:', azureErr);
    }
  }

  // Tier 3: Gemini (with Google Search grounding)
  if (geminiClient) {
    try {
      const response = await geminiClient.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      return {
        text: response.text || '',
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (geminiErr: any) {
      const errStr = geminiErr.toString();
      if (errStr.includes('Requested entity was not found')) {
        window.dispatchEvent(new CustomEvent('gemini-reauth-required'));
      }
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted')) {
        window.dispatchEvent(new CustomEvent('gemini-quota-error', { detail: { type: 'text' } }));
      }
      console.error('[GoExplore] All AI providers failed:', geminiErr);
    }
  }

  throw new Error('No AI provider available. Set OPENAI_API_KEY, AZURE_OPENAI_KEY, or GEMINI_API_KEY.');
}
