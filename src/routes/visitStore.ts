import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type VisitStatus =
  "PENDIENTE" | "EN_VISITA" | "VISITADO" | "NO_ATENDIO" | "REPROGRAMADO";
export type VisitState = Record<
  number,
  { status: VisitStatus; updatedAt: string }
>;
const KEY = "toma_pedidos_visit_states";

export async function loadVisitState(): Promise<VisitState> {
  const raw =
    Platform.OS === "web"
      ? globalThis.localStorage?.getItem(KEY)
      : await SecureStore.getItemAsync(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as VisitState;
  } catch {
    return {};
  }
}

export async function saveVisitState(value: VisitState) {
  const raw = JSON.stringify(value);
  if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export function optimizeRoute<
  T extends { latitud: number | null; longitud: number | null },
>(items: T[]): T[] {
  if (items.length < 3) return items;
  const remaining = items.slice(1);
  const ordered = [items[0]];
  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let nearest = 0;
    let best = Infinity;
    remaining.forEach((candidate, index) => {
      const distance = Math.hypot(
        Number(candidate.latitud) - Number(current.latitud),
        Number(candidate.longitud) - Number(current.longitud),
      );
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    ordered.push(remaining.splice(nearest, 1)[0]);
  }
  return ordered;
}
