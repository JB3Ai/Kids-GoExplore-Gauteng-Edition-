
import React, { useState, useEffect } from 'react';
import { fetchWeather, getWeatherIcon, getWeatherAdvice } from '../services/weatherService';
import { WeatherData } from '../types';
import { AlertTriangle, Sparkles, Thermometer, CloudRain, Sun, Loader2 } from 'lucide-react';

export const WeatherSummary: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchWeather('Johannesburg');
      setWeather(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="bg-white/50 backdrop-blur-sm border border-blue-100 rounded-3xl p-6 flex justify-center items-center h-32">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  if (!weather) return null;

  const todayCode = weather.daily.weathercode[0];
  const advice = getWeatherAdvice(todayCode);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Gauteng Outlook
            </span>
            {advice.alert && (
              <span className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" /> Warning
              </span>
            )}
          </div>
          
          <div className="flex items-baseline space-x-3">
            <h2 className="text-4xl font-black">{Math.round(weather.daily.temperature_2m_max[0])}°</h2>
            <span className="text-2xl">{getWeatherIcon(todayCode)}</span>
            <div className="flex flex-col text-xs font-bold text-white/70">
              <span>{weather.daily.time[0]}</span>
              <span>L: {Math.round(weather.daily.temperature_2m_min[0])}°</span>
            </div>
          </div>

          <div className={`p-3 rounded-2xl flex items-start space-x-3 ${advice.type === 'storm' ? 'bg-red-500/20' : 'bg-white/10'}`}>
            <div className="p-2 bg-white/20 rounded-xl">
              {advice.type === 'sun' && <Sun className="w-4 h-4" />}
              {advice.type === 'rain' && <CloudRain className="w-4 h-4" />}
              {advice.type === 'storm' && <AlertTriangle className="w-4 h-4" />}
              {advice.type === 'neutral' && <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              {advice.alert && <p className="text-xs font-black text-red-100 mb-0.5">{advice.alert}</p>}
              <p className="text-sm font-semibold leading-snug">{advice.tip}</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2">
          {weather.daily.time.slice(1, 4).map((time, i) => (
            <div key={time} className="flex-none bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col items-center min-w-[75px]">
              <span className="text-[10px] font-bold text-white/60 mb-1">
                {new Date(time).toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-xl mb-1">{getWeatherIcon(weather.daily.weathercode[i+1])}</span>
              <span className="text-xs font-black">{Math.round(weather.daily.temperature_2m_max[i+1])}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
