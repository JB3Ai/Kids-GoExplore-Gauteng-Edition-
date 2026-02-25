
import React, { useState, useEffect } from 'react';
import { Venue } from '../types';
import { DistanceBadge } from './DistanceBadge.tsx';
import { MapPin, ChevronRight, Image as ImageIcon, Sparkles, Loader2, Heart, Share2 } from 'lucide-react';
import { StarRating } from './StarRating.tsx';
import { generateVenueImage } from '../services/imageService.ts';

interface VenueCardProps {
  venue: Venue & { calculatedKm?: number };
  onClick: (venue: Venue) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  viewMode?: 'expanded' | 'list' | 'compact';
}

const VenueThumbnail: React.FC<{ 
  venue: Venue; 
  isFavorite: boolean; 
  onToggleFavorite: () => void;
  viewMode: 'expanded' | 'list' | 'compact';
}> = ({ venue, isFavorite, onToggleFavorite, viewMode }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(venue.thumbnailUrl || null);
  const [loading, setLoading] = useState(!venue.thumbnailUrl);
  const [error, setError] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `Check out ${venue.name}`,
      text: `I found this great place in Gauteng: ${venue.name}. ${venue.description}`,
      url: venue.url || window.location.href,
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

  useEffect(() => {
    let isMounted = true;
    if (!venue.thumbnailUrl) {
      const loadAiImage = async () => {
        try {
          const fetched = await generateVenueImage(venue.ref, venue.name, venue.tags);
          if (isMounted) setImageSrc(fetched);
        } catch (e) {
          if (isMounted) setError(true);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadAiImage();
    } else {
      setLoading(false);
    }
    return () => { isMounted = false; };
  }, [venue]);

  const thumbHeight = viewMode === 'list' ? 'h-full w-32 sm:w-44' : viewMode === 'compact' ? 'h-32' : 'h-44';

  return (
    <div className={`${thumbHeight} relative overflow-hidden bg-black/20 flex-shrink-0`}>
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center animate-pulse bg-theme-primary/10">
          <Loader2 className="w-6 h-6 text-theme-accent animate-spin mb-2" />
          {viewMode !== 'compact' && (
            <span className="text-[8px] font-black text-theme-accent uppercase tracking-widest opacity-60 text-center px-2">Locating Visuals...</span>
          )}
        </div>
      ) : error || !imageSrc ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-theme-secondary opacity-20">
          <ImageIcon className="w-8 h-8" />
          {viewMode !== 'compact' && (
            <span className="text-[8px] font-black uppercase tracking-widest mt-2">Source Unavailable</span>
          )}
        </div>
      ) : (
        <img 
          src={imageSrc} 
          alt={venue.name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onError={() => setError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 transition-all active:scale-90"
        >
          <Heart className={`${viewMode === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} transition-all duration-300 ${isFavorite ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
        </button>

        {viewMode !== 'compact' && (
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 transition-all active:scale-90"
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {viewMode !== 'compact' && (
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
            <Sparkles className="w-2 h-2 text-theme-accent" />
            <span className="text-[7px] font-black text-white uppercase tracking-widest">
              {venue.thumbnailUrl ? 'Verified' : 'AI Gen'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onClick, isFavorite, onToggleFavorite, viewMode = 'expanded' }) => {
  const displayRating = venue.userRating 
    ? (venue.googleRating + venue.userRating) / 2 
    : venue.googleRating;

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onClick(venue)}
        className="w-full text-left bg-theme-card rounded-3xl border border-theme-primary hover:border-theme-accent transition-all active:scale-[0.99] group overflow-hidden flex h-32 sm:h-44 cursor-pointer shadow-xl relative"
      >
        <VenueThumbnail venue={venue} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} viewMode={viewMode} />
        <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex justify-between items-start mb-1 sm:mb-2">
              <h3 className="text-sm sm:text-lg font-black leading-tight group-hover:text-theme-accent transition-colors uppercase tracking-tight line-clamp-1">
                {venue.name}
              </h3>
              <DistanceBadge category={venue.distance} />
            </div>
            <div className="flex items-center text-[8px] sm:text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">
              <MapPin className="w-2.5 h-2.5 sm:w-3 h-3 mr-1 text-theme-accent" />
              {venue.area || venue.location}
            </div>
            <p className="text-[10px] sm:text-xs text-theme-secondary line-clamp-2 opacity-80 hidden sm:block">
              {venue.description}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              <StarRating rating={displayRating} size={12} showValue={true} />
              {venue.userRating && (
                <span className="text-[7px] font-black text-theme-accent uppercase tracking-tighter bg-theme-accent/10 px-1.5 py-0.5 rounded-md border border-theme-accent/20">
                  VOTED
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center text-theme-secondary group-hover:bg-theme-accent group-hover:text-black transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => onClick(venue)}
        className="w-full text-left bg-theme-card rounded-[2rem] border border-theme-primary hover:border-theme-accent transition-all active:scale-[0.98] group overflow-hidden flex flex-col h-full cursor-pointer shadow-lg relative"
      >
        <VenueThumbnail venue={venue} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} viewMode={viewMode} />
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black leading-tight mb-1 group-hover:text-theme-accent transition-colors uppercase tracking-tight line-clamp-2">
              {venue.name}
            </h3>
            <div className="flex items-center text-[8px] font-black opacity-60 uppercase tracking-widest">
              <MapPin className="w-2.5 h-2.5 mr-1 text-theme-accent" />
              <span className="truncate">{venue.area || venue.location}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
            <StarRating rating={displayRating} size={10} showValue={false} />
            <DistanceBadge category={venue.distance} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(venue)}
      className="w-full text-left bg-theme-card rounded-[2.5rem] border border-theme-primary hover:border-theme-accent transition-all active:scale-[0.98] group overflow-hidden flex flex-col h-full cursor-pointer shadow-2xl relative"
    >
      <VenueThumbnail venue={venue} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} viewMode={viewMode} />
      <div className="p-7 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <h3 className="text-xl font-black leading-[1.1] mb-2 group-hover:text-theme-accent transition-colors uppercase tracking-tight line-clamp-2">
              {venue.name}
            </h3>
            <div className="flex items-center text-[10px] font-black opacity-60 uppercase tracking-widest">
              <MapPin className="w-3 h-3 mr-1.5 text-theme-accent" />
              {venue.area || venue.location}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DistanceBadge category={venue.distance} />
            {venue.calculatedKm !== undefined && (
              <span className="text-[9px] font-black text-theme-accent bg-theme-accent/5 px-2 py-0.5 rounded-md border border-theme-accent/10 uppercase tracking-tighter">
                {venue.calculatedKm.toFixed(1)} km
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-black/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StarRating rating={displayRating} size={16} showValue={true} />
            {venue.userRating && (
              <span className="text-[8px] font-black text-theme-accent uppercase tracking-tighter bg-theme-accent/10 px-2 py-1 rounded-md border border-theme-accent/20">
                MY VOTE
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-theme-secondary group-hover:bg-theme-accent group-hover:text-black transition-all shadow-inner">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
