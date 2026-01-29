
import React, { useState, useEffect, useMemo } from 'react';
import { Venue, DistanceCategory, Environment, AppTheme } from './types';
import { fetchVenues, getCachedVenues, getFavorites, toggleFavoriteVenue } from './services/sheetService';
import { VenueCard } from './components/VenueCard';
import { VenueDetails } from './components/VenueDetails';
import { WeatherSummary } from './components/WeatherSummary';
import { NowMode } from './components/NowMode';
import { Search, Compass, Loader2, WifiOff, SlidersHorizontal, RefreshCw, Clock, MapPin, Sun, Moon, Palette, Zap, PlayCircle, Filter, Banknote, Footprints, Map as MapIcon, Check, Database, Key, AlertCircle } from 'lucide-react';

type SortOption = 'distance' | 'name' | 'ref' | 'environment' | 'rating';

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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() => (localStorage.getItem('VS_THEME') as AppTheme) || 'pastel');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'BROWSE' | 'NOW'>('BROWSE');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [quotaAlert, setQuotaAlert] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<DistanceCategory | 'ALL'>('ALL');
  const [envFilter, setEnvFilter] = useState<Environment | 'ALL'>('ALL');
  const [costFilter, setCostFilter] = useState<string>('ALL');
  const [effortFilter, setEffortFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('ref');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  useEffect(() => {
    localStorage.setItem('VS_THEME', theme);
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      }
    };
    checkKey();

    const handleQuotaError = (e: any) => {
      setQuotaAlert(`Shared AI quota exhausted. Try using your own API key.`);
      setTimeout(() => setQuotaAlert(null), 8000);
    };
    
    const handleReauth = () => {
      setQuotaAlert("Pro model requires a paid API key. Please select yours.");
      handleSelectKey();
    };

    window.addEventListener('gemini-quota-error', handleQuotaError);
    window.addEventListener('gemini-reauth-required', handleReauth);

    setFavorites(getFavorites());

    const cached = getCachedVenues();
    if (cached) {
      setVenues(cached);
      setLoading(false);
      setLastUpdated(new Date());
    }

    const load = async () => {
      try {
        const data = await fetchVenues();
        setVenues(data);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (error) {
        if (!cached) setLoading(false);
      }
    };
    load();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('gemini-quota-error', handleQuotaError);
      window.removeEventListener('gemini-reauth-required', handleReauth);
    };
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setQuotaAlert(null);
      if (viewMode === 'BROWSE') handleRefresh();
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setSyncStatus("Syncing with Google Sheets...");
    try {
      const data = await fetchVenues(true);
      setVenues(data);
      setLastUpdated(new Date());
      setSyncStatus(`Successfully synced ${data.length} venues.`);
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus("Sync failed. Using local cache.");
      setTimeout(() => setSyncStatus(null), 3000);
      console.error("Refresh failed", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRatingUpdate = (ref: string, rating: number) => {
    setVenues(prev => prev.map(v => 
      v.ref === ref ? { ...v, userRating: rating } : v
    ));
    if (selectedVenue && selectedVenue.ref === ref) {
      setSelectedVenue({ ...selectedVenue, userRating: rating });
    }
  };

  const handleToggleFavorite = (ref: string) => {
    const newFavorites = toggleFavoriteVenue(ref);
    setFavorites([...newFavorites]);
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    venues.forEach(v => v.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [venues]);

  const allAreas = useMemo(() => {
    const areas = new Set<string>();
    venues.forEach(v => {
      if (v.area) areas.add(v.area);
      else if (v.location) areas.add(v.location.split(',')[0].trim());
    });
    return Array.from(areas).sort();
  }, [venues]);

  const filteredVenues = useMemo(() => {
    let result = venues.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.ref.includes(searchQuery);
      
      const matchesDistance = distanceFilter === 'ALL' || v.distance === distanceFilter;
      const matchesEnv = envFilter === 'ALL' || v.environment === envFilter;
      const matchesCost = costFilter === 'ALL' || v.costBand === costFilter;
      const matchesEffort = effortFilter === 'ALL' || v.effortLevel === effortFilter;
      const matchesArea = areaFilter === 'ALL' || v.area === areaFilter || v.location.includes(areaFilter);
      const matchesTags = activeTags.length === 0 || activeTags.every(t => v.tags.includes(t));
      
      return matchesSearch && matchesDistance && matchesEnv && matchesCost && matchesEffort && matchesArea && matchesTags;
    });

    result.sort((a, b) => {
      if (sortBy === 'distance') {
        const order = { [DistanceCategory.NEAR]: 0, [DistanceCategory.MED]: 1, [DistanceCategory.FAR]: 2 };
        return order[a.distance] - order[b.distance];
      }
      if (sortBy === 'rating') {
        const getAvg = (v: Venue) => v.userRating ? (v.googleRating + v.userRating) / 2 : v.googleRating;
        return getAvg(b) - getAvg(a);
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.ref.localeCompare(b.ref);
    });

    return result;
  }, [venues, searchQuery, distanceFilter, envFilter, costFilter, effortFilter, areaFilter, activeTags, sortBy]);

  const themeClasses = {
    light: 'bg-white text-gray-900',
    dark: 'bg-gray-950 text-white dark',
    pastel: 'bg-[#f0f7f4] text-[#2d4a3e] pastel',
    amber: 'bg-[#fffaf0] text-[#451a03] amber'
  };

  const themeOptions: { id: AppTheme, label: string, icon: any, color: string }[] = [
    { id: 'light', label: 'Classic', icon: Sun, color: 'bg-blue-500' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, color: 'bg-gray-800' },
    { id: 'pastel', label: 'Pastel Mint', icon: Zap, color: 'bg-emerald-400' },
    { id: 'amber', label: 'Warm Amber', icon: Palette, color: 'bg-amber-500' }
  ];

  if (viewMode === 'NOW') {
    return <NowMode venues={venues} onBack={() => setViewMode('BROWSE')} />;
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen ${themeClasses[theme]} px-6 text-center transition-colors duration-500`}>
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
        <h1 className="text-xl font-black tracking-widest uppercase">Initializing Explorer</h1>
        <p className="text-gray-400 mt-2 font-bold text-xs uppercase">Connecting to Gauteng Cloud...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${themeClasses[theme]} pb-24`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 py-4 ${theme === 'dark' ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl shadow-lg transition-all ${theme === 'pastel' ? 'bg-[#5ba388] text-white' : 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'}`}>
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase leading-none mb-1">Explorer</h1>
              <div className="flex items-center text-[9px] font-black uppercase tracking-widest opacity-60">
                <MapPin className="w-2.5 h-2.5 mr-1" /> Gauteng, ZA
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 relative">
            <button 
              onClick={handleSelectKey}
              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${hasCustomKey ? 'bg-emerald-500 border-emerald-400 text-white' : (theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600')}`}
            >
              <Key size={16} />
              {!hasCustomKey && <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Set Key</span>}
            </button>

            <button 
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`p-2 rounded-xl flex items-center gap-2 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
            >
              <Palette size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Theme</span>
            </button>

            {showThemeMenu && (
              <div className={`absolute top-full right-0 mt-2 w-48 rounded-2xl shadow-2xl border p-2 z-50 animate-in slide-in-from-top-2 fade-in ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
                {themeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setTheme(opt.id); setShowThemeMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${theme === opt.id ? 'bg-gray-100 dark:bg-gray-800' : 'text-gray-500'}`}
                  >
                    {opt.label}
                    {theme === opt.id && <Check size={14} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {syncStatus && (
          <div className={`mb-4 p-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top border ${theme === 'pastel' ? 'bg-[#2d4a3e] text-white border-[#1a2e26]' : 'bg-blue-600 text-white border-blue-500'}`}>
            <Database className={`w-4 h-4 ${isRefreshing ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest flex-1">{syncStatus}</span>
            {isRefreshing && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
        )}

        {quotaAlert && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-bold">{quotaAlert}</p>
          </div>
        )}

        <div className="flex items-stretch gap-2 mb-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search venues..."
              className={`w-full pl-11 pr-4 py-4 rounded-2xl text-sm outline-none font-bold border transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : (theme === 'pastel' ? 'bg-white border-[#e2ede8]' : 'bg-gray-50 border-gray-100 focus:bg-white')}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-4 rounded-2xl flex items-center justify-center gap-2 border font-black uppercase tracking-widest text-[10px] whitespace-nowrap active:scale-95 disabled:opacity-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-blue-400' : (theme === 'pastel' ? 'bg-white border-[#e2ede8] text-[#5ba388]' : 'bg-white border-gray-200 text-blue-600')}`}
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            <span className="hidden sm:inline">Fetch from Sheet</span>
          </button>
        </div>

        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
             <div className={`flex items-center rounded-xl px-3 py-2 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 mr-2" />
              <select 
                className="text-[10px] font-black bg-transparent border-none outline-none uppercase tracking-widest cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="ref">By Ref</option>
                <option value="name">By Name</option>
                <option value="distance">By Distance</option>
                <option value="rating">By Rating</option>
              </select>
            </div>
            {['ALL', DistanceCategory.NEAR, DistanceCategory.MED, DistanceCategory.FAR].map(d => (
              <button 
                key={d}
                onClick={() => setDistanceFilter(d as any)}
                className={`flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${distanceFilter === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4">
        {!searchQuery && distanceFilter === 'ALL' && <WeatherSummary />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVenues.map((venue) => (
            <VenueCard 
              key={venue.ref} 
              venue={venue} 
              onClick={setSelectedVenue} 
              isFavorite={favorites.includes(venue.ref)}
              onToggleFavorite={() => handleToggleFavorite(venue.ref)}
            />
          ))}
        </div>

        {filteredVenues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Filter className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-widest text-gray-400">No Venues Found</h3>
          </div>
        )}
      </main>

      {lastUpdated && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className={`px-5 py-2.5 rounded-2xl flex items-center shadow-2xl border text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${theme === 'dark' ? 'bg-gray-900/90 border-gray-700 text-blue-400' : 'bg-white/90 border-gray-100 text-blue-600'}`}>
            <Zap className="w-3.5 h-3.5 mr-2 animate-pulse" />
            {venues.length} Venues • Synced {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}

      {selectedVenue && (
        <VenueDetails venue={selectedVenue} onClose={() => setSelectedVenue(null)} onRatingUpdate={handleRatingUpdate} />
      )}
    </div>
  );
};

export default App;
