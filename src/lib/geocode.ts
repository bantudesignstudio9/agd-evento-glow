// OpenStreetMap Nominatim — free, no API key required.
// Respect their usage: ≤1 req/sec and identify the app.
export interface GeocodeResult {
  lat: number;
  lng: number;
  display: string;
}

export async function geocode(endereco: string): Promise<GeocodeResult | null> {
  if (!endereco.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt", "User-Agent": "AGD-Eventos/1.0" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
  } catch {
    return null;
  }
}
