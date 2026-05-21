import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";
import { radius, shadows, spacing } from "../theme/spacing";

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
};

export function PrimaryButton({
  disabled = false,
  label,
  onPress,
  variant = "primary",
}: PrimaryButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondary : null,
        variant === "danger" ? styles.danger : null,
        variant === "primary" ? styles.primary : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "secondary" ? styles.secondaryLabel : null,
          variant === "danger" ? styles.dangerLabel : null,
          variant === "primary" ? styles.primaryLabel : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.round,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.brandInk,
    ...shadows.card,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.roseSoft,
    borderColor: "rgba(200,111,122,0.16)",
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryLabel: {
    color: colors.surface,
  },
  secondaryLabel: {
    color: colors.brandInk,
  },
  dangerLabel: {
    color: colors.brandInk,
  },
});
