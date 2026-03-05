import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding.tsx';
import MainNowScreen from './MainNowScreen.tsx';
import ExploreScreen from './ExploreScreen.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { InfoModal } from './components/InfoModal.tsx';
import { fetchVenues, loadProfileFromBackend, syncProfileWithBackend, getFavorites } from './services/sheetService.ts';
import { Venue, UserProfile, DistanceCategory, AppTheme } from './types.ts';
import { Key, Zap, Search, Settings, Loader2, Info } from 'lucide-react';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("onboarded") === "true");
  const [hasApiKey, setHasApiKey] = useState(true);
  
  // PRIMARY OPENING SCREEN: Explore
  const [activeTab, setActiveTab] = useState<'now' | 'explore'>('explore');
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Theme state: Defaulting to dark as per new aesthetic request
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('FAMILY_NOW_THEME') as AppTheme) || 'dark';
  });

  // Load User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('FAMILY_NOW_PROFILE');
    return saved ? JSON.parse(saved) : {
      id: crypto.randomUUID(),
      onboarded: false,
      kidsAgeMin: 7,
      kidsAgeMax: 10,
      maxDistanceBand: DistanceCategory.FAR,
      rainLookaheadHours: 2,
      indoorFirst: true,
      newsletterOptIn: false
    };
  });

  useEffect(() => {
    const init = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
      try {
        const data = await fetchVenues();
        setVenues(data);

        // Load profile from backend if onboarded
        const savedProfile = localStorage.getItem('FAMILY_NOW_PROFILE');
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          const backendData = await loadProfileFromBackend(p.id);
          if (backendData) {
            // Merge backend data if necessary, though loadProfileFromBackend updates localStorage
            // We might want to refresh the profile state if it changed
          }
        }
      } catch (e) {
        console.error("Failed to fetch venues", e);
      } finally {
        setLoadingVenues(false);
      }
    };
    init();
  }, []);

  // Sync theme to document body
  useEffect(() => {
    document.body.className = `bg-theme-primary text-theme-primary ${theme}`;
    localStorage.setItem('FAMILY_NOW_THEME', theme);
  }, [theme]);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setOnboarded(true);
  };

  const handleProfileUpdate = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('FAMILY_NOW_PROFILE', JSON.stringify(newProfile));
    localStorage.setItem("kids_age_min", String(newProfile.kidsAgeMin));
    localStorage.setItem("kids_age_max", String(newProfile.kidsAgeMax));
    
    // Sync with backend
    syncProfileWithBackend(newProfile.id, {
      favorites: getFavorites(),
      ratings: {} // Ratings are handled separately in saveUserRating but we could sync here too
    });
  };

  if (!hasApiKey) {
    return (
      <div className="fixed inset-0 z-[200] bg-space flex flex-col items-center justify-center p-8 text-center text-white font-sans">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className="relative flex flex-col items-center">
          <div className="w-20 h-20 bg-[#66FF66]/20 rounded-[2rem] flex items-center justify-center mb-8 border border-[#66FF66]/30">
            <Key className="w-10 h-10 text-[#66FF66]" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-4">API Key Required</h2>
          <p className="text-slate-400 text-sm font-medium mb-10 max-w-sm leading-relaxed">
            Advanced AI models are required to score your local venues accurately. Please select a valid API key to proceed.
          </p>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full max-w-xs py-5 bg-[#66FF66] hover:bg-[#66FF66]/90 text-[#0A0C10] rounded-[1.5rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (loadingVenues) {
    return (
      <div className="min-h-screen bg-space text-theme-primary flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div className="relative flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-theme-accent animate-spin mb-6" />
          <h2 className="text-xl font-black uppercase tracking-widest text-theme-accent">Syncing Master Database...</h2>
          <p className="text-theme-secondary text-[10px] font-bold mt-2 uppercase tracking-widest">Fetching 300+ Curated Gauteng Venues</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Logo and Title at top left */}
      <div className="w-full flex items-center pt-8 pb-2 px-8 gap-4">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="JB³Ai Kids Edition Logo"
          className="w-16 h-16 object-contain rounded-xl border border-theme-primary shadow-xl"
          style={{ background: 'rgba(0,0,0,0.01)' }}
        />
        <div className="flex flex-col">
          <span className="text-lg font-black uppercase tracking-tight text-theme-primary leading-none">JB³Ai Explore <span className="text-green-600">Gauteng</span></span>
          <span className="text-xs font-bold uppercase tracking-widest text-theme-secondary mt-1">Kids Edition</span>
        </div>
        <button
          onClick={() => setIsInfoOpen(true)}
          className="ml-auto w-10 h-10 flex items-center justify-center rounded-full bg-theme-secondary/60 hover:bg-theme-secondary border border-theme-primary text-theme-secondary hover:text-theme-primary transition-all"
          aria-label="App info"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
      <main className="pb-32">
        {activeTab === 'now' ? (
          <MainNowScreen venues={venues} profile={profile} theme={theme} />
        ) : (
          <ExploreScreen venues={venues} profile={profile} theme={theme} />
        )}
      </main>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-8 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-theme-secondary/90 backdrop-blur-2xl border border-theme-primary rounded-full p-2 flex items-center justify-between shadow-2xl">
            <button 
              onClick={() => setActiveTab('explore')}
              className={`flex-1 flex flex-col items-center py-3 rounded-full transition-all ${activeTab === 'explore' ? 'bg-theme-accent text-gray-950 shadow-lg' : 'text-theme-secondary hover:text-theme-primary'}`}
            >
              <Search className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest">Explore</span>
            </button>
            <button 
              onClick={() => setActiveTab('now')}
              className={`flex-1 flex flex-col items-center py-3 rounded-full transition-all ${activeTab === 'now' ? 'bg-theme-accent text-gray-950 shadow-lg' : 'text-theme-secondary hover:text-theme-primary'}`}
            >
              <Zap className={`w-5 h-5 mb-1 ${activeTab === 'now' ? 'fill-gray-950' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Now</span>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-14 flex flex-col items-center py-3 text-theme-secondary hover:text-theme-primary transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        profile={profile}
        onUpdate={handleProfileUpdate}
        theme={theme}
        onThemeChange={setTheme}
        onRefreshVenues={async () => {
          setLoadingVenues(true);
          const data = await fetchVenues(true);
          setVenues(data);
          setLoadingVenues(false);
          setIsSettingsOpen(false);
        }}
      />
    </div>
  );
};

export default App;