import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '../theme/spacing';
import { textStyles } from '../theme/typography';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
};

export function ScreenHeader({ title, subtitle, eyebrow }: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
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
  title: {
    ...textStyles.screenTitle,
  },
  subtitle: {
    ...textStyles.bodyMuted,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
});
