
import React, { useState, useEffect } from 'react';
import { Venue } from '../types';
import { DistanceBadge } from './DistanceBadge';
import { MapPin, ChevronRight, Image as ImageIcon, Sparkles, Loader2, Heart, Search } from 'lucide-react';
import { StarRating } from './StarRating';
import { generateVenueImage } from '../services/imageService';

interface VenueCardProps {
  venue: Venue & { calculatedKm?: number };
  onClick: (venue: Venue) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const VenueThumbnail: React.FC<{ venue: Venue; isFavorite: boolean; onToggleFavorite: () => void }> = ({ venue, isFavorite, onToggleFavorite }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(venue.thumbnailUrl || null);
  const [loading, setLoading] = useState(!venue.thumbnailUrl);

  useEffect(() => {
    if (!venue.thumbnailUrl) {
      const loadAiImage = async () => {
        try {
          const generated = await generateVenueImage(venue.ref, venue.name, venue.tags);
          setImageSrc(generated);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadAiImage();
    }
  }, [venue]);

  if (loading) {
    return (
      <div className="h-32 w-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center animate-pulse relative">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-2" />
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center">
          <Search className="w-3 h-3 mr-1" /> Locating Real Venue Visuals...
        </span>
      </div>
    );
  }

  return (
    <div className="h-32 w-full relative overflow-hidden">
      {imageSrc ? (
        <img 
          src={imageSrc} 
          alt={venue.name} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
      
      {/* Ref Badge */}
      <div className="absolute top-3 left-3">
        <span className="text-[9px] font-black bg-black/40 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-lg border border-white/20 uppercase tracking-widest">
          #{venue.ref}
        </span>
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all active:scale-90 group/fav focus:outline-none"
      >
        <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white group-hover/fav:text-red-200'}`} />
      </button>

      {/* AI Badge */}
      {!venue.thumbnailUrl && (
        <div className="absolute bottom-2 right-2">
           <span className="text-[8px] font-black bg-blue-600/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md flex items-center">
            <Sparkles className="w-2.5 h-2.5 mr-1" /> Search Grounded
          </span>
        </div>
      )}
    </div>
  );
};

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onClick, isFavorite, onToggleFavorite }) => {
  const displayRating = venue.userRating 
    ? (venue.googleRating + venue.userRating) / 2 
    : venue.googleRating;

  return (
    <div
      onClick={() => onClick(venue)}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.1)] transition-all active:scale-[0.98] group overflow-hidden flex flex-col h-full cursor-pointer"
    >
      <VenueThumbnail venue={venue} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 pr-2 leading-tight">
            {venue.name}
          </h3>
          <div className="flex flex-col items-end gap-1">
            <DistanceBadge category={venue.distance} />
            {venue.calculatedKm !== undefined && (
              <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {venue.calculatedKm.toFixed(1)} km
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
          <MapPin className="w-2.5 h-2.5 mr-1 text-blue-500" />
          {venue.location}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <StarRating rating={displayRating} size={12} showValue={true} />
            {venue.userRating && (
              <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
                VOTED
              </span>
            )}
          </div>
          <div className="w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
