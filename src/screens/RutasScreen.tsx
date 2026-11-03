import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ClienteResumen, RootStackParamList } from "../../App";
import { api } from "../api/client";
import { BottomNav } from "../components/BottomNav";
import { ClientMap } from "../components/ClientMap";
import {
  loadVisitState,
  optimizeRoute,
  saveVisitState,
  VisitState,
  VisitStatus,
} from "../routes/visitStore";

type Props = NativeStackScreenProps<RootStackParamList, "Rutas">;

export function RutasScreen({ navigation }: Props) {
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClienteResumen | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visits, setVisits] = useState<VisitState>({});
  const [filter, setFilter] = useState<VisitStatus | "TODOS">("TODOS");
  const [optimized, setOptimized] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ClienteResumen[]>("/clientes");
      setClientes(
        data.filter(
          (cliente) => cliente.latitud != null && cliente.longitud != null,
        ),
      );
    } catch {
      Alert.alert(
        "No se cargaron las rutas",
        "Revisa tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(
    () => navigation.addListener("focus", () => void load()),
    [load, navigation],
  );
  useEffect(() => {
    void loadVisitState().then(setVisits);
  }, []);
  const visibleClients = useMemo(() => {
    const filtered =
      filter === "TODOS"
        ? clientes
        : clientes.filter(
            (cliente) => (visits[cliente.id]?.status ?? "PENDIENTE") === filter,
          );
    return optimized ? optimizeRoute(filtered) : filtered;
  }, [clientes, filter, optimized, visits]);

  function updateVisit(clienteId: number, status: VisitStatus) {
    const next = {
      ...visits,
      [clienteId]: { status, updatedAt: new Date().toISOString() },
    };
    setVisits(next);
    void saveVisitState(next);
  }

  async function open(cliente: ClienteResumen) {
    const query = `${cliente.latitud},${cliente.longitud}`;
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
    );
  }

  async function moveClient(
    cliente: ClienteResumen,
    latitude: number,
    longitude: number,
  ) {
    if (saving) return;
    setSaving(true);
    const coordinates = {
      latitud: Number(latitude.toFixed(7)),
      longitud: Number(longitude.toFixed(7)),
    };
    try {
      const { data } = await api.patch<ClienteResumen>(
        `/clientes/${cliente.id}`,
        coordinates,
      );
      setClientes((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
      setSelected(data);
      setEditing(false);
      Alert.alert(
        "Ubicación actualizada",
        "El nuevo punto del cliente fue guardado.",
      );
    } catch {
      setEditing(false);
      Alert.alert(
        "No se guardó la ubicación",
        "El marcador volvió a su posición anterior. Revisa la conexión e inténtalo nuevamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver al inicio"
          onPress={() => navigation.navigate("Inicio")}
        >
          <MaterialCommunityIcons
            name="home-variant-outline"
            size={30}
            color="#101828"
          />
        </Pressable>
        <View>
          <Text style={styles.kicker}>VENTA DE CAMPO</Text>
          <Text style={styles.title}>Rutas</Text>
        </View>
        <Pressable
          accessibilityLabel="Ver clientes"
          onPress={() => navigation.navigate("Clientes")}
        >
          <MaterialCommunityIcons
            name="storefront-outline"
            size={29}
            color="#e3262e"
          />
        </Pressable>
      </View>
      {!loading && clientes.length > 0 ? (
        <View style={styles.mapWrap}>
          <ClientMap
            clientes={visibleClients}
            selectedId={selected?.id ?? null}
            editing={editing}
            onSelect={(cliente) => {
              setSelected(cliente);
              setEditing(false);
            }}
            onMove={(cliente, latitude, longitude) =>
              void moveClient(cliente, latitude, longitude)
            }
          />
          <View style={styles.mapLegend}>
            <View style={styles.legendCopy}>
              <Text style={styles.summaryValue}>
                {clientes.length} puntos en el mapa
              </Text>
              <Text style={styles.summaryText} numberOfLines={1}>
                {editing
                  ? "Arrastra el marcador negro y suéltalo"
                  : selected
                    ? (selected.nombreComercial ?? selected.razonSocial)
                    : "Toca un marcador para seleccionar"}
              </Text>
            </View>
            {selected ? (
              <View style={styles.mapActions}>
                <Pressable
                  style={[
                    styles.editButton,
                    editing && styles.editButtonActive,
                  ]}
                  disabled={saving}
                  onPress={() => setEditing((current) => !current)}
                >
                  <MaterialCommunityIcons
                    name={editing ? "close" : "map-marker-radius-outline"}
                    size={19}
                    color="#fff"
                  />
                  <Text style={styles.navigateText}>
                    {saving ? "Guardando" : editing ? "Cancelar" : "Mover"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.navigateButton}
                  disabled={editing || saving}
                  onPress={() => void open(selected)}
                >
                  <MaterialCommunityIcons
                    name="navigation-variant"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.navigateText}>Ir</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      <Text style={styles.sectionTitle}>Próximas visitas</Text>
      <View style={styles.filters}>
        {(["TODOS", "PENDIENTE", "VISITADO"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.filter, filter === value && styles.filterActive]}
            onPress={() => setFilter(value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === value && styles.filterTextActive,
              ]}
            >
              {value === "TODOS"
                ? "Todos"
                : value === "PENDIENTE"
                  ? "Pendientes"
                  : "Visitados"}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.filter, optimized && styles.filterActive]}
          onPress={() => setOptimized((value) => !value)}
        >
          <Text
            style={[styles.filterText, optimized && styles.filterTextActive]}
          >
            Optimizar
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e3262e" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={visibleClients}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <Pressable
              style={[
                styles.card,
                selected?.id === item.id && styles.cardSelected,
              ]}
              onPress={() => {
                setSelected(item);
                setEditing(false);
              }}
            >
              <View style={styles.pin}>
                <Text style={styles.pinText}>{index + 1}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>
                  {item.nombreComercial ?? item.razonSocial}
                </Text>
                <Text style={styles.address} numberOfLines={2}>
                  {item.direccion ?? `${item.latitud}, ${item.longitud}`}
                </Text>
                <Text style={styles.action}>Ver punto en el mapa</Text>
                <View style={styles.statuses}>
                  {(
                    [
                      "EN_VISITA",
                      "VISITADO",
                      "NO_ATENDIO",
                      "REPROGRAMADO",
                    ] as VisitStatus[]
                  ).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusChip,
                        visits[item.id]?.status === status &&
                          styles.statusChipActive,
                      ]}
                      onPress={(event) => {
                        event.stopPropagation();
                        updateVisit(item.id, status);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          visits[item.id]?.status === status &&
                            styles.statusTextActive,
                        ]}
                      >
                        {status === "EN_VISITA"
                          ? "Iniciar"
                          : status === "VISITADO"
                            ? "Visitado"
                            : status === "NO_ATENDIO"
                              ? "No atendió"
                              : "Reprogramar"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <MaterialCommunityIcons
                name="navigation-variant-outline"
                size={27}
                color="#e3262e"
              />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="map-marker-off-outline"
                size={48}
                color="#98a2b3"
              />
              <Text style={styles.emptyTitle}>Aún no hay puntos guardados</Text>
              <Text style={styles.emptyText}>
                En Clientes puedes capturar la ubicación GPS de cada negocio.
              </Text>
              <Pressable
                style={styles.button}
                onPress={() => navigation.navigate("Clientes")}
              >
                <Text style={styles.buttonText}>Ir a clientes</Text>
              </Pressable>
            </View>
          }
        />
      )}
      <BottomNav active="Rutas" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    padding: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: "#d91f28",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  title: {
    color: "#101828",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: { color: "#667085", marginTop: 3 },
  mapWrap: {
    marginHorizontal: 18,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eaecf0",
  },
  mapLegend: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#e3262e",
  },
  legendCopy: { flex: 1 },
  mapActions: { flexDirection: "row", gap: 7 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#fff",
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 13,
  },
  editButtonActive: { backgroundColor: "#b4232a", borderColor: "#b4232a" },
  navigateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#101828",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
  },
  navigateText: { color: "#fff", fontWeight: "900" },
  summaryValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  summaryText: {
    color: "#ffe8e9",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionTitle: {
    color: "#101828",
    fontSize: 21,
    fontWeight: "900",
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 2,
  },
  filters: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  filter: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e7ec",
  },
  filterActive: { backgroundColor: "#e3262e", borderColor: "#e3262e" },
  filterText: { color: "#667085", fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 18, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eaecf0",
    borderRadius: 19,
    padding: 13,
    marginBottom: 10,
  },
  cardSelected: { borderColor: "#e3262e", backgroundColor: "#fff8f8" },
  pin: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff0f1",
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: { color: "#e3262e", fontWeight: "900" },
  copy: { flex: 1, paddingHorizontal: 12 },
  name: { color: "#101828", fontSize: 15, fontWeight: "900" },
  address: { color: "#667085", fontSize: 12, marginTop: 3 },
  action: { color: "#d91f28", fontSize: 11, fontWeight: "800", marginTop: 6 },
  statuses: { flexDirection: "row", gap: 5, marginTop: 8 },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#f2f4f7",
  },
  statusChipActive: { backgroundColor: "#101828" },
  statusText: { color: "#667085", fontSize: 9, fontWeight: "800" },
  statusTextActive: { color: "#fff" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: "#101828",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: {
    color: "#667085",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
  button: {
    backgroundColor: "#e3262e",
    borderRadius: 13,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 18,
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
