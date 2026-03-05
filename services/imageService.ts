import { GoogleGenAI } from "@google/genai";

// --- IndexedDB Configuration for Persistent Caching ---
const DB_NAME = 'VenueScoutDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// --- Fallback Image Logic (High Quality Unsplash) ---
const FALLBACKS: Record<string, string> = {
  'Water': 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=800', 
  'Nature': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800',
  'Dining': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  'Art': 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&q=80&w=800',
  'Adventure': 'https://images.unsplash.com/photo-1502086223501-681a6a5002e3?auto=format&fit=crop&q=80&w=800',
  'Edu-tainment': 'https://images.unsplash.com/photo-1568290747483-c5b1b427845f?auto=format&fit=crop&q=80&w=800',
  'Indoor': 'https://images.unsplash.com/photo-1596464716127-f9a826d2180c?auto=format&fit=crop&q=80&w=800',
  'default': 'https://images.unsplash.com/photo-1566432295019-1f12fb3f22b0?auto=format&fit=crop&q=80&w=800'
};

function getFallbackImage(tags: string[]): string {
  for (const tag of tags) {
    if (FALLBACKS[tag]) return FALLBACKS[tag];
  }
  return FALLBACKS['default'];
}

// --- IndexedDB Helpers ---
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const getFromDB = async (key: string): Promise<string | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) { return undefined; }
};

const saveToDB = async (key: string, value: string) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    
    // Also sync to server
    await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: key, url: value })
    });
  } catch (error) {}
};

// --- Memory Cache for Server Images ---
let serverImageCache: Record<string, string> | null = null;
let lastServerFetch = 0;
let serverFetchPromise: Promise<Record<string, string> | null> | null = null;

const getFromServer = async (key: string): Promise<string | undefined> => {
  try {
    // Refresh cache every 5 minutes
    if (!serverImageCache || Date.now() - lastServerFetch > 5 * 60 * 1000) {
      if (!serverFetchPromise) {
        serverFetchPromise = (async () => {
          try {
            const res = await fetch('/api/images');
            if (res.ok) {
              const data = await res.json();
              serverImageCache = data;
              lastServerFetch = Date.now();
              return data;
            }
          } catch (e) {
            console.error("Server image fetch failed", e);
          } finally {
            serverFetchPromise = null;
          }
          return serverImageCache;
        })();
      }
      await serverFetchPromise;
    }
    return serverImageCache?.[key];
  } catch (e) {}
  return undefined;
};

// --- Request Queuing & Backoff ---
let isProcessingQueue = false;
const requestQueue: (() => Promise<void>)[] = [];
let currentMinDelay = 3000; // Start with 3 seconds between requests
const MAX_DELAY = 10000; // Max 10 seconds between requests if hitting limits

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      await task();
      // Add some jitter to the delay
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, currentMinDelay + jitter));
    }
  }
  
  isProcessingQueue = false;
};

const queueRequest = <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      // If successful, slowly decrease delay back to baseline
      if (currentMinDelay > 3000) {
        currentMinDelay = Math.max(3000, currentMinDelay - 500);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      const errStr = error.toString();
      
      // If it's a 429, wait longer and increase global delay
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        currentMinDelay = Math.min(MAX_DELAY, currentMinDelay + 2000);
        const waitTime = Math.pow(2, i) * 10000; // 10s, 20s, 40s
        console.warn(`Quota exceeded, increasing delay to ${currentMinDelay}ms and retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw error; // Other errors fail immediately
    }
  }
  throw lastError;
}

/**
 * Clears the IndexedDB image cache.
 */
export const clearImageCache = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
  } catch (error) {
    console.error("Failed to clear image cache:", error);
  }
};

/**
 * Attempts to fetch a real image URL or generates one using Gemini 3 Pro with Google Search.
 */
export type VenueImageResult = { url: string, service: 'Gemini' | 'Azure' | 'Unsplash' };
export async function generateVenueImage(ref: string, name: string, tags: string[]): Promise<VenueImageResult> {
  const cached = await getFromDB(ref);
  if (cached) return { url: cached, service: 'Gemini' };

  // Check server cache
  const serverCached = await getFromServer(ref);
  if (serverCached) {
    saveToDB(ref, serverCached); // Cache locally too
    return { url: serverCached, service: 'Gemini' };
  }

  const fallback = getFallbackImage(tags);

  return queueRequest(async () => {
    // Check for Gemini API key
    let apiKey = process.env.API_KEY;
    if (typeof window !== 'undefined' && (!apiKey || apiKey === '')) {
      if (window.aistudio && window.aistudio.getSelectedApiKey) {
        apiKey = await window.aistudio.getSelectedApiKey();
      }
    }
    // Try Gemini first
    if (apiKey && apiKey !== '') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        return await withRetry(async () => {
          // Stage 1: Attempt to find a real, direct image URL via model knowledge
          const searchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview',
            contents: `Provide a direct, high-resolution public image URL for the venue "${name}" in Gauteng. Return ONLY the URL string. If you don't have a specific URL, return "GENERATE".`,
          });

          const resultText = searchResponse.text?.trim() || "";
          if (resultText.startsWith('http') && (resultText.toLowerCase().endsWith('.jpg') || resultText.toLowerCase().endsWith('.png') || resultText.toLowerCase().endsWith('.webp') || resultText.toLowerCase().endsWith('.jpeg'))) {
            saveToDB(ref, resultText);
            return { url: resultText, service: 'Gemini' };
          }

          // Stage 2: Fallback to high-quality search-informed generation
          const genResponse = await ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: { 
              parts: [{ 
                text: `Generate a professional, photorealistic architectural or environmental photograph of the venue "${name}" in Gauteng. Ensure the image is vibrant and accurately reflects the real location. Aspect Ratio: 16:9. No people, no text.` 
              }] 
            },
            config: {
              imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
              tools: [{ googleSearch: {} }]
            }
          });

          let imageUrl = '';
          const parts = genResponse.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }

          if (imageUrl) {
            saveToDB(ref, imageUrl);
            return { url: imageUrl, service: 'Gemini' as const };
          }
          throw new Error('No image generated by Gemini');
        });
      } catch (error: any) {
        const errStr = error.toString();
        if (errStr.includes("Requested entity was not found")) {
          window.dispatchEvent(new CustomEvent('gemini-reauth-required'));
        }
        console.error("Image Service Error (Gemini):", error);
        // If Gemini fails, try Azure next
      }
    }
    // Azure Fallback
    try {
      // Replace with your Azure endpoint and key
      const azureEndpoint = process.env.AZURE_IMAGE_ENDPOINT;
      const azureApiKey = process.env.AZURE_IMAGE_KEY;
      if (azureEndpoint && azureApiKey) {
        const azurePrompt = `Generate a professional, photorealistic architectural or environmental photograph of the venue '${name}' in Gauteng. Aspect Ratio: 16:9. No people, no text.`;
        const response = await fetch(azureEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey
          },
          body: JSON.stringify({ prompt: azurePrompt, aspect_ratio: '16:9', tags })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            saveToDB(ref, data.imageUrl);
            return { url: data.imageUrl, service: 'Azure' };
          }
        }
      }
    } catch (azureError) {
      console.error('Image Service Error (Azure):', azureError);
    }
    // Both AI providers unavailable — use high-quality Unsplash fallback (this is fine)
    return { url: fallback, service: 'Unsplash' };
  });
}
