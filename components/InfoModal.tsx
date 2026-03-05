import React from "react";
import { X, Search, Zap, Settings, MapPin, Star, Heart, Umbrella, Sun } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 pt-6 pb-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">How It Works</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 space-y-6">
          {/* Overview */}
          <section className="pt-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong className="text-green-400">Kids GoExplore Gauteng</strong> helps families discover 300+ curated kid-friendly venues across Gauteng — scored by distance, weather, age, and real-time context so you always know where to go <em>right now</em>.
            </p>
          </section>

          {/* Tabs */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-400">The Two Tabs</h3>

            <div className="flex items-start gap-3 bg-gray-800/60 rounded-2xl p-4">
              <div className="w-9 h-9 flex-shrink-0 rounded-full bg-green-500/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Explore</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-1">
                  Browse all venues. Filter by category chips (Water, Animals, Food, Active, Nature, Play, Culture, Edu). Search by name. Tap a card to see full details, directions, and insider tips.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-800/60 rounded-2xl p-4">
              <div className="w-9 h-9 flex-shrink-0 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Now</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-1">
                  AI-scored suggestions based on day, time, weather, and your kids' ages. Perfect for spontaneous outings — the app figures out the best fit right now.
                </p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-400">Key Features</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: MapPin, color: "text-blue-400", label: "Distance sorting from your location" },
                { icon: Umbrella, color: "text-cyan-400", label: "Rain-aware — prioritises indoor when wet" },
                { icon: Sun, color: "text-amber-400", label: "Live weather shown at the top" },
                { icon: Star, color: "text-yellow-400", label: "Rate venues to personalise results" },
                { icon: Heart, color: "text-pink-400", label: "Favourite venues for quick access" },
                { icon: Settings, color: "text-gray-400", label: "Settings: age range, theme, distance prefs" },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-3 py-2 px-3 rounded-xl">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                  <span className="text-xs text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Tips */}
          <section className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-green-400">Quick Tips</h3>
            <ul className="space-y-2 text-xs text-gray-400 leading-relaxed list-disc list-inside">
              <li>Allow location access for accurate distance & weather data.</li>
              <li>Set your kids' age range in Settings to filter appropriate venues.</li>
              <li>Use the <strong className="text-white">Now</strong> tab on weekends for instant family plans.</li>
              <li>Tap any venue card for full details, Google Maps link, and insider tips.</li>
            </ul>
          </section>

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">JB³Ai · Kids Edition · Gauteng</p>
          </div>
        </div>
      </div>
    </div>
  );
};
