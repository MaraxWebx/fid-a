import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { ServiceCatalogPicker } from "../components/ServiceCatalogPicker";
import { treatmentCatalog } from "../data/treatmentCatalog";
import {
  getCenterServices,
  updateCenterOnboarding,
  updateCenterServices,
} from "../lib/api";
import type {
  ActivationStatus,
  Center,
  CenterOnboardingInput,
  Service,
} from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type CenterOnboardingScreenProps = {
  center: Center;
  initialActivation: ActivationStatus;
  onBack: () => void;
  onComplete: (center: Center, activation: ActivationStatus) => void;
};

type OnboardingStep = "welcome" | "brand" | "schedule" | "services" | "summary";
type WeekdayKey = "Lun" | "Mar" | "Mer" | "Gio" | "Ven" | "Sab" | "Dom";
type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

const stepOrder: OnboardingStep[] = [
  "welcome",
  "brand",
  "schedule",
  "services",
  "summary",
];

const stepIconMap = {
  welcome: "sparkles-outline",
  brand: "color-palette-outline",
  schedule: "calendar-outline",
  services: "cut-outline",
  summary: "checkmark-circle-outline",
} as const;

const weekdayOptions: { key: WeekdayKey; fullLabel: string }[] = [
  { key: "Lun", fullLabel: "Lunedi" },
  { key: "Mar", fullLabel: "Martedi" },
  { key: "Mer", fullLabel: "Mercoledi" },
  { key: "Gio", fullLabel: "Giovedi" },
  { key: "Ven", fullLabel: "Venerdi" },
  { key: "Sab", fullLabel: "Sabato" },
  { key: "Dom", fullLabel: "Domenica" },
];

function buildInitialSchedule(center: Center): Record<WeekdayKey, DaySchedule> {
  return weekdayOptions.reduce(
    (accumulator, day) => {
      const currentHours = center.opening_hours?.[day.key];
      const isEnabled =
        center.opening_days?.includes(day.key) ??
        ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].includes(day.key);

      accumulator[day.key] = {
        enabled: isEnabled,
        start: currentHours?.start ?? "09:00",
        end: currentHours?.end ?? "19:00",
      };
      return accumulator;
    },
    {} as Record<WeekdayKey, DaySchedule>,
  );
}

