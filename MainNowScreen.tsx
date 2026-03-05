
import React, { useEffect, useMemo, useState } from "react";
import { getRainModeOpenMeteo } from "./lib/weather.ts";
import { getDistanceKm, bandFromKm, DistanceBand } from "./lib/geo.ts";
import { makeIcsEvent, downloadIcs } from "./lib/ics.ts";
import { getFavorites, toggleFavoriteVenue } from "./services/sheetService.ts";
import { 
  Zap, MapPin, Navigation, Calendar, Sun, Umbrella, Loader2, 
  Sparkles, Users, Info, Globe, Waves, PawPrint, Utensils, 
  Leaf, Gamepad2, Library, GraduationCap, InfoIcon, Heart, Share2 
} from "lucide-react";
import { Venue, UserProfile, DistanceCategory, AppTheme } from "./types.ts";

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

function getNowContext() {
  const now = new Date();
  const dow = now.getDay();
  const h = now.getHours();
  let dayType: "Friday" | "Saturday" | "Sunday" | "Holiday" | "Weekday" = "Weekday";
  if (dow === 5) dayType = "Friday";
  else if (dow === 6) dayType = "Saturday";
  else if (dow === 0) dayType = "Sunday";
  let timeBlock: "Morning" | "Afternoon" | "Evening" = "Morning";
  if (h >= 12 && h < 17) timeBlock = "Afternoon";
  else if (h >= 17) timeBlock = "Evening";
  return { now, dayType, timeBlock };
}

function isRainSafe(v: Venue): boolean {
  return !!(v.indoor || v.covered || (v.subcategory || "").toLowerCase().includes("indoor") || v.environment === "Indoor");
}

function ageOk(v: Venue, minA: number, maxA: number): boolean {
  const vMin = v.ageMin ?? 0;
  const vMax = v.ageMax ?? 99;
  return vMin <= maxA && vMax >= minA;
}

function scoreVenue(params: {
  v: Venue;
  ctx: ReturnType<typeof getNowContext>;
  rainMode: boolean;
  km: number | undefined;
  band: DistanceBand;
  kidsMin: number;
  kidsMax: number;
}): { score: number; why: string[] } {
  const { v, ctx, rainMode, km, band, kidsMin, kidsMax } = params;
  if ((v.status || "UNKNOWN") !== "OPEN") return { score: 0, why: ["Closed"] };
  if (!ageOk(v, kidsMin, kidsMax)) return { score: 0, why: ["Age mismatch"] };
  if (rainMode && !isRainSafe(v)) return { score: 0, why: ["Not rain-safe"] };
  let s = 0;
  const why: string[] = [];
  s += 25;
  if (rainMode) {
    if (isRainSafe(v)) { s += 20; why.push("Rain-Safe"); }
  } else {
    if (v.environment === "Outdoor") { s += 15; why.push("Outdoor Fun"); }
    else { s += 10; }
  }
  if (band === "🟢") { s += 25; why.push("Nearby"); }
  else if (band === "🟡") { s += 12; why.push("Gauteng-wide Pick"); }
  if (v.effortLevel === "DropIn") { s += 15; why.push("No-Booking Needed"); }
  else if (v.effortLevel === "Booked") { s += 8; }
  if (v.energyLevel === "High") { s += 10; why.push("High Energy"); }
  else { s += 5; }
  return { score: Math.min(100, s), why: Array.from(new Set(why)).slice(0, 3) };
}

interface MainNowScreenProps {
  venues: Venue[];
  profile: UserProfile;
  theme: AppTheme;
}

