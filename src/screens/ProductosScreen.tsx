import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";

type Producto = {
  id: number;
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  unidadMedida: string | null;
};
type Props = NativeStackScreenProps<RootStackParamList, "Productos">;

export function ProductosScreen({ route, navigation }: Props) {
  const { cliente } = route.params;
  const [items, setItems] = useState<Producto[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>(
    {},
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Producto[]>("/productos");
      setItems(data);
    } catch {
      Alert.alert(
        "No se cargó el catálogo",
        "Revisa la conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return value
      ? items.filter((item) =>
          `${item.sku} ${item.nombre}`.toLocaleLowerCase().includes(value),
        )
      : items;
  }, [items, query]);
  const selected = items.filter((item) => (quantities[item.id] ?? 0) > 0);
  const units = selected.reduce((sum, item) => sum + quantities[item.id], 0);
  const total = selected.reduce(
    (sum, item) => sum + Number(item.precio) * quantities[item.id],
    0,
  );

  function change(item: Producto, delta: number) {
    setQuantityDrafts((current) => {
      const { [item.id]: _removed, ...rest } = current;
      return rest;
    });
    setQuantities((current) => ({
      ...current,
      [item.id]: Math.max(
        0,
        Math.min(item.stock, (current[item.id] ?? 0) + delta),
      ),
    }));
  }

  function writeQuantity(item: Producto, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setQuantityDrafts((current) => ({ ...current, [item.id]: "" }));
      setQuantities((current) => ({ ...current, [item.id]: 0 }));
      return;
    }

    const quantity = Math.min(item.stock, Number.parseInt(digits, 10));
    setQuantityDrafts((current) => ({
      ...current,
      [item.id]: String(quantity),
    }));
    setQuantities((current) => ({ ...current, [item.id]: quantity }));
  }

  function finishWritingQuantity(itemId: number) {
    setQuantityDrafts((current) => {
      const { [itemId]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function submit() {
    if (!selected.length) return;
    setSubmitting(true);
    try {
      const numeroPedido = `M-${Date.now()}`;
      await api.post("/pedidos", {
        numeroPedido,
        clienteId: cliente.id,
        observaciones: observaciones.trim() || undefined,
        detalles: selected.map((item) => ({
          productoId: item.id,
          cantidad: quantities[item.id],
        })),
      });
      setReviewing(false);
      if (Platform.OS === "web") {
        Alert.alert(
          "Pedido registrado",
          `${numeroPedido} fue guardado correctamente.`,
        );
        navigation.goBack();
        return;
      }
      Alert.alert(
        "Pedido registrado",
        `${numeroPedido} fue guardado correctamente.`,
        [{ text: "Aceptar", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert(
        "No se pudo registrar",
        Array.isArray(message)
          ? message.join("\n")
          : (message ?? "Revisa la conexión e inténtalo nuevamente."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e3262e" />
      </View>
    );
  return (
    <View style={styles.container}>
      <View style={styles.client}>
        <Text style={styles.label}>CLIENTE</Text>
        <Text style={styles.clientName}>
          {cliente.nombreComercial ?? cliente.razonSocial}
        </Text>
        <Text style={styles.clientCode}>{cliente.codigo}</Text>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Buscar producto o SKU"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const quantity = quantities[item.id] ?? 0;
          return (
            <View style={[styles.card, quantity > 0 && styles.cardSelected]}>
              <View style={styles.product}>
                <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.meta}>
                  {item.sku} · Stock {item.stock} {item.unidadMedida ?? ""}
                </Text>
                <Text style={styles.price}>
                  S/ {Number(item.precio).toFixed(2)}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.step} onPress={() => change(item, -1)}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <TextInput
                  style={styles.quantityInput}
                  value={quantityDrafts[item.id] ?? String(quantity)}
                  onChangeText={(value) => writeQuantity(item, value)}
                  onBlur={() => finishWritingQuantity(item.id)}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  selectTextOnFocus
                  maxLength={7}
                  accessibilityLabel={`Cantidad de ${item.nombre}`}
                  editable={item.stock > 0}
                />
                <Pressable
                  style={styles.step}
                  onPress={() => change(item, 1)}
                  disabled={quantity >= item.stock}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay productos disponibles.</Text>
        }
      />
      <Modal
        visible={reviewing}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setReviewing(false)}
      >
        <View style={reviewStyles.overlay}>
          <View style={reviewStyles.sheet}>
            <View style={reviewStyles.handle} />
            <Text style={reviewStyles.title}>Revisar pedido</Text>
            <Text style={reviewStyles.client}>
              {cliente.nombreComercial ?? cliente.razonSocial}
            </Text>
            <View style={reviewStyles.metrics}>
              <View>
                <Text style={reviewStyles.metricLabel}>PRODUCTOS</Text>
                <Text style={reviewStyles.metricValue}>{selected.length}</Text>
              </View>
              <View>
                <Text style={reviewStyles.metricLabel}>UNIDADES</Text>
                <Text style={reviewStyles.metricValue}>{units}</Text>
              </View>
              <View>
                <Text style={reviewStyles.metricLabel}>TOTAL</Text>
                <Text style={reviewStyles.metricTotal}>
                  S/ {total.toFixed(2)}
                </Text>
              </View>
            </View>
            <Text style={reviewStyles.inputLabel}>Observaciones</Text>
            <TextInput
              style={reviewStyles.notes}
              placeholder="Indicaciones de entrega, referencia u otra nota"
              multiline
              maxLength={500}
              value={observaciones}
              onChangeText={setObservaciones}
              textAlignVertical="top"
            />
            <View style={reviewStyles.actions}>
              <Pressable
                style={reviewStyles.cancel}
                disabled={submitting}
                onPress={() => setReviewing(false)}
              >
                <Text style={reviewStyles.cancelText}>Seguir editando</Text>
              </Pressable>
              <Pressable
                style={[reviewStyles.confirm, submitting && styles.disabled]}
                disabled={submitting}
                onPress={submit}
              >
                <Text style={reviewStyles.confirmText}>
                  {submitting ? "Guardando…" : "Guardar pedido"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>{units} unidades</Text>
          <Text style={styles.total}>S/ {total.toFixed(2)}</Text>
        </View>
        <Pressable
          style={[
            styles.submit,
            (!selected.length || submitting) && styles.disabled,
          ]}
          disabled={!selected.length || submitting}
          onPress={() => setReviewing(true)}
        >
          <Text style={styles.submitText}>Revisar pedido</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  client: {
    backgroundColor: "#12213f",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  label: {
    color: "#91a8df",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  clientName: { color: "#fff", fontSize: 19, fontWeight: "800", marginTop: 2 },
  clientCode: { color: "#b9c5df", marginTop: 2 },
  search: {
    margin: 14,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe4ed",
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: { padding: 14, paddingBottom: 110 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e9f0",
  },
  cardSelected: { borderColor: "#9bb4f3", backgroundColor: "#f9fbff" },
  product: { flex: 1, paddingRight: 10 },
  name: { color: "#12213f", fontSize: 16, fontWeight: "700" },
  meta: { color: "#7b8494", fontSize: 12, marginTop: 4 },
  price: { color: "#d91f28", fontSize: 16, fontWeight: "800", marginTop: 7 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  step: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#e9efff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: "#d91f28", fontSize: 22, fontWeight: "700" },
  quantityInput: {
    width: 48,
    height: 38,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "#d7dfef",
    borderRadius: 9,
    backgroundColor: "#fff",
    textAlign: "center",
    color: "#12213f",
    fontSize: 16,
    fontWeight: "800",
  },
  summary: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#dfe4ed",
  },
  summaryLabel: { color: "#7b8494", fontSize: 12 },
  total: { color: "#12213f", fontSize: 23, fontWeight: "900" },
  submit: {
    backgroundColor: "#e3262e",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 13,
  },
  disabled: { opacity: 0.45 },
  submitText: { color: "#fff", fontWeight: "800" },
  empty: { textAlign: "center", color: "#6c7688", marginTop: 48 },
});

const reviewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 40, 0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d7dce5",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { color: "#12213f", fontSize: 24, fontWeight: "900" },
  client: { color: "#657087", marginTop: 4 },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f4f6fa",
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  metricLabel: { color: "#7b8494", fontSize: 10, fontWeight: "800" },
  metricValue: {
    color: "#12213f",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  metricTotal: {
    color: "#d91f28",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  inputLabel: {
    color: "#344159",
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 7,
  },
  notes: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: "#dfe4ed",
    borderRadius: 13,
    padding: 12,
    color: "#12213f",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancel: {
    padding: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#cbd3e1",
  },
  cancelText: { color: "#526076", fontWeight: "800" },
  confirm: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#e3262e",
    padding: 14,
    borderRadius: 13,
  },
  confirmText: { color: "#fff", fontWeight: "800" },
});
