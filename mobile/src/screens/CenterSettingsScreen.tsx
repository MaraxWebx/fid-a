import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ServiceCatalogPicker } from '../components/ServiceCatalogPicker';
import { SectionCard } from '../components/SectionCard';
import { treatmentCatalog } from '../data/treatmentCatalog';
import { getCenterServices, updateCenterServices } from '../lib/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { ActivationStatus, Center, Service } from '../types/api';

type CenterSettingsScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onLogout: () => void;
};

export function CenterSettingsScreen({
  activation,
  center,
  onLogout,
}: CenterSettingsScreenProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    getCenterServices(center.id)
      .then((response) => {
        if (mounted) {
          setServices(response);
        }
      })
      .catch(() => {
        if (mounted) {
          setCatalogError('Impossibile caricare i trattamenti del centro.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingServices(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [center.id]);

  const servicesByName = useMemo(
    () => new Map(services.map((service) => [service.name, service])),
    [services],
  );

  const configuredServices = useMemo(
    () => services.filter((service) => service.visibility === 'active'),
    [services],
  );

  const openServiceModal = (category: string, treatment: string) => {
    const existing = servicesByName.get(treatment);
    setSelectedCategory(category);
    setSelectedTreatment(treatment);
    setPriceInput(
      existing?.price !== null && existing?.price !== undefined
        ? String(existing.price)
        : '',
    );
    setDurationInput(
      existing?.duration !== null && existing?.duration !== undefined
        ? String(existing.duration)
        : '',
    );
    setCatalogError(null);
    setIsModalOpen(true);
  };

  const handleSaveTreatment = async () => {
    if (!selectedCategory || !selectedTreatment) {
      return;
    }

    setSavingService(true);
    setCatalogError(null);

    const parsedPrice =
      priceInput.trim().length > 0 ? Number(priceInput.replace(',', '.')) : null;
    const parsedDuration =
      durationInput.trim().length > 0 ? Number(durationInput) : null;

    if (
      (parsedPrice !== null && Number.isNaN(parsedPrice)) ||
      (parsedDuration !== null && Number.isNaN(parsedDuration))
    ) {
      setCatalogError('Inserisci prezzo e durata validi.');
      setSavingService(false);
      return;
    }

    try {
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: selectedTreatment,
            category: selectedCategory,
            duration: parsedDuration,
            price: parsedPrice,
            visibility: 'active',
          },
        ],
      });
      setServices(response);
      setIsModalOpen(false);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Salvataggio trattamento non riuscito.',
      );
    } finally {
      setSavingService(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Impostazioni"
        logoUrl={center.branding.logo}
        title={center.name}
        subtitle="Brand, informazioni e configurazione trattamenti del centro."
      />

      <View style={styles.profileHero}>
        {center.branding.logo ? (
          <Image source={{ uri: center.branding.logo }} style={styles.profileLogo} />
        ) : (
          <View style={styles.profileLogoFallback}>
            <Text style={styles.profileLogoText}>
              {center.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>{center.name}</Text>
          <Text style={styles.profileSubtitle}>
            Profilo centro e configurazione operativa del listino.
          </Text>
        </View>
      </View>

      {!activation.is_listable ? (
        <SectionCard eyebrow="Attivazione" title="Centro non ancora visibile" tone="sand">
          <Text style={styles.catalogDetail}>{activation.message}</Text>
          <Text style={styles.catalogDetail}>
            Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Branding" title="Identita centro">
        <View style={styles.brandPreview}>
          {center.branding.logo ? (
            <Image source={{ uri: center.branding.logo }} style={styles.brandPreviewLogo} />
          ) : (
            <View style={styles.brandPreviewFallback}>
              <Text style={styles.brandPreviewText}>
                {center.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.brandPreviewCopy}>
            <Text style={styles.brandPreviewTitle}>{center.name}</Text>
            <Text style={styles.catalogDetail}>
              Anteprima logo e colore principale del centro.
            </Text>
          </View>
        </View>
        <SettingRow label="Nome centro" value={center.name} />
        <SettingRow label="Logo" value={center.branding.logo ?? 'Logo non caricato'} />
        <SettingRow
          label="Colore principale"
          value={center.branding.primary_color ?? 'Colore non impostato'}
        />
      </SectionCard>

      <SectionCard eyebrow="Catalogo" title="Categorie trattamenti">
        <Text style={styles.catalogIntro}>
          Tocca un trattamento per aprire la modale e inserire prezzo e durata.
          Dopo il salvataggio puoi passare subito al prossimo.
        </Text>
        {loadingServices ? <ActivityIndicator color={colors.brand} /> : null}
        {catalogError ? <Text style={styles.errorText}>{catalogError}</Text> : null}
        <ServiceCatalogPicker
          catalog={treatmentCatalog}
          configuredServices={configuredServices.map((service) => ({
            category: service.category,
            duration: service.duration,
            name: service.name,
            price: service.price,
          }))}
          onSelectCategory={setSelectedCategory}
          onSelectTreatment={openServiceModal}
          selectedCategory={selectedCategory}
        />
      </SectionCard>

      <SectionCard eyebrow="Listino attivo" title="Trattamenti configurati">
        {configuredServices.length === 0 ? (
          <Text style={styles.catalogDetail}>
            Nessun trattamento configurato. Seleziona una categoria e inizia dal
            primo servizio.
          </Text>
        ) : (
          configuredServices.map((service) => (
            <View key={service.id} style={styles.catalogRow}>
              <Text style={styles.catalogTitle}>{service.name}</Text>
              <Text style={styles.catalogDetail}>
                {service.category} · {service.duration ?? '-'} min · EUR{' '}
                {service.price ?? '-'}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard eyebrow="Sessione" title="Torna alla home app">
        <Text style={styles.catalogDetail}>
          Esci dalla sessione del centro e torna alla schermata iniziale pubblica di Fidea.
        </Text>
        <View style={styles.logoutWrap}>
          <PrimaryButton label="Log out" onPress={onLogout} variant="secondary" />
        </View>
      </SectionCard>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
        transparent
        visible={isModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>{selectedCategory ?? 'Trattamento'}</Text>
                <Text style={styles.modalTitle}>{selectedTreatment ?? ''}</Text>
              </View>
              <Pressable onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Prezzo EUR</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setPriceInput}
                placeholder="Es. 45"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={priceInput}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Durata minuti</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setDurationInput}
                placeholder="Es. 60"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={durationInput}
              />
            </View>

            {catalogError ? <Text style={styles.errorText}>{catalogError}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setIsModalOpen(false)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={savingService}
                label={savingService ? 'Salvataggio...' : 'Salva trattamento'}
                onPress={() => {
                  void handleSaveTreatment();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  profileHero: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  profileLogo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 64,
    width: 64,
  },
  profileLogoFallback: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  profileLogoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
  },
  profileSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  brandPreview: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  brandPreviewLogo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 52,
    width: 52,
  },
  brandPreviewFallback: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  brandPreviewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  brandPreviewCopy: {
    flex: 1,
  },
  brandPreviewTitle: {
    color: colors.brandInk,
    fontSize: 17,
    fontWeight: '800',
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
  catalogIntro: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.lg,
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
  errorText: {
    color: '#B42318',
    fontSize: 14,
    marginTop: spacing.sm,
  },
  logoutWrap: {
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
