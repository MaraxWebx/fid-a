import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type { BookingSlot, Center, Service } from "../types/api";
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

function buildUpcomingDates(totalDays = 14) {
  const today = new Date();
  return Array.from({ length: totalDays }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(date),
    };
  });
}

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
    buildUpcomingDates()[0]?.key ?? "",
  );
  const [slotId, setSlotId] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const activeCenterId = localCenterId ?? selectedCenterId;
  const upcomingDates = useMemo(() => buildUpcomingDates(), []);

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
        const defaultServiceId = selectedServiceId ?? response[0]?.id ?? null;
        setServiceId(defaultServiceId);
        setSlotId(null);
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
    if (!activeCenterId || !serviceId || !selectedDateKey) {
      setSlots([]);
      return;
    }

    let mounted = true;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlotId(null);

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
  }, [activeCenterId, serviceId, selectedDateKey]);

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
        <Text style={styles.notice}>
          {selectedCenter
            ? `${selectedCenter.email} - logo ${selectedCenter.branding?.logo ? "configurato" : "non configurato"}`
            : "Seleziona un centro per continuare."}
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Step 1" title="Scegli il servizio">
        {servicesLoading ? <ActivityIndicator color={colors.brand} /> : null}
        {servicesError ? <Text style={styles.notice}>{servicesError}</Text> : null}
        {services.map((service) => (
          <SelectableRow
            key={service.id}
            active={service.id === serviceId}
            title={service.name}
            subtitle={`${service.category} - ${service.duration ?? "-"} min - ${service.price ?? "-"} EUR`}
            onPress={() => setServiceId(service.id)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 2" title="Scegli il giorno">
        {upcomingDates.map((day) => (
          <SelectableRow
            key={day.key}
            active={day.key === selectedDateKey}
            title={day.label}
            subtitle={day.key}
            onPress={() => setSelectedDateKey(day.key)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 3" title="Scegli l'orario">
        {slotsLoading ? <ActivityIndicator color={colors.brand} /> : null}
        {slotsError ? <Text style={styles.notice}>{slotsError}</Text> : null}
        {!slotsLoading && slots.length === 0 && !slotsError ? (
          <Text style={styles.notice}>
            Nessuno slot disponibile per questo giorno.
          </Text>
        ) : null}
        {slots.map((slot) => (
          <SelectableRow
            key={slot.id}
            active={slot.id === slotId}
            title={slot.time_label}
            subtitle={`${slot.date_label} - ${slot.availability_label}`}
            onPress={() => setSlotId(slot.id)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 4" title="Conferma prenotazione">
        <Text style={styles.summaryLine}>
          Centro: {selectedCenter?.name ?? "Da selezionare"}
        </Text>
        <Text style={styles.summaryLine}>
          Servizio: {selectedService?.name ?? "Da selezionare"}
        </Text>
        <Text style={styles.summaryLine}>
          Slot: {selectedSlot ? `${selectedSlot.date_label} - ${selectedSlot.time_label}` : "Seleziona uno slot"}
        </Text>
        {bookingError ? (
          <Text style={styles.errorText}>{bookingError}</Text>
        ) : null}
        <View style={styles.buttonRow}>
          <PrimaryButton
            label={
              bookingLoading ? "Prenotazione in corso..." : "Conferma booking"
            }
            onPress={handleConfirmBooking}
            disabled={bookingLoading}
          />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

type SelectableRowProps = {
  active: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function SelectableRow({
  active,
  onPress,
  subtitle,
  title,
}: SelectableRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active ? styles.rowActive : null]}
    >
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
    color: "#B05252",
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  buttonRow: {
    marginTop: spacing.lg,
  },
});
