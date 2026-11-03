import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../../App";

type RootRoute = "Inicio" | "Clientes" | "Pedidos" | "Rutas";

const items: {
  route: RootRoute;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { route: "Inicio", label: "Inicio", icon: "home-variant-outline" },
  { route: "Clientes", label: "Clientes", icon: "storefront-outline" },
  { route: "Pedidos", label: "Pedidos", icon: "clipboard-text-outline" },
  { route: "Rutas", label: "Rutas", icon: "map-marker-path" },
];

export function BottomNav({
  active,
  navigation,
}: {
  active: RootRoute;
  navigation: Pick<NativeStackNavigationProp<RootStackParamList>, "navigate">;
}) {
  return (
    <View style={styles.bar}>
      {items.map((item) => {
        const selected = active === item.route;
        return (
          <Pressable
            key={item.route}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.item}
            onPress={() => navigation.navigate(item.route as never)}
          >
            <View style={[styles.icon, selected && styles.iconActive]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={25}
                color={selected ? "#fff" : "#667085"}
              />
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eaecf0",
    paddingTop: 8,
    paddingBottom: 9,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  icon: {
    width: 52,
    height: 34,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: { backgroundColor: "#e3262e" },
  label: { color: "#667085", fontSize: 11, fontWeight: "700" },
  labelActive: { color: "#d91f28" },
});
