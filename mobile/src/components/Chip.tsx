import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ChipProps = {
  label: string;
};

export function Chip({ label }: ChipProps) {
  return (
    <Pressable style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  label: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
