
import React, { useState, useMemo } from 'react';
import { VenueCard } from './components/VenueCard.tsx';
import { VenueDetails } from './components/VenueDetails.tsx';
import { 
  Search, MapPin, X, Info, Globe, Waves, PawPrint, 
  Utensils, Zap, Leaf, Gamepad2, Library, GraduationCap,
  LayoutGrid, List, Grid, PlusCircle
} from 'lucide-react';
import { getFavorites, toggleFavoriteVenue } from './services/sheetService.ts';
import { Venue, UserProfile, AppTheme } from './types.ts';

const CHIP_MAP: Record<string, string[]> = {
  All: [],
  Water: ["2. 🌊 WATERPARKS (34–54)", "Water", "Waterpark", "Splash", "Swimming"],
  Animals: ["1. ANIMALS", "Animals", "Wildlife", "Farm", "Zoo", "Bird"],
  Food: ["4. 🍕 RESTAURANTS (110–161)", "Food", "Dining", "Market", "9. 🛍️ MALLS & MARKETS (298–312)", "Cafe", "Restaurant"],
  Active: ["3. 🤸‍♂️ ACTIVITIES & ADRENALINE (55–109)", "Active", "Active Play", "Trampoline", "Climbing", "Sports"],
  Nature: ["6. 🌳 NATURE, PARKS & HIKING (211–239)", "Nature", "Park", "Hiking", "Outdoors"],
  Play: ["3. 🤸‍♂️ ACTIVITIES & ADRENALINE (55–109)", "2. 🌊 WATERPARKS (34–54)", "9. 🛍️ MALLS & MARKETS (298–312)", "Play", "Indoor Play", "Playground"],
  Culture: ["5. 🏛️ MUSEUMS (162–210)", "7. 💎 HIDDEN GEMS, HOBBIES & SKILLS (240–283)", "Culture", "Museum", "History", "Art"],
  "Edu-tainment": ["5. 🏛️ MUSEUMS (162–210)", "7. 💎 HIDDEN GEMS, HOBBIES & SKILLS (240–283)", "1. ANIMALS", "Edu-tainment", "Education", "Science", "Learning"]
};

const CATEGORIES = [
  { id: "All", label: "All", icon: Globe },
  { id: "Water", label: "Water", icon: Waves },
  { id: "Animals", label: "Animals", icon: PawPrint },
  { id: "Food", label: "Food", icon: Utensils },
  { id: "Active", label: "Active", icon: Zap },
  { id: "Nature", label: "Nature", icon: Leaf },
  { id: "Play", label: "Play", icon: Gamepad2 },
  { id: "Culture", label: "Culture", icon: Library },
  { id: "Edu-tainment", label: "Edu", icon: GraduationCap }
];

function venueMatchesChip(v: Venue, chipId: string) {
  if (chipId === "All") return true;
  const keywords = CHIP_MAP[chipId] || [];
  const searchTargets = [
    v.category,
    v.subcategory,
    ...(v.tags || [])
  ].filter(Boolean).map(s => s!.toLowerCase());

  return keywords.some(k => 
    searchTargets.some(t => t.includes(k.toLowerCase()))
  );
}

interface ExploreScreenProps {
  venues: Venue[];
  profile: UserProfile;
  theme: AppTheme;
}

