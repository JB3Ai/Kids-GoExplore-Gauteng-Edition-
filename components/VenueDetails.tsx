
import React, { useState, useEffect } from 'react';
import { Venue, GroundingChunk } from '../types';
import { DistanceBadge } from './DistanceBadge';
import { X, Map, Compass, Lightbulb, Info, ExternalLink, Sparkles, Loader2, Calendar, TreePine, DoorOpen, WifiOff, Star, User, TextQuote, Phone, Globe } from 'lucide-react';
import { getVenueDeepDive } from '../services/geminiService';
import { WeatherWidget } from './WeatherWidget';
import { StarRating } from './StarRating';
import { saveUserRating } from '../services/sheetService';

interface VenueDetailsProps {
  venue: Venue;
  onClose: () => void;
  onRatingUpdate: (ref: string, rating: number) => void;
}

export const VenueDetails: React.FC<VenueDetailsProps> = ({ venue, onClose, onRatingUpdate }) => {
  const [deepDive, setDeepDive] = useState<{ text: string; sources: GroundingChunk[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleOpenMaps = () => {
    const query = encodeURIComponent(`${venue.name} ${venue.location}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const handleOpenWaze = () => {
    const query = encodeURIComponent(`${venue.name} ${venue.location}`);
    window.open(`https://waze.com/ul?q=${query}`, '_blank');
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent(`Visit ${venue.name}`);
    const details = encodeURIComponent(`${venue.description}\n\nNotes: ${venue.notes}`);
    const location = encodeURIComponent(`${venue.name}, ${venue.location}`);
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    window.open(url, '_blank');
  };

  const handleDeepDive = async () => {
    if (isOffline) return;
    setLoading(true);
    try {
      const data = await getVenueDeepDive(venue);
      setDeepDive(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserRating = (rating: number) => {
    saveUserRating(venue.ref, rating);
    onRatingUpdate(venue.ref, rating);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold text-gray-400">REF: #{venue.ref}</span>
          <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{venue.name}</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {isOffline && (
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center text-amber-800 text-xs font-bold">
            <WifiOff className="w-4 h-4 mr-2" />
            Limited access: You are currently offline. Weather and AI insights are unavailable.
          </div>
        )}

        <section className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <div className="flex items-center text-gray-600 text-sm mb-1 font-semibold">
                <Compass className="w-4 h-4 mr-1 text-blue-500" />
                <span>{venue.location}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DistanceBadge category={venue.distance} />
              <span className="flex items-center px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600">
                {venue.environment === 'Indoor' ? <DoorOpen className="w-3 h-3 mr-1" /> : <TreePine className="w-3 h-3 mr-1" />}
                {venue.environment}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={handleOpenMaps} className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 active:scale-95 transition-all text-sm">
              <Map className="w-4 h-4 mr-2" /> Maps
            </button>
            <button onClick={handleOpenWaze} className="flex items-center justify-center p-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-black active:scale-95 transition-all text-sm">
              <ExternalLink className="w-4 h-4 mr-2" /> Waze
            </button>
            <button onClick={handleAddToCalendar} className="flex items-center justify-center p-3 bg-indigo-50 text-indigo-700 rounded-xl font-semibold border border-indigo-100 shadow-sm hover:bg-indigo-100 active:scale-95 transition-all text-sm">
              <Calendar className="w-4 h-4 mr-2" /> Calendar
            </button>
            {venue.phone && (
              <a href={`tel:${venue.phone}`} className="flex items-center justify-center p-3 bg-emerald-50 text-emerald-700 rounded-xl font-semibold border border-emerald-100 shadow-sm hover:bg-emerald-100 active:scale-95 transition-all text-sm">
                <Phone className="w-4 h-4 mr-2" /> Call
              </a>
            )}
            {venue.url && (
              <a href={venue.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-3 bg-amber-50 text-amber-700 rounded-xl font-semibold border border-amber-100 shadow-sm hover:bg-amber-100 active:scale-95 transition-all text-sm">
                <Globe className="w-4 h-4 mr-2" /> Website
              </a>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="flex items-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
              Google Rating
            </div>
            <StarRating rating={venue.googleRating} size={18} showValue={true} />
            <span className="text-[10px] text-gray-400 mt-1 font-medium italic">Verified reviews</span>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-center text-center">
            <div className="flex items-center text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-widest">
              <User className="w-3 h-3 mr-1" />
              Your Experience
            </div>
            <StarRating rating={venue.userRating || 0} interactive={true} onRate={handleUserRating} size={18} showValue={false} />
            <span className="text-[10px] text-blue-400 mt-1 font-medium">
              {venue.userRating ? `Rated ${venue.userRating}/5` : 'Tap to rate'}
            </span>
          </div>
        </section>

        {!isOffline && <WeatherWidget location={venue.location} />}

        <section className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center text-gray-900 font-black mb-3 text-sm uppercase tracking-wider">
              <TextQuote className="w-4 h-4 mr-2 text-blue-600" /> Description
            </div>
            <p className="text-gray-700 leading-relaxed text-base font-medium">
              {venue.description || 'No detailed description provided.'}
            </p>
          </div>

          {(venue.notes || venue.insiderTip) ? (
            <div className="grid grid-cols-1 gap-4">
              {venue.insiderTip && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center text-amber-800 font-bold mb-2 text-sm">
                    <Lightbulb className="w-4 h-4 mr-2" /> Insider Tip
                  </div>
                  <p className="text-amber-900 text-sm leading-relaxed italic">"{venue.insiderTip}"</p>
                </div>
              )}
              {venue.notes && (
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center text-blue-800 font-bold mb-2 text-sm">
                    <Info className="w-4 h-4 mr-2" /> Helpful Notes
                  </div>
                  <p className="text-blue-900 text-sm leading-relaxed">{venue.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 border-dashed flex flex-col items-center text-center">
              <p className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-wider">Missing details for this venue?</p>
              <button onClick={handleDeepDive} className="text-blue-600 font-black text-xs flex items-center hover:underline">
                <Sparkles className="w-3 h-3 mr-1" /> Ask AI to find notes & tips
              </button>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {venue.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black border border-gray-200 uppercase">
                #{tag}
              </span>
            ))}
          </div>
        </section>

        <section className="pt-4 border-t">
          {!deepDive && !loading && (
            <button 
              onClick={handleDeepDive}
              disabled={isOffline}
              className={`w-full flex items-center justify-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md transition-all ${isOffline ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:opacity-90 active:scale-[0.98]'}`}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isOffline ? 'Offline' : 'Comprehensive AI Deep Dive'}
            </button>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="font-bold text-xs uppercase tracking-widest">Enriching venue data...</span>
            </div>
          )}

          {deepDive && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center text-blue-800 font-black text-xs uppercase tracking-widest">
                <Sparkles className="w-3 h-3 mr-2" /> AI Generated Insights
              </div>
              <div className="bg-blue-50/20 p-5 rounded-2xl border-2 border-blue-100/50 text-gray-700 prose prose-sm max-w-none shadow-inner">
                {deepDive.text.split('\n').map((para, i) => para.trim() && (
                  <p key={i} className="mb-3 leading-relaxed text-sm">{para}</p>
                ))}
              </div>
              
              {deepDive.sources.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verified Sources</span>
                  <div className="flex flex-wrap gap-2">
                    {deepDive.sources.map((source, i) => (
                      <a key={i} href={source.web?.uri || source.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 transition-colors border border-gray-200">
                        <ExternalLink className="w-3 h-3 mr-1 text-blue-500" />
                        {source.web?.title || source.maps?.title || 'Source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
