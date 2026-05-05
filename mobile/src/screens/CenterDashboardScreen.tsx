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

import { getCenterDashboard, getCenterReviews } from "../lib/api";
import type { ActivationStatus, Center, CenterDashboard, DashboardClient, Review } from "../types/api";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { StatTile } from "../components/StatTile";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CenterDashboardScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onOpenClient: (clientId: string) => void;
  onOpenOnboarding: () => void;
};

function getClientDedupKey(client: DashboardClient) {
  const phone = client.phone?.replace(/\D/g, "");
  if (phone && phone !== "0") return `phone:${phone}`;

  const name = client.name.trim().toLowerCase();
  if (name) return `name:${name}`;

  return `id:${client.id}`;
}

function dedupeDashboardClients(clients: DashboardClient[]) {
  const clientsByKey = new Map<string, DashboardClient>();

  clients.forEach((client) => {
    const key = getClientDedupKey(client);
    const existingClient = clientsByKey.get(key);

    if (!existingClient) {
      clientsByKey.set(key, {
        ...client,
        history: [...(client.history ?? [])],
      });
      return;
    }

    const historyById = new Map(
      (existingClient.history ?? []).map((entry) => [entry.id, entry]),
    );
    (client.history ?? []).forEach((entry) => {
      historyById.set(entry.id, entry);
    });

    clientsByKey.set(key, {
      ...existingClient,
      last_visit: existingClient.last_visit ?? client.last_visit,
      history: Array.from(historyById.values()),
    });
  });

  return Array.from(clientsByKey.values());
}

export function CenterDashboardScreen({
  activation,
  center,
  onOpenClient,
  onOpenOnboarding,
}: CenterDashboardScreenProps) {
  const [dashboard, setDashboard] = useState<CenterDashboard | null>(null);
  const [latestReview, setLatestReview] = useState<Review | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeClients = useMemo(
    () => dedupeDashboardClients(dashboard?.clients ?? []),
    [dashboard?.clients],
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([getCenterDashboard(center.id), getCenterReviews(center.id)])
      .then(([dashboardResponse, reviewsResponse]) => {
        if (!mounted) return;
        setDashboard(dashboardResponse);
        setLatestReview(reviewsResponse[0] ?? null);
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

      {!activation.onboarding_completed || !activation.is_listable ? (
        <Pressable onPress={onOpenOnboarding} style={styles.onboardingAlert}>
          <View style={styles.alertIcon}>
            <Ionicons color={colors.brandDark} name="alert-circle-outline" size={22} />
          </View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Completa il tuo profilo</Text>
            <Text style={styles.alertText}>
              Mancano alcuni dati per rendere operativo il centro.
            </Text>
          </View>
          <Ionicons color={colors.brandDark} name="chevron-forward" size={18} />
        </Pressable>
      ) : null}

      <SectionCard eyebrow="Oggi">
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
            {entry.status_label ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{entry.status_label}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Clienti recenti" title="Relazioni attive">
        {activeClients.map((client) => {
          const isExpanded = expandedClientId === client.id;
          const history = client.history ?? [];

          return (
            <View key={client.id} style={styles.crmItem}>
              <Pressable
                onPress={() => setExpandedClientId(isExpanded ? null : client.id)}
                style={styles.crmRow}
              >
                <View style={styles.crmAvatar}>
                  <Text style={styles.crmAvatarText}>
                    {client.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.crmMain}>
                  <Text style={styles.scheduleTitle}>{client.name}</Text>
                  <Text style={styles.scheduleMeta}>{client.phone}</Text>
                  {history.length > 1 ? (
                    <Text style={styles.relationshipCount}>
                      {history.length} relazioni registrate
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.lastVisit}>{client.last_visit ?? "n/a"}</Text>
                <Ionicons
                  color={colors.textMuted}
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                />
              </Pressable>

              {isExpanded ? (
                <View style={styles.relationshipHistory}>
                  {history.length === 0 ? (
                    <Text style={styles.relationshipEmpty}>Nessuno storico disponibile.</Text>
                  ) : null}
                  {history.map((entry) => (
                    <View key={entry.id} style={styles.relationshipRow}>
                      <View style={styles.relationshipDot} />
                      <View style={styles.relationshipMain}>
                        <Text style={styles.relationshipTitle}>{entry.service_name}</Text>
                        <Text style={styles.relationshipMeta}>
                          {entry.date_label} {entry.time_label}
                          {entry.status && entry.status !== "confirmed" ? ` - ${entry.status}` : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <Pressable onPress={() => onOpenClient(client.id)} style={styles.openClientButton}>
                    <Text style={styles.openClientText}>Apri scheda cliente</Text>
                    <Ionicons color={colors.brandDark} name="chevron-forward" size={15} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </SectionCard>

      <SectionCard eyebrow="Recensioni" title="Ultima recensione ricevuta">
        {latestReview ? (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewStars}>
              {"★".repeat(latestReview.rating)}
              {"☆".repeat(5 - latestReview.rating)}
            </Text>
            <Text style={styles.reviewComment}>{latestReview.comment}</Text>
            <Text style={styles.reviewMeta}>
              {latestReview.user_name ?? "Cliente"} · {latestReview.service_name ?? "Trattamento"}
            </Text>
          </View>
        ) : (
          <Text style={styles.reviewEmpty}>Ancora nessuna recensione ricevuta.</Text>
        )}
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
  onboardingAlert: {
    alignItems: "center",
    backgroundColor: colors.surfaceSand,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  alertIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  alertText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
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
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  crmItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
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
  relationshipCount: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  relationshipHistory: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingLeft: 54,
  },
  relationshipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  relationshipDot: {
    backgroundColor: colors.brand,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  relationshipMain: {
    flex: 1,
  },
  relationshipTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  relationshipMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  relationshipEmpty: {
    color: colors.textMuted,
    fontSize: 13,
  },
  openClientButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  openClientText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  reviewCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.md,
  },
  reviewStars: {
    color: colors.brandDark,
    fontSize: 18,
    fontWeight: "800",
  },
  reviewComment: {
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  reviewMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  reviewEmpty: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