export default function MainNowScreen({ venues, profile, theme }: MainNowScreenProps) {
  const [loading, setLoading] = useState(true);
  const [rainMode, setRainMode] = useState(false);
  const [rainReason, setRainReason] = useState("");
  const [selectedChip, setSelectedChip] = useState("All");
  const [results, setResults] = useState<(Venue & { km?: number; band: DistanceBand; score: number; why: string[] })[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());

  const kidsMin = profile.kidsAgeMin;
  const kidsMax = profile.kidsAgeMax;
  const lookahead = profile.rainLookaheadHours;

  useEffect(() => {
    async function init() {
      setLoading(true);
      const lat = Number(localStorage.getItem("last_lat")) || -26.2041;
      const lng = Number(localStorage.getItem("last_lng")) || 28.0473;
      const w = await getRainModeOpenMeteo(lat, lng, lookahead);
      setRainMode(w.rainMode);
      setRainReason(w.reason);
      const ctx = getNowContext();
      const scoredList: any[] = [];
      for (const v of venues) {
        if (!venueMatchesChip(v, selectedChip)) continue;
        let km: number | undefined = undefined;
        let band: DistanceBand = "🔴";
        if (v.lat && v.lng && v.lat !== 0) {
          km = getDistanceKm(lat, lng, v.lat, v.lng);
          band = bandFromKm(km);
        } else {
          if (v.distance === DistanceCategory.NEAR) band = "🟢";
          else if (v.distance === DistanceCategory.MED) band = "🟡";
          else band = "🔴";
        }
        const scored = scoreVenue({ v, ctx, rainMode: w.rainMode, km, band, kidsMin, kidsMax });
        if (scored.score > 0) {
          scoredList.push({ ...v, km, band, score: scored.score, why: scored.why });
        }
      }
      const sorted = scoredList.sort((a, b) => b.score - a.score).slice(0, 7);
      setResults(sorted);
      setLoading(false);
    }
    init();
  }, [venues, profile, lookahead, kidsMin, kidsMax, selectedChip]);

  const toggleFavorite = (ref: string) => {
    const newFavorites = toggleFavoriteVenue(ref);
    setFavorites([...newFavorites]);
  };

  const handleShare = async (v: Venue) => {
    const shareData = {
      title: `Check out ${v.name}`,
      text: `I found this great place in Gauteng: ${v.name}. ${v.description}`,
      url: v.url || window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const addToCalendar = (p: Venue) => {
    const start = new Date(Date.now() + 30 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const ics = makeIcsEvent({
      uid: `now-${p.ref}@familynow`,
      start, end,
      summary: `Do this now: ${p.name}`,
      location: p.address || p.area || p.location || "Gauteng",
      description: `Tip: ${p.insiderTip || "Enjoy!"}`
    });
    downloadIcs(`now-${p.ref}.ics`, ics);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary text-theme-primary flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-theme-accent/10 blur-3xl animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-theme-accent animate-spin relative" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-theme-accent">Syncing Gauteng...</h2>
        <p className="text-theme-secondary text-[10px] font-black mt-4 uppercase tracking-[0.2em] max-w-xs leading-loose">
          Fresh GPS Lookup • Rain Mode Probe • Scoring {venues.length} Curated Venues
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary font-sans selection:bg-theme-accent/30">
      <header className="sticky top-0 z-30 bg-theme-header backdrop-blur-xl border-b border-theme-primary p-6 space-y-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="JB³Ai Logo" 
              className="w-12 h-12 rounded-2xl object-cover border border-theme-primary shadow-lg"
            />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-theme-primary">Do This <span className="text-theme-accent">Now.</span></h1>
              <div className="flex items-center text-[9px] font-black uppercase tracking-widest text-theme-secondary gap-2">
                <Users className="w-3 h-3" /> Kids {kidsMin}-{kidsMax}
              </div>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-theme-accent/10 text-theme-accent border border-theme-accent/20 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedChip(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                selectedChip === cat.id 
                ? 'bg-theme-accent border-theme-accent text-gray-950 shadow-lg shadow-theme-accent/20' 
                : 'bg-theme-secondary border-theme-primary text-theme-secondary hover:text-theme-primary hover:border-theme-accent/40'
              }`}
            >
              <cat.icon className={`w-3.5 h-3.5 ${selectedChip === cat.id ? 'text-gray-950' : 'text-theme-accent'}`} />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="bg-theme-secondary/50 border border-theme-primary rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="p-3 rounded-2xl bg-theme-accent/10 text-theme-accent">
            <InfoIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-theme-primary mb-1">How "Now" Works</h4>
            <p className="text-[10px] font-medium text-theme-secondary leading-relaxed opacity-70">
              This secondary mode uses real-time GPS and local weather to find perfect activities for right now. We scan for open venues and rain-safe spots so you don't have to.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-4">
        <div className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${rainMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-theme-accent/10 border-theme-accent/20 text-theme-accent'}`}>
          <div className="flex items-center gap-3">
            {rainMode ? <Umbrella className="w-5 h-5 animate-bounce" /> : <Sun className="w-5 h-5" />}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{rainMode ? 'Rain Mode Active' : 'Fair Skies'}</p>
              <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">{rainReason}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-theme-primary/50 rounded-full border border-theme-primary text-[8px] font-black uppercase tracking-widest text-theme-secondary">
            <Sparkles className="w-3 h-3" /> Scored by AI
          </div>
        </div>
      </div>

      <main className="px-6 space-y-6 max-w-2xl mx-auto mt-4">
        {results.length === 0 ? (
          <div className="py-20 bg-theme-secondary/40 rounded-[2.5rem] border-2 border-theme-primary border-dashed flex flex-col items-center text-center px-10">
            <Info className="w-12 h-12 text-theme-secondary mb-6" />
            <p className="text-theme-secondary font-black uppercase tracking-widest mb-4">No Perfect Matches</p>
            <p className="text-theme-secondary text-xs font-bold leading-relaxed max-w-xs opacity-60">
              {selectedChip === 'All' 
                ? "Nothing currently fits your crew and weather conditions. Check back soon!"
                : `No "${selectedChip}" venues currently fit your profile and conditions.`}
            </p>
            {selectedChip !== 'All' && (
              <button onClick={() => setSelectedChip('All')} className="mt-6 text-theme-accent text-[10px] font-black uppercase tracking-widest hover:underline">
                Show All Categories
              </button>
            )}
          </div>
        ) : (
          results.map((v, idx) => (
            <div key={v.ref} className="group relative bg-theme-secondary rounded-[2.5rem] border border-theme-primary overflow-hidden hover:border-theme-accent/30 transition-all duration-500 shadow-2xl">
              <div className="absolute top-6 left-6 z-10 w-12 h-12 rounded-2xl bg-theme-primary/90 backdrop-blur-md border border-theme-primary flex items-center justify-center font-black text-theme-accent text-xl">
                {idx + 1}
              </div>

              <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(v.ref);
                  }}
                  className="p-3 rounded-2xl bg-theme-primary/90 backdrop-blur-md border border-theme-primary transition-all active:scale-90"
                >
                  <Heart className={`w-5 h-5 transition-all duration-300 ${favorites.includes(v.ref) ? 'fill-red-500 text-red-500 scale-110' : 'text-theme-secondary'}`} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(v);
                  }}
                  className="p-3 rounded-2xl bg-theme-primary/90 backdrop-blur-md border border-theme-primary transition-all active:scale-90"
                >
                  <Share2 className="w-5 h-5 text-theme-secondary" />
                </button>
              </div>

              <div className="p-8 pt-20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-theme-primary leading-none mb-2 group-hover:text-theme-accent transition-colors uppercase tracking-tight">{v.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-theme-secondary font-black uppercase tracking-widest flex items-center">
                        <MapPin className="w-3 h-3 mr-1.5" /> {v.area || v.city || v.location}
                      </span>
                      <span className="text-[10px] text-theme-accent/80 font-black uppercase tracking-tighter bg-theme-accent/5 px-2 py-0.5 rounded-lg border border-theme-accent/10">
                        {v.km ? `${v.km.toFixed(1)} km` : v.band === '🟢' ? 'Nearby' : 'Gauteng-wide'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-3xl font-black text-theme-accent opacity-20 group-hover:opacity-40 transition-opacity leading-none">{v.score}</div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-theme-secondary opacity-50">FIT %</span>
                  </div>
                </div>

                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-theme-accent/70 mb-8 bg-theme-accent/5 p-4 rounded-[1.5rem] border border-theme-accent/10 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {v.why.join(" • ") || "Overall high fit"}
                </div>

                {v.insiderTip && (
                  <p className="text-xs text-theme-secondary font-medium mb-8 leading-relaxed italic opacity-80">
                    "{v.insiderTip}"
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => addToCalendar(v)}
                    className="flex items-center justify-center py-4 bg-theme-accent hover:opacity-90 text-gray-950 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Quick Add
                  </button>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + " " + (v.area || v.city || v.location))}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center py-4 bg-theme-primary hover:opacity-90 text-theme-primary rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all border border-theme-primary active:scale-95"
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Go Now
                  </a>
                </div>
              </div>
              
              <div className="h-1 bg-theme-primary w-full overflow-hidden">
                <div className="h-full bg-theme-accent transition-all duration-1000 ease-out" style={{ width: `${v.score}%` }}></div>
              </div>
            </div>
          ))
        )}
      </main>

      <div className="py-12 flex justify-center">
        <div className="bg-theme-secondary/90 backdrop-blur-xl px-6 py-3 rounded-full border border-theme-primary shadow-2xl">
          <span className="text-[9px] font-black text-theme-secondary uppercase tracking-[0.4em]">
             Family NOW <span className="text-theme-accent mx-2">•</span> Gauteng Edition
          </span>
        </div>
      </div>
    </div>
  );
}
