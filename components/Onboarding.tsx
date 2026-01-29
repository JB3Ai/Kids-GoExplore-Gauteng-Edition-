import React, { useState } from 'react';
import { UserProfile, DistanceCategory } from '../types';
// Fixed: GpsFixed does not exist in lucide-react, using LocateFixed instead
import { MapPin, Users, Mail, ChevronRight, LocateFixed, Check, Sparkles, Loader2, Info } from 'lucide-react';

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
    kidsAgeMin: 4,
    kidsAgeMax: 12,
    maxDistanceBand: DistanceCategory.MED,
    rainLookaheadHours: 2,
    newsletterOptIn: false,
    email: ''
  });

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          homeLat: pos.coords.latitude,
          homeLng: pos.coords.longitude
        }));
        setLoading(false);
        setStep(2);
      },
      (err) => {
        setError("Location denied. Please set your area manually.");
        setLoading(false);
        setStep(2); // Still proceed but without coordinates
      },
      { timeout: 10000 }
    );
  };

  const handleFinish = () => {
    const finalProfile = { ...formData, onboarded: true };
    onComplete(finalProfile);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white flex flex-col font-sans">
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 max-w-md mx-auto w-full">
        
        {/* Progress Dots */}
        <div className="flex space-x-2 mb-12">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-emerald-500' : 'w-2 bg-gray-800'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30">
                <MapPin className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                Where's the <span className="text-emerald-400">Home Base?</span>
              </h1>
              <p className="text-gray-400 font-medium leading-relaxed">
                We use your location to calculate distance bands and check real-time weather alerts for your area.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={requestLocation}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5 mr-3" />}
                Use Current GPS
              </button>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-gray-800"
              >
                Set Manually
              </button>
            </div>
            {error && <p className="text-center text-xs text-red-400 font-bold uppercase tracking-widest">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 w-full">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/30">
                <Users className="w-10 h-10 text-blue-400" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                The <span className="text-blue-400">Crew</span>
              </h1>
              <p className="text-gray-400 font-medium">Customize recommendations based on age and distance tolerance.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Kids Age Range</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-900 p-4 rounded-2xl border border-gray-800">
                    <span className="text-[8px] block font-black text-gray-600 mb-1 uppercase">Min</span>
                    <input 
                      type="number" 
                      value={formData.kidsAgeMin}
                      onChange={(e) => setFormData({...formData, kidsAgeMin: Number(e.target.value)})}
                      className="bg-transparent w-full text-xl font-black focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 bg-gray-900 p-4 rounded-2xl border border-gray-800">
                    <span className="text-[8px] block font-black text-gray-600 mb-1 uppercase">Max</span>
                    <input 
                      type="number" 
                      value={formData.kidsAgeMax}
                      onChange={(e) => setFormData({...formData, kidsAgeMax: Number(e.target.value)})}
                      className="bg-transparent w-full text-xl font-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Travel Threshold</label>
                <div className="flex p-1 bg-gray-900 rounded-2xl border border-gray-800">
                  {[DistanceCategory.NEAR, DistanceCategory.MED, DistanceCategory.FAR].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFormData({...formData, maxDistanceBand: d})}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formData.maxDistanceBand === d ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(3)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95"
            >
              Continue <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 w-full">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/30">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">
                The Friday <span className="text-indigo-400">Brief</span>
              </h1>
              <p className="text-gray-400 font-medium leading-relaxed">
                Join 1,200+ Gauteng families receiving a custom-scored weekend plan every Friday at 2PM.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-indigo-400" />
                <input 
                  type="email"
                  placeholder="family@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-900 rounded-2xl border border-gray-800 focus:border-indigo-500 outline-none font-bold text-sm transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value, newsletterOptIn: true})}
                />
              </div>

              <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex items-start gap-3">
                <Info className="w-4 h-4 text-gray-500 mt-1" />
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest">
                  Strictly one email a week. Computed against your specific distance and age preferences.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleFinish}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-xl active:scale-95"
              >
                Let's Go <Check className="w-5 h-5 ml-2" />
              </button>
              <button 
                onClick={handleFinish}
                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-8 text-center border-t border-gray-900">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-700">Family NOW • Gauteng Edition</span>
      </div>
    </div>
  );
};