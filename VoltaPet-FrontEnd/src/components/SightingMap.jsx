import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SightingMap.css";

/** O mapa é montado uma vez; novos pontos são sincronizados sem recriá-lo. */
const valid = (latitude, longitude) =>
  latitude !== null && latitude !== undefined && latitude !== "" &&
  longitude !== null && longitude !== undefined && longitude !== "" &&
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) &&
  Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;

function setupMap(element, position, zoom) {
  const map = L.map(element, { scrollWheelZoom: false }).setView(position, zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  }).addTo(map);
  return map;
}

/** Visitante indica o local exato onde viu o animal; o endereço não sai em um mapa público. */
export function SightingPointPicker({ pet, value, onChange }) {
  const element = useRef(null);
  const mapRef = useRef(null);
  const pointRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const petLat = valid(pet.latitude, pet.longitude) ? Number(pet.latitude) : -14.24;
  const petLon = valid(pet.latitude, pet.longitude) ? Number(pet.longitude) : -51.93;

  useEffect(() => {
    const map = setupMap(element.current, [petLat, petLon], valid(pet.latitude, pet.longitude) ? 13 : 4);
    mapRef.current = map;
    const click = ({ latlng }) => onChangeRef.current({
      latitude: Number(latlng.lat.toFixed(6)),
      longitude: Number(latlng.lng.toFixed(6)),
    });
    map.on("click", click);
    const id = window.setTimeout(() => map.invalidateSize(), 100);
    return () => { window.clearTimeout(id); map.off("click", click); map.remove(); mapRef.current = null; pointRef.current = null; };
  }, [pet.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pointRef.current) { pointRef.current.remove(); pointRef.current = null; }
    if (value && valid(value.latitude, value.longitude)) {
      const latlng = [Number(value.latitude), Number(value.longitude)];
      pointRef.current = L.circleMarker(latlng, {
        radius: 11, color: "#fff", weight: 3, fillColor: "#ea6a35", fillOpacity: 1,
      }).addTo(map).bindTooltip("Local confirmado do avistamento");
      map.setView(latlng, Math.max(map.getZoom(), 15));
    }
  }, [value]);

  return (
    <div className="sighting-coordinate-selector" aria-label="Selecionar local do avistamento">
      <strong>📍 Marque no mapa onde viu o pet *</strong>
      <p>Clique no ponto correto do mapa. O local registrado ficará visível apenas ao autor da ocorrência.</p>
      <div ref={element} className="sighting-map-picker" data-testid="sighting-point-map" role="application" aria-label="Mapa para marcar o ponto do avistamento" />
      <div className="sighting-point-feedback" role="status">
        {value ? `Ponto definido: ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}.` : "Nenhum ponto selecionado. Clique no mapa para definir o local."}
        {value && <button type="button" onClick={() => onChange(null)}>Remover ponto</button>}
      </div>
    </div>
  );
}

/** Pinos exatos são apresentados SOMENTE na área autenticada do autor. */
export function OwnerSightingMap({ pet, reports }) {
  const element = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef(null);
  const fallback = valid(pet.latitude, pet.longitude)
    ? [Number(pet.latitude), Number(pet.longitude)] : [-14.24, -51.93];
  const positioned = reports.filter((report) => valid(report.latitude, report.longitude));

  useEffect(() => {
    const map = setupMap(element.current, fallback, valid(pet.latitude, pet.longitude) ? 13 : 4);
    mapRef.current = map;
    layers.current = L.layerGroup().addTo(map);
    const id = window.setTimeout(() => map.invalidateSize(), 100);
    return () => { window.clearTimeout(id); map.remove(); mapRef.current = null; layers.current = null; };
  }, [pet.id]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layers.current;
    if (!map || !group) return;
    group.clearLayers();
    const bounds = [];
    if (valid(pet.latitude, pet.longitude)) {
      const home = [Number(pet.latitude), Number(pet.longitude)];
      L.circle(home, { radius: 900, color: "#07847a", fillOpacity: 0.09, weight: 2 })
        .bindPopup("Região aproximada da ocorrência inicial").addTo(group);
      bounds.push(home);
    }
    positioned.forEach((report, i) => {
      const point = [Number(report.latitude), Number(report.longitude)];
      const date = new Date(report.seenAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const popup = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `Avistamento ${i + 1}`;
      const paragraph = document.createElement("p");
      paragraph.textContent = `${date} — ${report.street}, ${report.houseNumber}, ${report.neighborhood ?? ""}, ${report.city ?? ""}`;
      popup.append(strong, paragraph);
      L.marker(point, { icon: L.divIcon({ className: "sighting-map-pin", html: `<span>${i + 1}</span>`, iconSize: [32, 38], iconAnchor: [16, 38] }) })
        .bindPopup(popup).addTo(group);
      bounds.push(point);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    else if (bounds.length) map.setView(bounds[0], 13);
  }, [pet.id, pet.latitude, pet.longitude, reports]);

  const missing = reports.length - positioned.length;
  return <div className="sighting-map-owner-panel">
    <p className="sighting-map-owner-label">🔒 Mapa privado dos avistamentos — {positioned.length} pino(s)</p>
    <div ref={element} className="sighting-map-owner" role="application" aria-label="Mapa privado dos locais onde o pet foi visto" />
    <p className="sighting-map-caption">Pinos laranja = avistamentos. Círculo verde = região aproximada da ocorrência inicial. Clique em cada pino para consultar data e endereço.</p>
    {missing > 0 && <p className="sighting-map-caption">{missing} avistamento(s) antigo(s) não possuem coordenadas e continuam disponíveis na lista de relatos.</p>}
  </div>;
}
