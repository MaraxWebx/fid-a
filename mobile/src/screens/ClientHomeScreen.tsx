import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  cancelBooking,
  getCenters,
  getFavoriteCenters,
  getUserBookings,
  toggleFavoriteCenter,
} from "../lib/api";
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
  onOpenCenter: (center: Center) => void;
  onOpenBooking: (serviceId: string | null) => void;
};

export function ClientHomeScreen({
  userName,
  selectedCenterId,
  onChangeCenter,
  onOpenCenter,
  onOpenBooking,
  userEmail,
}: ClientHomeScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [favoriteCenterIds, setFavoriteCenterIds] = useState<string[]>([]);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([getCenters(), getUserBookings(userEmail), getFavoriteCenters(userEmail)])
      .then(([centersRes, bookingsRes, favoritesRes]) => {
        if (!mounted) return;
        setCenters(centersRes);
        setAppointments(bookingsRes);
        setFavoriteCenterIds(favoritesRes.favorite_center_ids);
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

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const left = a.start_time ? new Date(a.start_time).getTime() : 0;
        const right = b.start_time ? new Date(b.start_time).getTime() : 0;
        return left - right;
      }),
    [appointments],
  );

  const now = Date.now();

  const nextAppointment = sortedAppointments.find((a) => {
    const time = a.start_time ? new Date(a.start_time).getTime() : Number.NaN;
    return a.status !== "canceled" && !isNaN(time) && time > now;
  });

  const discoverCenters = useMemo(
    () => centers.filter((center) => !favoriteCenterIds.includes(center.id)),
    [centers, favoriteCenterIds],
  );

  const handleCancelNextAppointment = async () => {
    if (!nextAppointment) {
      return;
    }

    setCancelingBookingId(nextAppointment.id);
    setError(null);
    try {
      await cancelBooking({
        bookingId: nextAppointment.id,
        role: "client",
        userEmail,
      });
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === nextAppointment.id
            ? { ...appointment, status: "canceled" }
            : appointment,
        ),
      );
    } catch {
      setError("Annullamento prenotazione non riuscito.");
    } finally {
      setCancelingBookingId(null);
    }
  };

  const handleToggleFavorite = async (centerId: string) => {
    setFavoriteLoadingId(centerId);
    setError(null);

    try {
      const response = await toggleFavoriteCenter(userEmail, centerId);
      setFavoriteCenterIds(response.favorite_center_ids);
    } catch {
      setError("Impossibile aggiornare i preferiti.");
    } finally {
      setFavoriteLoadingId(null);
    }
  };

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

        {nextAppointment ? (
          <View style={styles.actions}>
            <PrimaryButton
              disabled={cancelingBookingId === nextAppointment.id}
              label={
                cancelingBookingId === nextAppointment.id
                  ? "Annullamento..."
                  : "Annulla prenotazione"
              }
              onPress={() => {
                void handleCancelNextAppointment();
              }}
              variant="danger"
            />
          </View>
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Centri estetici" title="Scegli i tuoi preferiti">
        {discoverCenters.length === 0 && !loading ? (
          <Text style={styles.secondary}>
            Hai gia salvato tutti i centri disponibili nei preferiti.
          </Text>
        ) : null}
        <View style={styles.centerList}>
          {discoverCenters.map((center) => {
            const isFavorite = favoriteCenterIds.includes(center.id);
            const selected = center.id === selectedCenterId;

            return (
              <Pressable
                key={center.id}
                onPress={() => onOpenCenter(center)}
                style={[styles.centerCard, selected ? styles.centerCardSelected : null]}
              >
                {center.branding.logo ? (
                  <Image source={{ uri: center.branding.logo }} style={styles.centerLogo} />
                ) : (
                  <View style={styles.centerLogoFallback}>
                    <Text style={styles.centerLogoText}>
                      {center.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.centerMain}>
                  <Text style={styles.centerName}>{center.name}</Text>
                  <Text style={styles.centerMeta}>
                    {(center.primary_services ?? []).slice(0, 2).join(" - ") ||
                      "Centro estetico"}
                  </Text>
                </View>
                <Pressable
                  disabled={favoriteLoadingId === center.id}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleToggleFavorite(center.id);
                  }}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    color={isFavorite ? "#B42318" : colors.textMuted}
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={22}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Ultime prenotazioni" title="Storico recente">
        {sortedAppointments.slice(0, 3).map((appointment) => (
          <View key={appointment.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.service}>{appointment.service_name}</Text>

              <Text style={styles.meta}>
                {appointment.date_label} • {appointment.time_label}
              </Text>

              <Text style={styles.meta}>{appointment.operator_name}</Text>

              {appointment.status !== "confirmed" ? (
                <Text style={styles.status}>{appointment.status}</Text>
              ) : null}
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
  centerList: {
    gap: spacing.sm,
  },
  centerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  centerCardSelected: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  centerLogo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 48,
    width: 48,
  },
  centerLogoFallback: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  centerLogoText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  centerMain: {
    flex: 1,
  },
  centerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  centerMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  favoriteButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
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
