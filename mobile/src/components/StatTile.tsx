import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { radius, shadows, spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type StatTileProps = {
  label: string;
  value: string;
};

export function StatTile({ label, value }: StatTileProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    flex: 1,
    minHeight: 100,
    padding: spacing.md,
    ...shadows.soft,
  },
  value: {
    ...textStyles.metricValue,
  },
  label: {
    ...textStyles.caption,
    marginTop: spacing.xs,
  },
});
