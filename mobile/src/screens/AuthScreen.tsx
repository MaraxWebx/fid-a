import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles, typeScale } from "../theme/typography";

type AuthScreenProps = {
  ctaLabel: string;
  ctaText: string;
  eyebrow: string;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  password: string;
  primaryLabel: string;
  roleLabel: string;
  subtitle: string;
  title: string;
  email: string;
};

export function AuthScreen({
  ctaLabel,
  ctaText,
  eyebrow,
  error,
  isSubmitting,
  onBack,
  onChangeEmail,
  onChangePassword,
  onPrimaryAction,
  onSecondaryAction,
  password,
  primaryLabel,
  roleLabel,
  subtitle,
  title,
  email,
}: AuthScreenProps) {
  const [localEmail, setLocalEmail] = useState(email);
  const [localPassword, setLocalPassword] = useState(password);

  const syncEmail = (value: string) => {
    setLocalEmail(value);
    onChangeEmail(value);
  };

  const syncPassword = (value: string) => {
    setLocalPassword(value);
    onChangePassword(value);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <View style={styles.card}>
        <Text style={styles.rolePill}>{roleLabel}</Text>
        <Field
          label="Email"
          value={localEmail}
          onChangeText={syncEmail}
          placeholder="nome@dominio.it"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={localPassword}
          onChangeText={syncPassword}
          placeholder="Minimo 6 caratteri"
          autoCapitalize="none"
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? "Attendi..." : primaryLabel}
            onPress={onPrimaryAction}
          />
          <PrimaryButton
            label="Torna indietro"
            onPress={onBack}
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerText}>{ctaText}</Text>
        <View style={styles.footerButton}>
          <PrimaryButton
            label={ctaLabel}
            onPress={onSecondaryAction}
            variant="secondary"
          />
        </View>
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
};

function Field({
  autoCapitalize = "sentences",
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.xl,
  },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSky,
    borderRadius: 12,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...textStyles.microLabel,
    color: colors.brandInk,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...textStyles.fieldLabel,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: "#B05252",
    fontSize: typeScale.body,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  footerCard: {
    backgroundColor: colors.surfaceSand,
    borderRadius: 24,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  footerText: {
    ...textStyles.body,
  },
  footerButton: {
    marginTop: spacing.md,
  },
});
