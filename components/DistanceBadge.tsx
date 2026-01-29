
import React from 'react';
import { DistanceCategory } from '../types';
import { Car, Clock } from 'lucide-react';

interface DistanceBadgeProps {
  category: DistanceCategory;
}

export const DistanceBadge: React.FC<DistanceBadgeProps> = ({ category }) => {
  const config = {
    [DistanceCategory.NEAR]: {
      label: 'NEAR',
      km: '< 15km',
      time: '5–20m',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    [DistanceCategory.MED]: {
      label: 'MED',
      km: '15–40km',
      time: '20–45m',
      classes: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    [DistanceCategory.FAR]: {
      label: 'FAR',
      km: '40km+',
      time: '45m+',
      classes: 'bg-red-50 text-red-700 border-red-200'
    }
  };

  const { label, km, time, classes } = config[category];

  return (
    <div className={`inline-flex flex-col items-end gap-1`}>
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-tighter ${classes}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
        <span className="flex items-center"><Car className="w-2.5 h-2.5 mr-0.5" /> {km}</span>
        <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-0.5" /> {time}</span>
      </div>
    </div>
  );
};
