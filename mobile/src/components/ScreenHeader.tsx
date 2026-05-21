import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors } from "../theme/colors";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  onBack?: any;
  eyebrow?: string;
  logoUrl?: string;
  accentColor?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  logoUrl,
  accentColor,
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.brandInk} />
        </Pressable>
      )}

      {eyebrow ? (
        <Text style={[styles.eyebrow, accentColor ? { color: accentColor } : null]}>
          {eyebrow}
        </Text>
      ) : null}
      <View style={styles.titleRow}>
        {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 40,
  },
  eyebrow: {
    ...textStyles.eyebrow,
    marginBottom: spacing.xs,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logo: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 36,
    width: 36,
  },
  title: {
    ...textStyles.screenTitle,
    flexShrink: 1,
  },
  subtitle: {
    ...textStyles.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    maxWidth: 360,
  },
});
