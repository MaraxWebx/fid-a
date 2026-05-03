import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { getCenterClientDetail } from "../lib/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { BeautyStatItem, Center, CenterClientDetail } from "../types/api";

type CenterClientDetailScreenProps = {
  center: Center;
  clientId: string | null;
  onBack: () => void;
};

export function CenterClientDetailScreen({
  center,
  clientId,
  onBack,
}: CenterClientDetailScreenProps) {
  const [detail, setDetail] = useState<CenterClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      setDetail(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getCenterClientDetail(center.id, clientId)
      .then((response) => {
        if (mounted) setDetail(response);
      })
      .catch(() => {
        if (mounted) setError("Impossibile caricare la scheda cliente.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [center.id, clientId]);

  const client = detail?.client ?? null;
  const stats = detail?.stats ?? null;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons color={colors.brandDark} name="chevron-back" size={18} />
        <Text style={styles.backLabel}>Indietro</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(client?.name ?? "Cliente").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerMain}>
          <Text style={styles.eyebrow}>Scheda cliente</Text>
          <Text style={styles.title}>{client?.name ?? "Cliente"}</Text>
          <Text style={styles.meta}>{client?.email ?? "Email non disponibile"}</Text>
          <Text style={styles.meta}>{client?.phone ?? "Telefono non disponibile"}</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator color={colors.brand} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiche cliente</Text>
        {!stats || stats.summary.total_treatments === 0 ? (
          <Text style={styles.empty}>Nessun trattamento effettuato in questo centro.</Text>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.total_treatments}</Text>
                <Text style={styles.statLabel}>Trattamenti effettuati</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_treatment}</Text>
                <Text style={styles.statLabel}>Trattamento preferito</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_time_slot}</Text>
                <Text style={styles.statLabel}>Orario preferito</Text>
              </View>
            </View>

            <Chart title="Per categoria" items={stats.categories} />
            <Chart title="Per trattamento" items={stats.treatments} />
            <Chart title="Per fascia oraria" items={stats.time_slots} />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storico prenotazioni</Text>
        {detail?.bookings.length === 0 ? (
          <Text style={styles.empty}>Nessuna prenotazione registrata.</Text>
        ) : null}
        <View style={styles.list}>
          {detail?.bookings.map((booking) => (
            <View key={booking.id} style={styles.row}>
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
        {detail?.reviews.length === 0 ? (
          <Text style={styles.empty}>Nessuna recensione lasciata da questo cliente.</Text>
        ) : null}
        <View style={styles.list}>
          {detail?.reviews.map((review) => (
            <View key={review.id} style={styles.reviewRow}>
              <Text style={styles.rating}>{review.rating}/5</Text>
              <Text style={styles.comment}>{review.comment}</Text>
              <Text style={styles.meta}>{review.service_name ?? "Trattamento"}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Chart({ title, items }: { title: string; items: BeautyStatItem[] }) {
  if (items.length === 0) return null;

  return (
    <>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartList}>
        {items.map((item) => (
          <View key={item.label} style={styles.statBarRow}>
            <View style={styles.statBarHeader}>
              <Text style={styles.statBarLabel}>{item.label}</Text>
              <Text style={styles.statBarCount}>{item.count}</Text>
            </View>
            <View style={styles.statBarTrack}>
              <View style={[styles.statBarFill, { width: `${item.percent}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </>
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
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "800",
  },
  headerMain: {
    flex: 1,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    marginTop: spacing.xs,
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
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    padding: spacing.md,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
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
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    marginTop: spacing.md,
  },
  loader: {
    marginTop: spacing.lg,
  },
});