export function CenterOnboardingScreen({
  center,
  initialActivation,
  onBack,
  onComplete,
}: CenterOnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [logoUrl, setLogoUrl] = useState(center.branding.logo ?? "");
  const [schedule, setSchedule] = useState(() => buildInitialSchedule(center));
  const [selectedDayKey, setSelectedDayKey] = useState<WeekdayKey>("Lun");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [configuredServices, setConfiguredServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activation, setActivation] = useState(initialActivation);

  const step = stepOrder[stepIndex];
  const canGoBack = stepIndex > 0;

  const selectedDays = useMemo(
    () =>
      weekdayOptions
        .filter(({ key }) => schedule[key].enabled)
        .map(({ key }) => key),
    [schedule],
  );
  const selectedDaySchedule = schedule[selectedDayKey];
  const selectedPrimaryServices = useMemo(
    () => configuredServices.map((service) => service.name),
    [configuredServices],
  );
  const configuredServicesSummary = useMemo(
    () =>
      configuredServices.map((service) => ({
        category: service.category,
        duration: service.duration,
        name: service.name,
        price: service.price,
      })),
    [configuredServices],
  );

  useEffect(() => {
    let mounted = true;

    getCenterServices(center.id)
      .then((response) => {
        if (mounted) {
          setConfiguredServices(response);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Impossibile caricare i trattamenti configurati.");
        }
      })
      .finally(() => {
        if (mounted) {
          setServicesLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [center.id]);

  const handleLocalServiceSave = async (
    selectedServiceCategory: string,
    selectedServiceName: string,
    parsedPrice: number | null,
    parsedDuration: number | null,
  ) => {
    setConfiguredServices((current) => {
      const previous = current.find((service) => service.name === selectedServiceName);
      const nextItem: Service = {
        id: previous?.id ?? `draft-${selectedServiceName}`,
        center_id: center.id,
        category: selectedServiceCategory,
        created_at: previous?.created_at,
        description: previous?.description,
        duration: parsedDuration,
        name: selectedServiceName,
        price: parsedPrice,
        subcategory: previous?.subcategory ?? selectedServiceCategory.toLowerCase(),
        visibility: "active",
      };
      const filtered = current.filter(
        (service) => service.name !== selectedServiceName,
      );
      return [...filtered, nextItem].sort(
        (left, right) =>
          left.category.localeCompare(right.category) ||
          left.name.localeCompare(right.name),
      );
    });
    setError(null);
  };

  const renderStep = () => {
    if (step === "welcome") {
      return (
        <>
          <StepIcon name={stepIconMap[step]} />
          <Text style={styles.stepKicker}>Step 1 di 5</Text>
          <Text style={styles.stepTitle}>Benvenuto in Fidea</Text>
          <Text style={styles.stepBody}>
            Il pagamento e confermato. Completiamo il profilo operativo del
            centro, incluso il planning base settimanale che poi potrai
            modificare dalla tua area privata.
          </Text>
        </>
      );
    }

    if (step === "brand") {
      return (
        <>
          <StepIcon name={stepIconMap[step]} />
          <Text style={styles.stepKicker}>Step 2 di 5</Text>
          <Text style={styles.stepTitle}>Definisci il brand</Text>
          <Text style={styles.stepBody}>
            Imposta identita visiva e riferimenti base del centro.
          </Text>
          <Field
            label="Logo URL"
            placeholder="https://..."
            value={logoUrl}
            onChangeText={setLogoUrl}
          />
        </>
      );
    }

    if (step === "schedule") {
      return (
        <>
          <StepIcon name={stepIconMap[step]} />
          <Text style={styles.stepKicker}>Step 3 di 5</Text>
          <Text style={styles.stepTitle}>Giorni e orari di apertura</Text>
          <Text style={styles.stepBody}>
            Qui imposti il calendario settimanale base. Nell&apos;area privata
            potrai poi chiudere singole date, cambiare orari e gestire
            eccezioni.
          </Text>
          <View style={styles.dayList}>
            {weekdayOptions.map((day) => {
              const entry = schedule[day.key];

              return (
                <View key={day.key} style={styles.dayCard}>
                  <Pressable
                    onPress={() => {
                      setSelectedDayKey(day.key);
                      setIsScheduleModalOpen(true);
                    }}
                    style={styles.dayToggle}
                  >
                    <View>
                      <Text style={styles.dayTitle}>{day.fullLabel}</Text>
                      <Text style={styles.dayMeta}>
                        {entry.enabled ? `${entry.start} - ${entry.end}` : "Chiuso"}
                      </Text>
                    </View>
                    <Text style={styles.dayToggleLabel}>Modifica</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      );
    }

    if (step === "services") {
      return (
        <>
          <StepIcon name={stepIconMap[step]} />
          <Text style={styles.stepKicker}>Step 4 di 5</Text>
          <Text style={styles.stepTitle}>Servizi principali</Text>
          <Text style={styles.stepBody}>
            Seleziona una categoria dalla griglia, poi tocca il trattamento.
            Nella modale imposti prezzo e durata, poi passi subito al prossimo.
          </Text>
          {servicesLoading ? (
            <ActivityIndicator color={colors.brand} style={styles.loader} />
          ) : null}
          <ServiceCatalogPicker
            catalog={treatmentCatalog}
            configuredServices={configuredServicesSummary}
            onSaveTreatment={handleLocalServiceSave}
          />
          <Text style={styles.meta}>
            Configurati:{" "}
            {selectedPrimaryServices.join(", ") || "nessun trattamento"}
          </Text>
        </>
      );
    }

    return (
      <>
        <StepIcon name={stepIconMap[step]} />
        <Text style={styles.stepKicker}>Step 5 di 5</Text>
        <Text style={styles.stepTitle}>Riepilogo attivazione</Text>
        <Text style={styles.stepBody}>{activation.message}</Text>
        <Text style={styles.meta}>
          Giorni attivi: {selectedDays.join(", ") || "nessuno"}
        </Text>
        <Text style={styles.meta}>
          Servizi: {selectedPrimaryServices.join(", ") || "non ancora inseriti"}
        </Text>
        <Text style={styles.meta}>Stato: {activation.state}</Text>
        <Text style={styles.meta}>
          Mancano: {activation.missing_fields.join(", ") || "nessun campo"}
        </Text>
      </>
    );
  };

  const handleNext = async () => {
    setError(null);

    if (step !== "summary") {
      setStepIndex((current) => Math.min(current + 1, stepOrder.length - 1));
      return;
    }

    setIsSaving(true);

    const openingDays = weekdayOptions
      .filter(({ key }) => schedule[key].enabled)
      .map(({ key }) => key);
    const primaryServices = configuredServices.map((service) => service.name);
    const openingHours: CenterOnboardingInput["opening_hours"] = Object.fromEntries(
      openingDays.map((day) => [
        day,
        {
          start: schedule[day as WeekdayKey].start || null,
          end: schedule[day as WeekdayKey].end || null,
        },
      ]),
    );

    try {
      await updateCenterServices(center.id, {
        services: configuredServices.map((service) => ({
          category: service.category,
          duration: service.duration,
          name: service.name,
          price: service.price,
          visibility: service.visibility ?? "active",
        })),
      });
      const response = await updateCenterOnboarding(center.id, {
        logo_url: logoUrl,
        opening_days: openingDays,
        opening_hours: openingHours,
        primary_services: primaryServices,
      });
      setActivation(response.activation);
      onComplete(response.center, response.activation);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Salvataggio non riuscito.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressValue,
            { width: `${((stepIndex + 1) / stepOrder.length) * 100}%` },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Onboarding centro"
          title={`Completa ${center.name}`}
          subtitle="Brand, orari e servizi base prima di entrare in dashboard."
        />
        <View style={styles.stepCard}>{renderStep()}</View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={isSaving}
            label={
              isSaving
                ? "Salvataggio..."
                : step === "summary"
                  ? "Entra nella dashboard"
                  : "Continua"
            }
            onPress={() => {
              void handleNext();
            }}
          />
          <PrimaryButton
            label={canGoBack ? "Indietro" : "Esci"}
            onPress={() => {
              if (canGoBack) {
                setStepIndex((current) => Math.max(current - 1, 0));
              } else {
                onBack();
              }
            }}
            variant="secondary"
          />
        </View>

        <Modal
          animationType="slide"
          onRequestClose={() => setIsScheduleModalOpen(false)}
          transparent
          visible={isScheduleModalOpen}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
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
                  <Text style={styles.dayTitle}>Disponibilita del giorno</Text>
                  <Text style={styles.dayMeta}>
                    {selectedDaySchedule.enabled ? "Aperto" : "Chiuso"}
                  </Text>
                </View>
                <Text style={styles.dayToggleLabel}>
                  {selectedDaySchedule.enabled ? "APERTO" : "CHIUSO"}
                </Text>
              </Pressable>

              {selectedDaySchedule.enabled ? (
                <View style={styles.hoursRow}>
                  <View style={styles.hoursField}>
                    <Text style={styles.label}>Dalle</Text>
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
                    <Text style={styles.label}>Alle</Text>
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
    </View>
  );
}

function StepIcon({
  name,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.stepIcon}>
      <Ionicons color={colors.brandDark} name={name} size={26} />
    </View>
  );
}

type FieldProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function Field({
  autoCapitalize = "sentences",
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
    backgroundColor: colors.canvas,
  },
  progressTrack: {
    backgroundColor: colors.border,
    height: 6,
    width: "100%",
  },
  progressValue: {
    backgroundColor: colors.brand,
    height: 6,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
  },
  stepIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surfaceSky,
    borderColor: colors.overlayBorder,
    borderRadius: 14,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 54,
  },
  stepKicker: {
    ...textStyles.eyebrow,
    textAlign: "center",
  },
  stepTitle: {
    ...textStyles.titleBase,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  stepBody: {
    ...textStyles.body,
    marginTop: spacing.md,
    textAlign: "center",
  },
  fieldWrap: {
    marginTop: spacing.lg,
  },
  label: {
    ...textStyles.fieldLabel,
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
  dayList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dayCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  dayToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayTitle: {
    ...textStyles.titleXs,
    color: colors.text,
  },
  dayMeta: {
    ...textStyles.bodyMuted,
    marginTop: spacing.xs,
  },
  dayToggleLabel: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  hoursRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hoursField: {
    flex: 1,
  },
  loader: {
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(49, 94, 114, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalEyebrow: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  modalTitle: {
    ...textStyles.titleBase,
    color: colors.text,
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
  dayModalToggle: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  dayModalToggleActive: {
    borderColor: colors.brandDark,
    borderWidth: 1,
  },
  meta: {
    ...textStyles.bodyMuted,
    marginTop: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
