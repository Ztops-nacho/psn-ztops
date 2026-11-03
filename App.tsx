import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ClientesScreen } from './src/screens/ClientesScreen';
import { ProductosScreen } from './src/screens/ProductosScreen';
import { PedidosScreen } from './src/screens/PedidosScreen';
import { PedidoDetalleScreen, PedidoResumen } from './src/screens/PedidoDetalleScreen';
import { NuevoClienteScreen } from './src/screens/NuevoClienteScreen';
import { InicioScreen } from './src/screens/InicioScreen';
import { RutasScreen } from './src/screens/RutasScreen';
import { AdminScreen } from './src/screens/AdminScreen';

export type ClienteResumen = { id: number; codigo: string; razonSocial: string; nombreComercial: string | null; direccion: string | null; latitud: number | null; longitud: number | null };

export type RootStackParamList = {
  Login: undefined;
  Inicio: undefined;
  Clientes: undefined;
  Productos: { cliente: ClienteResumen };
  Pedidos: undefined;
  PedidoDetalle: { pedido: PedidoResumen };
  NuevoCliente: undefined;
  Rutas: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function releaseWebFocus() {
  if (Platform.OS !== 'web') return;
  const activeElement = globalThis.document?.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}

function Navigator() {
  const { token, user, loading } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" /></View>;
  const isWebAdmin = Platform.OS === 'web' && user?.roles.includes('ADMIN');
  return (
    <NavigationContainer onStateChange={releaseWebFocus}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '800' } }}>
        {token ? (
          isWebAdmin ? (
            <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="Inicio" component={InicioScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Clientes" component={ClientesScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Rutas" component={RutasScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Productos" component={ProductosScreen} options={{ title: 'Armar pedido' }} />
              <Stack.Screen name="Pedidos" component={PedidosScreen} options={{ title: 'Mis pedidos' }} />
              <Stack.Screen name="PedidoDetalle" component={PedidoDetalleScreen} options={{ title: 'Detalle del pedido' }} />
              <Stack.Screen name="NuevoCliente" component={NuevoClienteScreen} options={{ title: 'Registrar cliente' }} />
            </>
          )
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Toma de pedidos' }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return <AuthProvider><Navigator /></AuthProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
