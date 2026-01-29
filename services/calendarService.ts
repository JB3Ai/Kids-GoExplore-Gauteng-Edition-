
import { Venue, DistanceCategory } from '../types';

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocal(dt: Date): string {
  // Floating local time in ICS with TZID handled externally by DTSTART;TZID
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function getDistanceLabel(category?: DistanceCategory): string {
  if (!category) return '';
  const map = {
    [DistanceCategory.NEAR]: '🟢 NEAR',
    [DistanceCategory.MED]: '🟡 MED',
    [DistanceCategory.FAR]: '🔴 FAR'
  };
  return map[category] || category;
}

export function downloadCalendarEvent(venue: Venue) {
  const start = new Date(Date.now() + 30 * 60 * 1000); // Start 30 mins from now
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  
  const uid = `family-now-${venue.ref}-${start.getTime()}@jb3ai`;
  const tzid = "Africa/Johannesburg";
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  
  const distanceStr = getDistanceLabel(venue.distance);
  // Summary now includes distance band for quick reference in calendar list
  const summary = `Do this now: ${venue.name} [${distanceStr}]`;
  
  const descriptionLines = [
    `Quick Info: ${distanceStr}`,
    venue.description,
    venue.phone ? `Phone: ${venue.phone}` : "",
    venue.url ? `Link: ${venue.url}` : "",
    venue.insiderTip ? `Tip: ${venue.insiderTip}` : "",
    venue.notes ? `Note: ${venue.notes}` : ""
  ].filter(Boolean).join('\n');
  
  const location = venue.address || venue.location;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jb3ai//FamilyNow//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${tzid}:${formatLocal(start)}`,
    `DTEND;TZID=${tzid}:${formatLocal(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs(descriptionLines)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  
  const icsText = lines.join("\r\n");
  
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Do_This_Now_${venue.name.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
