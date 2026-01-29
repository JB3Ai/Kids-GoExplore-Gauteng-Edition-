
import { WeatherData } from '../types';

export interface WeatherAdvice {
  alert?: string;
  tip: string;
  type: 'sun' | 'rain' | 'storm' | 'cold' | 'neutral';
}

export type RainDecision = {
  rainMode: boolean;
  reason: string;
};

export async function fetchWeather(location: string, lat?: number, lng?: number): Promise<WeatherData | null> {
  try {
    let coords = { lat: -26.2041, lng: 28.0473 }; // Default JHB

    if (lat && lng) {
      coords = { lat, lng };
    } else {
      const coordMap: Record<string, { lat: number, lng: number }> = {
        'Pretoria': { lat: -25.7479, lng: 28.2293 },
        'Centurion': { lat: -25.8598, lng: 28.1816 },
        'Midrand': { lat: -25.9992, lng: 28.1262 },
        'Johannesburg': { lat: -26.2041, lng: 28.0473 },
        'Hartbeespoort': { lat: -25.7461, lng: 27.8824 },
        'East Rand': { lat: -26.1715, lng: 28.2323 },
      };
      const found = Object.keys(coordMap).find(k => location.includes(k));
      if (found) coords = coordMap[found];
    }
    
    // Using Africa/Johannesburg timezone to align with "Now Mode" specs
    // Added forecast_days=2 to match rain prediction lookahead needs
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=precipitation,precipitation_probability&timezone=Africa%2FJohannesburg&forecast_days=2`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

export function calculateRainMode(
  weather: WeatherData, 
  lookaheadHours: number = 2,
  precipMmThreshold: number = 0.2,
  popThreshold: number = 50
): RainDecision {
  if (!weather.hourly) {
    return { rainMode: false, reason: "Weather data unavailable" };
  }
  
  const times: string[] = weather.hourly.time ?? [];
  const prec: number[] = weather.hourly.precipitation ?? [];
  const pop: number[] = weather.hourly.precipitation_probability ?? [];

  if (!times.length || times.length !== prec.length || times.length !== pop.length) {
    return { rainMode: false, reason: "Weather unavailable (bad data)" };
  }
  
  const now = new Date();
  let startIdx = times.findIndex((t) => new Date(t) >= now);
  if (startIdx < 0) startIdx = 0;

  const endIdx = Math.min(startIdx + lookaheadHours, times.length - 1);

  for (let i = startIdx; i <= endIdx; i++) {
    const mm = Number(prec[i] ?? 0);
    const p = Number(pop[i] ?? 0);
    // Rain mode triggers if precip >= threshold OR probability >= threshold
    if (mm >= precipMmThreshold || p >= popThreshold) {
      return {
        rainMode: true,
        reason: `Rain likely within ${lookaheadHours}h (mm=${mm.toFixed(1)}, pop=${p}%)`
      };
    }
  }

  return { rainMode: false, reason: `No rain signal in next ${lookaheadHours}h` };
}

export function getWeatherAdvice(code: number, maxTemp?: number): WeatherAdvice {
  // Severe Weather / Storms
  if (code >= 95) {
    return {
      alert: "⛈️ STORM WARNING: Severe weather detected!",
      tip: "Keep the kids indoors! Check for venue closures and keep a close eye on the sky.",
      type: 'storm'
    };
  }

  // Rain/Drizzle
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      tip: "🌧️ Rain expected! Pack umbrellas and prioritize our Indoor venues for a dry day out.",
      type: 'rain'
    };
  }

  // Heatwave
  if (maxTemp && maxTemp > 32) {
    return {
      tip: "🔥 Heatwave! Essential: Pack extra water, costumes for splash pads, and reapply sunscreen hourly!",
      type: 'sun'
    };
  }

  // Beautiful Sunny Day
  if (code <= 3) {
    return {
      tip: "☀️ Perfect conditions! Don't forget hats, sunscreen, and swimming costumes for the kids!",
      type: 'sun'
    };
  }

  // Cold Weather
  if (maxTemp && maxTemp < 16) {
    return {
      tip: "🧥 It's chilly out! Wrap up in layers. Great day for an indoor activity or a brisk walk with hot cocoa.",
      type: 'cold'
    };
  }

  // Overcast / Fog
  if (code >= 45 && code <= 48) {
    return {
      tip: "☁️ Gray skies ahead. Visibility might be low, but it's a cozy day for a museum or indoor play park.",
      type: 'neutral'
    };
  }

  return {
    tip: "✨ Lovely weather for an outing! Pack the essentials and enjoy making memories with the family.",
    type: 'neutral'
  };
}

export function getWeatherIcon(code: number) {
  if (code === 0) return '☀️'; // Clear
  if (code <= 3) return '🌤️'; // Partly cloudy
  if (code <= 48) return '☁️'; // Foggy/Overcast
  if (code <= 67) return '🌧️'; // Rain
  if (code <= 82) return '🌦️'; // Showers
  return '⛈️'; // Storms
}
