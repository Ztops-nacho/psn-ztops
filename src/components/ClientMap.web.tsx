import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ClienteResumen } from "../../App";

type Props = {
  clientes: ClienteResumen[];
  selectedId: number | null;
  editing: boolean;
  onSelect: (cliente: ClienteResumen) => void;
  onMove: (
    cliente: ClienteResumen,
    latitude: number,
    longitude: number,
  ) => void;
};

export function ClientMap({
  clientes,
  selectedId,
  editing,
  onSelect,
  onMove,
}: Props) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const cliente = clientes.find((item) => item.id === event.data?.id);
      if (!cliente) return;
      if (event.data.type === "client-map-select") onSelect(cliente);
      if (event.data.type === "client-map-move")
        onMove(cliente, event.data.latitude, event.data.longitude);
    };
    globalThis.addEventListener("message", handleMessage);
    return () => globalThis.removeEventListener("message", handleMessage);
  }, [clientes, onMove, onSelect]);

  const html = useMemo(() => {
    const points = clientes.map((cliente, index) => ({
      id: cliente.id,
      lat: cliente.latitud,
      lng: cliente.longitud,
      name: cliente.nombreComercial ?? cliente.razonSocial,
      address: cliente.direccion ?? "",
      order: index + 1,
    }));
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font-size:9px}.pin{background:#e3262e;color:white;width:30px;height:30px;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0004;display:grid;place-items:center}.pin.selected{background:#101828}.pin span{transform:rotate(45deg);font:bold 12px system-ui}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const points=${JSON.stringify(points)},selectedId=${selectedId ?? "null"},editing=${editing};const map=L.map('map',{zoomControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OpenStreetMap'}).addTo(map);const bounds=[];points.forEach(p=>{const selected=p.id===selectedId;const icon=L.divIcon({className:'',html:'<div class="pin '+(selected?'selected':'')+'"><span>'+p.order+'</span></div>',iconSize:[34,34],iconAnchor:[17,34]});const marker=L.marker([p.lat,p.lng],{icon,draggable:editing&&selected}).addTo(map).bindPopup('<b>'+p.name+'</b><br>'+p.address);marker.on('click',()=>parent.postMessage({type:'client-map-select',id:p.id},'*'));marker.on('dragend',e=>{const pos=e.target.getLatLng();parent.postMessage({type:'client-map-move',id:p.id,latitude:pos.lat,longitude:pos.lng},'*')});bounds.push([p.lat,p.lng]);});if(bounds.length===1)map.setView(bounds[0],15);else if(bounds.length)map.fitBounds(bounds,{padding:[28,28]});else map.setView([-9.19,-75.0152],5);</script></body></html>`;
  }, [clientes, editing, selectedId]);

  const Iframe = "iframe" as any;
  return (
    <View style={styles.frame}>
      <Iframe
        title="Mapa de clientes"
        srcDoc={html}
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 290,
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#eaecf0",
    backgroundColor: "#eef2f6",
  },
});
