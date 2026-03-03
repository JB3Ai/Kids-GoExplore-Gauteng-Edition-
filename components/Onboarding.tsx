
import React, { useState } from 'react';
import { UserProfile, DistanceCategory } from '../types';
import { getCurrentLocation } from '../lib/location';
import { syncProfileWithBackend } from '../services/sheetService';
import { MapPin, Users, Mail, ChevronRight, LocateFixed, Check, Sparkles, Loader2, Map as MapIcon, ShieldCheck, Umbrella, Home, Globe, Phone } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserProfile>({
    id: crypto.randomUUID(),
    onboarded: false,
    kidsAgeMin: 7,
    kidsAgeMax: 10,
    maxDistanceBand: DistanceCategory.FAR,
    rainLookaheadHours: 2,
    indoorFirst: true,
    newsletterOptIn: false,
    email: '',
    phone: ''
  });

  const persistToLocalStorage = (profile: UserProfile) => {
    localStorage.setItem("onboarded", "true");
    if (profile.homeLat && profile.homeLng) {
      localStorage.setItem("home_lat", String(profile.homeLat));
      localStorage.setItem("home_lng", String(profile.homeLng));
      localStorage.setItem("last_lat", String(profile.homeLat));
      localStorage.setItem("last_lng", String(profile.homeLng));
    }
    localStorage.setItem("kids_age_min", String(profile.kidsAgeMin));
    localStorage.setItem("kids_age_max", String(profile.kidsAgeMax));
    localStorage.setItem("indoor_first", profile.indoorFirst ? "true" : "false");
    localStorage.setItem("rain_lookahead_hours", String(profile.rainLookaheadHours));
    localStorage.setItem("newsletter_optin", profile.newsletterOptIn ? "true" : "false");
    if (profile.email) localStorage.setItem("newsletter_email", profile.email.trim());
    if (profile.phone) localStorage.setItem("user_phone", profile.phone.trim());
    
    localStorage.setItem('FAMILY_NOW_PROFILE', JSON.stringify(profile));
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    const res = await getCurrentLocation();
    
    if (res.ok === false) {
      setError(res.reason === 'denied' 
        ? "Permission denied. We'll set a manual home base." 
        : "GPS connection weak. Try manual setup.");
      setLoading(false);
      setTimeout(() => setStep(2), 2000);
      return;
    }

    setFormData(prev => ({
      ...prev,
      homeLat: res.lat,
      homeLng: res.lng
    }));
    setLoading(false);
    setStep(2);
  };

  const handleManualFallback = () => {
    setFormData(prev => ({
      ...prev,
      homeLat: -26.2041,
      homeLng: 28.0473
    }));
    setStep(2);
  };

  const handleFinish = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError("Please enter a valid email to continue.");
      return;
    }
    if (!formData.phone || formData.phone.length < 10) {
      setError("Please enter a valid phone number to continue.");
      return;
    }
    const finalProfile = { 
      ...formData, 
      onboarded: true,
      consentTimestamp: formData.newsletterOptIn ? new Date().toISOString() : undefined
    };
    persistToLocalStorage(finalProfile);

    // Sync with backend
    await syncProfileWithBackend(finalProfile.id, {
      favorites: [],
      ratings: {}
    });

    // If newsletterOptIn, send email to leads@jonoblackburn.com
    if (finalProfile.newsletterOptIn && finalProfile.email) {
      try {
        await fetch('https://formspree.io/f/xwkzqgqv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: finalProfile.email,
            _subject: 'Friday Brief Subscription',
            message: `New Friday Brief subscriber: ${finalProfile.email}`
          })
        });
      } catch (e) {
        // Optionally handle error
      }
    }

    onComplete(finalProfile);
  };

  const updateAge = (type: 'min' | 'max', val: number) => {
    setFormData(prev => {
      const next = { ...prev };
      if (type === 'min') next.kidsAgeMin = Math.max(0, Math.min(val, prev.kidsAgeMax));
      else next.kidsAgeMax = Math.max(prev.kidsAgeMin, Math.min(val, 18));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-space text-theme-primary flex flex-col font-sans overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      <div className="relative flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 max-w-md mx-auto w-full">
        
        {/* Unified Step Indicator */}
        <div className="flex space-x-2 mb-12 w-full px-4">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-700 flex-1 ${step >= s ? 'bg-theme-accent shadow-[0_0_12px_rgba(102,255,102,0.4)]' : 'bg-theme-secondary border border-theme-primary'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full">
            <div className="text-center space-y-6">
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 bg-theme-accent/20 rounded-full animate-pulse opacity-25"></div>
                <img 
                  src="/logo-kids-edition.jpg" 
                  alt="JB³Ai Kids Edition Logo" 
                  className="relative w-full h-full object-contain rounded-3xl border border-white/20 shadow-2xl"
                  onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'; }}
                />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight leading-none text-white drop-shadow-lg">
                Locate the <span className="text-theme-accent">Fun.</span>
              </h1>
              <p className="text-white/80 font-bold leading-relaxed text-sm px-4 drop-shadow-md">
                Use your location to show nearby kid-friendly options and activate rain-safe picks automatically.
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleUseCurrentLocation}
                disabled={loading}
                className="group w-full py-5 bg-theme-accent hover:opacity-90 text-gray-950 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <LocateFixed className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                    Use Current GPS
                  </>
                )}
              </button>
              <button 
                onClick={handleManualFallback}
                className="w-full py-5 bg-theme-secondary border border-theme-primary text-theme-secondary rounded-[1.5rem] font-black uppercase tracking-widest transition-all hover:bg-theme-secondary/80 hover:text-theme-primary flex items-center justify-center"
              >
                <MapIcon className="w-5 h-5 mr-3" />
                Set Home Base Manually
              </button>
            </div>
            {error && <p className="text-center text-[10px] text-theme-accent font-black uppercase tracking-[0.2em] animate-pulse">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tight">
                Quick <span className="text-theme-accent">Preferences.</span>
              </h1>
              <p className="text-theme-secondary text-xs font-bold uppercase tracking-widest">Tuned to your family</p>
            </div>

            <div className="space-y-6 bg-theme-secondary p-6 rounded-[2rem] border border-theme-primary shadow-xl">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-theme-secondary flex justify-between items-center">
                  <span className="flex items-center"><Users className="w-3 h-3 mr-1.5" /> Kids Ages</span>
                  <span className="text-theme-accent">{formData.kidsAgeMin} – {formData.kidsAgeMax} yrs</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button onClick={() => updateAge('min', formData.kidsAgeMin - 1)} className="w-10 h-10 bg-theme-primary border border-theme-primary rounded-xl flex items-center justify-center font-black active:bg-theme-accent active:text-gray-950 transition-colors">-</button>
                  <div className="flex-1 h-2.5 bg-theme-primary rounded-full relative overflow-hidden">
                    <div className="absolute h-full bg-theme-accent" style={{ left: `${(formData.kidsAgeMin/18)*100}%`, right: `${100 - (formData.kidsAgeMax/18)*100}%` }}></div>
                  </div>
                  <button onClick={() => updateAge('max', formData.kidsAgeMax + 1)} className="w-10 h-10 bg-theme-primary border border-theme-primary rounded-xl flex items-center justify-center font-black active:bg-theme-accent active:text-gray-950 transition-colors">+</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase tracking-[0.2em] text-theme-secondary">Indoor-First Priority</label>
                   <button 
                    onClick={() => setFormData(p => ({ ...p, indoorFirst: !p.indoorFirst }))}
                    className={`w-full py-4 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${formData.indoorFirst ? 'bg-theme-accent border-theme-accent text-gray-950' : 'bg-theme-primary border-theme-primary text-theme-secondary'}`}
                   >
                    {formData.indoorFirst ? 'ACTIVE' : 'OFF'}
                   </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-theme-secondary flex items-center">
                  <Umbrella className="w-3 h-3 mr-1.5" /> Rain Lookahead Probe
                </label>
                <div className="flex p-1 bg-theme-primary rounded-xl border border-theme-primary">
                  {[2, 4].map(h => (
                    <button 
                      key={h}
                      onClick={() => setFormData(p => ({ ...p, rainLookaheadHours: h }))}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.rainLookaheadHours === h ? 'bg-theme-secondary text-theme-accent shadow-sm' : 'text-theme-secondary'}`}
                    >
                      {h} Hours
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(3)}
              className="w-full py-5 bg-theme-accent hover:opacity-90 text-gray-950 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95"
            >
              Continue <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-theme-secondary rounded-[2rem] flex items-center justify-center mx-auto border border-theme-primary">
                <Sparkles className="w-12 h-12 text-theme-accent" />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight leading-tight">
                Friday <span className="text-theme-accent">Brief.</span>
              </h1>
              <p className="text-theme-secondary font-bold leading-relaxed text-sm">
                Top weekend picks based on your preferences. One email a week.
              </p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary group-focus-within:text-theme-accent" />
                <input 
                  type="email"
                  placeholder="name@example.com"
                  className="w-full pl-14 pr-6 py-5 bg-theme-secondary rounded-[1.5rem] border border-theme-primary focus:border-theme-accent outline-none font-bold text-sm transition-all text-theme-primary"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value, newsletterOptIn: true})}
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary group-focus-within:text-theme-accent" />
                <input 
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full pl-14 pr-6 py-5 bg-theme-secondary rounded-[1.5rem] border border-theme-primary focus:border-theme-accent outline-none font-bold text-sm transition-all text-theme-primary"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="bg-theme-secondary/40 p-5 rounded-[1.5rem] border border-theme-primary flex items-start gap-4">
                <div className="mt-1">
                  <input 
                    type="checkbox" 
                    id="consent"
                    checked={formData.newsletterOptIn}
                    onChange={(e) => setFormData({...formData, newsletterOptIn: e.target.checked})}
                    className="w-5 h-5 rounded border-theme-primary bg-theme-primary text-theme-accent focus:ring-theme-accent"
                  />
                </div>
                <label htmlFor="consent" className="text-[11px] text-theme-secondary font-bold leading-relaxed uppercase tracking-wider cursor-pointer">
                  Subscribe to the Friday Brief. Unsubscribe anytime.
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleFinish}
                className="w-full py-5 bg-theme-accent hover:opacity-90 text-gray-950 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95"
              >
                Finish Setup <Check className="w-6 h-6 ml-2" />
              </button>
              {error && <p className="text-center text-[10px] text-theme-accent font-black uppercase tracking-[0.2em] animate-pulse">{error}</p>}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-8 text-center border-t border-theme-primary flex flex-col items-center gap-2">
        <div className="flex items-center text-[8px] font-black uppercase tracking-[0.4em] text-theme-secondary opacity-40">
           <ShieldCheck className="w-3 h-3 mr-2" /> Privacy Safe • Gauteng Edition
        </div>
      </div>
    </div>
  );
};
