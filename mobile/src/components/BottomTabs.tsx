import Ionicons from "react-native-vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

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
                color={active ? colors.brand : colors.textMuted}
                name={iconNameMap[item.icon][active ? "active" : "default"]}
                size={20}
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
    backgroundColor: colors.canvas,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: "#243F5C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  item: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    gap: 6,
    paddingVertical: 8,
  },
  itemActive: {
    backgroundColor: colors.surfaceSky,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.brandInk,
  },
});
