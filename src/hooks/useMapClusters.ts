import { useEffect, useRef, useState } from 'react';
import { groupMapPointsAtZoom, type GridCluster, type LatLngTuple } from '../utils/mapMarkerLayout';

/** One idle worker per map; successive requests keep only the newest result. */
export function useMapClusters<T extends { ll: LatLngTuple }>(items: T[], zoom: number) {
  const workerRef = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const jobRef = useRef<{ id: number; items: T[]; fallback: () => void } | null>(null);
  const [groups, setGroups] = useState<GridCluster<T>[]>([]);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    try {
      const worker = new Worker(new URL('../workers/mapClusters.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ requestId: number; groups: GridCluster<number>[] }>) => {
        const job = jobRef.current;
        if (!job || event.data.requestId !== job.id) return;
        setGroups(event.data.groups.map(group => ({ ...group, items: group.items.map(index => job.items[index]) })));
        setPending(false);
      };
      worker.onerror = event => {
        event.preventDefault(); worker.terminate(); workerRef.current = null;
        jobRef.current?.fallback();
      };
    } catch { workerRef.current = null; }
    return () => { jobRef.current = null; workerRef.current?.terminate(); workerRef.current = null; };
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    const fallback = () => {
      if (jobRef.current?.id !== id) return;
      const scale = 256 * 2 ** zoom;
      const project = (lat: number, lng: number) => {
        const sin = Math.sin(lat * Math.PI / 180);
        return { x: scale * (lng + 180) / 360, y: scale * (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) };
      };
      setGroups(groupMapPointsAtZoom(items, item => item.ll, project, zoom)); setPending(false);
    };
    jobRef.current = { id, items, fallback };
    if (!items.length) { setGroups([]); setPending(false); return; }
    setGroups([]); setPending(true);
    if (!workerRef.current) fallback();
    else workerRef.current.postMessage({ requestId: id, zoom, points: items.map(item => item.ll) });
  }, [items, zoom]);
  return { groups, pending };
}
