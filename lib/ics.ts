
function pad(n: number) { return String(n).padStart(2, "0"); }
function formatLocal(dt: Date) {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}
function escapeIcs(s: string) {
  return (s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function makeIcsEvent(p: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location: string;
  description: string;
}) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const tzid = "Africa/Johannesburg";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jb3ai//FamilyNow//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${p.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${tzid}:${formatLocal(p.start)}`,
    `DTEND;TZID=${tzid}:${formatLocal(p.end)}`,
    `SUMMARY:${escapeIcs(p.summary)}`,
    `LOCATION:${escapeIcs(p.location)}`,
    `DESCRIPTION:${escapeIcs(p.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