export default function ExploreScreen({ venues, profile, theme }: ExploreScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());
  const [viewMode, setViewMode] = useState<'expanded' | 'list' | 'compact'>('expanded');

  const filteredVenues = useMemo(() => {
    return venues.filter(v => {
      if (!venueMatchesChip(v, selectedCategory)) return false;
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.area || v.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (v.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
      const ageMatches = v.ageMin !== undefined && v.ageMax !== undefined 
        ? (v.ageMin <= profile.kidsAgeMax && v.ageMax >= profile.kidsAgeMin) 
        : true;
      return ageMatches;
    });
  }, [venues, searchQuery, selectedCategory, profile]);

  const toggleFavorite = (ref: string) => {
    const newFavorites = toggleFavoriteVenue(ref);
    setFavorites([...newFavorites]);
  };

  const handleAddVenue = () => {
    const subject = encodeURIComponent("New Venue Suggestion - Family NOW Gauteng");
    const body = encodeURIComponent(
      "Hi JB³Ai Team,\n\n" +
      "I'd like to suggest a new venue for the Family NOW Gauteng app:\n\n" +
      "Venue Name: \n" +
      "Location/Area: \n" +
      "Description: \n" +
      "Why kids love it: \n" +
      "Website/Social Link: \n\n" +
      "Thanks!"
    );
    window.location.href = `mailto:hi@jb3ai.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary font-sans">
      <header className="sticky top-0 z-30 bg-theme-header backdrop-blur-xl border-b border-theme-primary p-6 space-y-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="JB³Ai Kids Edition Logo" 
              className="w-10 h-10 rounded-lg object-cover border border-theme-primary"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-1">JB³Ai Explore <span className="text-theme-accent">Gauteng</span></h1>
              <span className="text-[10px] font-black text-theme-secondary uppercase tracking-widest">Kids edition</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAddVenue}
              className="flex items-center gap-2 px-3 py-2 bg-theme-accent/10 text-theme-accent border border-theme-accent/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-theme-accent/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Venue
            </button>
            <div className="flex bg-theme-secondary p-1 rounded-xl border border-theme-primary shadow-sm">
              <button 
                onClick={() => setViewMode('expanded')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'expanded' ? 'bg-theme-accent text-white shadow-md' : 'text-theme-secondary hover:text-theme-primary'}`}
                title="Expanded View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-theme-accent text-white shadow-md' : 'text-theme-secondary hover:text-theme-primary'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-theme-accent text-white shadow-md' : 'text-theme-secondary hover:text-theme-primary'}`}
                title="Compact View"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-black text-theme-secondary uppercase tracking-widest bg-theme-secondary px-3 py-1 rounded-full border border-theme-primary shadow-sm">
              {filteredVenues.length} {filteredVenues.length === 1 ? 'Venue' : 'Venues'}
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary group-focus-within:text-theme-accent transition-colors" />
          <input 
            type="text"
            placeholder="Search names, areas, or activities..."
            className="w-full bg-theme-secondary border border-theme-primary rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-theme-primary outline-none focus:border-theme-accent transition-all placeholder:text-theme-secondary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-theme-primary/10 rounded-md transition-all">
              <X className="w-4 h-4 text-theme-secondary" />
            </button>
          )}
        </div>

        <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                selectedCategory === cat.id 
                ? 'bg-theme-accent border-theme-accent text-white shadow-lg shadow-theme-accent/20' 
                : 'bg-theme-secondary border-theme-primary text-theme-secondary hover:text-theme-primary hover:border-theme-accent/40'
              }`}
            >
              <cat.icon className={`w-3.5 h-3.5 ${selectedCategory === cat.id ? 'text-white' : 'text-theme-accent'}`} />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <main className={`max-w-2xl mx-auto p-6 grid gap-6 ${
        viewMode === 'list' ? 'grid-cols-1' : 
        viewMode === 'compact' ? 'grid-cols-2 sm:grid-cols-3' : 
        'grid-cols-1 sm:grid-cols-2'
      }`}>
        {filteredVenues.length === 0 ? (
          <div className="col-span-full py-20 bg-theme-secondary/40 rounded-[2.5rem] border-2 border-theme-primary border-dashed flex flex-col items-center text-center px-10">
            <Info className="w-12 h-12 text-theme-secondary mb-6" />
            <p className="text-theme-secondary font-black uppercase tracking-widest mb-4">No results found</p>
            <p className="text-theme-secondary text-xs font-bold leading-relaxed max-w-xs opacity-60">
              Try adjusting your search query or picking a different category.
            </p>
          </div>
        ) : (
          filteredVenues.map(venue => (
            <VenueCard 
              key={venue.ref}
              venue={venue}
              isFavorite={favorites.includes(venue.ref)}
              onToggleFavorite={() => toggleFavorite(venue.ref)}
              onClick={(v) => setSelectedVenue(v)}
              viewMode={viewMode}
            />
          ))
        )}
      </main>

      {selectedVenue && (
        <VenueDetails 
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onRatingUpdate={() => {}}
          isFavorite={favorites.includes(selectedVenue.ref)}
          onToggleFavorite={() => toggleFavorite(selectedVenue.ref)}
        />
      )}
    </div>
  );
}
