import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import { api, setAccessToken, setUnauthorizedHandler } from "../api/client";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type AuthUser = {
  sub: number;
  username: string;
  vendedorId: number | null;
  roles: string[];
  permisos: string[];
};

const TOKEN_KEY = "toma_pedidos_access_token";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function getStoredToken() {
  if (Platform.OS === "web")
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string) {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function removeStoredToken() {
  if (Platform.OS === "web") globalThis.localStorage?.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredToken()
      .then(async (saved) => {
        setAccessToken(saved);
        if (saved) {
          try {
            const { data } = await api.get<AuthUser>("/auth/me");
            setUser(data);
            setToken(saved);
          } catch {
            await removeStoredToken();
            setAccessToken(null);
            setToken(null);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await removeStoredToken();
      setAccessToken(null);
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(username: string, password: string) {
    const { data } = await api.post<{ accessToken: string }>("/auth/login", {
      username,
      password,
    });
    await storeToken(data.accessToken);
    setAccessToken(data.accessToken);
    const profile = await api.get<AuthUser>("/auth/me");
    setUser(profile.data);
    setToken(data.accessToken);
  }

  async function logout() {
    await removeStoredToken();
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  return value;
}
