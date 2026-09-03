const fs = require('fs');

let content = fs.readFileSync('/tmp/InteractiveMap.tsx.bak', 'utf8');

// The file has a lot of mess from my previous run.
// Let's find exactly the boundaries to fix.

// 1. Fix imports
content = content.replace("Map, Thermometer", "Map as MapIcon, Thermometer");
content = content.replace(/import { MapContainer.*?react-leaflet';\n?/g, "");
content = content.replace(/import 'leaflet.*?;\n?/g, "");
content = content.replace(/import L from 'leaflet';\n?/g, "");
content = content.replace(/\/\/ Leaflet defaults[\s\S]*?shadowSize: \[41, 41\]\n\}\);\n?/g, "");

content = content.replace(
  "import { formatCurrency, getLangText, UI_TRANSLATIONS } from '../utils/i18n';",
  "import { formatCurrency, getLangText, UI_TRANSLATIONS } from '../utils/i18n';\nimport { APIProvider, Map, AdvancedMarker, PinElement, useMap } from '@vis.gl/react-google-maps';"
);

// Remove duplicate vis.gl imports if any
content = content.replace(/import { APIProvider, Map, AdvancedMarker, PinElement, useMap } from '@vis.gl\/react-google-maps';\nimport { APIProvider, Map, AdvancedMarker, PinElement, useMap } from '@vis.gl\/react-google-maps';/g, "import { APIProvider, Map, AdvancedMarker, PinElement, useMap } from '@vis.gl/react-google-maps';");

// 2. MapController Fix
// I'll replace the MapController function completely
const controllerStart = content.indexOf('function MapController');
const controllerEnd = content.indexOf('export const InteractiveMap');
if (controllerStart !== -1 && controllerEnd !== -1) {
    const newController = `function MapController({ center, zoom, onBoundsChange, onMapMove }: { center: [number, number], zoom: number, onBoundsChange: (bounds: any) => void, onMapMove: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center, zoom, map]);
  useEffect(() => {
    if (!map) return;
    const listeners = [
      map.addListener('idle', () => {
        onBoundsChange(map.getBounds() || undefined);
      }),
      map.addListener('dragend', () => {
        onMapMove();
      }),
      map.addListener('zoom_changed', () => {
        onMapMove();
      })
    ];
    return () => {
      listeners.forEach(l => google.maps.event.removeListener(l));
    };
  }, [map, onBoundsChange, onMapMove]);
  return null;
}
`;
    content = content.substring(0, controllerStart) + newController + content.substring(controllerEnd);
}

// 3. Fix bounds types
content = content.replace(/useState<L\.LatLngBounds \| null>/g, "useState<any>");
content = content.replace(/useState<google\.maps\.LatLngBounds \| null>/g, "useState<any>");

// 4. Fix pt contains
content = content.replace(/const pt = L\.latLng\(tour\.location\.lat, tour\.location\.lng\);\s*if \(\!currentBounds\.contains\(pt\)\)/g, "const pt = new google.maps.LatLng(tour.location.lat, tour.location.lng);\n      if (currentBounds && typeof currentBounds.contains === 'function' && !currentBounds.contains(pt))");
content = content.replace(/const pt = \{ lat: tour\.location\.lat, lng: tour\.location\.lng \};\s*if \(currentBounds && typeof currentBounds\.contains === 'function' && \!currentBounds\.contains\(pt\)\)/g, "const pt = new google.maps.LatLng(tour.location.lat, tour.location.lng);\n      if (currentBounds && typeof currentBounds.contains === 'function' && !currentBounds.contains(pt))");

// 5. Replace MapContainer with Map (if not already replaced)
const mapContainerStart = content.indexOf('<MapContainer');
if (mapContainerStart !== -1) {
    const mapContainerEnd = content.indexOf('</MapContainer>') + '</MapContainer>'.length;
    
    const googleMapStr = `<APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: mapCenter[0], lng: mapCenter[1] }}
            defaultZoom={mapZoom}
            gestureHandling="greedy"
            disableDefaultUI
            className="w-full h-full z-0"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <MapController 
              center={mapCenter} 
              zoom={mapZoom} 
              onBoundsChange={(bounds) => handleBoundsChange(bounds as any)} 
              onMapMove={handleMapMove} 
            />

            {/* Region Markers */}
            {selectedRegion === 'all' && REGIONS_DATA.map(region => (
              <AdvancedMarker
                key={region.id}
                position={{ lat: region.center.lat, lng: region.center.lng }}
                onClick={() => onExploreRegionTours?.(region.id as any)}
                title={getLangText(region.name, language)}
              >
                <PinElement background="#1E4D2B" borderColor="#11331B" glyphColor="#ffffff" />
              </AdvancedMarker>
            ))}

            {/* Tour Markers */}
            {effectiveTours.map(tour => {
              const isSelected = selectedMapTour?.id === tour.id;
              return (
                <AdvancedMarker
                  key={tour.id}
                  position={{ lat: tour.location.lat, lng: tour.location.lng }}
                  onClick={() => {
                    setSelectedMapTour(tour);
                  }}
                  title={getLangText(tour.title, language)}
                  zIndex={isSelected ? 100 : 1}
                >
                  <PinElement 
                    background={isSelected ? "#EF4444" : "#F97316"} 
                    borderColor={isSelected ? "#B91C1C" : "#C2410C"} 
                    glyphColor="#ffffff" 
                    scale={isSelected ? 1.2 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>`;
    
    content = content.substring(0, mapContainerStart) + googleMapStr + content.substring(mapContainerEnd);
}

fs.writeFileSync('src/components/InteractiveMap.tsx', content);

