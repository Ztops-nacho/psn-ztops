import { useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!username.trim() || !password)
      return Alert.alert("Datos incompletos", "Ingresa usuario y contraseña.");
    setSubmitting(true);
    try {
      await login(username, password);
    } catch {
      Alert.alert(
        "No se pudo iniciar sesión",
        "Verifica tus credenciales y la conexión con el servidor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <MaterialCommunityIcons
          name="storefront-outline"
          size={42}
          color="#fff"
        />
        <Text style={styles.kicker}>PANEL COMERCIAL</Text>
        <Text style={styles.title}>Ventas de campo</Text>
        <Text style={styles.caption}>
          Gestiona clientes, pedidos y rutas desde un solo lugar.
        </Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Usuario"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={[styles.button, submitting && styles.disabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
    backgroundColor: "#f7f8fa",
  },
  brand: {
    backgroundColor: "#e3262e",
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
    alignItems: "center",
  },
  kicker: {
    color: "#ffe8e9",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 10,
  },
  title: { fontSize: 29, fontWeight: "900", color: "#fff", marginTop: 3 },
  caption: { color: "#ffe8e9", textAlign: "center", marginTop: 7 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e7ec",
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#e3262e",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
