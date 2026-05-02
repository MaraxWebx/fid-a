import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCenterDashboard } from "../lib/api";
import type { Center, CenterDashboard } from "../types/api";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { StatTile } from "../components/StatTile";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CenterDashboardScreenProps = {
  center: Center;
};

export function CenterDashboardScreen({ center }: CenterDashboardScreenProps) {
  const [dashboard, setDashboard] = useState<CenterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCenterDashboard(center.id)
      .then((dashboardResponse) => {
        if (mounted) setDashboard(dashboardResponse);
      })
      .catch(() => {
        if (mounted)
          setError("Impossibile caricare la dashboard reale del centro.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [center.id]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow={`Beauty Center ${center.name}`}
        title="Dashboard"
        subtitle="Panoramica generale dell'attivita con dati reali letti dal database."
      />

      <SectionCard eyebrow="Oggi" title="KPI principali">
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.metricHint}>{error}</Text> : null}
        <View style={styles.metricsRow}>
          {dashboard?.metrics.map((item) => (
            <View key={item.id} style={styles.metricWrap}>
              <StatTile label={item.label} value={item.value} />
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Agenda di oggi"
        title="Prossimi appuntamenti"
        tone="sky"
      >
        {dashboard?.agenda.map((entry) => (
          <View key={entry.id} style={styles.scheduleRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeValue}>{entry.time_label}</Text>
              <Text style={styles.timeMeta}>{entry.client_name}</Text>
            </View>
            <View style={styles.scheduleMain}>
              <Text style={styles.scheduleTitle}>{entry.service}</Text>
              <Text style={styles.scheduleMeta}>{entry.operator_name}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{entry.status_label}</Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Clienti recenti" title="Relazioni attive">
        {dashboard?.clients.map((client) => (
          <View key={client.id} style={styles.crmRow}>
            <View style={styles.crmAvatar}>
              <Text style={styles.crmAvatarText}>
                {client.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.crmMain}>
              <Text style={styles.scheduleTitle}>{client.name}</Text>
              <Text style={styles.scheduleMeta}>{client.phone}</Text>
            </View>
            <Text style={styles.lastVisit}>{client.last_visit ?? "n/a"}</Text>
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
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricWrap: {
    flexBasis: "48%",
  },
  metricHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  scheduleRow: {
    alignItems: "center",
    borderTopColor: colors.overlayBorder,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  timeBlock: {
    width: 72,
  },
  timeValue: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "700",
  },
  timeMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  scheduleMain: {
    flex: 1,
  },
  scheduleTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "700",
  },
  scheduleMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  statusPill: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  statusText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  crmRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  crmAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSand,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  crmAvatarText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "700",
  },
  crmMain: {
    flex: 1,
  },
  lastVisit: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
