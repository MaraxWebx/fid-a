import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

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
      style={[
        styles.button,
        variant === "secondary" ? styles.secondary : null,
        variant === "danger" ? styles.danger : null,
        variant === "primary" ? styles.primary : null,
        disabled ? styles.disabled : null,
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
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.brand,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.overlayBorder,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.rose,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  primaryLabel: {
    color: colors.brandInk,
  },
  secondaryLabel: {
    color: colors.brandInk,
  },
  dangerLabel: {
    color: colors.brandInk,
  },
});
