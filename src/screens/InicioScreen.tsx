import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { BottomNav } from "../components/BottomNav";
import { PedidoResumen } from "./PedidoDetalleScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Inicio">;
type Cliente = { id: number };

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

export function InicioScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [orders, customers] = await Promise.all([
        api.get<PedidoResumen[]>("/pedidos"),
        api.get<Cliente[]>("/clientes"),
      ]);
      setPedidos(orders.data);
      setClientes(customers.data);
    } catch {
      // Conserva el último resumen disponible cuando la conexión se interrumpe.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(
    () => navigation.addListener("focus", () => void load()),
    [load, navigation],
  );

  const today = new Date().toDateString();
  const todayOrders = useMemo(
    () =>
      pedidos.filter(
        (pedido) =>
          pedido.fecha && new Date(pedido.fecha).toDateString() === today,
      ),
    [pedidos, today],
  );
  const approved = todayOrders.filter(
    (pedido) => pedido.estado === "CONFIRMADO",
  );
  const pending = todayOrders.filter((pedido) => pedido.estado === "BORRADOR");
  const approvedTotal = approved.reduce(
    (sum, pedido) => sum + Number(pedido.total ?? 0),
    0,
  );
  const allTotal = todayOrders.reduce(
    (sum, pedido) => sum + Number(pedido.total ?? 0),
    0,
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Cerrar sesión" onPress={logout}>
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={34}
              color="#101828"
            />
          </Pressable>
          <View>
            <Text style={styles.kicker}>PANEL COMERCIAL</Text>
            <Text style={styles.title}>Inicio</Text>
          </View>
          <Pressable
            accessibilityLabel="Ver pedidos"
            onPress={() => navigation.navigate("Pedidos")}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={28}
              color="#101828"
            />
          </Pressable>
        </View>

        <View style={styles.salesCard}>
          <View style={styles.glow} />
          <Text style={styles.salesLabel}>Tus ventas de hoy</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={styles.loader} />
          ) : (
            <Text style={styles.salesValue}>{money.format(allTotal)}</Text>
          )}
          <View style={styles.salesMeta}>
            <Text style={styles.salesMetaText}>
              {todayOrders.length} pedidos
            </Text>
            <Text style={styles.salesMetaText}>{clientes.length} clientes</Text>
          </View>
        </View>

        <View style={styles.shortcuts}>
          <Shortcut
            icon="cart-plus"
            label="Nuevo pedido"
            color="#e3262e"
            onPress={() => navigation.navigate("Clientes")}
          />
          <Shortcut
            icon="account-plus-outline"
            label="Nuevo cliente"
            color="#17a673"
            onPress={() => navigation.navigate("NuevoCliente")}
          />
          <Shortcut
            icon="receipt-text-outline"
            label="Historial"
            color="#6d5bd0"
            onPress={() => navigation.navigate("Pedidos")}
          />
        </View>

        <Text style={styles.sectionTitle}>Preventas de hoy</Text>
        <View style={styles.stats}>
          <Stat
            icon="check-decagram-outline"
            color="#18a66f"
            label="Aprobados"
            count={approved.length}
            value={approvedTotal}
          />
          <Stat
            icon="clock-alert-outline"
            color="#f2b705"
            label="Pendientes"
            count={pending.length}
            value={pending.reduce(
              (sum, pedido) => sum + Number(pedido.total ?? 0),
              0,
            )}
          />
        </View>

        <Text style={styles.sectionTitle}>Procesos de venta</Text>
        <ProcessCard
          icon="store-search-outline"
          tone="#fff0f1"
          color="#e3262e"
          title="Visitar clientes"
          description="Consulta tu cartera y registra pedidos."
          onPress={() => navigation.navigate("Clientes")}
        />
        <ProcessCard
          icon="map-marker-radius-outline"
          tone="#f0f7ff"
          color="#2864dc"
          title="Planificar ruta"
          description="Abre la ubicación de tus clientes en el mapa."
          onPress={() => navigation.navigate("Rutas")}
        />
        <ProcessCard
          icon="clipboard-check-outline"
          tone="#f0fbf7"
          color="#10996a"
          title="Gestionar pedidos"
          description="Revisa, confirma o cancela pedidos pendientes."
          onPress={() => navigation.navigate("Pedidos")}
        />
      </ScrollView>
      <BottomNav active="Inicio" navigation={navigation} />
    </View>
  );
}

function Shortcut({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.shortcut, { borderColor: color }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={21} color={color} />
      <Text style={[styles.shortcutText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  icon,
  color,
  label,
  count,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  label: string;
  count: number;
  value: number;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRow}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
        <View>
          <Text style={styles.statCount}>{count} pedidos</Text>
          <Text style={styles.statValue}>{money.format(value)}</Text>
        </View>
      </View>
    </View>
  );
}

function ProcessCard({
  icon,
  tone,
  color,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: string;
  color: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.process, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.processIcon, { backgroundColor: tone }]}>
        <MaterialCommunityIcons name={icon} size={38} color={color} />
      </View>
      <View style={styles.processCopy}>
        <Text style={styles.processTitle}>{title}</Text>
        <Text style={styles.processDescription}>{description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={26} color="#98a2b3" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f8fa" },
  content: { padding: 18, paddingBottom: 28 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
  salesCard: {
    minHeight: 178,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#e3262e",
  },
  glow: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#f28b91",
    right: -85,
    top: -72,
    opacity: 0.8,
  },
  salesLabel: { color: "#fff", fontSize: 18, fontWeight: "800" },
  salesValue: { color: "#fff", fontSize: 37, fontWeight: "900", marginTop: 23 },
  loader: { alignSelf: "flex-start", marginTop: 34 },
  salesMeta: { flexDirection: "row", gap: 18, marginTop: 20 },
  salesMetaText: { color: "#ffe8e9", fontWeight: "700" },
  shortcuts: { flexDirection: "row", gap: 8, marginVertical: 18 },
  shortcut: {
    flex: 1,
    minHeight: 66,
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  shortcutText: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  sectionTitle: {
    color: "#101828",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  stats: { flexDirection: "row", gap: 10, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e7ec",
    borderRadius: 18,
    padding: 15,
  },
  statLabel: {
    color: "#344054",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
  },
  statRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  statCount: { color: "#101828", fontSize: 13, fontWeight: "800" },
  statValue: { color: "#667085", fontSize: 11, marginTop: 2 },
  process: {
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
  processIcon: {
    width: 66,
    height: 66,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  processCopy: { flex: 1, paddingHorizontal: 13 },
  processTitle: { color: "#101828", fontSize: 16, fontWeight: "900" },
  processDescription: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
