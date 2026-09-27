import type { MapCircle, MapMarker } from './types';

/** Builds a self-contained Leaflet page. Leaflet is BSD-2-Clause licensed. */
export function buildLeafletHtml(opts: {
  center: { latitude: number; longitude: number };
  zoom: number;
  markers: MapMarker[];
  circles: MapCircle[];
  tileUrl: string;
  attribution: string;
}): string {
  const data = JSON.stringify(opts).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<style>html,body,#map{height:100%;margin:0;background:#EDE0CF}
.pin{background:#C65D3A;border:2px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.me{background:#173B57}</style></head>
<body><div id="map" role="application"></div><script>
(function(){
  var d=${data};
  function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent){window.parent.postMessage(s,'*')}}
  var map=L.map('map',{zoomControl:true}).setView([d.center.latitude,d.center.longitude],d.zoom);
  L.tileLayer(d.tileUrl,{maxZoom:17,attribution:d.attribution}).addTo(map);
  d.circles.forEach(function(c){L.circle([c.latitude,c.longitude],{radius:c.radiusMeters,color:'#C65D3A',weight:1,fillOpacity:0.15}).addTo(map)});
  d.markers.forEach(function(m){
    var icon=L.divIcon({className:'',html:'<div class="pin '+(m.kind==='buyer'?'me':'')+'"></div>',iconSize:[18,18]});
    var mk=L.marker([m.latitude,m.longitude],{icon:icon,title:m.title,keyboard:true}).addTo(map);
    var el=document.createElement('div');el.textContent=m.title+(m.subtitle?' — '+m.subtitle:'');
    mk.bindPopup(el);
    mk.on('click',function(){send({type:'marker',id:m.id})});
  });
})();
</script></body></html>`;
}
