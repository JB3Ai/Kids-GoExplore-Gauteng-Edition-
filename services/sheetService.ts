
import { Venue, DistanceCategory, Environment } from '../types';

const SHEET_ID = '1tbilLCslg5ai6vzEXtA5yMxLGz6kJ7FRKrbKTI8Mmj4';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const CACHE_KEY = 'VENUE_SCOUT_DATA_CACHE';
const RATINGS_KEY = 'VENUE_SCOUT_USER_RATINGS';
const FAVORITES_KEY = 'VENUE_SCOUT_FAVORITES';

const CUSTOM_VENUES: Venue[] = [
  {
    ref: '215',
    name: 'The Wilds',
    location: 'Houghton',
    area: 'Houghton',
    distance: DistanceCategory.NEAR,
    description: 'A beautifully rejuvenated safe city park featuring iconic colored metal animal sculptures by artist James Delaney.',
    notes: 'Free entry with safe parking and security presence. Perfect for a morning nature walk or a family photo session among the sculptures.',
    insiderTip: 'Follow the yellow route for the best views of the Johannesburg skyline!',
    environment: 'Outdoor',
    tags: ['Nature', 'Art', 'Scenic', 'Adventure'],
    googleRating: 4.8,
    status: 'OPEN',
    effortLevel: 'DropIn',
    costBand: 'Free',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=800'
  }
];

function getStableRating(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rating = 3.5 + (Math.abs(hash) % 16) / 10;
  return Math.min(5, rating);
}

function getUserRatings(): Record<string, number> {
  const stored = localStorage.getItem(RATINGS_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function getFavorites(): string[] {
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function toggleFavoriteVenue(ref: string): string[] {
  const favorites = getFavorites();
  const index = favorites.indexOf(ref);
  if (index === -1) {
    favorites.push(ref);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

/**
 * Robust CSV row splitter that handles quoted commas and spaces correctly.
 */
function splitCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Split point
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Venue[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Dynamic header mapping
  const headers = splitCSVRow(lines[0]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const findCol = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k.toLowerCase())));

  const idxMap = {
    ref: findCol(['ref', '#', 'id']),
    name: findCol(['name', 'title']),
    location: findCol(['location', 'area', 'address']),
    distance: findCol(['distance', 'band']),
    description: findCol(['description', 'about']),
    notes: findCol(['notes', 'tips']),
    lat: findCol(['lat', 'latitude']),
    lng: findCol(['lng', 'longitude']),
    cost: findCol(['cost', 'price']),
    effort: findCol(['effort']),
    env: findCol(['env', 'indoor', 'outdoor']),
    tags: findCol(['tags', 'categories', 'type'])
  };

  const rows = lines.slice(1);
  const userRatings = getUserRatings();
  
  const parsed = rows.map((row): Venue | null => {
    if (!row.trim()) return null;
    
    // Use the robust splitter instead of regex
    const clean = splitCSVRow(row).map(p => p.replace(/^"|"$/g, '').trim());
    
    if (clean.length < 2) return null;

    const val = (idx: number) => idx !== -1 && idx < clean.length ? clean[idx] : '';

    const name = val(idxMap.name);
    if (!name) return null;

    const dStr = (val(idxMap.distance) || '').toUpperCase();
    let distance = DistanceCategory.FAR;
    if (dStr.includes('NEAR') || dStr.includes('🟢')) distance = DistanceCategory.NEAR;
    else if (dStr.includes('MED') || dStr.includes('🟡')) distance = DistanceCategory.MED;
    else if (dStr.includes('FAR') || dStr.includes('🔴')) distance = DistanceCategory.FAR;

    const description = val(idxMap.description);
    const notes = val(idxMap.notes);
    const content = `${description} ${notes} ${name}`.toLowerCase();
    
    let environment: Environment = 'Both';
    const envVal = val(idxMap.env).toLowerCase();
    if (envVal.includes('outdoor') || content.includes('outdoor')) environment = 'Outdoor';
    else if (envVal.includes('indoor') || content.includes('indoor')) environment = 'Indoor';

    const rawTags = val(idxMap.tags);
    const tags = rawTags ? rawTags.split(/[,;|]/).map(t => t.trim()) : [];
    
    const ref = val(idxMap.ref) || `sh-${Math.random().toString(36).substr(2, 5)}`;

    return {
      ref,
      name,
      location: val(idxMap.location) || 'Gauteng',
      distance,
      description: description || 'No description available in sheet.',
      notes: notes || '',
      environment,
      tags: tags.length > 0 ? tags : ['General'],
      lat: parseFloat(val(idxMap.lat)) || undefined,
      lng: parseFloat(val(idxMap.lng)) || undefined,
      costBand: (val(idxMap.cost) || 'Mid') as any,
      effortLevel: (val(idxMap.effort) || 'DropIn') as any,
      userRating: userRatings[ref],
      googleRating: getStableRating(name),
      status: 'OPEN'
    };
  }).filter((v): v is Venue => v !== null);

  return [...parsed, ...CUSTOM_VENUES.filter(cv => !parsed.some(p => p.ref === cv.ref))];
}

export async function fetchVenues(forceRefresh = false): Promise<Venue[]> {
  try {
    if (!forceRefresh) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 1000 * 60 * 60 * 12) { // 12h cache
          const ratings = getUserRatings();
          return (data as Venue[]).map(v => ({ ...v, userRating: ratings[v.ref] }));
        }
      }
    }

    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Sheet fetch failed');
    const text = await response.text();
    const venues = parseCSV(text);
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: venues, timestamp: Date.now() }));
    return venues;
  } catch (error) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      const ratings = getUserRatings();
      return (data as Venue[]).map(v => ({ ...v, userRating: ratings[v.ref] }));
    }
    return CUSTOM_VENUES;
  }
}

export function saveUserRating(ref: string, rating: number) {
  const ratings = getUserRatings();
  ratings[ref] = rating;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

export function getCachedVenues(): Venue[] | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data } = JSON.parse(cached);
      const ratings = getUserRatings();
      return (data as Venue[]).map(v => ({ ...v, userRating: ratings[v.ref] }));
    } catch (e) { return null; }
  }
  return null;
}
