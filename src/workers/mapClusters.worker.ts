import { groupMapPointsAtZoom, type LatLngTuple } from '../utils/mapMarkerLayout';
type Request = { requestId: number; zoom: number; points: LatLngTuple[] };
let newest: Request | null = null;
let timer: ReturnType<typeof setTimeout>;
self.onmessage = (event: MessageEvent<Request>) => {
  newest = event.data;
  clearTimeout(timer);
  // Coalesce rapid layer-load/search/zoom changes before expensive work starts.
  timer = setTimeout(() => {
    const { requestId, zoom, points } = newest!;
    const scale = 256 * 2 ** zoom;
    const project = (lat: number, lng: number) => {
      const sin = Math.sin(lat * Math.PI / 180);
      return { x: scale * (lng + 180) / 360, y: scale * (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) };
    };
    const groups = groupMapPointsAtZoom(points.map((_, index) => index), index => points[index], project, zoom);
    self.postMessage({ requestId, groups });
  }, 16);
};
