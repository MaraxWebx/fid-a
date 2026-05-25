import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

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
  error,
  isSubmitting,
  onBack,
  onChangeEmail,
  onChangePassword,
  onPrimaryAction,
  onSecondaryAction,
  password,
  roleLabel,
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
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.container}
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons color={colors.brandInk} name="chevron-back" size={20} />
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.kicker}>{roleLabel}</Text>
        <Text style={styles.title}>Bentornata</Text>
        <Text style={styles.subtitle}>Accedi al tuo spazio personale.</Text>
      </View>

      <View style={styles.card}>
        <SocialButton icon="mail-outline" label="Continua con email" />
        <View style={styles.fields}>
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={syncEmail}
            placeholder="nome@dominio.it"
            value={localEmail}
          />
          <Field
            autoCapitalize="none"
            onChangeText={syncPassword}
            placeholder="Password"
            secureTextEntry
            value={localPassword}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={isSubmitting}
          label={isSubmitting ? "Accesso..." : "Accedi"}
          onPress={onPrimaryAction}
        />

        <View style={styles.socialStack}>
          <SocialButton disabled icon="logo-google" label="Continua con Google" />
          <SocialButton disabled icon="logo-apple" label="Continua con Apple" />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{ctaText}</Text>
        <PrimaryButton label={ctaLabel} onPress={onSecondaryAction} variant="secondary" />
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad";
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
};

function Field({
  autoCapitalize = "sentences",
  keyboardType = "default",
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: FieldProps) {
  return (
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
  );
}

function SocialButton({
  disabled,
  icon,
  label,
}: {
  disabled?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <View style={[styles.socialButton, disabled ? styles.disabledSocial : null]}>
      <Ionicons color={colors.brandInk} name={icon} size={19} />
      <Text style={styles.socialText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 42,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: colors.overlayBorder,
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 26,
    paddingTop: 54,
  },
  kicker: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: colors.brandInk,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: "rgba(40,111,112,0.10)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  fields: {
    gap: 12,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    color: colors.text,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  socialStack: {
    gap: 10,
    marginTop: 2,
  },
  socialButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  disabledSocial: {
    opacity: 0.56,
  },
  socialText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    gap: 12,
    marginTop: 18,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
