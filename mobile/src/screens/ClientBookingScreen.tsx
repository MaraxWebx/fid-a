import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  createBooking,
  getCenterBookingSlots,
  getCenterServices,
  getCenters,
} from "../lib/api";
import { buildUpcomingDateOptions } from "../lib/date";
import type { BookingSlot, Center, Service } from "../types/api";
import { MiniDateCalendar } from "../components/MiniDateCalendar";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ClientBookingScreenProps = {
  userEmail: string;
  selectedCenterId: string | null;
  selectedServiceId: string | null;
  onBookingConfirmed: () => void;
};

export function ClientBookingScreen({
  userEmail,
  selectedCenterId,
  selectedServiceId,
  onBookingConfirmed,
}: ClientBookingScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [localCenterId, setLocalCenterId] = useState<string | null>(
    selectedCenterId,
  );
  const [serviceId, setServiceId] = useState<string | null>(selectedServiceId);
  const [selectedDateKey, setSelectedDateKey] = useState(
    buildUpcomingDateOptions()[0]?.key ?? "",
  );
  const [slotId, setSlotId] = useState<string | null>(null);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const activeCenterId = localCenterId ?? selectedCenterId;
  const upcomingDates = useMemo(() => buildUpcomingDateOptions(), []);

  useEffect(() => {
    let mounted = true;

    getCenters().then((response) => {
      if (mounted) setCenters(response);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeCenterId) {
      setServices([]);
      setServicesLoading(false);
      return;
    }

    let mounted = true;
    setServicesLoading(true);
    setServicesError(null);

    getCenterServices(activeCenterId)
      .then((response) => {
        if (!mounted) return;
        setServices(response);
        const defaultServiceId = selectedServiceId ?? null;
        setServiceId(defaultServiceId);
        setSlotId(null);
        setBookingError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setServicesError("Impossibile caricare i trattamenti del centro.");
      })
      .finally(() => {
        if (mounted) setServicesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeCenterId, selectedServiceId]);

  useEffect(() => {
    if (!slotModalOpen || !activeCenterId || !serviceId || !selectedDateKey) {
      return;
    }

    let mounted = true;
    setSlotsLoading(true);
    setSlotsError(null);

    getCenterBookingSlots(activeCenterId, {
      serviceId,
      date: selectedDateKey,
    })
      .then((response) => {
        if (mounted) {
          setSlots(response.slots);
        }
      })
      .catch(() => {
        if (mounted) {
          setSlots([]);
          setSlotsError(
            "Nessuna disponibilita trovata per questo giorno o centro chiuso.",
          );
        }
      })
      .finally(() => {
        if (mounted) setSlotsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeCenterId, serviceId, selectedDateKey, slotModalOpen]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) ?? null,
    [serviceId, services],
  );
  const selectedCenter = useMemo(
    () => centers.find((center) => center.id === activeCenterId) ?? null,
    [centers, activeCenterId],
  );
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === slotId) ?? null,
    [slotId, slots],
  );
  const selectedDay = useMemo(
    () => upcomingDates.find((day) => day.key === selectedDateKey) ?? null,
    [selectedDateKey, upcomingDates],
  );

  const resetSlotSelection = () => {
    setSlotId(null);
    setSlots([]);
    setSlotsError(null);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!activeCenterId || !serviceId || !slotId) {
      setBookingError("Completa tutti i campi prima di confermare.");
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      await createBooking({
        center_id: activeCenterId,
        user_email: userEmail,
        service_id: serviceId,
        slot_id: slotId,
      });
      onBookingConfirmed();
    } catch (error) {
      setBookingError(
        error instanceof Error
          ? error.message
          : "Errore durante la prenotazione.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <ScreenHeader
          eyebrow="Booking flow"
          title={
            activeCenterId ? "Prenota dal centro scelto" : "Seleziona il centro"
          }
          subtitle={
            activeCenterId
              ? "Disponibilita reale basata su calendario centro e prenotazioni esistenti."
              : "Scegli il centro per iniziare la prenotazione."
          }
        />

        {!activeCenterId ? (
          <SectionCard eyebrow="Step 0" title="Scegli il centro">
            {centers.length === 0 ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              centers.map((center) => (
                <SelectableRow
                  key={center.id}
                  active={center.id === localCenterId}
                  logoUrl={center.branding?.logo}
                  title={center.name}
                  subtitle={center.email}
                  onPress={() => setLocalCenterId(center.id)}
                />
              ))
            )}
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="Centro"
          title={selectedCenter?.name ?? "Centro non selezionato"}
        >
          {selectedCenter ? (
            <View style={styles.selectedEntityCard}>
              {selectedCenter.branding?.logo ? (
                <Image
                  source={{ uri: selectedCenter.branding.logo }}
                  style={styles.selectedCenterLogo}
                />
              ) : (
                <View style={styles.selectedCenterLogoFallback}>
                  <Text style={styles.selectedCenterLogoFallbackText}>
                    {selectedCenter.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.selectedEntityContent}>
                <Text style={styles.selectedEntityTitle}>{selectedCenter.name}</Text>
                <Text style={styles.notice}>{selectedCenter.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.notice}>Seleziona un centro per continuare.</Text>
          )}

          {selectedCenter ? (
            <View style={styles.changeWrap}>
              <PrimaryButton
                label="Cambia centro"
                onPress={() => {
                  setLocalCenterId(null);
                  setServiceId(null);
                  resetSlotSelection();
                }}
                variant="secondary"
              />
            </View>
          ) : null}
        </SectionCard>

        {activeCenterId && !serviceId ? (
          <SectionCard eyebrow="Step 1" title="Scegli il trattamento">
            {servicesLoading ? <ActivityIndicator color={colors.brand} /> : null}
            {servicesError ? <Text style={styles.notice}>{servicesError}</Text> : null}
            {services.map((service) => (
              <SelectableRow
                key={service.id}
                active={false}
                title={service.name}
                subtitle={`${service.category} - ${service.duration ?? "-"} min - ${service.price ?? "-"} EUR`}
                onPress={() => {
                  setServiceId(service.id);
                  resetSlotSelection();
                }}
              />
            ))}
          </SectionCard>
        ) : null}

        {activeCenterId && selectedService ? (
          <SectionCard eyebrow="Trattamento" title={selectedService.name}>
            <View style={styles.selectedEntityContent}>
              <Text style={styles.notice}>
                {selectedService.category} - {selectedService.duration ?? "-"} min -{" "}
                {selectedService.price ?? "-"} EUR
              </Text>
            </View>
            <View style={styles.changeWrap}>
              <PrimaryButton
                label="Cambia trattamento"
                onPress={() => {
                  setServiceId(null);
                  resetSlotSelection();
                }}
                variant="secondary"
              />
            </View>
          </SectionCard>
        ) : null}

        {activeCenterId && selectedService && !slotId ? (
          <SectionCard eyebrow="Step 2" title="Scegli il giorno">
            <MiniDateCalendar
              dates={upcomingDates}
              onSelectDate={(dateKey) => {
                setSelectedDateKey(dateKey);
                setSlots([]);
                setSlotsError(null);
                setSlotModalOpen(true);
              }}
              selectedDateKey={selectedDateKey}
            />
            <Text style={styles.helperText}>
              Tocca un giorno per vedere solo gli orari davvero disponibili.
            </Text>
          </SectionCard>
        ) : null}

        {activeCenterId && selectedService && selectedSlot ? (
          <SectionCard eyebrow="Giorno e orario" title={selectedDay?.label ?? "Selezionato"}>
            <Text style={styles.selectedEntityTitle}>{selectedSlot.time_label}</Text>
            <Text style={styles.notice}>{selectedSlot.date_label}</Text>
            <View style={styles.changeWrap}>
              <PrimaryButton
                label="Cambia giorno e orario"
                onPress={() => {
                  setSlotId(null);
                  setSlotModalOpen(true);
                }}
                variant="secondary"
              />
            </View>
          </SectionCard>
        ) : null}

        {activeCenterId && selectedService && slotId ? (
          <SectionCard eyebrow="Step 3" title="Conferma prenotazione">
            <Text style={styles.summaryLine}>
              Centro: {selectedCenter?.name ?? "Da selezionare"}
            </Text>
            <Text style={styles.summaryLine}>
              Servizio: {selectedService?.name ?? "Da selezionare"}
            </Text>
            <Text style={styles.summaryLine}>
              Slot:{" "}
              {selectedSlot
                ? `${selectedSlot.date_label} - ${selectedSlot.time_label}`
                : "Seleziona uno slot"}
            </Text>
            {bookingError ? <Text style={styles.errorText}>{bookingError}</Text> : null}
            <View style={styles.buttonRow}>
              <PrimaryButton
                label={bookingLoading ? "Prenotazione in corso..." : "Conferma booking"}
                onPress={handleConfirmBooking}
                disabled={bookingLoading}
              />
            </View>
          </SectionCard>
        ) : null}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setSlotModalOpen(false)}
        transparent
        visible={slotModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Orari disponibili</Text>
                <Text style={styles.modalTitle}>
                  {selectedDay?.label ?? "Seleziona giorno"}
                </Text>
              </View>
              <Pressable onPress={() => setSlotModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            {slotsLoading ? <ActivityIndicator color={colors.brand} /> : null}
            {slotsError ? <Text style={styles.notice}>{slotsError}</Text> : null}
            {!slotsLoading && slots.length === 0 && !slotsError ? (
              <Text style={styles.notice}>Nessuno slot disponibile per questo giorno.</Text>
            ) : null}

            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <Pressable
                  key={slot.id}
                  onPress={() => {
                    setSlotId(slot.id);
                    setSlotModalOpen(false);
                    setBookingError(null);
                  }}
                  style={[
                    styles.slotChip,
                    slot.id === slotId && styles.slotChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      slot.id === slotId && styles.slotChipTextActive,
                    ]}
                  >
                    {slot.time_label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

type SelectableRowProps = {
  active: boolean;
  logoUrl?: string;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function SelectableRow({
  active,
  logoUrl,
  onPress,
  subtitle,
  title,
}: SelectableRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active ? styles.rowActive : null]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>
            {title.slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active ? styles.radioActive : null]} />
    </Pressable>
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
  row: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  rowActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.brand,
  },
  logo: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    height: 48,
    marginRight: spacing.md,
    width: 48,
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    marginRight: spacing.md,
    width: 48,
  },
  logoFallbackText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  rowContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  radio: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  selectedEntityCard: {
    alignItems: "center",
    flexDirection: "row",
  },
  selectedEntityContent: {
    flex: 1,
  },
  selectedEntityTitle: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  selectedCenterLogo: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    height: 64,
    marginRight: spacing.md,
    width: 64,
  },
  selectedCenterLogoFallback: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: 18,
    height: 64,
    justifyContent: "center",
    marginRight: spacing.md,
    width: 64,
  },
  selectedCenterLogoFallbackText: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
  changeWrap: {
    marginTop: spacing.md,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.md,
  },
  summaryLine: {
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  notice: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  buttonRow: {
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(49,94,114,0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
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
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  slotChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  slotChipActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  slotChipText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  slotChipTextActive: {
    color: colors.brandInk,
  },
});
