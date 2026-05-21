import { Pressable, StyleSheet, Text } from "react-native";

import { colors, statusColors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

type ChipProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "blush";
};

export function Chip({ label, tone = "neutral" }: ChipProps) {
  return (
    <Pressable
      style={[
        styles.chip,
        tone === "success" ? styles.success : null,
        tone === "warning" ? styles.warning : null,
        tone === "danger" ? styles.danger : null,
        tone === "info" ? styles.info : null,
        tone === "blush" ? styles.blush : null,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  success: {
    backgroundColor: `${statusColors.active}24`,
  },
  warning: {
    backgroundColor: `${statusColors.incomplete}28`,
  },
  danger: {
    backgroundColor: colors.roseSoft,
  },
  info: {
    backgroundColor: colors.surfaceSky,
  },
  blush: {
    backgroundColor: colors.roseSoft,
  },
});
