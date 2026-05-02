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
  clientHomeStats,
  demoAppointments,
  loyaltyOverview,
  upcomingBooking,
} from "../data/mockData";
import { getCenters } from "../lib/api";
import type { Center } from "../types/api";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { StatTile } from "../components/StatTile";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type ClientHomeScreenProps = {
  selectedCenterId: string | null;
  onChangeCenter: (centerId: string) => void;
  onOpenAppointments: () => void;
  onOpenBooking: (serviceId: string | null) => void;
};

export function ClientHomeScreen({
  selectedCenterId,
  onChangeCenter,
  onOpenAppointments,
  onOpenBooking,
}: ClientHomeScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCenters()
      .then((response) => {
        if (!mounted) return;
        setCenters(response);
        if (!selectedCenterId && response[0]) {
          onChangeCenter(response[0].id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError("Impossibile caricare i centri.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [onChangeCenter, selectedCenterId]);

  const activeCenter = useMemo(
    () => centers.find((center) => center.id === selectedCenterId) ?? null,
    [centers, selectedCenterId],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Cliente"
        title="Ciao, Martina"
        subtitle="Scegli il centro, tieni sotto controllo la routine beauty e apri il booking in pochi tocchi."
      />

      <SectionCard
        eyebrow="Centro selezionato"
        title={activeCenter ? activeCenter.name : "Scegli il centro"}
        tone="sky"
      >
        <Text style={styles.secondaryLine}>
          {activeCenter
            ? `${activeCenter.email}  •  colore ${activeCenter.branding?.primary_color ?? "non impostato"}`
            : "Seleziona un centro prima di aprire la prenotazione."}
        </Text>
        <View style={styles.centerList}>
          {loading ? (
            <ActivityIndicator color={colors.brand} style={styles.loader} />
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {centers.map((center) => {
            const active = center.id === selectedCenterId;

            return (
              <Pressable
                key={center.id}
                onPress={() => onChangeCenter(center.id)}
                style={[
                  styles.centerCard,
                  active ? styles.centerCardActive : null,
                ]}
              >
                <View style={styles.centerPill}>
                  <Text style={styles.centerPillText}>Centro</Text>
                </View>
                <Text style={styles.centerName}>{center.name}</Text>
                <Text style={styles.centerMeta}>{center.email}</Text>
                <Text style={styles.centerTag}>
                  {center.branding?.primary_color ?? "Palette non impostata"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Panoramica" title="I tuoi numeri">
        <View style={styles.metricsRow}>
          {clientHomeStats.map((item) => (
            <StatTile key={item.id} label={item.label} value={item.value} />
          ))}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Prossimo appuntamento"
        title={upcomingBooking.service}
        tone="sand"
      >
        <Text style={styles.primaryLine}>
          {upcomingBooking.dateLabel} alle {upcomingBooking.timeLabel}
        </Text>
        <Text style={styles.secondaryLine}>
          Con {upcomingBooking.specialist}
        </Text>
        <View style={styles.actionsRow}>
          <View style={styles.actionItem}>
            <PrimaryButton
              label={activeCenter ? "Apri prenotazione" : "Seleziona un centro"}
              onPress={() => onOpenBooking(null)}
              variant={activeCenter ? "primary" : "secondary"}
            />
          </View>
          <View style={styles.actionItem}>
            <PrimaryButton
              label="Storico prenotazioni"
              onPress={onOpenAppointments}
              variant="secondary"
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Beauty wallet" title="Promozioni e fedelta">
        <Text style={styles.secondaryLine}>
          {loyaltyOverview.points} punti disponibili, {loyaltyOverview.reward}
        </Text>
        <View style={styles.walletRibbon}>
          <Text style={styles.walletLabel}>Centro preferito</Text>
          <Text style={styles.walletValue}>
            {activeCenter?.name ?? "Da selezionare"}
          </Text>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Ultime prenotazioni" title="Storico rapido">
        {demoAppointments.slice(0, 2).map((appointment) => (
          <View key={appointment.id} style={styles.historyRow}>
            <View style={styles.historyBadge} />
            <View style={styles.historyMain}>
              <Text style={styles.serviceName}>{appointment.service}</Text>
              <Text style={styles.serviceMeta}>
                {appointment.dateLabel} • {appointment.statusLabel}
              </Text>
            </View>
            <Text style={styles.priceBadge}>{appointment.price}</Text>
          </View>
        ))}
      </SectionCard>
    </ScrollView>
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
  centerList: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  centerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 132,
    padding: spacing.md,
  },
  centerCardActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.brand,
  },
  centerPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSky,
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  centerPillText: {
    ...textStyles.microLabel,
    color: colors.brandInk,
  },
  centerName: {
    ...textStyles.titleXs,
  },
  centerMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  centerTag: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  loader: {
    marginVertical: spacing.md,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  primaryLine: {
    ...textStyles.titleBase,
  },
  secondaryLine: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  actionsRow: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionItem: {
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  walletRibbon: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  walletLabel: {
    ...textStyles.microLabel,
  },
  walletValue: {
    ...textStyles.titleXs,
    marginTop: spacing.sm,
  },
  historyRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  historyBadge: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 12,
    height: 44,
    width: 44,
  },
  historyMain: {
    flex: 1,
  },
  serviceName: {
    ...textStyles.titleXs,
  },
  serviceMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  priceBadge: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: "700",
  },
});
