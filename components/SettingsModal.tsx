import React, { useState } from 'react';
import { X, Users, MapPin, Umbrella, LogOut, RefreshCw, ShieldCheck, Sun, Moon, Palette, Zap, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { UserProfile, DistanceCategory, AppTheme } from '../types.ts';
import { clearImageCache } from '../services/imageService.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onRefreshVenues: () => Promise<void>;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, profile, onUpdate, onRefreshVenues, theme, onThemeChange 
}) => {
  const [clearingImages, setClearingImages] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm("Reset all settings and onboarding? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClearImages = async () => {
    if (confirm("This will clear all saved venue photos. They will be regenerated when you next view them. Proceed?")) {
      setClearingImages(true);
      await clearImageCache();
      setClearingImages(false);
      alert("Image cache cleared successfully.");
    }
  };

  const updateAge = (type: 'min' | 'max', delta: number) => {
    const newProfile = { ...profile };
    if (type === 'min') newProfile.kidsAgeMin = Math.max(0, Math.min(profile.kidsAgeMin + delta, profile.kidsAgeMax));
    else newProfile.kidsAgeMax = Math.max(profile.kidsAgeMin, Math.min(profile.kidsAgeMax + delta, 18));
    onUpdate(newProfile);
  };

  const themes: { id: AppTheme, label: string, icon: any }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'pastel', label: 'Pastel', icon: Palette },
    { id: 'amber', label: 'Amber', icon: Zap },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-theme-secondary border-t sm:border border-theme-primary sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        <header className="p-6 border-b border-theme-primary flex items-center justify-between bg-theme-secondary/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-theme-primary text-theme-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-theme-primary">App Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-primary rounded-full text-theme-secondary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Theme Switcher */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-secondary flex items-center">
              <Palette className="w-3 h-3 mr-2" /> Visual Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    theme === t.id 
                    ? 'bg-theme-accent border-theme-accent text-white' 
                    : 'bg-theme-primary border-theme-primary text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <t.icon className="w-5 h-5 mb-2" />
                  <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kids Age */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-secondary flex items-center">
              <Users className="w-3 h-3 mr-2" /> Crew Profile
            </label>
            <div className="bg-theme-primary/50 p-4 rounded-3xl border border-theme-primary flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-theme-secondary uppercase tracking-widest opacity-50">Age Range</span>
                <p className="text-lg font-black text-theme-accent">{profile.kidsAgeMin} – {profile.kidsAgeMax} years</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <button onClick={() => updateAge('min', 1)} className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center text-xs font-bold border border-theme-primary">+</button>
                  <button onClick={() => updateAge('min', -1)} className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center text-xs font-bold border border-theme-primary">-</button>
                </div>
                <div className="w-px h-10 bg-theme-primary mx-1" />
                <div className="flex flex-col gap-1">
                  <button onClick={() => updateAge('max', 1)} className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center text-xs font-bold border border-theme-primary">+</button>
                  <button onClick={() => updateAge('max', -1)} className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center text-xs font-bold border border-theme-primary">-</button>
                </div>
              </div>
            </div>
          </div>

          {/* Storage & Images */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-secondary flex items-center">
              <ImageIcon className="w-3 h-3 mr-2" /> Storage & Images
            </label>
            <button 
              onClick={handleClearImages}
              disabled={clearingImages}
              className="w-full flex items-center justify-between p-4 bg-theme-primary border border-theme-primary rounded-2xl hover:bg-theme-secondary transition-all group"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-theme-secondary group-hover:text-red-500 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-theme-secondary">Clear Image Cache</span>
              </div>
              {clearingImages && <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />}
            </button>
          </div>

          {/* Data Actions */}
          <div className="pt-4 space-y-3">
            <button 
              onClick={onRefreshVenues}
              className="w-full flex items-center justify-center gap-3 py-4 bg-theme-primary hover:opacity-80 text-theme-primary rounded-2xl text-[10px] font-black uppercase tracking-widest border border-theme-primary transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Sync Sheet Data
            </button>
            <button 
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <LogOut className="w-4 h-4" /> Reset Application
            </button>
          </div>
        </div>
        
        <footer className="p-6 bg-theme-primary/50 text-center border-t border-theme-primary">
          <p className="text-[8px] font-black text-theme-secondary uppercase tracking-[0.4em] opacity-40">Family NOW Gauteng • Ver 2.3.0</p>
        </footer>
      </div>
    </div>
  );
};