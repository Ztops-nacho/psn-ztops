import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";

export type PedidoResumen = {
  id: number;
  numeroPedido: string;
  fecha: string | null;
  estado: string | null;
  subtotal: number | null;
  descuento: number | null;
  impuesto: number | null;
  total: number | null;
  observaciones: string | null;
  cliente: {
    razonSocial: string;
    nombreComercial: string | null;
    codigo: string;
  };
  detalles: {
    id: number;
    cantidad: number;
    precioUnitario: number;
    descuento: number | null;
    subtotal: number;
    producto: { nombre: string; sku: string; unidadMedida: string | null };
  }[];
};
type Props = NativeStackScreenProps<RootStackParamList, "PedidoDetalle">;

export function PedidoDetalleScreen({ route, navigation }: Props) {
  const [pedido, setPedido] = useState(route.params.pedido);
  const [updating, setUpdating] = useState(false);
  const cliente = pedido.cliente.nombreComercial ?? pedido.cliente.razonSocial;

  async function update(estado: "CONFIRMADO" | "CANCELADO") {
    setUpdating(true);
    try {
      const { data } = await api.patch<PedidoResumen>(
        `/pedidos/${pedido.id}/estado`,
        { estado },
      );
      setPedido(data);
      if (estado === "CONFIRMADO" && Platform.OS === "web") {
        Alert.alert(
          "Pedido confirmado",
          "El stock fue actualizado correctamente.",
        );
        navigation.reset({ index: 0, routes: [{ name: "Clientes" }] });
        return;
      }
      Alert.alert(
        estado === "CONFIRMADO" ? "Pedido confirmado" : "Pedido cancelado",
        estado === "CONFIRMADO"
          ? "El stock fue actualizado correctamente."
          : "El estado del pedido fue actualizado.",
        estado === "CONFIRMADO"
          ? [{
              text: "Continuar ventas",
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: "Clientes" }],
              }),
            }]
          : undefined,
      );
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert(
        "No se pudo actualizar",
        Array.isArray(message)
          ? message.join("\n")
          : (message ?? "Inténtalo nuevamente."),
      );
    } finally {
      setUpdating(false);
    }
  }

  function confirm(estado: "CONFIRMADO" | "CANCELADO") {
    const title =
      estado === "CONFIRMADO" ? "Confirmar pedido" : "Cancelar pedido";
    const message =
      estado === "CONFIRMADO"
        ? "Esta acción descontará el stock."
        : "¿Deseas cancelar este pedido?";
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) void update(estado);
      return;
    }
    Alert.alert(title, message, [
      { text: "Volver", style: "cancel" },
      {
        text: estado === "CONFIRMADO" ? "Confirmar" : "Cancelar pedido",
        style: estado === "CANCELADO" ? "destructive" : "default",
        onPress: () => void update(estado),
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.number}>{pedido.numeroPedido}</Text>
            <Text style={styles.date}>
              {pedido.fecha
                ? new Date(pedido.fecha).toLocaleString()
                : "Sin fecha"}
            </Text>
          </View>
          <Status value={pedido.estado ?? "BORRADOR"} />
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>CLIENTE</Text>
          <Text style={styles.client}>{cliente}</Text>
          <Text style={styles.muted}>
            {pedido.cliente.codigo} · {pedido.cliente.razonSocial}
          </Text>
        </View>
        <Text style={styles.title}>Productos</Text>
        {pedido.detalles.map((item) => (
          <View style={styles.item} key={item.id}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.producto.nombre}</Text>
              <Text style={styles.muted}>
                {item.producto.sku} · {item.cantidad}{" "}
                {item.producto.unidadMedida ?? "un."} × S/{" "}
                {Number(item.precioUnitario).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              S/ {Number(item.subtotal).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.totals}>
          <Row label="Subtotal" value={pedido.subtotal} />
          {Number(pedido.descuento) > 0 ? (
            <Row label="Descuento" value={-Number(pedido.descuento)} />
          ) : null}
          {Number(pedido.impuesto) > 0 ? (
            <Row label="Impuesto" value={pedido.impuesto} />
          ) : null}
          <View style={styles.divider} />
          <Row label="Total" value={pedido.total} strong />
        </View>
      </ScrollView>
      {pedido.estado === "BORRADOR" ? (
        <View style={styles.actions}>
          <Pressable
            disabled={updating}
            style={[styles.secondary, updating && styles.disabled]}
            onPress={() => confirm("CANCELADO")}
          >
            <Text style={styles.secondaryText}>Cancelar</Text>
          </Pressable>
          <Pressable
            disabled={updating}
            style={[styles.primary, updating && styles.disabled]}
            onPress={() => confirm("CONFIRMADO")}
          >
            <Text style={styles.primaryText}>
              {updating ? "Procesando…" : "Confirmar pedido"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Status({ value }: { value: string }) {
  const tone =
    value === "CONFIRMADO"
      ? styles.success
      : value === "CANCELADO"
        ? styles.danger
        : styles.pending;
  return (
    <View style={[styles.badge, tone]}>
      <Text style={styles.badgeText}>{value}</Text>
    </View>
  );
}
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={strong ? styles.totalLabel : styles.muted}>{label}</Text>
      <Text style={strong ? styles.totalValue : styles.value}>
        S/ {Number(value ?? 0).toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  content: { padding: 16, paddingBottom: 110 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  number: { color: "#12213f", fontSize: 24, fontWeight: "900" },
  date: { color: "#778195", marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  success: { backgroundColor: "#d9f6e7" },
  danger: { backgroundColor: "#fee5e5" },
  pending: { backgroundColor: "#fff0c7" },
  badgeText: { color: "#26344f", fontSize: 11, fontWeight: "800" },
  section: {
    backgroundColor: "#12213f",
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  label: {
    color: "#91a8df",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  client: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },
  title: {
    color: "#12213f",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 22,
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
  },
  itemInfo: { flex: 1 },
  itemName: { color: "#12213f", fontWeight: "700" },
  muted: { color: "#7b8494", fontSize: 12, marginTop: 4 },
  itemTotal: { color: "#d91f28", fontWeight: "800" },
  totals: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  value: { color: "#26344f", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#e4e8ef", marginVertical: 8 },
  totalLabel: { color: "#12213f", fontSize: 18, fontWeight: "800" },
  totalValue: { color: "#d91f28", fontSize: 21, fontWeight: "900" },
  actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#dfe4ed",
  },
  secondary: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#ef6666",
  },
  secondaryText: { color: "#c93636", fontWeight: "800" },
  primary: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#e3262e",
    padding: 14,
    borderRadius: 13,
  },
  primaryText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
