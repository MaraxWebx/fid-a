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
import Ionicons from 'react-native-vector-icons/Ionicons';

import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ServiceCatalogPicker } from '../components/ServiceCatalogPicker';
import { SectionCard } from '../components/SectionCard';
import { treatmentCatalog } from '../data/treatmentCatalog';
import {
  getCenterReviews,
  getCenterServices,
  updateCenterProfile,
  updateCenterServices,
} from '../lib/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { ActivationStatus, Center, Review, Service } from '../types/api';

type CenterSettingsScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
  onLogout: () => void;
};

export function CenterSettingsScreen({
  activation,
  center,
  onCenterUpdated,
  onLogout,
}: CenterSettingsScreenProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(center.name);
  const [profileLogoUrl, setProfileLogoUrl] = useState(center.branding.logo ?? '');

  useEffect(() => {
    setProfileName(center.name);
    setProfileLogoUrl(center.branding.logo ?? '');
  }, [center]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getCenterServices(center.id), getCenterReviews(center.id)])
      .then(([servicesResult, reviewsResult]) => {
        if (!mounted) {
          return;
        }

        if (servicesResult.status === 'fulfilled') {
          setServices(servicesResult.value);
        } else {
          setCatalogError('Impossibile caricare i trattamenti del centro.');
        }

        if (reviewsResult.status === 'fulfilled') {
          setReviews(reviewsResult.value);
        } else {
          setReviews([]);
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

  const handleSaveTreatment = async (
    selectedCategory: string,
    selectedTreatment: string,
    parsedPrice: number | null,
    parsedDuration: number | null,
  ) => {
    setSavingService(true);
    setCatalogError(null);

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
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Salvataggio trattamento non riuscito.',
      );
      throw error;
    } finally {
      setSavingService(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setCatalogError(null);

    try {
      const response = await updateCenterProfile(center.id, {
        name: profileName,
        logo_url: profileLogoUrl,
      });
      onCenterUpdated(response.center, response.activation);
      setIsProfileModalOpen(false);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Aggiornamento profilo non riuscito.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Impostazioni"
        logoUrl={center.branding.logo}
        title={center.name}
        subtitle="Profilo centro e configurazione trattamenti."
      />

      <SectionCard eyebrow="Profilo centro" title="Informazioni principali">
        <View style={styles.profileCard}>
          {center.branding.logo ? (
            <Image source={{ uri: center.branding.logo }} style={styles.profileLogo} />
          ) : (
            <View style={styles.profileLogoFallback}>
              <Text style={styles.profileLogoText}>
                {center.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileMain}>
            <Text style={styles.profileTitle}>{center.name}</Text>
            <Text style={styles.profileMeta}>{center.email}</Text>
            <Text style={styles.profileMeta}>
              Logo: {center.branding.logo ? 'configurato' : 'non configurato'}
            </Text>
            <Text style={styles.profileMeta}>
              Logo: {center.branding.logo ? 'configurato' : 'non configurato'}
            </Text>
          </View>
          <Pressable
            onPress={() => setIsProfileModalOpen(true)}
            style={styles.editButton}
          >
            <Ionicons color={colors.brandInk} name="create-outline" size={18} />
            <Text style={styles.editButtonLabel}>Modifica</Text>
          </Pressable>
        </View>
      </SectionCard>

      {!activation.is_listable ? (
        <SectionCard eyebrow="Attivazione" title="Centro non ancora visibile" tone="sand">
          <Text style={styles.catalogDetail}>{activation.message}</Text>
          <Text style={styles.catalogDetail}>
            Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Catalogo" title="Categorie trattamenti">
        <Text style={styles.catalogIntro}>
          Tocca una categoria per aprire la lista trattamenti in modale, poi
          seleziona il servizio e imposta prezzo e durata.
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
          isBusy={savingService}
          onSaveTreatment={handleSaveTreatment}
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

      <SectionCard eyebrow="Recensioni" title="Tutte le recensioni">
        {reviews.length === 0 ? (
          <Text style={styles.catalogDetail}>Nessuna recensione disponibile al momento.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.catalogRow}>
              <Text style={styles.catalogTitle}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </Text>
              <Text style={styles.catalogDetail}>{review.comment}</Text>
              <Text style={styles.catalogDetail}>
                {review.user_name ?? 'Cliente'} · {review.service_name ?? 'Trattamento'}
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
        onRequestClose={() => setIsProfileModalOpen(false)}
        transparent
        visible={isProfileModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>Profilo centro</Text>
                <Text style={styles.modalTitle}>Modifica informazioni</Text>
              </View>
              <Pressable onPress={() => setIsProfileModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Nome centro</Text>
              <TextInput
                onChangeText={setProfileName}
                placeholder="Nome centro"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profileName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Logo URL</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setProfileLogoUrl}
                placeholder="https://..."
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profileLogoUrl}
              />
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setIsProfileModalOpen(false)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={savingProfile}
                label={savingProfile ? 'Salvataggio...' : 'Salva profilo'}
                onPress={() => {
                  void handleSaveProfile();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.md,
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
  profileMain: {
    flex: 1,
  },
  profileTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
  },
  profileMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editButtonLabel: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
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
