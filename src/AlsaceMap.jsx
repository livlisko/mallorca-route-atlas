import { useEffect, useRef } from "react";
import L from "leaflet";

function makePopup(place) {
  const wrap = document.createElement("div");
  wrap.className = "alsace-map-popup";

  const locality = document.createElement("span");
  locality.textContent = place.locality;
  const title = document.createElement("strong");
  title.textContent = place.title;
  const summary = document.createElement("p");
  summary.textContent = place.summary;

  wrap.append(locality, title, summary);
  return wrap;
}

export function AlsaceMap({ base, places, categories, selectedId, onSelect }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return undefined;

    const map = L.map(elementRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([base.latitude, base.longitude], 10);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
      crossOrigin: true,
    }).addTo(map);

    mapRef.current = map;
    window.requestAnimationFrame(() => map.invalidateSize());

    return () => {
      markersRef.current.clear();
      layerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [base.latitude, base.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerRef.current?.remove();
    markersRef.current.clear();
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    for (const place of places) {
      const primaryCategory = categoryMap.get(place.categories[0]);
      const color = primaryCategory?.color ?? "#0b7185";
      const marker = L.marker([place.latitude, place.longitude], {
        title: place.title,
        keyboard: true,
        icon: L.divIcon({
          className: "alsace-map-marker-shell",
          html: `<span class="alsace-map-marker" style="--marker-color:${color}"><i></i></span>`,
          iconSize: [34, 42],
          iconAnchor: [17, 38],
          popupAnchor: [0, -34],
        }),
      });
      marker.bindPopup(makePopup(place), { maxWidth: 280, closeButton: false });
      marker.on("click", () => onSelect(place.id));
      marker.addTo(layer);
      markersRef.current.set(place.id, marker);
    }

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 13, { animate: false });
    } else if (places.length > 1) {
      map.fitBounds(
        L.latLngBounds(places.map((place) => [place.latitude, place.longitude])),
        { padding: [42, 42], maxZoom: 12, animate: false },
      );
    }
    window.requestAnimationFrame(() => map.invalidateSize());
  }, [categories, onSelect, places]);

  useEffect(() => {
    if (!selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker || !mapRef.current) return;
    marker.openPopup();
    mapRef.current.panTo(marker.getLatLng(), { animate: true });
  }, [selectedId]);

  return <div className="alsace-map" ref={elementRef} aria-label="Interactive map of guide places" />;
}
