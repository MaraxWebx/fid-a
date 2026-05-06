import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { CalendarDayStrip } from "../components/CalendarDayStrip";
import { getCenterDashboard, getCenterReviews, updateBookingStatus } from "../lib/api";
import type {
  ActivationStatus,
  Center,
  CenterDashboard,
  DashboardAgendaItem,
  DashboardClient,
  Review,
} from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CenterDashboardScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onOpenClient: (clientId: string) => void;
  onOpenOnboarding: () => void;
};

type TreatmentTone = {
  accent: string;
  background: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
};

const treatmentTones: Record<string, TreatmentTone> = {
  viso: {
    accent: "#B9E7F6",
    background: "#EEF9FD",
    icon: "sparkles-outline",
    label: "Viso",
    text: "#2F6F8C",
  },
  unghie: {
    accent: "#A9D8FF",
    background: "#EAF6FF",
    icon: "color-palette-outline",
    label: "Unghie",
    text: "#326A9C",
  },
  lashes: {
    accent: "#B8CBE8",
    background: "#EEF4FC",
    icon: "eye-outline",
    label: "Brows & lashes",
    text: "#435F87",
  },
  massaggi: {
    accent: "#B7EEF4",
    background: "#ECFBFD",
    icon: "leaf-outline",
    label: "Massaggi",
    text: "#347B87",
  },
  corpo: {
    accent: "#C8E2FF",
    background: "#F0F8FF",
    icon: "body-outline",
    label: "Corpo",
    text: "#406B93",
  },
  default: {
    accent: colors.brand,
    background: colors.surfaceSky,
    icon: "rose-outline",
    label: "Beauty",
    text: colors.brandInk,
  },
};

const demoAgenda: DashboardAgendaItem[] = [
  {
    id: "demo-1",
    client_name: "Giulia R.",
    operator_name: "Marta",
    service: "Pulizia viso luxury",
    status_label: "Confermato",
    time_label: "09:30",
    duration_label: "75 min",
  },
  {
    id: "demo-2",
    client_name: "Elena B.",
    operator_name: "Sofia",
    service: "Manicure semipermanente",
    status_label: "Arrivata",
    time_label: "11:00",
    duration_label: "50 min",
  },
  {
    id: "demo-3",
    client_name: "Chiara M.",
    operator_name: "Alessia",
    service: "Laminazione ciglia",
    status_label: "In ritardo",
    time_label: "14:20",
    duration_label: "45 min",
  },
  {
    id: "demo-4",
    client_name: "Sara L.",
    operator_name: "Marta",
    service: "Massaggio rilassante",
    status_label: "Confermato",
    time_label: "16:00",
    duration_label: "60 min",
  },
];

const demoClients: DashboardClient[] = [
  {
    id: "demo-client-1",
    name: "Giulia Rossi",
    phone: "+39 333 128 4455",
    last_visit: "28 apr",
    history: [
      {
        id: "demo-history-1",
        date_label: "28 apr",
        service_name: "Pulizia viso luxury",
        status: "confirmed",
        time_label: "10:00",
      },
      {
        id: "demo-history-2",
        date_label: "12 mar",
        service_name: "Massaggio viso",
        status: "confirmed",
        time_label: "17:30",
      },
      {
        id: "demo-history-3",
        date_label: "03 feb",
        service_name: "Trattamento glow",
        status: "confirmed",
        time_label: "16:00",
      },
    ],
  },
  {
    id: "demo-client-2",
    name: "Elena Bianchi",
    phone: "+39 349 762 1800",
    last_visit: "02 mag",
    history: [
      {
        id: "demo-history-4",
        date_label: "02 mag",
        service_name: "Manicure semipermanente",
        status: "confirmed",
        time_label: "12:00",
      },
      {
        id: "demo-history-5",
        date_label: "18 apr",
        service_name: "Pedicure spa",
        status: "confirmed",
        time_label: "11:30",
      },
    ],
  },
  {
    id: "demo-client-3",
    name: "Sara Lombardi",
    phone: "+39 340 554 0921",
    last_visit: "15 apr",
    history: [
      {
        id: "demo-history-6",
        date_label: "15 apr",
        service_name: "Massaggio rilassante",
        status: "confirmed",
        time_label: "18:00",
      },
    ],
  },
];

