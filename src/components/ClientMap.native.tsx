import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native";
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
  const first = clientes[0];
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: first?.latitud ?? -9.19,
        longitude: first?.longitud ?? -75.0152,
        latitudeDelta: first ? 0.08 : 12,
        longitudeDelta: first ? 0.08 : 12,
      }}
    >
      {clientes.map((cliente, index) => (
        <Marker
          key={cliente.id}
          coordinate={{
            latitude: cliente.latitud!,
            longitude: cliente.longitud!,
          }}
          title={cliente.nombreComercial ?? cliente.razonSocial}
          description={cliente.direccion ?? cliente.codigo}
          pinColor={selectedId === cliente.id ? "#101828" : "#e3262e"}
          onPress={() => onSelect(cliente)}
          identifier={String(index + 1)}
          draggable={editing && selectedId === cliente.id}
          onDragEnd={(event) =>
            onMove(
              cliente,
              event.nativeEvent.coordinate.latitude,
              event.nativeEvent.coordinate.longitude,
            )
          }
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { height: 290, borderRadius: 22 } });
