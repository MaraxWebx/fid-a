import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCenterBookingDetail } from "../lib/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { BookingDetail } from "../types/api";

type CenterBookingDetailModalProps = {
  bookingId: string | null;
  centerId: string;
  onClose: () => void;
};

export function CenterBookingDetailModal({
  bookingId,
  centerId,
  onClose,
}: CenterBookingDetailModalProps) {
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setDetail(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getCenterBookingDetail(centerId, bookingId)
      .then((response) => {
        if (mounted) setDetail(response);
      })
      .catch(() => {
        if (mounted) setError("Impossibile caricare la scheda prenotazione.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookingId, centerId]);

  const booking = detail?.booking ?? null;
  const review = detail?.review ?? null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={bookingId !== null}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Scheda prenotazione</Text>
              <Text style={styles.title}>{booking?.service_name ?? "Prenotazione"}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Chiudi</Text>
            </Pressable>
          </View>

          {loading ? <ActivityIndicator color={colors.brand} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {booking ? (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryBlock}>
                  <Text style={styles.label}>Data</Text>
                  <Text style={styles.value}>{booking.date_label ?? "n/a"}</Text>
                </View>
                <View style={styles.summaryBlock}>
                  <Text style={styles.label}>Ora</Text>
                  <Text style={styles.value}>{booking.time_label ?? "n/a"}</Text>
                </View>
                {booking.status !== "confirmed" ? (
                  <View style={styles.summaryBlock}>
                    <Text style={styles.label}>Stato</Text>
                    <Text
                      style={[
                        styles.value,
                        booking.status === "canceled" ? styles.danger : null,
                      ]}
                    >
                      {booking.status}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cliente</Text>
                <DetailRow label="Nome" value={booking.client_name ?? "Cliente"} />
                <DetailRow
                  label="Telefono"
                  value={booking.client_phone ?? "Telefono non disponibile"}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trattamento</Text>
                <DetailRow label="Servizio" value={booking.service_name} />
                <DetailRow label="Centro" value={booking.operator_name} />
                <DetailRow
                  label="Prezzo"
                  value={booking.price !== null ? `EUR ${booking.price}` : "n/a"}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recensione cliente</Text>
                {review ? (
                  <View style={styles.reviewBox}>
                    <Text style={styles.rating}>{review.rating}/5</Text>
                    <Text style={styles.comment}>{review.comment}</Text>
                    <Text style={styles.meta}>{review.user_name ?? "Cliente"}</Text>
                  </View>
                ) : (
                  <Text style={styles.meta}>
                    Nessuna recensione ricevuta per questa prenotazione.
                  </Text>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.35)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: "90%",
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  close: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    paddingBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flex: 1,
    padding: spacing.md,
  },
  section: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  detailRow: {
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  danger: {
    color: "#B42318",
  },
  reviewBox: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  rating: {
    color: colors.brandDark,
    fontSize: 18,
    fontWeight: "800",
  },
  comment: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  error: {
    color: "#B42318",
    fontSize: 14,
  },
});
