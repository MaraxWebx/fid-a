import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCenters, getUserBookings } from "../lib/api";
import type { Booking, Center } from "../types/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type ClientHomeScreenProps = {
  userName: string;
  userEmail: string;
  selectedCenterId: string | null;
  onChangeCenter: (centerId: string) => void;
  onOpenAppointments: () => void;
  onOpenBooking: (serviceId: string | null) => void;
};

export function ClientHomeScreen({
  userName,
  selectedCenterId,
  onChangeCenter,
  onOpenAppointments,
  onOpenBooking,
  userEmail,
}: ClientHomeScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([getCenters(), getUserBookings(userEmail)])
      .then(([centersRes, bookingsRes]) => {
        if (!mounted) return;
        setCenters(centersRes);
        setAppointments(bookingsRes);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Errore caricamento dati");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userEmail]);

  const activeCenter = useMemo(
    () => centers.find((c) => c.id === selectedCenterId) ?? null,
    [centers, selectedCenterId],
  );

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      ),
    [appointments],
  );

  const now = Date.now();

  const nextAppointment = sortedAppointments.find((a) => {
    const time = new Date(a.start_time).getTime();
    return !isNaN(time) && time >= now;
  });
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Cliente"
        title={`Ciao, ${userName}`}
        subtitle="Gestisci la tua beauty routine in pochi tocchi"
      />

      {loading && <ActivityIndicator color={colors.brand} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* 🔥 QUICK CTA */}
      <View style={styles.quickBooking}>
        <PrimaryButton
          label="Prenota trattamento"
          onPress={() => onOpenBooking(null)}
        />
      </View>

      {/* 💎 PROSSIMO APPUNTAMENTO */}
      <SectionCard
        eyebrow="Prossimo appuntamento"
        title={nextAppointment?.service_name ?? "Nessun appuntamento"}
        tone="sand"
      >
        {nextAppointment ? (
          <>
            <Text style={styles.primary}>
              {nextAppointment.date_label} • {nextAppointment.time_label}
            </Text>

            <Text style={styles.secondary}>
              {nextAppointment.operator_name}
            </Text>
          </>
        ) : (
          <Text style={styles.secondary}>Nessun appuntamento programmato</Text>
        )}

        <View style={styles.actions}>
          <PrimaryButton label="Prenota" onPress={() => onOpenBooking(null)} />
          <PrimaryButton
            label="Storico"
            onPress={onOpenAppointments}
            variant="secondary"
          />
        </View>
      </SectionCard>

      {/* 🧾 STORICO RAPIDO */}
      <SectionCard eyebrow="Ultime prenotazioni" title="Storico recente">
        {sortedAppointments.slice(0, 3).map((appointment) => (
          <View key={appointment.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.service}>{appointment.service_name}</Text>

              <Text style={styles.meta}>
                {appointment.date_label} • {appointment.time_label}
              </Text>

              <Text style={styles.meta}>{appointment.operator_name}</Text>

              <Text
                style={[
                  styles.status,
                  appointment.status === "confirmed" && styles.statusConfirmed,
                ]}
              >
                {appointment.status}
              </Text>
            </View>

            <Text style={styles.price}>
              {appointment.price ? `€${appointment.price}` : ""}
            </Text>
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );
}

/* 🎨 STYLES */

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

  quickBooking: {
    marginBottom: spacing.lg,
  },

  primary: {
    ...textStyles.titleBase,
  },

  secondary: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },

  error: {
    color: "red",
    marginBottom: spacing.md,
  },

  /* CARD */

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  service: {
    ...textStyles.titleXs,
  },

  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },

  price: {
    color: colors.brand,
    fontWeight: "700",
  },

  status: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  statusConfirmed: {
    color: "#2E7D32",
  },
});
