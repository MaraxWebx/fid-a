import Ionicons from "react-native-vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { radius, shadows, spacing } from "../theme/spacing";

type TabIcon =
  | "home"
  | "calendar"
  | "favorites"
  | "profile"
  | "appointments"
  | "clients"
  | "settings";

type TabItem = {
  key: string;
  label: string;
  icon: TabIcon;
};

type BottomTabsProps = {
  activeKey: string;
  items: TabItem[];
  onChange: (key: string) => void;
};

export function BottomTabs({ activeKey, items, onChange }: BottomTabsProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        {items.map((item) => {
          const active = item.key === activeKey;

          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[styles.item, active ? styles.itemActive : null]}
            >
              <Ionicons
                color={active ? colors.brandInk : colors.textSoft}
                name={iconNameMap[item.icon][active ? "active" : "default"]}
                size={active ? 24 : 22}
              />
              <Text style={[styles.label, active ? styles.labelActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const iconNameMap = {
  home: {
    active: "home",
    default: "home-outline",
  },
  appointments: {
    active: "ticket",
    default: "ticket-outline",
  },
  profile: {
    active: "person",
    default: "person-outline",
  },
  calendar: {
    active: "calendar",
    default: "calendar-outline",
  },
  favorites: {
    active: "heart",
    default: "heart-outline",
  },
  clients: {
    active: "people",
    default: "people-outline",
  },
  settings: {
    active: "settings",
    default: "settings-outline",
  },
} as const;

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  wrap: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.07)",
    borderRadius: radius.xxl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    ...shadows.floating,
  },
  item: {
    alignItems: "center",
    borderRadius: radius.xl,
    flex: 1,
    gap: 5,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  itemActive: {
    backgroundColor: colors.surfaceSky,
  },
  label: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "700",
  },
});
