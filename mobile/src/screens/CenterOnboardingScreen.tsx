import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
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

export function CenterOnboardingScreen({
  center,
  initialActivation,
  onBack,
  onComplete,
}: CenterOnboardingScreenProps) {
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

  const suggestedDays = useMemo(() => 'Lun, Mar, Mer, Gio, Ven, Sab', []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

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
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Onboarding centro"
        title={`Completa ${center.name}`}
        subtitle="Nella demo il pagamento e gia validato. Completa il profilo del centro per renderlo visibile in app."
      />

      <SectionCard
        eyebrow="Stato attivazione"
        title={activation.is_listable ? 'Centro pronto' : 'Centro non ancora pubblicabile'}
        tone={activation.is_listable ? 'sky' : 'sand'}
      >
        <Text style={styles.statusMessage}>{activation.message}</Text>
        <Text style={styles.statusMeta}>Stato: {activation.state}</Text>
        {!activation.is_listable ? (
          <Text style={styles.statusMissing}>
            Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Brand" title="Identita centro">
        <Field label="Logo URL" placeholder="https://..." value={logoUrl} onChangeText={setLogoUrl} />
        <Field
          label="Colore brand"
          placeholder="#2F4F6F"
          value={brandColor}
          onChangeText={setBrandColor}
          autoCapitalize="characters"
        />
      </SectionCard>

      <SectionCard eyebrow="Apertura" title="Giorni e orari">
        <Field
          label="Giorni di apertura"
          placeholder={suggestedDays}
          value={openingDaysInput}
          onChangeText={setOpeningDaysInput}
        />
        <View style={styles.row}>
          <Field compact label="Apre alle" placeholder="09:00" value={startHour} onChangeText={setStartHour} />
          <Field compact label="Chiude alle" placeholder="19:00" value={endHour} onChangeText={setEndHour} />
        </View>
      </SectionCard>

      <SectionCard eyebrow="Catalogo" title="Servizi principali">
        <Field
          label="Servizi principali"
          placeholder="Hydra Glow Facial, Manicure Premium, Brow Design"
          value={primaryServicesInput}
          onChangeText={setPrimaryServicesInput}
        />
      </SectionCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton label="Torna al form" onPress={onBack} variant="secondary" />
        <PrimaryButton
          disabled={isSaving}
          label={isSaving ? 'Salvataggio...' : 'Completa onboarding'}
          onPress={handleSave}
        />
      </View>
    </ScrollView>
  );
}

type FieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  compact?: boolean;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function Field({
  autoCapitalize = 'sentences',
  compact = false,
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
  statusMessage: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  statusMeta: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  statusMissing: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
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
  error: {
    color: '#B05252',
    fontSize: 14,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
