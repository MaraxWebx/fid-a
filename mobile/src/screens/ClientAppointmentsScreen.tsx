import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { cancelBooking, getUserBookings } from "../lib/api";
import type { Booking } from "../types/api";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ClientAppointmentsScreenProps = {
  profileEmail: string;
};

export function ClientAppointmentsScreen({
  profileEmail,
}: ClientAppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const handleCancelBooking = async (booking: Booking) => {
    if (!canManageBooking(booking)) {
      setActionError("Le prenotazioni passate non possono piu essere gestite.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await cancelBooking({
        bookingId: booking.id,
        role: "client",
        userEmail: profileEmail,
      });
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
        subtitle="Puoi annullare solo gli appuntamenti futuri. Le prenotazioni passate restano nello storico."
      />

      <SectionCard eyebrow="Storico completo" title={`${appointments.length} prenotazioni`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.meta}>{error}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
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
          />
        ))}
      </SectionCard>
    </ScrollView>
  );
}

function canManageBooking(booking: Booking) {
  if (booking.status === "canceled" || !booking.start_time) {
    return false;
  }

  const startTime = new Date(booking.start_time).getTime();
  return !Number.isNaN(startTime) && startTime > Date.now();
}

function AppointmentRow({
  actionLoading,
  appointment,
  onCancel,
}: {
  actionLoading: boolean;
  appointment: Booking;
  onCancel: () => void;
}) {
  const isManageable = canManageBooking(appointment);

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.service}>{appointment.service_name}</Text>
        <Text style={styles.meta}>
          {appointment.date_label} - {appointment.time_label}
        </Text>
        <Text style={styles.meta}>
          {appointment.operator_name}
          {appointment.status !== "confirmed" ? ` - ${appointment.status}` : ""}
        </Text>
      </View>
      <View style={styles.rowSide}>
        <Text style={styles.price}>
          {appointment.price !== null ? `EUR ${appointment.price}` : "n/a"}
        </Text>
        {isManageable ? (
          <View style={styles.inlineActions}>
            <Pressable disabled={actionLoading} onPress={onCancel}>
              <Text style={[styles.linkAction, styles.linkDanger]}>Annulla</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.lockedAction}>Non gestibile</Text>
        )}
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
    color: colors.danger,
  },
  lockedAction: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
});
