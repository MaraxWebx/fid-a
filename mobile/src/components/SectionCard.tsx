import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { radius, shadows, spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type SectionCardProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  tone?: "default" | "sky" | "sand" | "blush" | "flat";
}>;

export function SectionCard({
  eyebrow,
  title,
  children,
  tone = "default",
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === "sky" ? styles.cardSky : null,
        tone === "sand" ? styles.cardSand : null,
        tone === "blush" ? styles.cardBlush : null,
        tone === "flat" ? styles.cardFlat : null,
      ]}
    >
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...shadows.soft,
  },
  cardSky: {
    backgroundColor: colors.surfaceSky,
  },
  cardSand: {
    backgroundColor: colors.surfaceSand,
  },
  cardBlush: {
    backgroundColor: colors.roseSoft,
  },
  cardFlat: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    ...shadows.none,
  },
  eyebrow: {
    ...textStyles.eyebrow,
    marginBottom: spacing.xs,
  },
  title: {
    ...textStyles.cardTitle,
  },
  content: {
    marginTop: spacing.md,
  },
});
