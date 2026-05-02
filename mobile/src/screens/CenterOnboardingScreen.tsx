import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { updateCenterOnboarding } from '../lib/api';
import type { ActivationStatus, Center, CenterOnboardingInput } from '../types/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type CenterOnboardingScreenProps = {
  center: Center;
  initialActivation: ActivationStatus;
  onBack: () => void;
  onComplete: (center: Center, activation: ActivationStatus) => void;
};

type OnboardingStep = 'welcome' | 'brand' | 'schedule' | 'services' | 'summary';

const stepOrder: OnboardingStep[] = ['welcome', 'brand', 'schedule', 'services', 'summary'];

export function CenterOnboardingScreen({
  center,
  initialActivation,
  onBack,
  onComplete,
}: CenterOnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [logoUrl, setLogoUrl] = useState(center.branding.logo ?? '');
  const [brandColor, setBrandColor] = useState(center.branding.primary_color ?? '#2F4F6F');
  const [openingDaysInput, setOpeningDaysInput] = useState((center.opening_days ?? []).join(', '));
  const [primaryServicesInput, setPrimaryServicesInput] = useState(
    (center.primary_services ?? []).join(', '),
  );
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('19:00');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activation, setActivation] = useState(initialActivation);

  const step = stepOrder[stepIndex];
  const canGoBack = stepIndex > 0;

  const renderStep = () => {
    if (step === 'welcome') {
      return (
        <>
          <Text style={styles.stepKicker}>Step 1 di 5</Text>
          <Text style={styles.stepTitle}>Benvenuto in Fidea</Text>
          <Text style={styles.stepBody}>
            Il pagamento e confermato. Ora completiamo il profilo del centro in pochi step full
            screen, come nel flusso reference.
          </Text>
        </>
      );
    }

    if (step === 'brand') {
      return (
        <>
          <Text style={styles.stepKicker}>Step 2 di 5</Text>
          <Text style={styles.stepTitle}>Definisci il brand</Text>
          <Text style={styles.stepBody}>Logo e colore primario danno identita al centro.</Text>
          <Field label="Logo URL" placeholder="https://..." value={logoUrl} onChangeText={setLogoUrl} />
          <Field
            label="Colore brand"
            placeholder="#2F4F6F"
            value={brandColor}
            onChangeText={setBrandColor}
            autoCapitalize="characters"
          />
        </>
      );
    }

    if (step === 'schedule') {
      return (
        <>
          <Text style={styles.stepKicker}>Step 3 di 5</Text>
          <Text style={styles.stepTitle}>Imposta giorni e orari</Text>
          <Text style={styles.stepBody}>
            Se mancano i giorni di apertura, il centro non puo essere pubblicato ai clienti.
          </Text>
          <Field
            label="Giorni di apertura"
            placeholder="Lun, Mar, Mer, Gio, Ven, Sab"
            value={openingDaysInput}
            onChangeText={setOpeningDaysInput}
          />
          <Field label="Apre alle" placeholder="09:00" value={startHour} onChangeText={setStartHour} />
          <Field label="Chiude alle" placeholder="19:00" value={endHour} onChangeText={setEndHour} />
        </>
      );
    }

    if (step === 'services') {
      return (
        <>
          <Text style={styles.stepKicker}>Step 4 di 5</Text>
          <Text style={styles.stepTitle}>Scegli i servizi principali</Text>
          <Text style={styles.stepBody}>
            Inserisci i trattamenti chiave separati da virgola. Senza questi il centro resta non
            pubblicabile.
          </Text>
          <Field
            label="Servizi principali"
            placeholder="Hydra Glow Facial, Manicure Premium, Brow Design"
            value={primaryServicesInput}
            onChangeText={setPrimaryServicesInput}
          />
        </>
      );
    }

    return (
      <>
        <Text style={styles.stepKicker}>Step 5 di 5</Text>
        <Text style={styles.stepTitle}>Riepilogo attivazione</Text>
        <Text style={styles.stepBody}>{activation.message}</Text>
        <Text style={styles.meta}>Stato: {activation.state}</Text>
        <Text style={styles.meta}>
          Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
        </Text>
      </>
    );
  };

  const handleNext = async () => {
    setError(null);

    if (step !== 'summary') {
      setStepIndex((current) => Math.min(current + 1, stepOrder.length - 1));
      return;
    }

    setIsSaving(true);

    const openingDays = openingDaysInput
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean);
    const primaryServices = primaryServicesInput
      .split(',')
      .map((service) => service.trim())
      .filter(Boolean);
    const openingHours: CenterOnboardingInput['opening_hours'] = Object.fromEntries(
      openingDays.map((day) => [day, { start: startHour || null, end: endHour || null }]),
    );

    try {
      const response = await updateCenterOnboarding(center.id, {
        logo_url: logoUrl,
        brand_color: brandColor,
        opening_days: openingDays,
        opening_hours: openingHours,
        primary_services: primaryServices,
      });
      setActivation(response.activation);
      onComplete(response.center, response.activation);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Salvataggio non riuscito.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressValue, { width: `${((stepIndex + 1) / stepOrder.length) * 100}%` }]} />
      </View>
      <View style={styles.content}>
        <ScreenHeader
          eyebrow="Onboarding centro"
          title={`Completa ${center.name}`}
          subtitle="Step-by-step fullscreen, senza formone unico."
        />
        <View style={styles.stepCard}>{renderStep()}</View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={canGoBack ? 'Indietro' : 'Esci'}
            onPress={() => {
              if (canGoBack) {
                setStepIndex((current) => Math.max(current - 1, 0));
              } else {
                onBack();
              }
            }}
            variant="secondary"
          />
          <PrimaryButton
            disabled={isSaving}
            label={
              isSaving ? 'Salvataggio...' : step === 'summary' ? 'Entra nella dashboard' : 'Continua'
            }
            onPress={() => {
              void handleNext();
            }}
          />
        </View>
      </View>
    </View>
  );
}

type FieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function Field({
  autoCapitalize = 'sentences',
  label,
  onChangeText,
  placeholder,
  value,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
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
    backgroundColor: colors.brand,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    height: 6,
    width: '100%',
  },
  progressValue: {
    backgroundColor: '#F6E6A8',
    height: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  stepCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: spacing.xl,
  },
  stepKicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  stepTitle: {
    color: colors.brandInk,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  stepBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  fieldWrap: {
    marginTop: spacing.lg,
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
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  error: {
    color: '#FDE2E2',
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
