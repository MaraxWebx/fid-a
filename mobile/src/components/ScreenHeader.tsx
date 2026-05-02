import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import Ionicons from "react-native-vector-icons/Ionicons";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  onBack?: any;
  eyebrow?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      )}

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
