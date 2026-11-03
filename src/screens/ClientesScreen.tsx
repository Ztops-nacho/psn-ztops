import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RootStackParamList, ClienteResumen } from "../../App";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { BottomNav } from "../components/BottomNav";

type Props = NativeStackScreenProps<RootStackParamList, "Clientes">;

export function ClientesScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locatingId, setLocatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ClienteResumen[]>("/clientes");
      setClientes(data);
    } catch {
      Alert.alert(
        "No se cargaron los clientes",
        "Revisa la conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => void load());
    return unsubscribe;
  }, [load, navigation]);

  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return clientes;
    return clientes.filter((cliente) =>
      [cliente.codigo, cliente.razonSocial, cliente.nombreComercial].some(
        (field) => field?.toLocaleLowerCase().includes(value),
      ),
    );
  }, [clientes, query]);

  async function openLocation(cliente: ClienteResumen) {
    if (cliente.latitud == null || cliente.longitud == null) return;
    const coordinates = `${cliente.latitud},${cliente.longitud}`;
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`,
    );
  }

  async function captureClientLocation(cliente: ClienteResumen) {
    if (locatingId != null) return;
    setLocatingId(cliente.id);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return Alert.alert(
          "Permiso requerido",
          "Habilita el acceso a la ubicación para guardar el punto del cliente.",
        );
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coordinates = {
        latitud: Number(position.coords.latitude.toFixed(7)),
        longitud: Number(position.coords.longitude.toFixed(7)),
      };
      const { data } = await api.patch<ClienteResumen>(
        `/clientes/${cliente.id}`,
        coordinates,
      );
      setClientes((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
      Alert.alert(
        "Ubicación guardada",
        "El punto GPS del cliente fue actualizado.",
      );
    } catch {
      Alert.alert(
        "No se guardó la ubicación",
        "Verifica el permiso, el GPS y la conexión.",
      );
    } finally {
      setLocatingId(null);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2457d6" />
      </View>
    );
  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable accessibilityLabel="Cerrar sesión" onPress={logout}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={34}
              color="#101828"
            />
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>CARTERA COMERCIAL</Text>
            <Text style={styles.heading}>Clientes</Text>
          </View>
          <Pressable
            accessibilityLabel="Registrar cliente"
            onPress={() => navigation.navigate("NuevoCliente")}
          >
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={29}
              color="#e3262e"
            />
          </Pressable>
        </View>
        <Pressable
          style={styles.history}
          onPress={() => navigation.navigate("Pedidos")}
        >
          <Text style={styles.historyText}>Ver historial de pedidos</Text>
          <Text style={styles.historyArrow}>›</Text>
        </Pressable>
        <Pressable
          style={styles.newClient}
          onPress={() => navigation.navigate("NuevoCliente")}
        >
          <Text style={styles.newClientText}>＋ Registrar nuevo cliente</Text>
        </Pressable>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nombre o código"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <Text style={styles.result}>{filtered.length} clientes</Text>
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() =>
                navigation.navigate("Productos", { cliente: item })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.nombreComercial ?? item.razonSocial)
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.nombreComercial ?? item.razonSocial}
                </Text>
                <Text style={styles.legal}>
                  {item.codigo} · {item.razonSocial}
                </Text>
                {item.direccion ? (
                  <Text style={styles.address} numberOfLines={1}>
                    {item.direccion}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 14 }}>
                  {item.latitud != null && item.longitud != null ? (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        void openLocation(item);
                      }}
                    >
                      <Text style={styles.location}>⌖ Ver ubicación</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={locatingId != null}
                    onPress={(event) => {
                      event.stopPropagation();
                      void captureClientLocation(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.location,
                        locatingId != null && { opacity: 0.45 },
                      ]}
                    >
                      {locatingId === item.id
                        ? "Obteniendo GPS…"
                        : item.latitud != null
                          ? "Actualizar GPS"
                          : "⌖ Capturar ubicación"}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No encontramos clientes con esa búsqueda.
            </Text>
          }
        />
      </View>
      <BottomNav active="Clientes" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    paddingBottom: 0,
    backgroundColor: "#f7f8fa",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: "#d91f28",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  heading: {
    color: "#101828",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  logout: { color: "#526076", fontWeight: "700" },
  history: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff0f1",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 9,
  },
  historyText: { color: "#d91f28", fontWeight: "900" },
  historyArrow: { color: "#d91f28", fontSize: 22 },
  newClient: {
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#17a673",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 11,
    marginBottom: 13,
  },
  newClientText: { color: "#10996a", fontWeight: "800" },
  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e7ec",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
  },
  result: { color: "#667085", marginVertical: 12, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 13,
    borderRadius: 19,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eaecf0",
  },
  pressed: { opacity: 0.7 },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 16,
    backgroundColor: "#fff0f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#e3262e", fontWeight: "900" },
  info: { flex: 1, marginLeft: 12 },
  name: { color: "#101828", fontSize: 16, fontWeight: "900" },
  legal: { color: "#667085", fontSize: 12, marginTop: 3 },
  address: { color: "#98a2b3", fontSize: 12, marginTop: 3 },
  location: { color: "#d91f28", fontSize: 12, fontWeight: "800", marginTop: 7 },
  noLocation: { color: "#a0a7b3", fontSize: 11, marginTop: 6 },
  arrow: { color: "#d91f28", fontSize: 28 },
  empty: { textAlign: "center", color: "#667085", marginTop: 48 },
});
