
export async function getRainModeOpenMeteo(lat: number, lng: number, lookaheadHours = 2) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation,precipitation_probability&timezone=Africa%2FJohannesburg&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();

    const now = new Date();
    const times: string[] = data.hourly.time;
    const prec: number[] = data.hourly.precipitation;
    const pop: number[] = data.hourly.precipitation_probability;

    let startIdx = times.findIndex((t) => new Date(t) >= now);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(startIdx + lookaheadHours, times.length - 1);

    for (let i = startIdx; i <= endIdx; i++) {
      if (prec[i] >= 0.2 || pop[i] >= 50) {
        return { 
          rainMode: true, 
          reason: `Rain likely (mm=${prec[i].toFixed(1)}, pop=${pop[i]}%) in the next ${lookaheadHours}h` 
        };
      }
    }
    return { rainMode: false, reason: "No significant rain detected in your area" };
  } catch (e) {
    return { rainMode: false, reason: "Weather service temporarily offline" };
  }
}
