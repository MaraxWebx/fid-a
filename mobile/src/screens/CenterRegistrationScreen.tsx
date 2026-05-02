import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { registerCenter } from '../lib/api';
import type {
  ActivationStatus,
  Center,
  CenterRegistrationInput,
  CenterRegistrationResponse,
} from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type CenterRegistrationScreenProps = {
  onBack: () => void;
  onRegistered: (center: Center, activation: ActivationStatus) => void;
};

const initialForm: CenterRegistrationInput = {
  name: '',
  email: '',
  password: '',
  vat_number: '',
  address: '',
  city: '',
  postal_code: '',
  province: '',
  country: 'Italia',
};

export function CenterRegistrationScreen({ onBack, onRegistered }: CenterRegistrationScreenProps) {
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
      if (response.checkout_bypassed || !response.checkout_url) {
        onRegistered(response.center, response.activation);
      } else {
        await Linking.openURL(response.checkout_url);
      }
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
        subtitle="Inserisci i dati anagrafici del centro. Nella demo saltiamo Stripe e passiamo direttamente all'onboarding del profilo."
      />

      <View style={styles.card}>
        <Field
          label="Nome centro estetico"
          value={form.name}
          onChangeText={(value) => handleChange('name', value)}
          placeholder="Maison Glow Milano"
        />
        <Field
          label="Email accesso centro"
          value={form.email}
          onChangeText={(value) => handleChange('email', value)}
          placeholder="centro@dominio.it"
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
          Il backend crea il profilo centro, marca la sottoscrizione come valida in demo e ti porta
          subito al completamento del profilo.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton label="Torna indietro" onPress={onBack} variant="secondary" />
          <PrimaryButton
            disabled={!isFormValid || isSubmitting}
            label={isSubmitting ? 'Creazione centro...' : 'Continua all onboarding'}
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
          {result.checkout_url ? (
            <View style={styles.statusAction}>
              <PrimaryButton
                label="Riapri checkout Stripe"
                onPress={() => {
                  if (result.checkout_url) {
                    void Linking.openURL(result.checkout_url);
                  }
                }}
              />
            </View>
          ) : null}
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
  secureTextEntry?: boolean;
  value: string;
};

function Field({
  autoCapitalize = 'words',
  compact = false,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
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
