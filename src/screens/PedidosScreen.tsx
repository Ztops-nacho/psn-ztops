import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { BottomNav } from "../components/BottomNav";
import { PedidoResumen } from "./PedidoDetalleScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Pedidos">;
const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function PedidosScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data } = await api.get<PedidoResumen[]>("/pedidos");
      setPedidos(data);
    } catch {
      Alert.alert(
        "No se cargaron los pedidos",
        "Revisa la conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(
    () => navigation.addListener("focus", () => void load()),
    [load, navigation],
  );
  const total = useMemo(
    () => pedidos.reduce((sum, pedido) => sum + Number(pedido.total ?? 0), 0),
    [pedidos],
  );
  const confirmed = pedidos.filter(
    (pedido) => pedido.estado === "CONFIRMADO",
  ).length;

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
          <Text style={styles.kicker}>ACTIVIDAD COMERCIAL</Text>
          <Text style={styles.title}>Pedidos</Text>
        </View>
        <Pressable
          accessibilityLabel="Nuevo pedido"
          onPress={() => navigation.navigate("Clientes")}
        >
          <MaterialCommunityIcons name="cart-plus" size={28} color="#e3262e" />
        </Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.glow} />
        <Text style={styles.summaryLabel}>Ventas registradas</Text>
        <Text style={styles.summaryValue}>{money.format(total)}</Text>
        <View style={styles.summaryMeta}>
          <Text style={styles.summaryMetaText}>{pedidos.length} pedidos</Text>
          <Text style={styles.summaryMetaText}>{confirmed} confirmados</Text>
        </View>
      </View>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Actividad reciente</Text>
        <Text style={styles.count}>{pedidos.length}</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e3262e" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={pedidos}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#e3262e"
            />
          }
          renderItem={({ item }) => {
            const confirmedOrder = item.estado === "CONFIRMADO";
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  navigation.navigate("PedidoDetalle", { pedido: item })
                }
              >
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: confirmedOrder ? "#f0fbf7" : "#fff8e7" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      confirmedOrder
                        ? "check-decagram-outline"
                        : "clock-outline"
                    }
                    size={28}
                    color={confirmedOrder ? "#10996a" : "#e6a700"}
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.row}>
                    <Text style={styles.number}>{item.numeroPedido}</Text>
                    <Text style={styles.total}>
                      {money.format(Number(item.total ?? 0))}
                    </Text>
                  </View>
                  <Text style={styles.client} numberOfLines={1}>
                    {item.cliente.nombreComercial ?? item.cliente.razonSocial}
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.date}>
                      {item.fecha
                        ? new Date(item.fecha).toLocaleDateString("es-PE")
                        : "Sin fecha"}
                    </Text>
                    <Text
                      style={[
                        styles.status,
                        confirmedOrder && styles.statusConfirmed,
                      ]}
                    >
                      {item.estado ?? "BORRADOR"}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={25}
                  color="#98a2b3"
                />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={48}
                color="#98a2b3"
              />
              <Text style={styles.emptyTitle}>Aún no hay pedidos</Text>
              <Text style={styles.emptyText}>
                Selecciona un cliente para registrar la primera venta.
              </Text>
            </View>
          }
        />
      )}
      <BottomNav active="Pedidos" navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f8fa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    paddingBottom: 14,
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
  summary: {
    marginHorizontal: 18,
    minHeight: 142,
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    backgroundColor: "#e3262e",
  },
  glow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#f28b91",
    right: -62,
    top: -72,
    opacity: 0.8,
  },
  summaryLabel: { color: "#fff", fontSize: 16, fontWeight: "800" },
  summaryValue: {
    color: "#fff",
    fontSize: 31,
    fontWeight: "900",
    marginTop: 12,
  },
  summaryMeta: { flexDirection: "row", gap: 18, marginTop: 12 },
  summaryMetaText: { color: "#ffe8e9", fontWeight: "700", fontSize: 12 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 11,
  },
  sectionTitle: { color: "#101828", fontSize: 21, fontWeight: "900" },
  count: {
    color: "#d91f28",
    backgroundColor: "#fff0f1",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "900",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 18, paddingBottom: 24, flexGrow: 1 },
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
  pressed: { opacity: 0.7 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, paddingHorizontal: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  number: { color: "#101828", fontSize: 14, fontWeight: "900" },
  total: { color: "#d91f28", fontSize: 15, fontWeight: "900" },
  client: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "700",
    marginVertical: 6,
  },
  date: { color: "#667085", fontSize: 11 },
  status: { color: "#b77900", fontSize: 10, fontWeight: "900" },
  statusConfirmed: { color: "#10996a" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    color: "#101828",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  emptyText: { color: "#667085", textAlign: "center", marginTop: 6 },
});
