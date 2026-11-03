import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ClienteResumen, RootStackParamList } from "../../App";
import { api } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "NuevoCliente">;
type Form = {
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  documento: string;
  direccion: string;
  telefono: string;
  email: string;
};
const initial: Form = {
  codigo: "",
  razonSocial: "",
  nombreComercial: "",
  documento: "",
  direccion: "",
  telefono: "",
  email: "",
};

export function NuevoClienteScreen({ navigation }: Props) {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);
  const update = (field: keyof Form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function captureLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return Alert.alert(
          "Permiso requerido",
          "Habilita el acceso a la ubicación para registrar las coordenadas del cliente.",
        );
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoordinates({
        latitud: Number(position.coords.latitude.toFixed(7)),
        longitud: Number(position.coords.longitude.toFixed(7)),
      });
    } catch {
      Alert.alert(
        "No se obtuvo la ubicación",
        "Verifica que el GPS esté activo e inténtalo nuevamente.",
      );
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    const codigo = form.codigo.trim().toUpperCase();
    const razonSocial = form.razonSocial.trim();
    if (!codigo || !razonSocial)
      return Alert.alert(
        "Datos incompletos",
        "El código y la razón social son obligatorios.",
      );
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      return Alert.alert(
        "Correo inválido",
        "Ingresa una dirección de correo válida.",
      );
    setSubmitting(true);
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries({ ...form, codigo, razonSocial }).map(
            ([key, value]) => [
              key,
              typeof value === "string" ? value.trim() || undefined : value,
            ],
          ),
        ),
        ...coordinates,
      };
      const { data } = await api.post<ClienteResumen>("/clientes", payload);
      if (Platform.OS === "web") {
        Alert.alert(
          "Cliente registrado",
          "Ya puedes comenzar a tomar su pedido.",
        );
        navigation.replace("Productos", { cliente: data });
        return;
      }
      Alert.alert(
        "Cliente registrado",
        "Ya puedes comenzar a tomar su pedido.",
        [
          {
            text: "Crear pedido",
            onPress: () => navigation.replace("Productos", { cliente: data }),
          },
        ],
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Datos comerciales</Text>
        <Text style={styles.caption}>
          Los campos marcados con * son obligatorios.
        </Text>
        <Field
          label="Código *"
          value={form.codigo}
          onChangeText={update("codigo")}
          placeholder="Ej. CLI-001"
          autoCapitalize="characters"
          maxLength={20}
        />
        <Field
          label="Razón social *"
          value={form.razonSocial}
          onChangeText={update("razonSocial")}
          placeholder="Nombre legal"
          maxLength={150}
        />
        <Field
          label="Nombre comercial"
          value={form.nombreComercial}
          onChangeText={update("nombreComercial")}
          placeholder="Nombre visible en el negocio"
          maxLength={150}
        />
        <Field
          label="Documento"
          value={form.documento}
          onChangeText={update("documento")}
          placeholder="RUC o DNI"
          keyboardType="number-pad"
          maxLength={20}
        />
        <Field
          label="Dirección"
          value={form.direccion}
          onChangeText={update("direccion")}
          placeholder="Dirección de entrega"
          multiline
        />
        <View style={locationStyles.box}>
          <View style={locationStyles.info}>
            <Text style={locationStyles.title}>Ubicación del negocio</Text>
            <Text style={locationStyles.caption}>
              {coordinates
                ? `${coordinates.latitud}, ${coordinates.longitud}`
                : "Todavía no se capturó el GPS"}
            </Text>
          </View>
          <Pressable
            style={[locationStyles.button, locating && styles.disabled]}
            disabled={locating}
            onPress={captureLocation}
          >
            <Text style={locationStyles.buttonText}>
              {locating
                ? "Ubicando…"
                : coordinates
                  ? "Actualizar"
                  : "Capturar GPS"}
            </Text>
          </Pressable>
        </View>
        <Field
          label="Teléfono"
          value={form.telefono}
          onChangeText={update("telefono")}
          placeholder="Número de contacto"
          keyboardType="phone-pad"
          maxLength={30}
        />
        <Field
          label="Correo"
          value={form.email}
          onChangeText={update("email")}
          placeholder="cliente@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={150}
        />
        <Pressable
          style={[styles.button, submitting && styles.disabled]}
          disabled={submitting}
          onPress={submit}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Registrando…" : "Registrar y crear pedido"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };
function Field({ label, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.multiline]}
        placeholderTextColor="#9aa2b1"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  content: { padding: 18, paddingBottom: 40 },
  heading: { color: "#12213f", fontSize: 24, fontWeight: "900" },
  caption: { color: "#778195", marginTop: 4, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { color: "#344159", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe4ed",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#12213f",
    fontSize: 16,
  },
  multiline: { minHeight: 78, textAlignVertical: "top" },
  button: {
    backgroundColor: "#e3262e",
    borderRadius: 14,
    alignItems: "center",
    padding: 15,
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});

const locationStyles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f1",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  info: { flex: 1, paddingRight: 10 },
  title: { color: "#12213f", fontWeight: "800" },
  caption: { color: "#66728a", fontSize: 11, marginTop: 4 },
  button: {
    backgroundColor: "#e3262e",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
  },
  buttonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
