import { useEffect, useRef, useState } from "react";
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

import { getCenterDashboard, getCenterReviews, updateBookingStatus } from "../lib/api";
import {
  AppointmentState,
  AppointmentStatus,
  AppointmentTemporalState,
  getAppointmentTemporalState,
  getAppointmentStatusCounts,
  getAppointmentStatusMeta,
  getNextAppointment,
  isAppointmentActive,
  normalizeAppointmentState,
  toApiBookingState,
} from "../lib/appointmentStatus";
import type {
  ActivationStatus,
  Center,
  CenterDashboard,
  DashboardAgendaItem,
  Review,
} from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CenterDashboardScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onOpenClient: (clientId: string) => void;
  onOpenNewAppointment: () => void;
  onOpenOnboarding: () => void;
};

type TreatmentTone = {
  accent: string;
  background: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
};

type NormalizedAgendaItem = DashboardAgendaItem & {
  appointmentState: AppointmentState;
  appointmentStatus: AppointmentStatus;
  temporalState: AppointmentTemporalState;
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
    start_time: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(10, 45, 0, 0)).toISOString(),
    id: "demo-1",
    client_name: "Giulia R.",
    operator_name: "Marta",
    service: "Pulizia viso luxury",
    status_label: "Confermato",
    time_label: "09:30",
    duration_label: "75 min",
  },
  {
    start_time: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(11, 50, 0, 0)).toISOString(),
    id: "demo-2",
    client_name: "Elena B.",
    operator_name: "Sofia",
    service: "Manicure semipermanente",
    status_label: "Arrivata",
    time_label: "11:00",
    duration_label: "50 min",
  },
  {
    start_time: new Date(new Date().setHours(14, 20, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(15, 5, 0, 0)).toISOString(),
    id: "demo-3",
    client_name: "Chiara M.",
    operator_name: "Alessia",
    service: "Laminazione ciglia",
    status_label: "In ritardo",
    time_label: "14:20",
    duration_label: "45 min",
  },
  {
    start_time: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
    id: "demo-4",
    client_name: "Sara L.",
    operator_name: "Marta",
    service: "Massaggio rilassante",
    status_label: "Confermato",
    time_label: "16:00",
    duration_label: "60 min",
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

export function CenterDashboardScreen({
  activation,
  center,
  onOpenNewAppointment,
  onOpenOnboarding,
}: CenterDashboardScreenProps) {
  const [dashboard, setDashboard] = useState<CenterDashboard | null>(null);
  const [latestReview, setLatestReview] = useState<Review | null>(null);
  const [agendaStatuses, setAgendaStatuses] = useState<Record<string, AppointmentState>>({});
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
  const agendaWithStatuses: NormalizedAgendaItem[] = agenda.map((entry) => {
    const appointmentState =
      agendaStatuses[entry.id] ?? normalizeAppointmentState(entry.status_label, entry.is_delayed);
    const appointmentStatus = appointmentState.status;
    return {
      ...entry,
      appointmentState,
      appointmentStatus,
      temporalState: getAppointmentTemporalState(
        { endTime: entry.end_time, startTime: entry.start_time },
        now,
      ),
      status_label: getAppointmentStatusMeta(appointmentState).label,
    };
  });
  const statusCounts = getAppointmentStatusCounts(
    agendaWithStatuses.map((entry) => ({
      endTime: entry.end_time,
      isDelayed: entry.appointmentState.isDelayed,
      startTime: entry.start_time,
      status: entry.appointmentStatus,
    })),
    now,
  );
  const activeAgenda = agendaWithStatuses.filter((entry) =>
    isAppointmentActive(entry.appointmentStatus),
  );
  const canceledAgenda = agendaWithStatuses.filter(
    (entry) => entry.appointmentStatus === AppointmentStatus.CANCELLED,
  );
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
  const dateLabel = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    weekday: "long",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const arrivedClients = statusCounts.arrived;
  const lateAppointments = statusCounts.delayed;
  const activeIssues = statusCounts.requiringAction;
  const nextAppointment = getNextAppointment(
    agendaWithStatuses.map((entry) => ({
      ...entry,
      endTime: entry.end_time,
      isDelayed: entry.appointmentState.isDelayed,
      startTime: entry.start_time,
      status: entry.appointmentStatus,
    })),
    now,
  );
  const schedulePreview = [
    ...agendaWithStatuses
      .filter((entry) => entry.temporalState === "current" || entry.temporalState === "upcoming")
      .slice(0, 4),
    ...agendaWithStatuses.filter((entry) => entry.temporalState === "past").slice(0, 2),
  ].slice(0, 5);

  const kpis = [
    {
      icon: "people-outline",
      label: "Clienti",
      tone: treatmentTones.unghie,
      value: String(expectedClients),
    },
    {
      icon: "person-circle-outline",
      label: "Arrivi",
      tone: treatmentTones.lashes,
      value: String(arrivedClients),
    },
    {
      icon: "alert-circle-outline",
      label: "Urgenze",
      tone: treatmentTones.massaggi,
      value: String(activeIssues),
    },
  ];

  const handleChangeStatus = async (
    entry: DashboardAgendaItem,
    nextState: AppointmentState,
    reason?: string,
  ) => {
    const currentState = normalizeAppointmentState(entry.status_label, entry.is_delayed);
    if (
      nextState.status === AppointmentStatus.CANCELLED &&
      currentState.status !== AppointmentStatus.CANCELLED &&
      !reason?.trim()
    ) {
      setCancelDraft(entry);
      setCancelReason("");
      return;
    }

    setAgendaStatuses((current) => ({
      ...current,
      [entry.id]: nextState,
    }));

    if (entry.id.startsWith("demo-")) return;

    setStatusSavingId(entry.id);
    try {
      await updateBookingStatus(entry.id, {
        cancellation_reason: reason?.trim() || null,
        center_id: center.id,
        role: "center",
        status: toApiBookingState(nextState),
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
      { status: AppointmentStatus.CANCELLED, isDelayed: false },
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
        <View style={styles.topBar}>
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
            <Text style={styles.eyebrow}>Dashboard centro</Text>
            <Text numberOfLines={1} style={styles.centerName}>{center.name}</Text>
            <Text numberOfLines={1} style={styles.centerDescription}>
              {dateLabel} - {timeLabel}
            </Text>
          </View>

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

        <View style={styles.hero}>
          <PrimaryKpiCard
            appointments={String(statusCounts.totalScheduled)}
            activeCount={statusCounts.active}
            completedCount={statusCounts.completed}
            dailyRevenue={formatMoney(dailyRevenue)}
            nextAppointment={nextAppointment}
            predictedRevenue={formatMoney(predictedRevenue)}
          />
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

        <View style={styles.quickActions}>
          <QuickAction
            icon="add-circle-outline"
            label="Nuovo appuntamento"
            onPress={onOpenNewAppointment}
            variant="primary"
          />
          <QuickAction icon="logo-whatsapp" label="WhatsApp" onPress={() => {}} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Agenda di oggi</Text>
            <Text style={styles.sectionTitle}>Prossimi appuntamenti</Text>
          </View>
          <View style={styles.dragHint}>
            <Ionicons color={colors.textMuted} name="reorder-three-outline" size={18} />
            <Text style={styles.dragHintText}>{statusCounts.active} attivi</Text>
          </View>
        </View>

        <View style={styles.agendaCard}>
          <View style={styles.timelineLine} />
          {schedulePreview.map((entry, index) => (
            <AgendaRow
              key={entry.id}
              entry={entry}
              isLast={index === schedulePreview.length - 1}
              onChangeStatus={(nextState, reason) => void handleChangeStatus(entry, nextState, reason)}
              saving={statusSavingId === entry.id}
              status={entry.appointmentState}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Promemoria</Text>
            <Text style={styles.sectionTitle}>Da non perdere</Text>
          </View>
        </View>

        <View style={styles.alertList}>
          {demoAlerts.slice(0, 2).map((alert) => (
            <SmartAlert
              key={alert.id}
              icon={alert.icon as React.ComponentProps<typeof Ionicons>["name"]}
              label={alert.label}
              text={alert.text}
              tone={alert.tone}
            />
          ))}
        </View>


        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>Recensioni</Text>
            <Text style={styles.sectionTitle}>Latest Reviews</Text>
          </View>
        </View>

        <View style={styles.alertList}>
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewIdentity}>
                <Text style={styles.reviewTitle}>{review.user_name ?? "Cliente"}</Text>
                <Text style={styles.reviewMeta}>{review.service_name ?? "Trattamento"}</Text>
              </View>
              <Text style={styles.reviewStars}>{"★".repeat(review.rating)}</Text>
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
            <Pressable style={styles.reviewReplyAction}>
              <Text style={styles.reviewReplyText}>Risposta rapida</Text>
              <Ionicons color={colors.brandInk} name="return-up-forward-outline" size={14} />
            </Pressable>
          </View>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Ionicons color={colors.brandInk} name="sparkles-outline" size={18} />
          </View>
          <View style={styles.aiMain}>
            <Text style={styles.aiTitle}>AI Suggestions</Text>
            <Text style={styles.aiText}>
              Spazio pronto per suggerimenti operativi su agenda, ricavi e follow-up.
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
  return (
    <View
      style={[
        styles.smartAlert,
        {
          backgroundColor: tone.background,
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
    </View>
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
  onPress,
  variant = "secondary",
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        variant === "primary" ? styles.quickActionPrimary : null,
        pressed ? styles.quickActionPressed : null,
      ]}
    >
      <Ionicons
        color={variant === "primary" ? colors.surface : colors.brandInk}
        name={icon}
        size={19}
      />
      <Text style={[styles.quickActionText, variant === "primary" ? styles.quickActionTextPrimary : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryKpiCard({
  activeCount,
  appointments,
  completedCount,
  dailyRevenue,
  nextAppointment,
  predictedRevenue,
}: {
  activeCount: number;
  appointments: string;
  completedCount: number;
  dailyRevenue: string;
  nextAppointment: NormalizedAgendaItem | null;
  predictedRevenue: string;
}) {
  return (
    <View style={styles.primaryKpiCard}>
      <View style={styles.primaryKpiHeader}>
        <View>
          <Text style={styles.primaryKpiLabel}>Appuntamenti attivi</Text>
          <Text style={styles.primaryKpiValue}>{appointments}</Text>
        </View>
        <View style={styles.primaryKpiBadge}>
          <Ionicons color={colors.brandInk} name="wallet-outline" size={15} />
          <Text style={styles.primaryKpiBadgeText}>{dailyRevenue}</Text>
        </View>
      </View>

      <View style={styles.nextAppointmentRow}>
        <View style={styles.nextAppointmentIcon}>
          <Ionicons color={colors.brandInk} name="time-outline" size={17} />
        </View>
        <View style={styles.nextAppointmentCopy}>
          <Text style={styles.nextAppointmentLabel}>Prossimo appuntamento</Text>
          <Text numberOfLines={1} style={styles.nextAppointmentText}>
            {nextAppointment
              ? `${nextAppointment.time_label} - ${nextAppointment.client_name} - ${nextAppointment.service}`
              : "Nessun appuntamento attivo"}
          </Text>
        </View>
      </View>
      <Text style={styles.primaryKpiMeta}>
        {completedCount} completati - previsione {predictedRevenue}
      </Text>
    </View>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone: TreatmentTone;
  value: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <View style={styles.kpiIcon}>
          <Ionicons color={colors.brandInk} name={icon} size={17} />
        </View>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
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
  entry: NormalizedAgendaItem;
  isLast: boolean;
  onChangeStatus: (state: AppointmentState, reason?: string) => void;
  saving: boolean;
  status: AppointmentState;
}) {
  const tone = getTreatmentTone(entry.service);
  const statusTone = getAppointmentStatusMeta(status);
  const pressScale = useRef(new Animated.Value(1)).current;
  const quickActions = [
    {
      icon: "person-circle-outline" as const,
      key: "arrived",
      label: "Arrivata",
      nextState: { status: AppointmentStatus.ARRIVED, isDelayed: false },
      variant: "neutral" as const,
    },
    {
      icon: "time-outline" as const,
      key: "delayed",
      label: "Ritardo",
      nextState: { status: AppointmentStatus.CONFIRMED, isDelayed: true },
      variant: "neutral" as const,
    },
    {
      icon: "alert-circle-outline" as const,
      key: "no-show",
      label: "No-show",
      nextState: { status: AppointmentStatus.NO_SHOW, isDelayed: false },
      variant: "neutral" as const,
    },
    {
      icon: "close-circle-outline" as const,
      key: "cancelled",
      label: "Annulla",
      nextState: { status: AppointmentStatus.CANCELLED, isDelayed: false },
      reason: "Dashboard quick action",
      variant: "danger" as const,
    },
  ];
  const canUseQuickActions = isAppointmentActive(status.status);

  const handleStatusPress = (nextState: AppointmentState, reason?: string) => {
    onChangeStatus(nextState, reason);
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
        entry.temporalState === "past" ? styles.agendaRowPast : null,
        entry.temporalState === "current" ? styles.agendaRowCurrent : null,
        status.isDelayed ? styles.agendaRowDelayed : null,
        {
          transform: [{ scale: pressScale }],
        },
      ]}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.agendaTime}>{entry.time_label}</Text>
        <Text style={styles.temporalLabel}>
          {entry.temporalState === "current"
            ? "ora"
            : entry.temporalState === "past"
              ? "passato"
              : entry.temporalState === "upcoming"
                ? "prossimo"
                : ""}
        </Text>
        <View style={[styles.timelineNode, { borderColor: tone.accent }]}>
          <View style={[styles.timelineNodeCore, { backgroundColor: tone.accent }]} />
        </View>
      </View>

      <View style={styles.agendaMain}>
        <View style={styles.agendaTitleRow}>
          <View style={styles.agendaClientBlock}>
            <Text style={styles.agendaClient}>{entry.client_name}</Text>
            <Text style={styles.agendaSubMeta}>
              {entry.duration_label ?? "60 min"}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusTone.background }]}>
            <Ionicons color={statusTone.text} name={statusTone.icon} size={13} />
            <Text style={[styles.statusText, { color: statusTone.text }]}>
              {statusTone.label}
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
          <View style={styles.durationChip}>
            <Ionicons color="#4D7D9B" name="person-outline" size={13} />
            <Text style={styles.durationChipText}>{entry.operator_name}</Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          {canUseQuickActions ? (
            quickActions.map((action) => {
              const isSelected =
                status.status === action.nextState.status &&
                status.isDelayed === action.nextState.isDelayed;
              return (
                <Pressable
                  disabled={saving}
                  key={action.key}
                  onPress={() => handleStatusPress(action.nextState, action.reason)}
                  style={[
                    styles.statusQuickAction,
                    isSelected ? styles.statusQuickActionActive : null,
                    action.variant === "danger" ? styles.statusQuickActionDanger : null,
                  ]}
                >
                  <Ionicons
                    color={isSelected ? colors.surface : colors.brandInk}
                    name={action.icon}
                    size={14}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.statusQuickActionText,
                      isSelected ? styles.statusQuickActionTextActive : null,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.statusCompleteState}>
              <Text style={styles.statusCompleteText}>Gestito</Text>
            </View>
          )}
        </View>
        {status.status === AppointmentStatus.CANCELLED ? (
          <View style={styles.cancellationInfo}>
            <Text style={styles.cancellationInfoText}>
              Disdetta cliente
              {entry.client_cancellations_count
                ? ` - ${entry.client_cancellations_count} totali`
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
            Ultimo cambio: {getAppointmentStatusMeta(entry.status_history[entry.status_history.length - 1].status).label}
          </Text>
        ) : null}
      </View>

      {saving ? <ActivityIndicator color={colors.brand} size="small" /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F3FAFF",
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  pageMotion: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: spacing.sm,
    padding: spacing.xs,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  logo: {
    backgroundColor: "#F4FBFF",
    borderRadius: 20,
    height: 56,
    width: 56,
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: "#DDF3FF",
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    width: 56,
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
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  centerName: {
    color: colors.brandInk,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 4,
  },
  centerDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  socialLinks: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  primaryKpiCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: spacing.sm,
    borderLeftColor: colors.brandDark,
    borderLeftWidth: 4,
  },
  primaryKpiHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  primaryKpiLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  primaryKpiValue: {
    color: colors.brandInk,
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
    marginTop: 2,
  },
  primaryKpiBadge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  primaryKpiBadgeText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  nextAppointmentRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  nextAppointmentIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  nextAppointmentCopy: {
    flex: 1,
  },
  nextAppointmentLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  nextAppointmentText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  primaryKpiMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  socialIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(234, 246, 255, 0.92)",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 36,
  },
  revenuePanel: {
    alignItems: "flex-end",
    backgroundColor: "rgba(221, 243, 255, 0.86)",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  revenueLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  revenueValue: {
    color: colors.brandInk,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 2,
  },
  datePanel: {
    alignItems: "flex-end",
    flexShrink: 1,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeText: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  onboardingAlert: {
    alignItems: "center",
    backgroundColor: "#EAF6FF",
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
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
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  alertText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 3,
  },
  loader: {
    marginBottom: spacing.md,
  },
  demoNote: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  quickActionText: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  quickActionPrimary: {
    backgroundColor: colors.brandDark,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  quickActionTextPrimary: {
    color: colors.surface,
  },
  quickActionPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "31.5%",
    flexGrow: 1,
    minHeight: 104,
    padding: spacing.md,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 14,
    elevation: 1,
  },
  kpiHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  kpiIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  kpiValue: {
    color: colors.brandInk,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: spacing.md,
  },
  kpiLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionKicker: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 1,
  },
  dragHint: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  dragHintText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  agendaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.74)",
    borderRadius: 22,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.sm,
    position: "relative",
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1,
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 104,
  },
  agendaRowLast: {
    marginBottom: 0,
  },
  agendaRowPast: {
    opacity: 0.58,
  },
  agendaRowCurrent: {
    backgroundColor: "rgba(221, 243, 250, 0.35)",
    borderRadius: 18,
  },
  agendaRowDelayed: {
    backgroundColor: "rgba(255, 244, 231, 0.55)",
    borderRadius: 18,
  },
  timeColumn: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: 52,
  },
  agendaTime: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  temporalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  timelineNode: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    height: 22,
    justifyContent: "center",
    marginTop: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 22,
  },
  timelineNodeCore: {
    borderRadius: 7,
    height: 10,
    width: 10,
  },
  agendaMain: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    flex: 1,
    padding: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  agendaTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  agendaClient: {
    color: colors.brandInk,
    fontSize: 17,
    fontWeight: "800",
  },
  agendaClientBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  agendaSubMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
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
    marginTop: spacing.xs,
  },
  serviceIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  serviceName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  appointmentMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  durationChip: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  durationChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statusQuickAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    flexBasis: "48%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  statusQuickActionActive: {
    backgroundColor: colors.brandDark,
  },
  statusQuickActionDanger: {
    backgroundColor: "#F8EDEE",
  },
  statusQuickActionText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: "800",
  },
  statusQuickActionTextActive: {
    color: colors.surface,
  },
  statusPrimaryAction: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  statusPrimaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  statusPrimaryActionDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  statusMoreAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 46,
  },
  statusMoreActionDisabled: {
    opacity: 0.42,
  },
  statusCompleteState: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
  },
  statusCompleteText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  moreActionsPanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  moreAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  moreActionText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusAction: {
    alignItems: "center",
    backgroundColor: "rgba(244, 251, 255, 0.72)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0,
    shadowRadius: 0,
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
    borderRadius: 14,
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
    marginBottom: spacing.lg,
  },
  clientCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    padding: spacing.sm,
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
    height: 44,
    justifyContent: "center",
    width: 44,
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
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  clientMeta: {
    color: colors.textMuted,
    fontSize: 13,
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
    marginLeft: 56,
    marginTop: spacing.sm,
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
    color: colors.text,
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
    marginBottom: spacing.lg,
  },
  smartAlert: {
    alignItems: "center",
    borderColor: "rgba(23, 63, 74, 0.06)",
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  smartAlertIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  smartAlertMain: {
    flex: 1,
  },
  smartAlertLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  smartAlertText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  reviewCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(23, 63, 74, 0.06)",
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewIdentity: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  reviewTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  reviewStars: {
    color: "#5FAEC8",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewComment: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  reviewMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  reviewReplyAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  reviewReplyText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  aiCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "rgba(23, 63, 74, 0.06)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  aiIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  aiMain: {
    flex: 1,
  },
  aiTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  aiText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  cancelBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(31, 79, 112, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  cancelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    maxWidth: 520,
    padding: spacing.md,
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
    color: colors.brandInk,
    fontSize: 21,
    fontWeight: "800",
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  cancelInput: {
    backgroundColor: "#F4FBFF",
    borderRadius: 16,
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
    borderRadius: 16,
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
    borderRadius: 16,
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
