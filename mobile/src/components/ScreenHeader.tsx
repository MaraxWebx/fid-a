import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import Ionicons from "react-native-vector-icons/Ionicons";

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
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
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
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...textStyles.eyebrow,
    marginBottom: spacing.sm,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  title: {
    ...textStyles.screenTitle,
    flexShrink: 1,
  },
  subtitle: {
    ...textStyles.bodyMuted,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
});
