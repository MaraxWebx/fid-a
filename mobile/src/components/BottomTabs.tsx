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
  | "settings"
  | "insights";

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
              style={({ pressed }) => [
                styles.item,
                active ? styles.itemActive : null,
                pressed ? styles.itemPressed : null,
              ]}
            >
              <Ionicons
                color={active ? colors.brandInk : colors.textSoft}
                name={iconNameMap[item.icon][active ? "active" : "default"]}
                size={active ? 22 : 20}
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
  insights: {
    active: "stats-chart",
    default: "stats-chart-outline",
  },
} as const;

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "transparent",
    paddingBottom: spacing.md,
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
    padding: spacing.xs,
    ...shadows.floating,
  },
  item: {
    alignItems: "center",
    borderRadius: radius.xl,
    flex: 1,
    gap: 4,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  itemActive: {
    backgroundColor: colors.surfaceSky,
  },
  itemPressed: {
    opacity: 0.76,
  },
  label: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: "800",
  },
});
