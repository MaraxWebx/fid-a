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
  updateCenterOnboarding,
  updateCenterProfile,
  updateCenterServices,
} from '../lib/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type {
  ActivationStatus,
  Center,
  CenterOnboardingInput,
  Review,
  Service,
} from '../types/api';

type CenterSettingsScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
  onLogout: () => void;
};

type WeekdayKey = 'Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom';
type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

const weekdayOptions: { key: WeekdayKey; fullLabel: string }[] = [
  { key: 'Lun', fullLabel: 'Lunedi' },
  { key: 'Mar', fullLabel: 'Martedi' },
  { key: 'Mer', fullLabel: 'Mercoledi' },
  { key: 'Gio', fullLabel: 'Giovedi' },
  { key: 'Ven', fullLabel: 'Venerdi' },
  { key: 'Sab', fullLabel: 'Sabato' },
  { key: 'Dom', fullLabel: 'Domenica' },
];

function buildInitialSchedule(center: Center): Record<WeekdayKey, DaySchedule> {
  return weekdayOptions.reduce(
    (accumulator, day) => {
      const currentHours = center.opening_hours?.[day.key];
      const isEnabled = center.opening_days?.includes(day.key) ?? false;

      accumulator[day.key] = {
        enabled: isEnabled,
        start: currentHours?.start ?? '09:00',
        end: currentHours?.end ?? '19:00',
      };
      return accumulator;
    },
    {} as Record<WeekdayKey, DaySchedule>,
  );
}

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
  const [profileDescription, setProfileDescription] = useState(center.branding.description ?? '');
  const [profileInstagramUrl, setProfileInstagramUrl] = useState(center.branding.instagram_url ?? '');
  const [profileTiktokUrl, setProfileTiktokUrl] = useState(center.branding.tiktok_url ?? '');
  const [schedule, setSchedule] = useState(() => buildInitialSchedule(center));
  const [selectedDayKey, setSelectedDayKey] = useState<WeekdayKey>('Lun');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    setProfileName(center.name);
    setProfileLogoUrl(center.branding.logo ?? '');
    setProfileDescription(center.branding.description ?? '');
    setProfileInstagramUrl(center.branding.instagram_url ?? '');
    setProfileTiktokUrl(center.branding.tiktok_url ?? '');
    setSchedule(buildInitialSchedule(center));
  }, [center]);

  const selectedDaySchedule = schedule[selectedDayKey];

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
  const ratingAverage =
    center.rating_average ??
    (reviews.length > 0
      ? Number(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1),
        )
      : null);
  const reviewsCount = center.reviews_count ?? reviews.length;

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
        description: profileDescription.trim(),
        instagram_url: profileInstagramUrl.trim(),
        name: profileName,
        logo_url: profileLogoUrl,
        tiktok_url: profileTiktokUrl.trim(),
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

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setCatalogError(null);

    const openingDays = weekdayOptions
      .filter(({ key }) => schedule[key].enabled)
      .map(({ key }) => key);
    const openingHours: CenterOnboardingInput['opening_hours'] = Object.fromEntries(
      openingDays.map((day) => [
        day,
        {
          start: schedule[day].start || null,
          end: schedule[day].end || null,
        },
      ]),
    );

    try {
      const response = await updateCenterOnboarding(center.id, {
        logo_url: center.branding.logo ?? '',
        opening_days: openingDays,
        opening_hours: openingHours,
        primary_services: configuredServices.map((service) => service.name),
      });
      onCenterUpdated(response.center, response.activation);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Aggiornamento orari non riuscito.',
      );
    } finally {
      setSavingSchedule(false);
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

      <SectionCard eyebrow="Profilo centro" title="Informazioni Centro">
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
            {center.branding.description ? (
              <Text numberOfLines={2} style={styles.profileDescription}>
                {center.branding.description}
              </Text>
            ) : null}
            <View style={styles.socialPreviewRow}>
              {center.branding.instagram_url ? (
                <View style={styles.socialPreviewPill}>
                  <Ionicons color={colors.brandInk} name="logo-instagram" size={14} />
                  <Text style={styles.socialPreviewText}>Instagram</Text>
                </View>
              ) : null}
              {center.branding.tiktok_url ? (
                <View style={styles.socialPreviewPill}>
                  <Ionicons color={colors.brandInk} name="logo-tiktok" size={14} />
                  <Text style={styles.socialPreviewText}>TikTok</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.ratingInline}>
              <Ionicons color={colors.brandInk} name="star" size={16} />
              <Text style={styles.ratingInlineText}>
                {ratingAverage !== null
                  ? `${ratingAverage}/5 su ${reviewsCount} recensioni`
                  : 'Nessuna valutazione ancora'}
              </Text>
            </View>
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

      <SectionCard eyebrow="Orari" title="Orari settimanali">
        <Text style={styles.catalogIntro}>
          Modifica i giorni e gli orari base del centro. Le eccezioni per singole date restano
          gestibili dall'agenda.
        </Text>
        <View style={styles.scheduleList}>
          {weekdayOptions.map((day) => {
            const entry = schedule[day.key];

            return (
              <Pressable
                key={day.key}
                onPress={() => {
                  setSelectedDayKey(day.key);
                  setIsScheduleModalOpen(true);
                }}
                style={styles.scheduleRow}
              >
                <View style={styles.scheduleMain}>
                  <Text style={styles.scheduleTitle}>{day.fullLabel}</Text>
                  <Text style={styles.scheduleMeta}>
                    {entry.enabled ? `${entry.start} - ${entry.end}` : 'Chiuso'}
                  </Text>
                </View>
                <Text style={styles.scheduleAction}>Modifica</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.saveScheduleWrap}>
          <PrimaryButton
            disabled={savingSchedule}
            label={savingSchedule ? 'Salvataggio...' : 'Salva orari'}
            onPress={() => {
              void handleSaveSchedule();
            }}
          />
        </View>
      </SectionCard>

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
                <Text style={styles.modalTitle}>Modifica Informazioni Centro</Text>
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

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Descrizione del centro</Text>
              <TextInput
                maxLength={300}
                multiline
                onChangeText={setProfileDescription}
                placeholder="Racconta in poche righe l'atmosfera e la specialita del tuo beauty salon"
                placeholderTextColor={colors.textSoft}
                style={[styles.input, styles.textArea]}
                value={profileDescription}
              />
              <Text style={styles.charCounter}>{profileDescription.length}/300</Text>
            </View>

            <View style={styles.socialFieldsBlock}>
              <Text style={styles.socialFieldsTitle}>Profili Social</Text>
              <Text style={styles.socialFieldsIntro}>
                Aggiungi link ufficiali, verranno mostrati nella dashboard del centro.
              </Text>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Instagram URL</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={setProfileInstagramUrl}
                  placeholder="https://instagram.com/nomecentro"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={profileInstagramUrl}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>TikTok URL</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={setProfileTiktokUrl}
                  placeholder="https://tiktok.com/@nomecentro"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={profileTiktokUrl}
                />
              </View>
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

      <Modal
        animationType="slide"
        onRequestClose={() => setIsScheduleModalOpen(false)}
        transparent
        visible={isScheduleModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>Orario di default</Text>
                <Text style={styles.modalTitle}>
                  {weekdayOptions.find(({ key }) => key === selectedDayKey)?.fullLabel}
                </Text>
              </View>
              <Pressable onPress={() => setIsScheduleModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setSchedule((current) => ({
                  ...current,
                  [selectedDayKey]: {
                    ...current[selectedDayKey],
                    enabled: !current[selectedDayKey].enabled,
                  },
                }));
              }}
              style={[
                styles.dayModalToggle,
                selectedDaySchedule.enabled && styles.dayModalToggleActive,
              ]}
            >
              <View>
                <Text style={styles.scheduleTitle}>Disponibilita del giorno</Text>
                <Text style={styles.scheduleMeta}>
                  {selectedDaySchedule.enabled ? 'Aperto' : 'Chiuso'}
                </Text>
              </View>
              <Text style={styles.scheduleAction}>
                {selectedDaySchedule.enabled ? 'APERTO' : 'CHIUSO'}
              </Text>
            </Pressable>

            {selectedDaySchedule.enabled ? (
              <View style={styles.hoursRow}>
                <View style={styles.hoursField}>
                  <Text style={styles.fieldLabel}>Dalle</Text>
                  <TextInput
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => {
                      setSchedule((current) => ({
                        ...current,
                        [selectedDayKey]: {
                          ...current[selectedDayKey],
                          start: value,
                        },
                      }));
                    }}
                    placeholder="09:00"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={selectedDaySchedule.start}
                  />
                </View>
                <View style={styles.hoursField}>
                  <Text style={styles.fieldLabel}>Alle</Text>
                  <TextInput
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) => {
                      setSchedule((current) => ({
                        ...current,
                        [selectedDayKey]: {
                          ...current[selectedDayKey],
                          end: value,
                        },
                      }));
                    }}
                    placeholder="19:00"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={selectedDaySchedule.end}
                  />
                </View>
              </View>
            ) : null}
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
    backgroundColor: colors.surface,
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
    color: colors.brandInk,
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
  profileDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  socialPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  socialPreviewPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  socialPreviewText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '800',
  },
  ratingInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  ratingInlineText: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
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
  scheduleList: {
    gap: spacing.sm,
  },
  scheduleRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  scheduleMain: {
    flex: 1,
    paddingRight: spacing.md,
  },
  scheduleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  scheduleMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  scheduleAction: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '800',
  },
  saveScheduleWrap: {
    marginTop: spacing.lg,
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
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  logoutWrap: {
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 94, 114, 0.28)',
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
  textArea: {
    minHeight: 112,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  charCounter: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  socialFieldsBlock: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  socialFieldsTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: '800',
  },
  socialFieldsIntro: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  dayModalToggle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  dayModalToggleActive: {
    borderColor: colors.brandDark,
    borderWidth: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  hoursField: {
    flex: 1,
  },
});
