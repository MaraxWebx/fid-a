import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { centerSettings, featuredServices, treatmentCatalogSections } from '../data/mockData';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { ActivationStatus, Center } from '../types/api';

type CenterSettingsScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onLogout: () => void;
};

export function CenterSettingsScreen({ activation, center, onLogout }: CenterSettingsScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Impostazioni"
        title={`Configura ${center.name}`}
        subtitle="Brand, informazioni, posizione e catalogo trattamenti in un'unica sezione."
      />

      {!activation.is_listable ? (
        <SectionCard eyebrow="Attivazione" title="Centro non ancora visibile" tone="sand">
          <Text style={styles.catalogDetail}>{activation.message}</Text>
          <Text style={styles.catalogDetail}>
            Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Branding" title="Identita centro">
        <SettingRow label="Nome centro" value={center.name} />
        <SettingRow label="Logo" value={center.branding.logo ?? centerSettings.logoStatus} />
        <SettingRow
          label="Colore principale"
          value={center.branding.primary_color ?? centerSettings.primaryColor}
        />
      </SectionCard>

      <SectionCard eyebrow="Informazioni" title="Contatti e posizione">
        <SettingRow label="Email accesso" value={center.email} />
        <SettingRow label="Indirizzo" value={centerSettings.location} />
        <SettingRow label="Coordinate" value={centerSettings.coordinates} />
      </SectionCard>

      <SectionCard eyebrow="Catalogo" title="Sezioni trattamenti">
        {treatmentCatalogSections.map((section) => (
          <View key={section.id} style={styles.catalogRow}>
            <Text style={styles.catalogTitle}>{section.title}</Text>
            <Text style={styles.catalogDetail}>{section.detail}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Listino" title="Trattamenti attivi">
        {featuredServices.map((service) => (
          <View key={service.id} style={styles.catalogRow}>
            <Text style={styles.catalogTitle}>{service.name}</Text>
            <Text style={styles.catalogDetail}>
              {service.duration} - {service.price}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Sessione" title="Torna alla home app">
        <Text style={styles.catalogDetail}>
          Esci dalla sessione del centro e torna alla schermata iniziale pubblica di Fidea.
        </Text>
        <View style={styles.logoutWrap}>
          <PrimaryButton label="Log out" onPress={onLogout} variant="secondary" />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
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
  settingRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  settingLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  settingValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  catalogRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  catalogTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  catalogDetail: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  logoutWrap: {
    marginTop: spacing.lg,
  },
});
