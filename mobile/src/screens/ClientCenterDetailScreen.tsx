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
  getCenterReviews,
  getCenterServices,
  getCenterUserStats,
  getFavoriteCenters,
  getUserBookings,
  toggleFavoriteCenter,
} from "../lib/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type {
  BeautyStatItem,
  Booking,
  Center,
  Review,
  Service,
  UserBeautyStats,
} from "../types/api";

type ClientCenterDetailScreenProps = {
  center: Center | null;
  selectedCenterId: string | null;
  userEmail: string;
  onBack: () => void;
  onBookCenter: (centerId: string) => void;
  onSelectCenter: (centerId: string) => void;
};

const weekdayOrder = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function ClientCenterDetailScreen({
  center,
  selectedCenterId,
  userEmail,
  onBack,
  onBookCenter,
  onSelectCenter,
}: ClientCenterDetailScreenProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<UserBeautyStats | null>(null);
  const [favoriteCenterIds, setFavoriteCenterIds] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getCenterServices(center.id),
      getCenterReviews(center.id),
      getUserBookings(userEmail),
      getFavoriteCenters(userEmail),
      getCenterUserStats(center.id, userEmail),
    ])
      .then(
        ([
          servicesResponse,
          reviewsResponse,
          bookingsResponse,
          favoritesResponse,
          statsResponse,
        ]) => {
          if (!mounted) return;
          setServices(servicesResponse);
          setReviews(reviewsResponse);
          setBookings(
            bookingsResponse.filter((booking) => booking.center_id === center.id),
          );
          setFavoriteCenterIds(favoritesResponse.favorite_center_ids);
          setStats(statsResponse);
        },
      )
      .catch(() => {
        if (mounted) setError("Impossibile caricare le informazioni del centro.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [center, userEmail]);

  const hoursRows = useMemo(() => {
    if (!center) return [];

    return weekdayOrder.map((day) => {
      const hours = center.opening_hours?.[day];
      const isOpen = center.opening_days?.includes(day) ?? false;
      const label =
        isOpen && hours?.start && hours?.end
          ? `${hours.start} - ${hours.end}`
          : "Chiuso";
      return { day, label, isOpen };
    });
  }, [center]);

  const isFavorite = center ? favoriteCenterIds.includes(center.id) : false;
  const ratingAverage =
    center?.rating_average ??
    (reviews.length > 0
      ? Number(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1),
        )
      : null);
  const reviewsCount = center?.reviews_count ?? reviews.length;

  const handleToggleFavorite = async () => {
    if (!center) return;

    setFavoriteLoading(true);
    setError(null);
    try {
      const response = await toggleFavoriteCenter(userEmail, center.id);
      setFavoriteCenterIds(response.favorite_center_ids);
    } catch {
      setError("Impossibile aggiornare i preferiti.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (!center) {
    return (
      <View style={styles.emptyPage}>
        <Text style={styles.empty}>Centro non disponibile.</Text>
        <View style={styles.backWrap}>
          <PrimaryButton label="Torna indietro" onPress={onBack} variant="secondary" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons color={colors.brandDark} name="chevron-back" size={18} />
        <Text style={styles.backLabel}>Indietro</Text>
      </Pressable>

      <View style={styles.header}>
        {center.branding.logo ? (
          <Image source={{ uri: center.branding.logo }} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoText}>{center.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Centro estetico</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{center.name}</Text>
            <Pressable
              disabled={favoriteLoading}
              onPress={() => {
                void handleToggleFavorite();
              }}
              style={styles.favoriteButton}
            >
              <Ionicons
                color={isFavorite ? colors.rose : colors.textMuted}
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.ratingSummary}>
        <View style={styles.ratingIcon}>
          <Ionicons color={colors.brandInk} name="star" size={20} />
        </View>
        <View style={styles.ratingCopy}>
          <Text style={styles.ratingValue}>
            {ratingAverage !== null ? `${ratingAverage}/5` : "Nessuna valutazione"}
          </Text>
          <Text style={styles.ratingMeta}>
            {reviewsCount > 0
              ? `${reviewsCount} recensioni ricevute`
              : "La media apparira dopo le prime recensioni"}
          </Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionWrap}>
        <Pressable
          onPress={() => {
            onSelectCenter(center.id);
          }}
          style={styles.defaultButton}
        >
          <Text style={styles.defaultButtonLabel}>
            Imposta come predefinito per me
          </Text>
        </Pressable>
        <PrimaryButton
          label="Prenota trattamento"
          onPress={() => onBookCenter(center.id)}
        />
        {selectedCenterId === center.id ? (
          <Text style={styles.selectedHint}>Questo e il tuo centro predefinito.</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orari</Text>
        <View style={styles.hoursGrid}>
          {hoursRows.map((row) => (
            <View key={row.day} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{row.day}</Text>
              <Text style={[styles.hoursValue, !row.isOpen ? styles.mutedValue : null]}>
                {row.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trattamenti</Text>
        {services.length === 0 ? (
          <Text style={styles.empty}>Nessun trattamento configurato.</Text>
        ) : null}
        <View style={styles.list}>
          {services.map((service) => (
            <View key={service.id} style={styles.serviceRow}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{service.name}</Text>
                <Text style={styles.meta}>
                  {service.category} - {service.duration ?? "-"} min
                </Text>
              </View>
              <Text style={styles.price}>
                {service.price !== null ? `EUR ${service.price}` : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiche in questo centro</Text>
        {!stats || stats.summary.total_treatments === 0 ? (
          <Text style={styles.empty}>
            Le statistiche compariranno dopo i primi trattamenti effettuati.
          </Text>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.total_treatments}</Text>
                <Text style={styles.statLabel}>Trattamenti effettuati</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_treatment}</Text>
                <Text style={styles.statLabel}>Piu prenotato</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_time_slot}</Text>
                <Text style={styles.statLabel}>Orario preferito</Text>
              </View>
            </View>

            <Text style={styles.chartTitle}>Per trattamento</Text>
            <View style={styles.chartList}>
              {stats.treatments.map((item) => (
                <StatBar key={item.label} item={item} />
              ))}
            </View>

            <Text style={styles.chartTitle}>Per fascia oraria</Text>
            <View style={styles.chartList}>
              {stats.time_slots.map((item) => (
                <StatBar key={item.label} item={item} />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storico prenotazioni</Text>
        {bookings.length === 0 ? (
          <Text style={styles.empty}>Non hai ancora prenotazioni in questo centro.</Text>
        ) : null}
        <View style={styles.list}>
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.historyRow}>
              <Text style={styles.rowTitle}>{booking.service_name}</Text>
              <Text style={styles.meta}>
                {booking.date_label} - {booking.time_label}
                {booking.status !== "confirmed" ? ` - ${booking.status}` : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recensioni</Text>
        {reviews.length === 0 ? (
          <Text style={styles.empty}>Nessuna recensione disponibile.</Text>
        ) : null}
        <View style={styles.list}>
          {reviews.slice(0, 5).map((review) => (
            <View key={review.id} style={styles.reviewRow}>
              <Text style={styles.rating}>{review.rating}/5</Text>
              <Text style={styles.comment}>{review.comment}</Text>
              <Text style={styles.meta}>{review.user_name ?? "Cliente"}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function StatBar({ item }: { item: BeautyStatItem }) {
  return (
    <View style={styles.statBarRow}>
      <View style={styles.statBarHeader}>
        <Text style={styles.statBarLabel}>{item.label}</Text>
        <Text style={styles.statBarCount}>{item.count}</Text>
      </View>
      <View style={styles.statBarTrack}>
        <View style={[styles.statBarFill, { width: `${item.percent}%` }]} />
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
  emptyPage: {
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  backWrap: {
    marginTop: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.lg,
  },
  backLabel: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  logo: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    height: 58,
    width: 58,
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
  },
  favoriteButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  ratingSummary: {
    alignItems: "center",
    backgroundColor: colors.surfaceSand,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  ratingIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  ratingCopy: {
    flex: 1,
  },
  ratingValue: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
  ratingMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  actionWrap: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  defaultButton: {
    alignItems: "center",
    backgroundColor: colors.warning,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  defaultButtonLabel: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  selectedHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statTile: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  statValue: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chartList: {
    gap: spacing.sm,
  },
  statBarRow: {
    gap: spacing.xs,
  },
  statBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBarLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    paddingRight: spacing.sm,
  },
  statBarCount: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  statBarTrack: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  statBarFill: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    height: "100%",
  },
  hoursGrid: {
    gap: spacing.xs,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  hoursDay: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  hoursValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  mutedValue: {
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
  serviceRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  price: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
  },
  historyRow: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    padding: spacing.md,
  },
  reviewRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.md,
  },
  rating: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: "800",
  },
  comment: {
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
});
