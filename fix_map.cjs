const fs = require('fs');

let content = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');

// Fix MapController
content = content.replace(
  'function MapController({ center, zoom, onBoundsChange, onMapMove }: { center: [number, number], zoom: number, onBoundsChange: (bounds: google.maps.LatLngBounds | undefined) => void, onMapMove: () => void }) {',
  'function MapController({ center, zoom, onBoundsChange, onMapMove }: { center: [number, number], zoom: number, onBoundsChange: (bounds: any) => void, onMapMove: () => void }) {'
);

// We still have Leaflet imports and icons at the top because patch_map2 failed to remove them due to previous modifications!
// Let's clean the imports completely:
content = content.replace(
  "import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';",
  "import { APIProvider, Map, AdvancedMarker, PinElement, useMap } from '@vis.gl/react-google-maps';"
);
content = content.replace("import 'leaflet/dist/leaflet.css';", "");
content = content.replace("import L from 'leaflet';", "");
content = content.replace(/\/\/ Leaflet defaults[\s\S]*?shadowSize: \[41, 41\]\n\}\);/g, "");

content = content.replace(
  "const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null);",
  "const [currentBounds, setCurrentBounds] = useState<any>(null);"
);

content = content.replace(
  "const [currentBounds, setCurrentBounds] = useState<google.maps.LatLngBounds | null>(null);",
  "const [currentBounds, setCurrentBounds] = useState<any>(null);"
);

content = content.replace(
  "const pt = L.latLng(tour.location.lat, tour.location.lng);",
  "const pt = { lat: tour.location.lat, lng: tour.location.lng };"
);

content = content.replace(
  "const pt = new google.maps.LatLng(tour.location.lat, tour.location.lng);",
  "const pt = new google.maps.LatLng(tour.location.lat, tour.location.lng);"
);

fs.writeFileSync('src/components/InteractiveMap.tsx', content);