const demoReview: Review = {
  booking_id: "demo-review-booking",
  center_id: "demo-center",
  comment: "Ambiente curato e trattamento viso impeccabile. Mi sono sentita seguita con grande attenzione.",
  id: "demo-review",
  rating: 5,
  service_name: "Pulizia viso luxury",
  user_id: "demo-user",
  user_name: "Martina",
};

const demoAlerts = [
  {
    id: "birthday",
    icon: "gift-outline",
    label: "Compleanni",
    text: "Oggi compie gli anni Laura P. Prepara un messaggio WhatsApp dedicato.",
    tone: treatmentTones.unghie,
  },
  {
    id: "package",
    icon: "hourglass-outline",
    label: "Pacchetti",
    text: "2 pacchetti viso scadono entro 7 giorni. Suggerisci il rinnovo in agenda.",
    tone: treatmentTones.viso,
  },
  {
    id: "promo",
    icon: "pricetag-outline",
    label: "Promo del giorno",
    text: "Upgrade consigliato: trattamento icy glow dopo pulizia viso, +EUR 18.",
    tone: treatmentTones.massaggi,
  },
];

const statusActions = ["Confermato", "Arrivata", "In ritardo", "Annullato"] as const;
const statusActionIconMap = {
  Confermato: "checkmark-circle-outline",
  Arrivata: "person-circle-outline",
  "In ritardo": "time-outline",
  Annullato: "close-circle-outline",
} as const;
const statusActionShortLabelMap = {
  Confermato: "Conferma",
  Arrivata: "Arrivata",
  "In ritardo": "Ritardo",
  Annullato: "Annulla",
} as const;

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

function getTreatmentTone(service: string) {
  const value = service.toLowerCase();
  if (value.includes("viso") || value.includes("facial") || value.includes("glow")) {
    return treatmentTones.viso;
  }
  if (value.includes("ungh") || value.includes("manicure") || value.includes("pedicure")) {
    return treatmentTones.unghie;
  }
  if (
    value.includes("laminazione") ||
    value.includes("brow") ||
    value.includes("lash") ||
    value.includes("ciglia")
  ) {
    return treatmentTones.lashes;
  }
  if (value.includes("massaggio") || value.includes("relax")) {
    return treatmentTones.massaggi;
  }
  if (value.includes("corpo") || value.includes("body")) {
    return treatmentTones.corpo;
  }
  return treatmentTones.default;
}

function getStatusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes("arriv")) return { background: "#EAF9F3", text: "#4D8B77" };
  if (value.includes("ritardo")) return { background: "#FFF4E7", text: "#B47A3B" };
  if (value.includes("cancell") || value.includes("annull") || value.includes("disdet")) {
    return { background: "#EFF4FA", text: "#74889D" };
  }
  return { background: "#DFF3FF", text: "#2F6F8C" };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function parseMetricValue(metrics: CenterDashboard["metrics"] | undefined, terms: string[]) {
  const match = metrics?.find((metric) =>
    terms.some((term) => metric.label.toLowerCase().includes(term)),
  );
  const numeric = Number(String(match?.value ?? "").replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normalizeExternalUrl(url: string) {
  const trimmedUrl = url.trim();
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

function isCanceledStatus(status: string) {
  const value = status.toLowerCase();
  return value.includes("annull") || value.includes("disdet") || value.includes("cancel");
}

function normalizeStatusLabel(status: string) {
  if (!status || status === "confirmed") return "Confermato";
  if (status === "arrived") return "Arrivata";
  if (status === "late") return "In ritardo";
  if (status === "canceled") return "Annullato";
  return status;
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
  const [agendaStatuses, setAgendaStatuses] = useState<Record<string, string>>({});
  const [cancelDraft, setCancelDraft] = useState<DashboardAgendaItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeValue = useRef(new Animated.Value(0)).current;

  const loadDashboard = async (mounted = true) => {
    try {
      const [dashboardResponse, reviewsResponse] = await Promise.all([
        getCenterDashboard(center.id),
        getCenterReviews(center.id),
      ]);
      if (!mounted) return;
      setDashboard(dashboardResponse);
      setLatestReview(reviewsResponse[0] ?? null);
      setAgendaStatuses({});
      setError(null);
    } catch {
      if (mounted) {
        setError("Dati reali non disponibili. Stai visualizzando una demo operativa.");
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    void loadDashboard(mounted);

    return () => {
      mounted = false;
    };
  }, [center.id]);

  useEffect(() => {
    Animated.timing(fadeValue, {
      duration: 420,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [fadeValue]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const agenda = dashboard?.agenda && dashboard.agenda.length > 0 ? dashboard.agenda : demoAgenda;
  const clients = useMemo(() => {
    const source = dashboard?.clients && dashboard.clients.length > 0 ? dashboard.clients : demoClients;
    return dedupeDashboardClients(source);
  }, [dashboard?.clients]);
  const agendaWithStatuses = agenda.map((entry) => ({
    ...entry,
    status_label: normalizeStatusLabel(agendaStatuses[entry.id] ?? entry.status_label),
  }));
  const activeAgenda = agendaWithStatuses.filter((entry) => !isCanceledStatus(entry.status_label));
  const canceledAgenda = agendaWithStatuses.filter((entry) => isCanceledStatus(entry.status_label));
  const hasLocalAgendaUpdates = Object.keys(agendaStatuses).length > 0;

  const review = latestReview ?? demoReview;
  const dailyRevenue =
    (!hasLocalAgendaUpdates
      ? parseMetricValue(dashboard?.metrics, ["incasso", "revenue", "fatturato"])
      : null) ??
    activeAgenda.reduce((total, item) => {
      const service = item.service.toLowerCase();
      if (service.includes("massaggio")) return total + 85;
      if (service.includes("laminazione")) return total + 55;
      if (service.includes("manicure") || service.includes("ungh")) return total + 42;
      return total + 70;
    }, 0);
  const predictedRevenue = dailyRevenue + Math.max(activeAgenda.length - 1, 0) * 18;
  const expectedClients = new Set(activeAgenda.map((entry) => entry.client_name)).size;
  const nextBookings = activeAgenda.length;
  const dateLabel = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    weekday: "long",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const kpis = [
    {
      icon: "calendar-clear-outline",
      label: "Appuntamenti oggi",
      tone: treatmentTones.viso,
      value: String(activeAgenda.length),
    },
    {
      icon: "people-outline",
      label: "Clienti previsti",
      tone: treatmentTones.unghie,
      value: String(expectedClients),
    },
    {
      icon: "wallet-outline",
      label: "Incasso previsto",
      tone: treatmentTones.lashes,
      value: formatMoney(predictedRevenue),
    },
    {
      icon: "time-outline",
      label: "Prossime prenotazioni",
      tone: treatmentTones.massaggi,
      value: String(nextBookings),
    },
    {
      icon: "close-circle-outline",
      label: "No-show / disdette",
      tone: treatmentTones.corpo,
      value: String(canceledAgenda.length),
    },
  ];

  const handleChangeStatus = async (
    entry: DashboardAgendaItem,
    nextStatus: string,
    reason?: string,
  ) => {
    if (nextStatus === "Annullato" && !isCanceledStatus(entry.status_label)) {
      setCancelDraft(entry);
      setCancelReason("");
      return;
    }

    setAgendaStatuses((current) => ({
      ...current,
      [entry.id]: nextStatus,
    }));

    if (entry.id.startsWith("demo-")) return;

    setStatusSavingId(entry.id);
    try {
      await updateBookingStatus(entry.id, {
        cancellation_reason: reason?.trim() || null,
        center_id: center.id,
        role: "center",
        status: nextStatus,
      });
      await loadDashboard(true);
    } catch {
      setError("Aggiornamento stato appuntamento non riuscito.");
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelDraft) return;
    const draft = cancelDraft;
    setCancelDraft(null);
    await handleChangeStatus(
      { ...draft, status_label: "Annullato" },
      "Annullato",
      cancelReason,
    );
    setCancelReason("");
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Animated.View
        style={[
          styles.pageMotion,
          {
            opacity: fadeValue,
            transform: [
              {
                translateY: fadeValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {center.branding.logo ? (
              <Image source={{ uri: center.branding.logo }} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>
                  {center.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.heroIdentity}>
              <Text style={styles.eyebrow}>Beauty salon management</Text>
              <Text style={styles.centerName}>{center.name}</Text>
              <Text numberOfLines={2} style={styles.centerDescription}>
                {center.branding.description ||
                  "Buongiorno, il centro e pronto ad accogliere con un'esperienza beauty curata e rilassante."}
              </Text>
              <View style={styles.socialLinks}>
                {center.branding.instagram_url ? (
                  <SocialIcon
                    icon="logo-instagram"
                    label="Instagram"
                    url={center.branding.instagram_url}
                  />
                ) : null}
                {center.branding.tiktok_url ? (
                  <SocialIcon
                    icon="logo-tiktok"
                    label="TikTok"
                    url={center.branding.tiktok_url}
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.revenuePanel}>
            <View>
              <Text style={styles.revenueLabel}>Incasso giornaliero</Text>
              <Text style={styles.revenueValue}>{formatMoney(dailyRevenue)}</Text>
            </View>
            <View style={styles.datePanel}>
              <Text style={styles.dateText}>{dateLabel}</Text>
              <Text style={styles.timeText}>{timeLabel}</Text>
            </View>
          </View>
        </View>

        <CalendarDayStrip sideDays={1} />

        {!activation.onboarding_completed || !activation.is_listable ? (
          <Pressable onPress={onOpenOnboarding} style={styles.onboardingAlert}>
            <View style={styles.alertIcon}>
              <Ionicons color={colors.brandInk} name="sparkles-outline" size={20} />
            </View>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>Completa il profilo premium</Text>
              <Text style={styles.alertText}>
                Mancano alcuni dettagli per rendere il centro pienamente operativo.
              </Text>
            </View>
            <Ionicons color={colors.brandInk} name="chevron-forward" size={18} />
          </Pressable>
        ) : null}

        {loading ? <ActivityIndicator color={colors.brand} style={styles.loader} /> : null}
        {error ? <Text style={styles.demoNote}>{error}</Text> : null}

        <View style={styles.quickActions}>
          <QuickAction icon="logo-whatsapp" label="WhatsApp" />
          <QuickAction icon="add-circle-outline" label="Nuovo appunt." />
        </View>

        <View style={styles.kpiGrid}>
          {kpis.map((item) => (
            <KpiCard
              key={item.label}
              icon={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
              label={item.label}
              tone={item.tone}
              value={item.value}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Agenda di oggi</Text>
            <Text style={styles.sectionTitle}>Ritmo della giornata</Text>
          </View>
          <View style={styles.dragHint}>
            <Ionicons color={colors.textMuted} name="reorder-three-outline" size={18} />
            <Text style={styles.dragHintText}>priorita</Text>
          </View>
        </View>

        <View style={styles.agendaCard}>
          <View style={styles.timelineLine} />
          {agendaWithStatuses.map((entry, index) => (
            <AgendaRow
              key={entry.id}
              entry={entry}
              isLast={index === agendaWithStatuses.length - 1}
              onChangeStatus={(nextStatus) => void handleChangeStatus(entry, nextStatus)}
              saving={statusSavingId === entry.id}
              status={entry.status_label}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Relazioni attive</Text>
            <Text style={styles.sectionTitle}>Clienti recenti</Text>
          </View>
        </View>

        <View style={styles.clientList}>
          {clients.slice(0, 4).map((client) => {
            const history = client.history ?? [];
            const visits = Math.max(history.length, 1);
            const isVip = visits >= 3;
            const isExpanded = expandedClientId === client.id;

            return (
              <View key={client.id} style={styles.clientCard}>
                <Pressable
                  onPress={() => setExpandedClientId(isExpanded ? null : client.id)}
                  style={styles.clientRow}
                >
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>
                      {client.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientMain}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientMeta}>
                      {visits} visite · ultimo trattamento {client.last_visit ?? "n/a"}
                    </Text>
                  </View>
                  <View style={[styles.loyaltyBadge, isVip ? styles.vipBadge : null]}>
                    <Text style={styles.loyaltyText}>{isVip ? "VIP" : "Loyal"}</Text>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.clientHistory}>
                    {history.slice(0, 3).map((entry) => (
                      <View key={entry.id} style={styles.historyRow}>
                        <View style={styles.historyDot} />
                        <Text style={styles.historyText}>
                          {entry.service_name} · {entry.date_label}
                        </Text>
                      </View>
                    ))}
                    <Pressable onPress={() => onOpenClient(client.id)} style={styles.openClientButton}>
                      <Text style={styles.openClientText}>Apri scheda cliente</Text>
                      <Ionicons color={colors.brandInk} name="chevron-forward" size={15} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Alert intelligenti</Text>
            <Text style={styles.sectionTitle}>Da non perdere</Text>
          </View>
        </View>

        <View style={styles.alertList}>
          {demoAlerts.map((alert) => (
            <SmartAlert
              key={alert.id}
              icon={alert.icon as React.ComponentProps<typeof Ionicons>["name"]}
              label={alert.label}
              text={alert.text}
              tone={alert.tone}
            />
          ))}

          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Ionicons color={colors.brandInk} name="star-outline" size={18} />
              <Text style={styles.reviewTitle}>Ultima recensione</Text>
            </View>
            <Text style={styles.reviewStars}>{"★".repeat(review.rating)}</Text>
            <Text style={styles.reviewComment}>{review.comment}</Text>
            <Text style={styles.reviewMeta}>
              {review.user_name ?? "Cliente"} · {review.service_name ?? "Trattamento"}
            </Text>
          </View>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons color={colors.brandInk} name="sparkles" size={18} />
          </View>
          <View style={styles.aiMain}>
            <Text style={styles.aiTitle}>Suggerimento AI</Text>
            <Text style={styles.aiText}>
              Proponi un siero lenitivo post-trattamento alle clienti viso di oggi.
              Upsell stimato: +EUR 36.
            </Text>
          </View>
        </View>
      </Animated.View>

      <Modal
        animationType="fade"
        onRequestClose={() => setCancelDraft(null)}
        transparent
        visible={cancelDraft !== null}
      >
        <View style={styles.cancelBackdrop}>
          <View style={styles.cancelCard}>
            <View style={styles.cancelIcon}>
              <Ionicons color="#486DA8" name="calendar-clear-outline" size={22} />
            </View>
            <Text style={styles.cancelTitle}>Annullare appuntamento?</Text>
            <Text style={styles.cancelText}>
              {cancelDraft
                ? `${cancelDraft.client_name} - ${cancelDraft.service} alle ${cancelDraft.time_label}`
                : ""}
            </Text>
            <TextInput
              maxLength={240}
              multiline
              onChangeText={setCancelReason}
              placeholder="Motivo disdetta cliente (facoltativo)"
              placeholderTextColor="#8BAEC5"
              style={styles.cancelInput}
              value={cancelReason}
            />
            <View style={styles.cancelActions}>
              <Pressable onPress={() => setCancelDraft(null)} style={styles.cancelSecondary}>
                <Text style={styles.cancelSecondaryText}>Indietro</Text>
              </Pressable>
              <Pressable onPress={() => void handleConfirmCancel()} style={styles.cancelPrimary}>
                <Text style={styles.cancelPrimaryText}>Conferma annullo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SmartAlert({
  icon,
  label,
  text,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
  tone: TreatmentTone;
}) {
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowValue, {
          duration: 1800,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(glowValue, {
          duration: 1800,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowValue]);

  return (
    <Animated.View
      style={[
        styles.smartAlert,
        {
          backgroundColor: tone.background,
          transform: [
            {
              scale: glowValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.01],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.smartAlertIcon, { backgroundColor: tone.accent }]}>
        <Ionicons color={tone.text} name={icon} size={18} />
      </View>
      <View style={styles.smartAlertMain}>
        <Text style={[styles.smartAlertLabel, { color: tone.text }]}>{label}</Text>
        <Text style={styles.smartAlertText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function SocialIcon({
  icon,
  label,
  url,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  url: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        duration: 90,
        toValue: 0.94,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        friction: 5,
        tension: 110,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    void Linking.openURL(normalizeExternalUrl(url));
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityLabel={`Apri ${label}`}
        onPress={handlePress}
        style={styles.socialIconButton}
      >
        <Ionicons color="#1F4F70" name={icon} size={18} />
      </Pressable>
    </Animated.View>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  return (
    <Pressable style={styles.quickAction}>
      <Ionicons color={colors.brandInk} name={icon} size={19} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function KpiCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone: TreatmentTone;
  value: string;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: tone.background }]}>
      <View style={[styles.kpiIcon, { backgroundColor: tone.accent }]}>
        <Ionicons color={tone.text} name={icon} size={18} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function AgendaRow({
  entry,
  isLast,
  onChangeStatus,
  saving,
  status,
}: {
  entry: DashboardAgendaItem;
  isLast: boolean;
  onChangeStatus: (status: string) => void;
  saving: boolean;
  status: string;
}) {
  const tone = getTreatmentTone(entry.service);
  const statusTone = getStatusTone(status);
  const pressScale = useRef(new Animated.Value(1)).current;

  const handleStatusPress = (nextStatus: string) => {
    onChangeStatus(nextStatus);
    Animated.sequence([
      Animated.timing(pressScale, {
        duration: 90,
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.spring(pressScale, {
        friction: 5,
        tension: 90,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.agendaRow,
        isLast ? styles.agendaRowLast : null,
        {
          transform: [{ scale: pressScale }],
        },
      ]}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.agendaTime}>{entry.time_label}</Text>
        <View style={[styles.timelineNode, { borderColor: tone.accent }]}>
          <View style={[styles.timelineNodeCore, { backgroundColor: tone.accent }]} />
        </View>
      </View>

      <View style={styles.agendaMain}>
        <View style={styles.agendaTitleRow}>
          <View style={styles.agendaClientBlock}>
            <Text style={styles.agendaClient}>{entry.client_name}</Text>
            <Text style={styles.agendaSubMeta}>
              {entry.duration_label ?? "60 min"} · gestione rapida
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusTone.background }]}>
            <Text style={[styles.statusText, { color: statusTone.text }]}>
              {status}
            </Text>
          </View>
        </View>
        <View style={styles.serviceRow}>
          <View style={[styles.serviceIcon, { backgroundColor: tone.background }]}>
            <Ionicons color={tone.text} name={tone.icon} size={15} />
          </View>
          <Text style={styles.serviceName}>{entry.service}</Text>
        </View>
        <View style={styles.appointmentMetaRow}>
          <View style={styles.durationChip}>
            <Ionicons color="#4D7D9B" name="hourglass-outline" size={13} />
            <Text style={styles.durationChipText}>{entry.duration_label ?? "60 min"}</Text>
          </View>
          <View style={[styles.categoryChip, { backgroundColor: tone.background }]}>
            <Text style={[styles.categoryChipText, { color: tone.text }]}>{tone.label}</Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          {statusActions.map((action) => {
            const active = action === status;
            const actionTone = getStatusTone(action);

            return (
              <Pressable
                disabled={saving}
                key={action}
                onPress={() => handleStatusPress(action)}
                style={[
                  styles.statusAction,
                  action === "Annullato" ? styles.cancelStatusAction : null,
                  active
                    ? {
                        backgroundColor: actionTone.background,
                        borderColor: actionTone.text,
                      }
                    : null,
                ]}
              >
                <Ionicons
                  color={active ? actionTone.text : "#6B91AB"}
                  name={statusActionIconMap[action]}
                  size={14}
                />
                <Text
                  style={[
                    styles.statusActionText,
                    active ? { color: actionTone.text } : null,
                  ]}
                >
                  {statusActionShortLabelMap[action]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {isCanceledStatus(status) ? (
          <View style={styles.cancellationInfo}>
            <Text style={styles.cancellationInfoText}>
              Disdetta cliente
              {entry.client_cancellations_count
                ? ` · ${entry.client_cancellations_count} totali`
                : ""}
            </Text>
            {entry.cancellation_reason ? (
              <Text numberOfLines={1} style={styles.cancellationReason}>
                Motivo: {entry.cancellation_reason}
              </Text>
            ) : null}
          </View>
        ) : null}
        {entry.status_history && entry.status_history.length > 0 ? (
          <Text numberOfLines={1} style={styles.statusHistoryText}>
            Ultimo cambio: {normalizeStatusLabel(entry.status_history[entry.status_history.length - 1].status)}
          </Text>
        ) : null}
      </View>

      {saving ? (
        <ActivityIndicator color={colors.brand} size="small" />
      ) : (
        <Ionicons color={colors.textSoft} name="ellipsis-vertical" size={16} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F3FAFF",
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  pageMotion: {
    flex: 1,
  },
  hero: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(174, 218, 245, 0.55)",
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 4,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  logo: {
    backgroundColor: "#F4FBFF",
    borderRadius: 24,
    height: 64,
    width: 64,
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: "#DDF3FF",
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  logoFallbackText: {
    color: "#2F6F8C",
    fontSize: 20,
    fontWeight: "800",
  },
  heroIdentity: {
    flex: 1,
  },
  eyebrow: {
    color: "#6F9DB9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  centerName: {
    color: "#1F4F70",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 4,
  },
  centerDescription: {
    color: "#668CA7",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  socialLinks: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  socialIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(234, 246, 255, 0.92)",
    borderColor: "rgba(174, 218, 245, 0.66)",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    width: 38,
  },
  revenuePanel: {
    alignItems: "flex-end",
    backgroundColor: "rgba(221, 243, 255, 0.86)",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  revenueLabel: {
    color: "#5E8DAC",
    fontSize: 12,
    fontWeight: "800",
  },
  revenueValue: {
    color: "#183F5C",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 2,
  },
  datePanel: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  dateText: {
    color: "#4D7D9B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeText: {
    color: "#1F4F70",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  onboardingAlert: {
    alignItems: "center",
    backgroundColor: "#EAF6FF",
    borderColor: "#B9E2FA",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  alertIcon: {
    alignItems: "center",
    backgroundColor: "#F8FCFF",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    color: "#1F4F70",
    fontSize: 15,
    fontWeight: "800",
  },
  alertText: {
    color: "#668CA7",
    fontSize: 13,
    marginTop: 3,
  },
  loader: {
    marginBottom: spacing.md,
  },
  demoNote: {
    color: "#668CA7",
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderColor: "rgba(174, 218, 245, 0.5)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  quickActionText: {
    color: "#245A7A",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  kpiCard: {
    borderColor: "rgba(174, 218, 245, 0.42)",
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: "48%",
    minHeight: 132,
    padding: spacing.md,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  kpiIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 36,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 36,
  },
  kpiValue: {
    color: "#183F5C",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 29,
  },
  kpiLabel: {
    color: "#5D86A0",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 5,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionKicker: {
    color: "#6F9DB9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#1F4F70",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },
  dragHint: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderColor: "rgba(174, 218, 245, 0.5)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  dragHintText: {
    color: "#668CA7",
    fontSize: 11,
    fontWeight: "800",
  },
  agendaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderColor: "rgba(174, 218, 245, 0.42)",
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 3,
  },
  timelineLine: {
    backgroundColor: "rgba(174, 218, 245, 0.46)",
    borderRadius: 999,
    bottom: spacing.lg,
    left: 47,
    position: "absolute",
    top: spacing.xl,
    width: 2,
  },
  agendaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    minHeight: 154,
  },
  agendaRowLast: {
    marginBottom: 0,
  },
  timeColumn: {
    alignItems: "center",
    paddingTop: spacing.md,
    width: 62,
  },
  agendaTime: {
    color: "#1F4F70",
    fontSize: 14,
    fontWeight: "800",
  },
  timelineNode: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    marginTop: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    width: 24,
  },
  timelineNodeCore: {
    borderRadius: 7,
    height: 10,
    width: 10,
  },
  agendaMain: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(174, 218, 245, 0.52)",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  agendaTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  agendaClient: {
    color: "#183F5C",
    fontSize: 17,
    fontWeight: "800",
  },
  agendaClientBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  agendaSubMeta: {
    color: "#8BAEC5",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 8,
  },
  serviceIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  serviceName: {
    color: "#4D7D9B",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  appointmentMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  durationChip: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    borderColor: "rgba(174, 218, 245, 0.62)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  durationChipText: {
    color: "#4D7D9B",
    fontSize: 12,
    fontWeight: "800",
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  statusAction: {
    alignItems: "center",
    backgroundColor: "rgba(244, 251, 255, 0.72)",
    borderColor: "rgba(174, 218, 245, 0.62)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 10,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cancelStatusAction: {
    borderStyle: "dashed",
  },
  statusActionText: {
    color: "#6B91AB",
    fontSize: 12,
    fontWeight: "800",
  },
  cancellationInfo: {
    backgroundColor: "#F5F9FD",
    borderColor: "rgba(174, 218, 245, 0.42)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  cancellationInfoText: {
    color: "#486DA8",
    fontSize: 12,
    fontWeight: "800",
  },
  cancellationReason: {
    color: "#74889D",
    fontSize: 12,
    marginTop: 3,
  },
  statusHistoryText: {
    color: "#8BAEC5",
    fontSize: 11,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  clientList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  clientCard: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(174, 218, 245, 0.5)",
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
  },
  clientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  clientAvatar: {
    alignItems: "center",
    backgroundColor: "#DDF3FF",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  clientAvatarText: {
    color: "#2F6F8C",
    fontSize: 14,
    fontWeight: "800",
  },
  clientMain: {
    flex: 1,
  },
  clientName: {
    color: "#183F5C",
    fontSize: 16,
    fontWeight: "800",
  },
  clientMeta: {
    color: "#668CA7",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  loyaltyBadge: {
    backgroundColor: "#EAF6FF",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  vipBadge: {
    backgroundColor: "#DFF3FF",
  },
  loyaltyText: {
    color: "#2F6F8C",
    fontSize: 11,
    fontWeight: "800",
  },
  clientHistory: {
    gap: spacing.xs,
    marginLeft: 60,
    marginTop: spacing.md,
  },
  historyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  historyDot: {
    backgroundColor: "#A9D8FF",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  historyText: {
    color: "#5D86A0",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  openClientButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingTop: spacing.xs,
  },
  openClientText: {
    color: "#1F4F70",
    fontSize: 12,
    fontWeight: "800",
  },
  alertList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  smartAlert: {
    alignItems: "center",
    borderColor: "rgba(174, 218, 245, 0.35)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  smartAlertIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  smartAlertMain: {
    flex: 1,
  },
  smartAlertLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  smartAlertText: {
    color: "#5D86A0",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  reviewCard: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderColor: "rgba(174, 218, 245, 0.5)",
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  reviewTitle: {
    color: "#1F4F70",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewStars: {
    color: "#5FAEC8",
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  reviewComment: {
    color: "#4D7D9B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  reviewMeta: {
    color: "#6F9DB9",
    fontSize: 12,
    marginTop: spacing.sm,
  },
  aiCard: {
    alignItems: "center",
    backgroundColor: "#EAF6FF",
    borderColor: "rgba(174, 218, 245, 0.5)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  aiIcon: {
    alignItems: "center",
    backgroundColor: "#DDF3FF",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  aiMain: {
    flex: 1,
  },
  aiTitle: {
    color: "#1F4F70",
    fontSize: 15,
    fontWeight: "800",
  },
  aiText: {
    color: "#5D86A0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cancelBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(31, 79, 112, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  cancelCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(174, 218, 245, 0.58)",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 520,
    padding: spacing.lg,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    width: "100%",
  },
  cancelIcon: {
    alignItems: "center",
    backgroundColor: "#EAF1FF",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 48,
  },
  cancelTitle: {
    color: "#1F4F70",
    fontSize: 21,
    fontWeight: "800",
  },
  cancelText: {
    color: "#5D86A0",
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  cancelInput: {
    backgroundColor: "#F4FBFF",
    borderColor: "rgba(174, 218, 245, 0.7)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#1F4F70",
    fontSize: 15,
    marginTop: spacing.lg,
    minHeight: 92,
    padding: spacing.md,
    textAlignVertical: "top",
  },
  cancelActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelSecondary: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    borderColor: "rgba(174, 218, 245, 0.7)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelSecondaryText: {
    color: "#5D86A0",
    fontSize: 14,
    fontWeight: "800",
  },
  cancelPrimary: {
    alignItems: "center",
    backgroundColor: "#DFF3FF",
    borderColor: "#A9D8FF",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelPrimaryText: {
    color: "#1F4F70",
    fontSize: 14,
    fontWeight: "800",
  },
});
