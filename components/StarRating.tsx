
import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: number;
  showValue?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  interactive = false, 
  onRate, 
  size = 16,
  showValue = true
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`transition-colors ${
              star <= displayRating 
                ? 'fill-amber-400 text-amber-400' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 active:scale-90 transition-transform' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(null)}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-bold text-gray-500 ml-1">
          {rating > 0 ? rating.toFixed(1) : 'NR'}
        </span>
      )}
    </div>
  );
};
