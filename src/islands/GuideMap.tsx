import { useEffect, useRef, useState } from 'preact/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Place { n: string; d: string; c: string; lat: number; lng: number }
interface Step { p: string; t: string; d: string; v: string; c: number }
interface Journey { n: string; c: string; i: string; s: Step[] }

interface Props { book: string; places: Place[]; journeys: Journey[] }

/** Relief map (no labels, no key) with the book's places, or one journey as numbered steps. */
export default function GuideMap({ book, places, journeys }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [route, setRoute] = useState(-1);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => { removeEventListener('online', on); removeEventListener('offline', on); };
  }, []);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { minZoom: 6, maxZoom: 13, zoomSnap: 0.5, scrollWheelZoom: false, attributionControl: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { maxZoom: 13 }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    // the map is created in a hidden tab: size it once it becomes visible
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const byName = new Map(places.map((p) => [p.n, p]));
    const pin = (p: Place, label: string, html: string) =>
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'pin', html: `<span>${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
        .bindPopup(html).addTo(g);
    if (route < 0) {
      for (const p of places) pin(p, '', `<strong>${p.n}</strong><br>${p.d}<br><small>cap. ${p.c}</small>`);
      m.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [24, 24] });
    } else {
      const steps = journeys[route].s;
      const pts = steps.map((s) => byName.get(s.p)!);
      L.polyline(pts.map((p) => [p.lat, p.lng]), { color: '#b9621a', weight: 3, dashArray: '6 6' }).addTo(g);
      steps.forEach((s, i) => pin(pts[i], String(i + 1), `<strong>${i + 1}. ${s.t}</strong><br>${s.p}`));
      m.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 10 });
    }
  }, [route]);

  const j = route >= 0 ? journeys[route] : null;
  return (
    <div class="guide-map">
      <div class="chips" role="radiogroup" aria-label="Ce arată harta">
        <button type="button" role="radio" class="chip" aria-checked={route < 0} onClick={() => setRoute(-1)}><span class="chip-name">Toate locurile</span></button>
        {journeys.map((x, i) => (
          <button type="button" role="radio" class="chip" aria-checked={route === i} onClick={() => setRoute(i)}><span class="chip-name">{x.n}</span></button>
        ))}
      </div>
      {!online && <p class="notice muted small">Harta are nevoie de internet; lista de mai jos merge și fără.</p>}
      <div ref={box} class="map" />
      {j ? (
        <section class="stack route">
          <p class="muted">{j.i}</p>
          <ol class="steps">
            {j.s.map((s, i) => (
              <li class="card step">
                <span class="step-num">{i + 1}</span>
                <div class="stack">
                  <p class="step-title">{s.t}</p>
                  <p class="small muted">{s.p}</p>
                  <p>{s.d}</p>
                  <a class="link small" href={`/${book}/citire/${s.c}`}>{s.v}</a>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <ul class="place-list">
          {places.map((p) => (
            <li class="card place">
              <p class="step-title">{p.n}</p>
              <p class="small">{p.d}</p>
              <p class="small muted">cap. {p.c}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
