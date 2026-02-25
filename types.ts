
export enum DistanceCategory {
  NEAR = 'NEAR',
  MED = 'MED',
  FAR = 'FAR'
}

export type Environment = 'Indoor' | 'Outdoor' | 'Both';
export type AppTheme = 'light' | 'dark' | 'pastel' | 'amber';

export interface Venue {
  ref: string;
  name: string;
  location: string;
  distance: DistanceCategory;
  description: string;
  notes: string;
  insiderTip?: string;
  environment: Environment;
  tags: string[];
  userRating?: number;
  googleRating: number;
  thumbnailUrl?: string;
  calculatedKm?: number;
  
  // Family NOW Extended Fields
  area?: string;
  city?: string;
  lat?: number;
  lng?: number;
  category?: string;
  subcategory?: string;
  indoor?: boolean;
  covered?: boolean;
  ageMin?: number;
  ageMax?: number;
  energyLevel?: 'Low' | 'Medium' | 'High';
  effortLevel?: 'DropIn' | 'Booked' | 'Anchor';
  costBand?: 'Free' | 'Budget' | 'Mid' | 'Premium';
  status?: 'OPEN' | 'TEMP_CLOSED' | 'SEASONAL' | 'UNKNOWN';
  phone?: string;
  address?: string;
  url?: string;
  openingHours?: string;
}

export interface UserProfile {
  id: string;
  onboarded: boolean;
  homeLat?: number;
  homeLng?: number;
  kidsAgeMin: number;
  kidsAgeMax: number;
  maxDistanceBand: DistanceCategory;
  rainLookaheadHours: number;
  indoorFirst: boolean;
  email?: string;
  phone?: string;
  newsletterOptIn: boolean;
  consentTimestamp?: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
  };
}

export interface WeatherData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
  hourly?: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
  };
}
