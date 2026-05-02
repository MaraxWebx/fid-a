import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { registerCenter } from '../lib/api';
import type { CenterRegistrationInput, CenterRegistrationResponse } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type CenterRegistrationScreenProps = {
  onBack: () => void;
};

const initialForm: CenterRegistrationInput = {
  name: '',
  vat_number: '',
  address: '',
  city: '',
  postal_code: '',
  province: '',
  country: 'Italia',
};

export function CenterRegistrationScreen({ onBack }: CenterRegistrationScreenProps) {
  const [form, setForm] = useState<CenterRegistrationInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CenterRegistrationResponse | null>(null);

  const isFormValid = Object.values(form).every((value) => value.trim().length > 0);

  const handleChange = (field: keyof CenterRegistrationInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await registerCenter(form);
      setResult(response);
      await Linking.openURL(response.checkout_url);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Registrazione non completata. Riprova.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Registrazione centro"
        title="Attiva il tuo centro"
        subtitle="Inserisci i dati anagrafici del centro. Al termine ti mandiamo al checkout Stripe del piano mensile da 20 euro."
      />

      <View style={styles.card}>
        <Field
          label="Nome centro estetico"
          value={form.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Maison Glow Milano"
        />
        <Field
          label="Partita IVA"
          value={form.vat_number}
          onChangeText={(value) => handleChange('vat_number', value)}
          placeholder="IT12345678901"
          autoCapitalize="characters"
        />
        <Field
          label="Indirizzo"
          value={form.address}
          onChangeText={(value) => handleChange('address', value)}
          placeholder="Via Roma 24"
        />
        <Field
          label="Citta"
          value={form.city}
          onChangeText={(value) => handleChange('city', value)}
          placeholder="Milano"
        />
        <View style={styles.row}>
          <Field
            compact
            label="CAP"
            value={form.postal_code}
            onChangeText={(value) => handleChange('postal_code', value)}
            placeholder="20100"
            keyboardType="number-pad"
          />
          <Field
            compact
            label="Provincia"
            value={form.province}
            onChangeText={(value) => handleChange('province', value)}
            placeholder="MI"
            autoCapitalize="characters"
          />
        </View>
        <Field
          label="Paese"
          value={form.country}
          onChangeText={(value) => handleChange('country', value)}
          placeholder="Italia"
        />

        <Text style={styles.note}>
          Il backend crea il profilo centro in stato iniziale e genera una sessione Stripe Checkout
          per l'abbonamento mensile di 20 EUR.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label="Torna indietro" onPress={onBack} variant="secondary" />
          <PrimaryButton
            disabled={!isFormValid || isSubmitting}
            label={isSubmitting ? 'Preparazione checkout...' : 'Continua al checkout'}
            onPress={handleSubmit}
          />
        </View>
      </View>

      {result ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>Registrazione creata</Text>
          <Text style={styles.statusTitle}>{result.center.name}</Text>
          <Text style={styles.statusBody}>{result.activation.message}</Text>
          <Text style={styles.statusMeta}>Stato: {result.activation.state}</Text>
          <View style={styles.statusAction}>
            <PrimaryButton
              label="Riapri checkout Stripe"
              onPress={() => {
                void Linking.openURL(result.checkout_url);
              }}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

type FieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  compact?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function Field({
  autoCapitalize = 'words',
  compact = false,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  value,
}: FieldProps) {
  return (
    <View style={[styles.fieldWrap, compact ? styles.fieldCompact : null]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
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
  fieldCompact: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
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
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  error: {
    color: '#B05252',
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statusCard: {
    backgroundColor: colors.surfaceSand,
    borderRadius: 28,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  statusEyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: colors.brandInk,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  statusBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  statusMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  statusAction: {
    marginTop: spacing.lg,
  },
});
