import { useEffect, useRef, useState } from 'react';
import { groupMapPointsAtZoom, type GridCluster, type LatLngTuple } from '../utils/mapMarkerLayout';

/** Keep national clustering off the UI thread; panning reuses completed groups. */
export function useMapClusters<T extends { ll: LatLngTuple }>(items: T[], zoom: number) {
  const sequence = useRef(0);
  const [groups, setGroups] = useState<GridCluster<T>[]>([]);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const requestId = ++sequence.current;
    if (!items.length) { setGroups([]); setPending(false); return; }
    setGroups([]); setPending(true);
    let worker: Worker | null = null;
    let cancelled = false;
    let failed = false;
    const fallback = () => {
      if (cancelled || failed || sequence.current !== requestId) return;
      failed = true;
      worker?.terminate();
      const scale = 256 * 2 ** zoom;
      const project = (lat: number, lng: number) => {
        const sin = Math.sin(lat * Math.PI / 180);
        return { x: scale * (lng + 180) / 360, y: scale * (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) };
      };
      setGroups(groupMapPointsAtZoom(items, item => item.ll, project, zoom));
      setPending(false);
    };
    try {
      worker = new Worker(new URL('../workers/mapClusters.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<{ requestId: number; groups: GridCluster<number>[] }>) => {
        if (cancelled || sequence.current !== requestId || event.data.requestId !== requestId) return;
        setGroups(event.data.groups.map(group => ({ ...group, items: group.items.map(index => items[index]) })));
        setPending(false);
        worker?.terminate();
      };
      worker.onerror = event => { event.preventDefault(); fallback(); };
      worker.postMessage({ requestId, zoom, points: items.map(item => item.ll) });
    } catch { fallback(); }
    // A new filter/zoom cancels obsolete work rather than queuing costly requests.
    return () => { cancelled = true; worker?.terminate(); };
  }, [items, zoom]);
  return { groups, pending };
}
