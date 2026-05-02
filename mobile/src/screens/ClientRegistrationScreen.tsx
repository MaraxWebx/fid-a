import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { registerClient } from '../lib/api';
import type { ClientRegistrationInput, UserProfile } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ClientRegistrationScreenProps = {
  onBack: () => void;
  onRegistered: (user: UserProfile) => void;
};

const initialForm: ClientRegistrationInput = {
  name: '',
  email: '',
  password: '',
  phone: '',
};

export function ClientRegistrationScreen({
  onBack,
  onRegistered,
}: ClientRegistrationScreenProps) {
  const [form, setForm] = useState<ClientRegistrationInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = form.name.trim() && form.email.trim() && form.password.trim().length >= 6;

  const handleChange = (field: keyof ClientRegistrationInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await registerClient(form);
      onRegistered(response.user);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Registrazione non completata.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Registrazione cliente"
        title="Crea il tuo account cliente"
        subtitle="Registri il profilo una sola volta e poi puoi accedere con email e password."
      />

      <View style={styles.card}>
        <Field
          label="Nome e cognome"
          value={form.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Giulia Rossi"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(value) => handleChange('email', value)}
          placeholder="giulia@dominio.it"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={(value) => handleChange('password', value)}
          placeholder="Minimo 6 caratteri"
          autoCapitalize="none"
          secureTextEntry
        />
        <Field
          label="Telefono"
          value={form.phone}
          onChangeText={(value) => handleChange('phone', value)}
          placeholder="+39 333 123 4567"
          keyboardType="default"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton label="Torna indietro" onPress={onBack} variant="secondary" />
          <PrimaryButton
            disabled={!isFormValid || isSubmitting}
            label={isSubmitting ? 'Creazione account...' : 'Registrati come cliente'}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
};

function Field({
  autoCapitalize = 'words',
  keyboardType = 'default',
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
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.xl,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: '#B05252',
    fontSize: 14,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
