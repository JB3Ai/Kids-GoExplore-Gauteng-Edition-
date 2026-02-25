
import React, { useState, useEffect } from 'react';
import { UserProfile, DistanceCategory, Venue } from '../types';
import { getTopRecommendations, ScoredVenue } from '../services/recommendationEngine';
import { downloadCalendarEvent } from '../services/calendarService';
import { calculateRainMode, fetchWeather, RainDecision } from '../services/weatherService';
import { getCurrentLocation } from '../lib/location';
import { MapPin, Calendar, Umbrella, Sun, Navigation, Settings, Loader2, Info, LocateFixed, Sparkles, ChevronLeft, ShieldCheck } from 'lucide-react';

interface NowModeProps {
  onBack: () => void;
  venues: Venue[];
}

export const NowMode: React.FC<NowModeProps> = ({ onBack, venues }) => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ScoredVenue[]>([]);
  const [rainDecision, setRainDecision] = useState<RainDecision>({ rainMode: false, reason: '' });
  const [locStatus, setLocStatus] = useState<'GPS' | 'FALLBACK' | 'SAVED'>('SAVED');

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('FAMILY_NOW_PROFILE');
    return saved ? JSON.parse(saved) : {
      id: crypto.randomUUID(),
      onboarded: true,
      kidsAgeMin: 7,
      kidsAgeMax: 10,
      maxDistanceBand: DistanceCategory.MED,
      rainLookaheadHours: 2,
      newsletterOptIn: false
    };
  });

  useEffect(() => {
    const generatePlan = async () => {
      setLoading(true);
      
      // Step 1: Fresh GPS Lookup (Spec: request GPS on each press)
      const locRes = await getCurrentLocation(6000);
      let lat = profile.homeLat || -26.2041;
      let lng = profile.homeLng || 28.0473;
      
      if (locRes.ok) {
        lat = locRes.lat;
        lng = locRes.lng;
        setLocStatus('GPS');
        // Privacy: Overwrite single last_known, no history trail
        localStorage.setItem('last_known_lat', String(lat));
        localStorage.setItem('last_known_lng', String(lng));
      } else {
        setLocStatus(profile.homeLat ? 'SAVED' : 'FALLBACK');
      }

      // Step 2: Open-Meteo Weather Lookahead (Spec: compute RAIN_MODE for next 2 hours)
      const weather = await fetchWeather('', lat, lng);
      const decision = weather 
        ? calculateRainMode(weather, profile.rainLookaheadHours) 
        : { rainMode: false, reason: 'Weather offline' };
      
      setRainDecision(decision);

      // Step 3: Compute Top 7 Scored
      const recs = getTopRecommendations({ ...profile, homeLat: lat, homeLng: lng }, decision, venues);
      setRecommendations(recs);
      
      setLoading(false);
    };

    generatePlan();
  }, [profile, venues]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-emerald-400 animate-spin relative" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-emerald-400">Syncing Gauteng...</h2>
        <p className="text-gray-500 text-[10px] font-black mt-4 uppercase tracking-[0.2em] max-w-xs leading-loose">
          Fresh GPS Lookup • Rain Mode Probe • Scoring {venues.length} Curated Venues
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-24 font-sans selection:bg-emerald-500/30">
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-gray-900 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Explorer
          </button>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${locStatus === 'GPS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>
              <LocateFixed className={`w-3 h-3 mr-1.5 ${locStatus === 'GPS' ? 'animate-pulse' : ''}`} /> 
              {locStatus === 'GPS' ? 'GPS Active' : 'Home Area'}
            </div>
            
            {rainDecision.rainMode ? (
              <div className="flex items-center px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                <Umbrella className="w-3 h-3 mr-1.5" /> Rain Mode
              </div>
            ) : (
              <div className="flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-500/80 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/10">
                <Sun className="w-3 h-3 mr-1.5" /> Fair Skies
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-2xl mx-auto animate-in fade-in duration-1000">
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white leading-none tracking-tight">
            TOP <span className="text-emerald-400">SEVEN.</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Fit for {profile.kidsAgeMin}-{profile.kidsAgeMax} Years • {profile.maxDistanceBand === 'NEAR' ? 'Local' : 'Cross-City'}</p>
        </div>

        {recommendations.length === 0 ? (
          <div className="py-20 bg-gray-900/40 rounded-[2.5rem] border-2 border-gray-900 border-dashed flex flex-col items-center text-center px-10">
            <Info className="w-12 h-12 text-gray-800 mb-6" />
            <p className="text-gray-400 font-black uppercase tracking-widest mb-4">No Perfect Matches</p>
            <p className="text-gray-600 text-xs font-bold leading-relaxed">
              Nothing currently matches your age constraints and travel tolerance for these conditions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((venue, idx) => (
              <div key={venue.ref} className="group relative bg-gray-900 rounded-[2.5rem] border border-gray-800 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 active:scale-[0.98] shadow-2xl">
                {/* Ranking Badge */}
                <div className="absolute top-6 left-6 z-10 w-12 h-12 rounded-2xl bg-gray-950/90 backdrop-blur-md border border-gray-800 flex items-center justify-center font-black text-emerald-400 text-xl shadow-xl">
                  {idx + 1}
                </div>

                <div className="p-8 pt-20 sm:pt-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="sm:pl-16">
                      <h3 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-emerald-400 transition-colors">{venue.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center">
                          <MapPin className="w-3 h-3 mr-1.5 text-gray-600" />
                          {venue.area || venue.location}
                        </span>
                        {venue.calculatedKm !== undefined && (
                          <span className="text-[10px] text-emerald-500/80 font-black uppercase tracking-tighter bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                            {venue.calculatedKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="text-3xl font-black text-gray-800 group-hover:text-emerald-900/50 transition-colors">{venue.score}</div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-700">FIT %</span>
                    </div>
                  </div>

                  {venue.whyNow && (
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-8 bg-emerald-950/20 p-4 rounded-[1.5rem] border border-emerald-500/10 backdrop-blur-sm">
                      <Sparkles className="w-4 h-4 mr-2 text-emerald-400" />
                      {venue.whyNow}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => downloadCalendarEvent(venue)}
                      className="flex items-center justify-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Quick Add
                    </button>
                    <button 
                      onClick={() => {
                          const q = encodeURIComponent(`${venue.name} ${venue.location}`);
                          window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
                      }}
                      className="flex items-center justify-center py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all border border-gray-700 active:scale-95"
                    >
                      <Navigation className="w-4 h-4 mr-2" /> Go Now
                    </button>
                  </div>
                </div>
                
                <div className="h-1.5 bg-gray-800 w-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out" style={{ width: `${venue.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto flex justify-center">
          <div className="bg-gray-900/90 backdrop-blur-xl px-6 py-3 rounded-full border border-gray-800 shadow-2xl pointer-events-auto flex items-center gap-4">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
              <ShieldCheck className="w-3 h-3 inline mr-2 text-emerald-500" />
              Privacy <span className="text-white">Active</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
