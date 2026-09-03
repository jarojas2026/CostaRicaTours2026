import fs from 'fs';

let content = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');

// Fix google.maps errors
content = content.replace(/google\.maps\.event\.removeListener/g, "window.google.maps.event.removeListener");
content = content.replace(/new google\.maps\.LatLng/g, "new window.google.maps.LatLng");

// Remove Region Markers completely
content = content.replace(/\{\/\* Region Markers \*\/\}[\s\S]*?\{\/\* Tour Markers \*\/\}/, "{/* Tour Markers */}");

// Fix the region Center calculation
content = content.replace(
  /if \(regionObj && regionObj\.center\) \{\n\s*mapCenter = \[regionObj\.center\.lat, regionObj\.center\.lng\];\n\s*mapZoom = 9;\n\s*\}/g,
  "if (regionObj) {\n      // Fallback center for region, maybe based on tours in region\n      const regionTours = tours.filter(t => t.region === selectedRegion);\n      if (regionTours.length > 0) {\n        mapCenter = [regionTours[0].location.lat, regionTours[0].location.lng];\n        mapZoom = 9;\n      }\n    }"
);

fs.writeFileSync('src/components/InteractiveMap.tsx', content);

