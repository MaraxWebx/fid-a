import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
        eyebrow="Dashboard centro"
        logoUrl={center.branding.logo}
        title={center.name}
        subtitle="Panoramica generale dell'attivita con dati reali letti dal database."
      />

      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          {center.branding.logo ? (
            <Image source={{ uri: center.branding.logo }} style={styles.heroLogo} />
          ) : (
            <View style={styles.heroLogoFallback}>
              <Text style={styles.heroLogoText}>
                {center.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{center.name}</Text>
            <Text style={styles.heroSubtitle}>
              Colore brand applicato alla dashboard del centro.
            </Text>
          </View>
        </View>
      </View>

      <SectionCard eyebrow="Oggi" title="KPI principali">
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.metricHint}>{error}</Text> : null}
        <View style={styles.metricsRow}>
          {dashboard?.metrics.map((item) => (
            <View key={item.id} style={[styles.metricWrap, styles.metricCard]}>
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
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  heroMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  heroLogo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 56,
    width: 56,
  },
  heroLogoFallback: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  heroLogoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricWrap: {
    flexBasis: "48%",
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
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
