import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  cancelBooking,
  getCenterBookingSlots,
  getUserBookings,
  updateBooking,
} from "../lib/api";
import type { Booking, BookingSlot } from "../types/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ClientAppointmentsScreenProps = {
  profileEmail: string;
};

type DateOption = {
  key: string;
  label: string;
};

function buildUpcomingDates(totalDays = 14): DateOption[] {
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

export function ClientAppointmentsScreen({
  profileEmail,
}: ClientAppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState(
    buildUpcomingDates()[0]?.key ?? "",
  );
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const upcomingDates = useMemo(() => buildUpcomingDates(), []);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUserBookings(profileEmail);
      setAppointments(response);
    } catch {
      setError("Impossibile caricare lo storico prenotazioni.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, [profileEmail]);

  useEffect(() => {
    if (!selectedBooking || !selectedDateKey) {
      setSlots([]);
      return;
    }

    let mounted = true;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlotId(null);

    getCenterBookingSlots(selectedBooking.center_id, {
      serviceId: selectedBooking.service_id,
      date: selectedDateKey,
      bookingId: selectedBooking.id,
    })
      .then((response) => {
        if (!mounted) return;
        setSlots(response.slots);
      })
      .catch(() => {
        if (!mounted) return;
        setSlots([]);
        setSlotsError("Nessuno slot disponibile per la data selezionata.");
      })
      .finally(() => {
        if (mounted) setSlotsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedBooking, selectedDateKey]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((left, right) => {
        const leftTime = left.start_time ? new Date(left.start_time).getTime() : 0;
        const rightTime = right.start_time
          ? new Date(right.start_time).getTime()
          : 0;
        return rightTime - leftTime;
      }),
    [appointments],
  );

  const openEditModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDateKey(buildUpcomingDates()[0]?.key ?? "");
    setSelectedSlotId(null);
    setSlots([]);
    setSlotsError(null);
    setActionError(null);
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking || !selectedSlotId) {
      setActionError("Seleziona una nuova disponibilita.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await updateBooking(selectedBooking.id, {
        role: "client",
        user_email: profileEmail,
        service_id: selectedBooking.service_id,
        slot_id: selectedSlotId,
      });
      setSelectedBooking(null);
      await loadAppointments();
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Modifica prenotazione non riuscita.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelBooking({
        bookingId: booking.id,
        role: "client",
        userEmail: profileEmail,
      });
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(null);
      }
      await loadAppointments();
    } catch (cancelError) {
      setActionError(
        cancelError instanceof Error
          ? cancelError.message
          : "Annullamento prenotazione non riuscito.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Prenotazioni"
        title="Storico cliente"
        subtitle="Modifica o annulla gli appuntamenti usando solo le disponibilita reali del centro."
      />

      <SectionCard eyebrow="Storico completo" title={`${appointments.length} prenotazioni`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.meta}>{error}</Text> : null}
        {!loading && appointments.length === 0 ? (
          <Text style={styles.meta}>Non ci sono ancora prenotazioni.</Text>
        ) : null}
        {sortedAppointments.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            actionLoading={actionLoading}
            appointment={appointment}
            onCancel={() => {
              void handleCancelBooking(appointment);
            }}
            onEdit={() => openEditModal(appointment)}
          />
        ))}
      </SectionCard>

      <Modal
        animationType="slide"
        onRequestClose={() => setSelectedBooking(null)}
        transparent
        visible={selectedBooking !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Modifica prenotazione</Text>
                <Text style={styles.modalTitle}>
                  {selectedBooking?.service_name ?? "Appuntamento"}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedBooking(null)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <Text style={styles.modalMeta}>
              Prenotazione attuale: {selectedBooking?.date_label} -{" "}
              {selectedBooking?.time_label}
            </Text>

            <Text style={styles.sectionLabel}>Nuovo giorno</Text>
            <View style={styles.chipGrid}>
              {upcomingDates.map((day) => (
                <Pressable
                  key={day.key}
                  onPress={() => setSelectedDateKey(day.key)}
                  style={[
                    styles.chip,
                    day.key === selectedDateKey && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      day.key === selectedDateKey && styles.chipTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Nuovo orario</Text>
            {slotsLoading ? <ActivityIndicator color={colors.brand} /> : null}
            {slotsError ? <Text style={styles.meta}>{slotsError}</Text> : null}
            {!slotsLoading && slots.length === 0 && !slotsError ? (
              <Text style={styles.meta}>Nessuno slot disponibile.</Text>
            ) : null}
            <View style={styles.slotList}>
              {slots.map((slot) => (
                <Pressable
                  key={slot.id}
                  onPress={() => setSelectedSlotId(slot.id)}
                  style={[
                    styles.slotRow,
                    selectedSlotId === slot.id && styles.slotRowActive,
                  ]}
                >
                  <View>
                    <Text style={styles.slotTitle}>{slot.time_label}</Text>
                    <Text style={styles.slotMeta}>{slot.availability_label}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selectedSlotId === slot.id && styles.radioActive,
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla prenotazione"
                onPress={() => {
                  if (selectedBooking) {
                    void handleCancelBooking(selectedBooking);
                  }
                }}
                variant="secondary"
              />
              <PrimaryButton
                disabled={actionLoading || !selectedSlotId}
                label={actionLoading ? "Salvataggio..." : "Salva modifica"}
                onPress={() => {
                  void handleUpdateBooking();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function AppointmentRow({
  actionLoading,
  appointment,
  onCancel,
  onEdit,
}: {
  actionLoading: boolean;
  appointment: Booking;
  onCancel: () => void;
  onEdit: () => void;
}) {
  const isCanceled = appointment.status === "canceled";

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.service}>{appointment.service_name}</Text>
        <Text style={styles.meta}>
          {appointment.date_label} - {appointment.time_label}
        </Text>
        <Text style={styles.meta}>
          {appointment.operator_name} - {appointment.status}
        </Text>
      </View>
      <View style={styles.rowSide}>
        <Text style={styles.price}>
          {appointment.price !== null ? `EUR ${appointment.price}` : "n/a"}
        </Text>
        {!isCanceled ? (
          <View style={styles.inlineActions}>
            <Pressable onPress={onEdit}>
              <Text style={styles.linkAction}>Modifica</Text>
            </Pressable>
            <Pressable disabled={actionLoading} onPress={onCancel}>
              <Text style={[styles.linkAction, styles.linkDanger]}>Annulla</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
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
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  rowMain: {
    flex: 1,
  },
  rowSide: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  service: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  price: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: "700",
  },
  inlineActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  linkAction: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "700",
  },
  linkDanger: {
    color: "#B42318",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.35)",
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
  modalMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.md,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: colors.brandInk,
  },
  slotList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slotRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  slotRowActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  slotTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  slotMeta: {
    color: colors.textMuted,
    fontSize: 13,
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
  error: {
    color: "#B42318",
    fontSize: 14,
    marginTop: spacing.md,
  },
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
