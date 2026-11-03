import axios from "axios";
import { Platform } from "react-native";

const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
const baseURL = configuredUrl ?? (Platform.OS === "web" ? "http://localhost:3000/api" : "http://10.0.2.2:3000/api");

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

let unauthorizedHandler: (() => void | Promise<void>) | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler)
      await unauthorizedHandler();
    return Promise.reject(error);
  },
);

export function setAccessToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function setUnauthorizedHandler(
  handler: (() => void | Promise<void>) | null,
) {
  unauthorizedHandler = handler;
}
