import { groupMapPointsAtZoom, type LatLngTuple } from '../utils/mapMarkerLayout';
self.onmessage = (event: MessageEvent<{requestId:number;zoom:number;points:LatLngTuple[]}>) => {
  const {requestId,zoom,points}=event.data, scale=256*2**zoom;
  const project=(lat:number,lng:number)=>{const s=Math.sin(lat*Math.PI/180);return{x:scale*(lng+180)/360,y:scale*(.5-Math.log((1+s)/(1-s))/(4*Math.PI))};};
  const indices=points.map((_,index)=>index);
  const groups=groupMapPointsAtZoom(indices,index=>points[index],project,zoom);
  self.postMessage({requestId,groups});
};
