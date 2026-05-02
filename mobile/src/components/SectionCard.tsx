import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type SectionCardProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  tone?: "default" | "sky" | "sand";
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
      ]}
    >
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    shadowColor: "#243F5C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 26,
    elevation: 3,
  },
  cardSky: {
    backgroundColor: colors.surfaceSky,
  },
  cardSand: {
    backgroundColor: colors.surfaceSand,
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
