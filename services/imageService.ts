
import { GoogleGenAI } from "@google/genai";

// --- IndexedDB Configuration ---
const DB_NAME = 'VenueScoutDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// --- Fallback Image Logic ---
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
  } catch (error) {
    return undefined;
  }
};

const saveToDB = async (key: string, value: string) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {}
};

// --- Request Queue & Rate Limiting ---
let isGenerating = false;
const queue: (() => Promise<void>)[] = [];
let cooldownUntil = 0; 

const processQueue = async () => {
  if (isGenerating || queue.length === 0) return;
  
  if (Date.now() < cooldownUntil) {
    setTimeout(processQueue, 2000);
    return;
  }

  isGenerating = true;
  const task = queue.shift();
  if (task) {
    try { await task(); } catch (e) {}
  }

  setTimeout(() => {
    isGenerating = false;
    processQueue();
  }, 3000); 
};

/**
 * Generates an actual, search-informed photograph of a venue.
 * Uses Gemini 3 Pro Image with Google Search grounding.
 */
export async function generateVenueImage(ref: string, name: string, tags: string[]): Promise<string> {
  const cached = await getFromDB(ref);
  if (cached) return cached;

  const fallback = getFallbackImage(tags);

  return new Promise((resolve) => {
    const task = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Prompt forces the model to use search results for accuracy
      const prompt = `Search for the actual family-friendly venue "${name}" in Gauteng. 
      Based on real search results, generate a hyper-realistic, photorealistic high-quality photograph of this specific venue. 
      Ensure the architecture and environment accurately reflect the actual place. 
      Style: Vibrant, bright, child-friendly photograph. No text, people, or logos.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
            tools: [{ googleSearch: {} }] // Enabled for actual real-world accuracy
          }
        });

        let imageUrl = '';
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (imageUrl) {
          saveToDB(ref, imageUrl);
          resolve(imageUrl);
        } else {
          resolve(fallback);
        }
      } catch (error: any) {
        const errStr = error.toString();
        if (errStr.includes("Requested entity was not found")) {
          // Trigger re-auth event for the main UI
          window.dispatchEvent(new CustomEvent('gemini-reauth-required'));
        }
        resolve(fallback);
      }
    };

    queue.push(task);
    processQueue();
  });
}
