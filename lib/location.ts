
export type GeoResult =
  | { ok: true; lat: number; lng: number; accuracyM?: number }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" | "error"; message?: string };

export function getCurrentLocation(timeoutMs = 8000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, reason: "unavailable", message: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) resolve({ ok: false, reason: "denied" });
        else if (err.code === err.TIMEOUT) resolve({ ok: false, reason: "timeout" });
        else resolve({ ok: false, reason: "error", message: err.message });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}
