
import { Venue, UserProfile, DistanceCategory } from '../types.ts';
import { PLACES_DATA } from '../places.ts';
import { RainDecision } from './weatherService.ts';

export interface ScoredVenue extends Venue {
  score: number;
  calculatedKm?: number;
  scoreBreakdown: {
    timeFit: number;
    weatherFit: number;
    distanceFit: number;
    kidFit: number;
    effort: number;
    cool: number;
  };
  whyNow?: string;
}

// Haversine distance calculation in km
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Updated Distance Bands for Gauteng.
 * NEAR: <= 15km (Local)
 * MED: <= 40km (Cross-city)
 * FAR: > 40km (Day trip)
 */
export function getDistanceBand(km: number): DistanceCategory {
  if (km <= 15) return DistanceCategory.NEAR; 
  if (km <= 40) return DistanceCategory.MED;  
  return DistanceCategory.FAR;                
}

function getClosingHour(venue: Venue, now: Date): number {
  const day = now.getDay(); 
  
  if (venue.subcategory === 'Market' && (venue.name.includes('Hazel') || venue.name.includes('Market'))) {
    return 14;
  }

  if (day === 5 || day === 6) return 21; 
  if (day === 0) return 18; 
  
  return 17;
}

function isOpenNow(venue: Venue, now: Date): boolean {
  if (venue.status && venue.status !== 'OPEN') return false;
  
  const day = now.getDay(); 
  const hour = now.getHours();
  
  if (venue.subcategory === 'Market' && venue.name.includes('Hazel')) {
    return day === 6 && hour >= 8 && hour < 14;
  }

  if (day === 5) return hour >= 14 && hour < 21;
  if (day === 6) return hour >= 9 && hour < 21;
  if (day === 0) return hour >= 9 && hour < 18;
  
  return hour >= 9 && hour < 17;
}

export function getTopRecommendations(
  userProfile: UserProfile, 
  rainDecision: RainDecision,
  venueList: Venue[] = PLACES_DATA
): ScoredVenue[] {
  const now = new Date();
  const currentHour = now.getHours();
  
  const candidates = venueList.filter(place => {
    if (place.status && place.status !== 'OPEN') return false;

    if (place.ageMin !== undefined && place.ageMax !== undefined) {
      const overlaps = Math.max(place.ageMin, userProfile.kidsAgeMin) <= Math.min(place.ageMax, userProfile.kidsAgeMax);
      if (!overlaps) return false;
    }

    // REMOVED: Distance band hard filtering. All venues are considered.

    if (!isOpenNow(place, now)) return false;

    if (rainDecision.rainMode) {
      const isRainSafe = place.indoor || place.covered || place.environment === 'Indoor' ||
                         ['Indoor Play', 'Museum', 'Cinema', 'Trampoline'].includes(place.subcategory || '');
      if (!isRainSafe) return false;
    }

    return true;
  });

  const scored = candidates.map(place => {
    let km: number | undefined = undefined;
    if (userProfile.homeLat && userProfile.homeLng && place.lat && place.lng) {
      km = getDistanceKm(userProfile.homeLat, userProfile.homeLng, place.lat, place.lng);
    }

    const closingHour = getClosingHour(place, now);
    const hoursRemaining = closingHour - currentHour;
    let timeFit = 10;
    if (hoursRemaining >= 3) timeFit = 25;
    else if (hoursRemaining >= 2) timeFit = 20;
    else if (hoursRemaining >= 1) timeFit = 10;
    else timeFit = 5; 

    let weatherFit = 10;
    if (rainDecision.rainMode) {
      if (place.indoor || place.environment === 'Indoor') weatherFit = 20;
      else if (place.covered) weatherFit = 15;
      else weatherFit = 0;
    } else {
      if (place.environment === 'Outdoor') weatherFit = 20;
      else if (place.environment === 'Both') weatherFit = 20;
      else weatherFit = 15;
    }

    let distanceFit = 0;
    if (km !== undefined) {
      if (km < 5) distanceFit = 20;
      else if (km < 15) distanceFit = 15;
      else if (km < 40) distanceFit = 10;
      else distanceFit = 5;
    } else {
      if (place.distance === DistanceCategory.NEAR) distanceFit = 20;
      else if (place.distance === DistanceCategory.MED) distanceFit = 15;
      else distanceFit = 5;
    }

    let kidFit = 10;
    if (place.ageMin !== undefined && place.ageMax !== undefined) {
      const userAvg = (userProfile.kidsAgeMin + userProfile.kidsAgeMax) / 2;
      const placeAvg = (place.ageMin + place.ageMax) / 2;
      if (Math.abs(userAvg - placeAvg) < 2) kidFit = 15;
    }

    const effort = place.effortLevel === 'DropIn' ? 10 : (place.effortLevel === 'Booked' ? 5 : 8);
    const cool = (place.googleRating || 4) * 2;

    const total = timeFit + weatherFit + distanceFit + kidFit + effort + cool;

    const reasons = [];
    if (timeFit >= 20) reasons.push("Open late");
    if (distanceFit >= 15) reasons.push("Nearby");
    if (rainDecision.rainMode && weatherFit >= 15) reasons.push("Rain Safe");
    else if (!rainDecision.rainMode && weatherFit >= 15) reasons.push("Great Weather");
    if (kidFit >= 15) reasons.push("Perfect Age Match");
    
    return {
      ...place,
      score: Math.min(100, total),
      calculatedKm: km,
      scoreBreakdown: { timeFit, weatherFit, distanceFit, kidFit, effort, cool },
      whyNow: reasons.slice(0, 3).join(' • ')
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 7);
}
