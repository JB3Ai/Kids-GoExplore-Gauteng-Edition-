
import React, { useState, useEffect } from 'react';
import { fetchWeather, getWeatherIcon, getWeatherAdvice } from '../services/weatherService';
import { WeatherData } from '../types';
import { Cloud, Sun, Thermometer, Loader2, AlertCircle, Zap, ShieldAlert, Sparkles, Umbrella } from 'lucide-react';

interface WeatherWidgetProps {
  location: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchWeather(location);
      setWeather(data);
      setLoading(false);
    };
    load();
  }, [location]);

  if (loading) return (
    <div className="bg-gray-50/50 rounded-2xl p-8 flex flex-col items-center justify-center border border-dashed border-gray-200">
      <Loader2 className="animate-spin text-blue-400 w-6 h-6 mb-2" />
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Skies...</span>
    </div>
  );
  
  if (!weather) return null;

  const todayCode = weather.daily.weathercode[0];
  const todayMax = weather.daily.temperature_2m_max[0];
  const advice = getWeatherAdvice(todayCode, todayMax);

  const themeConfig = {
    storm: 'bg-red-50 border-red-200 text-red-900',
    rain: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    sun: 'bg-amber-50 border-amber-200 text-amber-900',
    cold: 'bg-blue-50 border-blue-200 text-blue-900',
    neutral: 'bg-gray-50 border-gray-100 text-gray-900'
  };

  const currentTheme = themeConfig[advice.type];

  return (
    <div className="space-y-4">
      {/* Dynamic Advice Hero */}
      <div className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${currentTheme}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {advice.type === 'storm' && <ShieldAlert className="w-6 h-6 text-red-600 animate-pulse" />}
            {advice.type === 'rain' && <Umbrella className="w-6 h-6 text-indigo-600" />}
            {advice.type === 'sun' && <Sun className="w-6 h-6 text-amber-500" />}
            {advice.type === 'cold' && <Zap className="w-6 h-6 text-blue-500" />}
            {advice.type === 'neutral' && <Sparkles className="w-6 h-6 text-gray-400" />}
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Parent Briefing</h4>
            {advice.alert && (
              <p className="text-sm font-black text-red-700 leading-tight mb-1 animate-bounce">
                {advice.alert}
              </p>
            )}
            <p className="text-sm font-bold leading-snug">
              {advice.tip}
            </p>
          </div>
        </div>
      </div>

      {/* 3-Day Mini Grid */}
      <div className="grid grid-cols-3 gap-3">
        {weather.daily.time.slice(0, 3).map((time, i) => {
          const date = new Date(time);
          const isToday = i === 0;
          const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
          const code = weather.daily.weathercode[i];
          const isStormy = code >= 95;

          return (
            <div 
              key={time} 
              className={`flex flex-col items-center rounded-2xl p-3 border transition-all ${
                isToday 
                  ? 'bg-white shadow-md border-blue-100 ring-2 ring-blue-50 scale-105 z-10' 
                  : 'bg-gray-50/50 border-gray-100'
              } ${isStormy && isToday ? 'ring-red-500/20 border-red-200' : ''}`}
            >
              <span className={`text-[10px] font-black uppercase tracking-tighter mb-2 ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                {dayName}
              </span>
              <span className="text-3xl mb-2 drop-shadow-sm">{getWeatherIcon(code)}</span>
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-gray-900 leading-none">
                  {Math.round(weather.daily.temperature_2m_max[i])}°
                </span>
                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">
                  {Math.round(weather.daily.temperature_2m_min[i])}° L
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
