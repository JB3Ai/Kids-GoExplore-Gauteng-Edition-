
import React, { useState, useEffect } from 'react';
import { UserProfile, DistanceCategory, Venue } from '../types';
import { getTopRecommendations, ScoredVenue } from '../services/recommendationEngine';
import { downloadCalendarEvent } from '../services/calendarService';
import { calculateRainMode, fetchWeather, RainDecision } from '../services/weatherService';
// Added missing Sparkles import
import { MapPin, Calendar, Umbrella, Sun, Battery, Navigation, Settings, Loader2, Info, GpsFixed, Map as MapIcon, Sparkles } from 'lucide-react';

interface NowModeProps {
  onBack: () => void;
  venues: Venue[];
}

export const NowMode: React.FC<NowModeProps> = ({ onBack, venues }) => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ScoredVenue[]>([]);
  const [rainDecision, setRainDecision] = useState<RainDecision>({ rainMode: false, reason: '' });
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [locSource, setLocSource] = useState<'GPS' | 'DEFAULT' | 'HOME'>('DEFAULT');

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('FAMILY_NOW_PROFILE');
    return saved ? JSON.parse(saved) : {
      kidsAgeMin: 7,
      kidsAgeMax: 10,
      maxDistanceBand: DistanceCategory.MED,
      rainLookaheadHours: 2,
    };
  });

  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    localStorage.setItem('FAMILY_NOW_PROFILE', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      let lat = -26.2041;
      let lng = 28.0473;
      let source: 'GPS' | 'DEFAULT' | 'HOME' = 'DEFAULT';
      
      try {
        if (profile.homeLat && profile.homeLng) {
          lat = profile.homeLat;
          lng = profile.homeLng;
          source = 'HOME';
          setUserLoc({ lat, lng });
        } else if (navigator.geolocation) {
           await new Promise<void>((resolve) => {
             navigator.geolocation.getCurrentPosition(
               (pos) => {
                 lat = pos.coords.latitude;
                 lng = pos.coords.longitude;
                 source = 'GPS';
                 setUserLoc({ lat, lng });
                 resolve();
               }, 
               () => resolve(), 
               { timeout: 5000 }
             );
           });
        }
      } catch (e) {
        console.warn("Loc error", e);
      }

      setLocSource(source);

      const weather = await fetchWeather('', lat, lng);
      const decision = weather 
        ? calculateRainMode(weather, profile.rainLookaheadHours) 
        : { rainMode: false, reason: 'Weather unavailable' };
      
      setRainDecision(decision);

      const recs = getTopRecommendations({ ...profile, homeLat: lat, homeLng: lng }, decision, venues);
      setRecommendations(recs);
      
      setLoading(false);
    };

    init();
  }, [profile, venues]);

  const saveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setProfile(p => ({ ...p, homeLat: pos.coords.latitude, homeLng: pos.coords.longitude }));
        setShowConfig(false);
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400">Analysing Constraints...</h2>
        <p className="text-gray-400 text-[10px] font-mono mt-2 uppercase tracking-tighter">Locating Family • Checking Skies • Optimising Fun</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20 font-sans">
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Browse
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end">
            <span className={`flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${locSource === 'GPS' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              <MapPin className="w-2.5 h-2.5 mr-1" /> {locSource === 'GPS' ? 'Live GPS' : (locSource === 'HOME' ? 'Home Set' : 'Default JHB')}
            </span>
          </div>
          
          {rainDecision.rainMode ? (
            <span className="flex items-center px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
              <Umbrella className="w-3 h-3 mr-1" /> Rain Mode
            </span>
          ) : (
            <span className="flex items-center px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
              <Sun className="w-3 h-3 mr-1" /> Clear Skies
            </span>
          )}
          
          <button onClick={() => setShowConfig(!showConfig)} className={`p-2 rounded-lg transition-colors h-9 w-9 flex items-center justify-center ${showConfig ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showConfig && (
        <div className="bg-gray-900 border-b border-gray-800 p-6 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3 block">Base Location</label>
              <button onClick={saveLocation} className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all border border-gray-700 active:scale-95">
                <GpsFixed className="w-4 h-4 mr-2 text-emerald-400" />
                {profile.homeLat ? 'Sync Current GPS' : 'Set My GPS Base'}
              </button>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3 block">Travel Range</label>
              <div className="flex bg-gray-800 p-1 rounded-xl">
                {[DistanceCategory.NEAR, DistanceCategory.MED, DistanceCategory.FAR].map((d) => (
                  <button
                    key={d}
                    onClick={() => setProfile(p => ({ ...p, maxDistanceBand: d }))}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${profile.maxDistanceBand === d ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white leading-tight">
            Gauteng <span className="text-emerald-400">Now.</span>
          </h1>
          <p className="text-gray-500 text-sm font-bold mt-1 uppercase tracking-widest">Calculated recommendations for your family</p>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-3xl border-2 border-gray-800 border-dashed">
            <Info className="w-10 h-10 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest mb-2">No Optimized Matches</p>
            <p className="text-gray-600 text-xs px-10">Try expanding your 'Travel Range' in settings or checking if venues are currently open.</p>
          </div>
        ) : (
          recommendations.map((venue, idx) => (
            <div key={venue.ref} className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all active:scale-[0.99] group shadow-xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                       <span className="text-xl font-black text-emerald-400">{venue.score}</span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-white leading-tight">{venue.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{venue.area || venue.location}</span>
                        {venue.calculatedKm !== undefined && (
                          <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {venue.calculatedKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {venue.whyNow && (
                  <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30">
                    <Sparkles className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                    {venue.whyNow}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                   <div className="bg-gray-800/40 p-3 rounded-xl flex flex-col items-center border border-gray-800/50">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Energy</span>
                      <span className="text-xs font-black text-gray-300">{venue.energyLevel || 'Med'}</span>
                   </div>
                   <div className="bg-gray-800/40 p-3 rounded-xl flex flex-col items-center border border-gray-800/50">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Effort</span>
                      <span className="text-xs font-black text-gray-300">{venue.effortLevel || 'DropIn'}</span>
                   </div>
                   <div className="bg-gray-800/40 p-3 rounded-xl flex flex-col items-center border border-gray-800/50">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Cost</span>
                      <span className="text-xs font-black text-gray-300">{venue.costBand || 'Mid'}</span>
                   </div>
                   <div className="bg-gray-800/40 p-3 rounded-xl flex flex-col items-center border border-gray-800/50">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Env</span>
                      <span className="text-xs font-black text-gray-300">{venue.environment}</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => downloadCalendarEvent(venue)}
                    className="flex items-center justify-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Schedule
                  </button>
                  <button 
                    onClick={() => {
                        const q = encodeURIComponent(`${venue.name} ${venue.location}`);
                        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
                    }}
                    className="flex items-center justify-center py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-700 active:scale-95"
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Navigate
                  </button>
                </div>
              </div>
              
              <div className="h-1.5 bg-gray-800 w-full flex">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${venue.score}%` }}></div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

// Internal icon helper
const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
);
