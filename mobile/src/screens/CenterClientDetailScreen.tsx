import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

import { getCenterClientDetail } from "../lib/api";
import {
  AppointmentStatus,
  getAppointmentStatusMeta,
  isAppointmentActive,
  normalizeAppointmentState,
} from "../lib/appointmentStatus";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import type { Booking, Center, CenterClientDetail, Review } from "../types/api";

type CenterClientDetailScreenProps = {
  center: Center;
  clientId: string | null;
  onBack: () => void;
};

type TimelineEvent = {
  id: string;
  color: string;
  date: string;
  icon: string;
  kicker: string;
  title: string;
  body: string;
};

const actionItems = [
  { icon: "calendar-outline", label: "Nuovo appuntamento" },
  { icon: "logo-whatsapp", label: "WhatsApp" },
  { icon: "call-outline", label: "Chiama cliente" },
  { icon: "create-outline", label: "Aggiungi nota" },
  { icon: "gift-outline", label: "Invia promo" },
  { icon: "camera-outline", label: "Carica foto" },
];

const preferenceTags = [
  "Effetto naturale",
  "Toni freddi luminosi",
  "Pelle sensibile",
  "Non ama intensita eccessiva",
  "Routine delicata",
  "Finish duraturo",
];

const reviewKeywords = ["naturale", "delicato", "preciso", "duraturo", "rilassante"];

export function CenterClientDetailScreen({
  center,
  clientId,
  onBack,
}: CenterClientDetailScreenProps) {
  const [detail, setDetail] = useState<CenterClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(fade, {
      duration: 420,
      toValue: loading ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [fade, loading]);

  const client = detail?.client ?? null;
  const bookings = detail?.bookings ?? [];
  const reviews = detail?.reviews ?? [];
  const stats = detail?.stats ?? null;

  const intelligence = useMemo(
    () => buildClientIntelligence(bookings, reviews, stats),
    [bookings, reviews, stats],
  );
  const timelineEvents = useMemo(() => buildTimeline(bookings, reviews), [bookings, reviews]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons color={colors.brandDark} name="chevron-back" size={19} />
          <Text style={styles.backLabel}>Clienti</Text>
        </Pressable>
        <View style={styles.centerPill}>
          <Ionicons color={colors.brandDark} name="sparkles-outline" size={14} />
          <Text style={styles.centerPillText}>{center.name}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={colors.brandDark} />
          <Text style={styles.loadingText}>Creo il profilo beauty premium...</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View style={{ opacity: fade }}>
        <LinearGradient
          colors={["#FFFFFF", "#ECFAFF", "#DDF3FA"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View style={styles.photoFrame}>
              <LinearGradient
                colors={["#BEEBFA", "#8FCFE3", "#FFFFFF"]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials(client?.name ?? "Cliente")}</Text>
              </LinearGradient>
            </View>
            <View style={styles.heroIdentity}>
              <View style={styles.badgeRow}>
                <Badge label={intelligence.statusLabel} tone="gold" />
                <Badge label={intelligence.aiLabel} tone="sky" />
              </View>
              <Text numberOfLines={2} style={styles.heroName}>
                {client?.name ?? "Cliente"}
              </Text>
              <Text style={styles.heroMeta}>{client?.phone ?? "Telefono non disponibile"}</Text>
              <Text style={styles.heroMeta}>{client?.email ?? "Email non disponibile"}</Text>
            </View>
          </View>

          <View style={styles.beautyScorePanel}>
            <View>
              <Text style={styles.scoreEyebrow}>Beauty Score</Text>
              <Text style={styles.scoreValue}>{intelligence.beautyScore}</Text>
            </View>
            <View style={styles.scoreCopy}>
              <Text style={styles.scoreTitle}>{intelligence.scoreTitle}</Text>
              <Text style={styles.scoreText}>{intelligence.scoreText}</Text>
            </View>
          </View>

          <View style={styles.heroMetricGrid}>
            <HeroMetric label="Loyalty" value={intelligence.loyaltyLevel} />
            <HeroMetric label="Ultima visita" value={intelligence.lastVisit} />
            <HeroMetric label="Prossima" value={intelligence.nextBooking} />
            <HeroMetric label="Lifetime" value={formatCurrency(intelligence.totalSpent)} />
            <HeroMetric label="Affidabilita" value={`${intelligence.reliability}%`} />
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          {actionItems.map((item) => (
            <Pressable key={item.label} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <Ionicons color={colors.brandDark} name={item.icon} size={21} />
              <Text style={styles.actionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <AiAssistant intelligence={intelligence} stats={stats} />

        <SectionTitle
          eyebrow="Beauty journey"
          title="La relazione, raccontata in modo visuale"
        />
        <View style={styles.timeline}>
          {timelineEvents.map((event, index) => (
            <TimelineCard event={event} isLast={index === timelineEvents.length - 1} key={event.id} />
          ))}
        </View>

        <SectionTitle eyebrow="Analytics smart" title="Segnali chiari per lavorare piu veloce" />
        <View style={styles.analyticsGrid}>
          <AnalyticsTile
            icon="repeat-outline"
            label="Frequenza visite"
            progress={intelligence.visitFrequency}
            value={`${intelligence.visitFrequency}%`}
          />
          <AnalyticsTile
            icon="card-outline"
            label="Ticket medio"
            progress={Math.min(100, intelligence.averageTicket)}
            value={formatCurrency(intelligence.averageTicket)}
          />
          <AnalyticsTile
            icon="heart-outline"
            label="Trattamento preferito"
            progress={72}
            value={stats?.summary.top_treatment ?? "In analisi"}
          />
          <AnalyticsTile
            icon="time-outline"
            label="Fascia preferita"
            progress={64}
            value={stats?.summary.top_time_slot ?? "Da scoprire"}
          />
          <AnalyticsTile
            icon="close-circle-outline"
            label="Tasso cancellazioni"
            progress={intelligence.cancellationRate}
            value={`${intelligence.cancellationRate}%`}
          />
          <AnalyticsTile
            icon="leaf-outline"
            label="Retention"
            progress={intelligence.retention}
            value={`${intelligence.retention}%`}
          />
        </View>

        <View style={styles.aiForecastCard}>
          <ForecastPill icon="calendar-clear-outline" label="Ritorno previsto" value={intelligence.returnForecast} />
          <ForecastPill icon="alert-circle-outline" label="Assenza" value={intelligence.absenceSignal} />
          <ForecastPill icon="color-wand-outline" label="Probabilita refill" value={`${intelligence.refillProbability}%`} />
        </View>

        <SectionTitle eyebrow="Beauty preferences" title="Scheda personale e note staff" />
        <View style={styles.preferenceCard}>
          <View style={styles.preferenceTags}>
            {preferenceTags.map((tag) => (
              <View key={tag} style={styles.preferenceTag}>
                <Text style={styles.preferenceTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={styles.preferenceRows}>
            <PreferenceRow label="Allergie" value="Da verificare prima del trattamento" />
            <PreferenceRow label="Sensibilita pelle" value="Preferire prodotti lenitivi e posa breve" />
            <PreferenceRow label="Prodotti acquistati" value="Siero idratante, SPF viso, olio cuticole" />
            <PreferenceRow label="Nota staff" value="Preferisce un risultato naturale e sopracciglia non troppo intense." />
          </View>
        </View>

        <SectionTitle eyebrow="Prima / dopo" title="Gallery trattamento premium" />
        <View style={styles.galleryCard}>
          <View style={styles.comparison}>
            <LinearGradient colors={["#EAF9FE", "#BFEAF8"]} style={styles.beforePane}>
              <Text style={styles.photoLabel}>Prima</Text>
            </LinearGradient>
            <LinearGradient colors={["#FFFFFF", "#C8F1FC"]} style={styles.afterPane}>
              <Text style={styles.photoLabel}>Dopo</Text>
            </LinearGradient>
            <View style={styles.sliderHandle}>
              <Ionicons color={colors.brandDark} name="swap-horizontal-outline" size={18} />
            </View>
          </View>
          <View style={styles.photoTimeline}>
            {["Laminazione", "Nails", "Skin glow"].map((item, index) => (
              <View key={item} style={styles.photoThumb}>
                <Text style={styles.photoThumbDate}>{index + 12} Mag</Text>
                <Text style={styles.photoThumbTitle}>{item}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.uploadButton}>
            <Ionicons color={colors.surface} name="camera-outline" size={18} />
            <Text style={styles.uploadButtonText}>Carica nuova foto</Text>
          </Pressable>
        </View>

        <SectionTitle eyebrow="Recensioni & sentiment" title="Soddisfazione e parole ricorrenti" />
        <View style={styles.sentimentCard}>
          <View style={styles.sentimentHeader}>
            <Text style={styles.sentimentScore}>{intelligence.averageRating.toFixed(1)}</Text>
            <View style={styles.sentimentCopy}>
              <Text style={styles.sentimentTitle}>Mood cliente {intelligence.mood}</Text>
              <Text style={styles.sentimentText}>Soddisfazione generale alta, tono positivo e orientato al risultato naturale.</Text>
            </View>
          </View>
          <View style={styles.keywordRow}>
            {reviewKeywords.map((keyword) => (
              <View key={keyword} style={styles.keywordTag}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </View>
            ))}
          </View>
          <View style={styles.reviewList}>
            {reviews.slice(0, 2).map((review) => (
              <View key={review.id} style={styles.reviewMini}>
                <Text style={styles.reviewRating}>{review.rating}/5</Text>
                <Text numberOfLines={3} style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionTitle eyebrow="Alert intelligenti" title="Promemoria eleganti, senza rumore" />
        <View style={styles.alertGrid}>
          <AlertCard icon="balloon-outline" title="Compleanno vicino" text="Prepara una promo soft dedicata." tone="rose" />
          <AlertCard icon="sparkles-outline" title="Refill consigliato" text={intelligence.refillCopy} tone="sky" />
          <AlertCard icon="hourglass-outline" title="Pacchetto in scadenza" text="Verifica eventuali crediti residui." tone="sand" />
          <AlertCard icon="shield-checkmark-outline" title="VIP inattiva" text={intelligence.vipAlert} tone="blue" />
        </View>

        <SectionTitle eyebrow="Fidelity & loyalty" title="Percorso motivazionale cliente" />
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <View>
              <Text style={styles.loyaltyLevel}>{intelligence.loyaltyLevel}</Text>
              <Text style={styles.loyaltyMeta}>{intelligence.points} punti accumulati</Text>
            </View>
            <Badge label="Cashback attivo" tone="sky" />
          </View>
          <ProgressBar progress={intelligence.loyaltyProgress} />
          <View style={styles.rewardRow}>
            {["Gloss viso", "Upgrade mani", "Skin check"].map((reward) => (
              <View key={reward} style={styles.rewardBadge}>
                <Ionicons color={colors.brandDark} name="diamond-outline" size={16} />
                <Text style={styles.rewardText}>{reward}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function buildClientIntelligence(
  bookings: Booking[],
  reviews: Review[],
  stats: CenterClientDetail["stats"] | null,
) {
  const totalBookings = bookings.length;
  const normalizedStatuses = bookings.map((booking) => normalizeAppointmentState(booking.status, booking.is_delayed));
  const completedBookings = normalizedStatuses.filter(
    (state) => state.status === AppointmentStatus.COMPLETED || state.status === AppointmentStatus.ARRIVED,
  ).length;
  const cancellations = normalizedStatuses.filter(
    (state) => state.status === AppointmentStatus.CANCELLED,
  ).length;
  const totalSpent = bookings.reduce((sum, booking) => sum + (booking.price ?? 0), 0);
  const averageTicket = totalBookings > 0 ? Math.round(totalSpent / totalBookings) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancellations / totalBookings) * 100) : 0;
  const reliability = clamp(100 - cancellationRate * 2, 42, 99);
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 4.8;
  const beautyScore = clamp(
    Math.round(42 + completedBookings * 8 + averageRating * 7 + Math.min(totalSpent / 12, 25) - cancellationRate),
    58,
    98,
  );
  const statusLabel =
    totalSpent > 450 || completedBookings >= 6 ? "VIP" : completedBookings <= 1 ? "Nuova cliente" : "Fidelizzata";
  const aiLabel =
    cancellationRate > 22 ? "Cliente a rischio abbandono" : beautyScore > 84 ? "Cliente Gold" : "Cliente in crescita";
  const retention = clamp(beautyScore - cancellationRate, 44, 96);
  const visitFrequency = clamp(completedBookings * 14, 28, 94);
  const refillProbability = clamp(46 + completedBookings * 7 - cancellationRate, 35, 92);
  const points = Math.max(120, Math.round(totalSpent * 1.4 + completedBookings * 35));

  return {
    absenceSignal: totalBookings > 0 ? "Monitorare entro 21 giorni" : "Nessun segnale storico",
    aiLabel,
    averageRating,
    averageTicket,
    beautyScore,
    cancellationRate,
    lastVisit: bookings[0]?.date_label ?? "Non disponibile",
    loyaltyLevel: beautyScore > 84 ? "Gold Ritual" : beautyScore > 72 ? "Silver Glow" : "New Glow",
    loyaltyProgress: clamp(points / 10, 24, 96),
    mood: averageRating >= 4.7 ? "sereno" : "da curare",
    nextBooking:
      bookings.find((booking) => isAppointmentActive(normalizeAppointmentState(booking.status, booking.is_delayed).status))
        ?.date_label ?? "Da pianificare",
    points,
    refillCopy: stats?.summary.top_treatment
      ? `Suggerisci refill ${stats.summary.top_treatment}.`
      : "Proponi un check beauty personalizzato.",
    refillProbability,
    reliability,
    retention,
    returnForecast: completedBookings > 2 ? "Tra 18-24 giorni" : "Dopo primo follow-up",
    scoreText: "Profilo ad alto potenziale: cura la continuita con promemoria gentili e proposte mirate.",
    scoreTitle: beautyScore > 84 ? "Relazione molto forte" : "Crescita promettente",
    statusLabel,
    totalSpent,
    vipAlert: statusLabel === "VIP" ? "Ricontatto consigliato entro la settimana." : "Da far crescere con un rituale dedicato.",
    visitFrequency,
  };
}

function buildTimeline(bookings: Booking[], reviews: Review[]): TimelineEvent[] {
  const bookingEvents = bookings.slice(0, 5).map((booking) => {
    const state = normalizeAppointmentState(booking.status, booking.is_delayed);
    const meta = getAppointmentStatusMeta(state);
    return {
      body: `${booking.time_label ?? ""} - ${meta.label}`,
      color: meta.text,
      date: booking.date_label ?? "Data non disponibile",
      icon: meta.icon,
      id: `booking-${booking.id}`,
      kicker:
        state.status === AppointmentStatus.CANCELLED
          ? "Appuntamento annullato"
          : state.status === AppointmentStatus.NO_SHOW
            ? "No-show"
            : "Trattamento",
      title: booking.service_name,
    };
  });

  const reviewEvents = reviews.slice(0, 2).map((review) => ({
    body: review.comment,
    color: colors.success,
    date: review.created_at?.slice(0, 10) ?? "Recente",
    icon: "chatbubble-ellipses-outline",
    id: `review-${review.id}`,
    kicker: "Recensione lasciata",
    title: `${review.rating}/5 su ${review.service_name ?? "trattamento"}`,
  }));

  const fallbackEvents = [
    {
      body: "Preferenze aggiornate dallo staff dopo l'ultima seduta.",
      color: colors.warning,
      date: "Oggi",
      icon: "create-outline",
      id: "staff-note",
      kicker: "Nota staff",
      title: "Risultato naturale, finish delicato",
    },
    {
      body: "Promozione skincare personalizzata disponibile per il prossimo ritorno.",
      color: colors.brandDark,
      date: "Prossimo step",
      icon: "gift-outline",
      id: "promo",
      kicker: "Promo suggerita",
      title: "Rituale glow personalizzato",
    },
  ];

  return [...bookingEvents, ...reviewEvents, ...fallbackEvents].slice(0, 8);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function Badge({ label, tone }: { label: string; tone: "gold" | "sky" }) {
  return (
    <View style={[styles.badge, tone === "gold" ? styles.badgeGold : styles.badgeSky]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMetric}>
      <Text numberOfLines={1} style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function AiAssistant({
  intelligence,
  stats,
}: {
  intelligence: ReturnType<typeof buildClientIntelligence>;
  stats: CenterClientDetail["stats"] | null;
}) {
  const suggestions = [
    `Refill consigliato: ${stats?.summary.top_treatment ?? "rituale glow viso"}.`,
    `Upsell soft: aggiungi skincare post trattamento con follow-up WhatsApp.`,
    `Promo personalizzata: premio ${intelligence.loyaltyLevel} con cashback leggero.`,
  ];

  return (
    <LinearGradient colors={["#EAF9FE", "#FFFFFF"]} style={styles.aiBox}>
      <View style={styles.aiIcon}>
        <Ionicons color={colors.brandDark} name="sparkles-outline" size={20} />
      </View>
      <View style={styles.aiContent}>
        <Text style={styles.aiTitle}>AI Beauty Assistant</Text>
        {suggestions.map((suggestion) => (
          <Text key={suggestion} style={styles.aiSuggestion}>{suggestion}</Text>
        ))}
      </View>
    </LinearGradient>
  );
}

function TimelineCard({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: event.color }]}>
          <Ionicons color={colors.surface} name={event.icon} size={14} />
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineCard}>
        <Text style={styles.timelineDate}>{event.date}</Text>
        <Text style={styles.timelineKicker}>{event.kicker}</Text>
        <Text style={styles.timelineTitle}>{event.title}</Text>
        <Text numberOfLines={3} style={styles.timelineBody}>{event.body}</Text>
      </View>
    </View>
  );
}

function AnalyticsTile({
  icon,
  label,
  progress,
  value,
}: {
  icon: string;
  label: string;
  progress: number;
  value: string;
}) {
  return (
    <View style={styles.analyticsTile}>
      <View style={styles.analyticsIcon}>
        <Ionicons color={colors.brandDark} name={icon} size={18} />
      </View>
      <Text numberOfLines={2} style={styles.analyticsValue}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
      <ProgressBar progress={progress} />
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamp(progress, 0, 100)}%` }]} />
    </View>
  );
}

function ForecastPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.forecastPill}>
      <Ionicons color={colors.brandDark} name={icon} size={18} />
      <View style={styles.forecastText}>
        <Text style={styles.forecastLabel}>{label}</Text>
        <Text style={styles.forecastValue}>{value}</Text>
      </View>
    </View>
  );
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Text style={styles.preferenceValue}>{value}</Text>
    </View>
  );
}

function AlertCard({
  icon,
  text,
  title,
  tone,
}: {
  icon: string;
  text: string;
  title: string;
  tone: "rose" | "sky" | "sand" | "blue";
}) {
  return (
    <View style={[styles.alertCard, styles[`alert_${tone}`]]}>
      <Ionicons color={colors.brandInk} name={icon} size={19} />
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  backLabel: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
  },
  centerPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    maxWidth: "58%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  centerPillText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  hero: {
    borderRadius: 22,
    overflow: "hidden",
    padding: spacing.md,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  heroGlow: {
    backgroundColor: "rgba(143,207,227,0.22)",
    borderRadius: 999,
    height: 180,
    position: "absolute",
    right: -62,
    top: -68,
    width: 180,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  photoFrame: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 22,
    padding: 6,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: colors.brandInk,
    fontSize: 26,
    fontWeight: "800",
  },
  heroIdentity: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.xs,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeGold: {
    backgroundColor: "rgba(246,217,141,0.42)",
  },
  badgeSky: {
    backgroundColor: "rgba(143,207,227,0.26)",
  },
  badgeText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: "800",
  },
  heroName: {
    ...textStyles.displayTitle,
    fontSize: 29,
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  beautyScorePanel: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  scoreEyebrow: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  scoreValue: {
    color: colors.brandInk,
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
  },
  scoreCopy: {
    flex: 1,
  },
  scoreTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  scoreText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  heroMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroMetric: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 18,
    minWidth: "30%",
    padding: spacing.sm,
  },
  heroMetricValue: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  heroMetricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 7,
    minHeight: 68,
    justifyContent: "center",
    padding: spacing.sm,
    shadowColor: colors.brandDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  actionLabel: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  aiBox: {
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  aiIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  aiContent: {
    flex: 1,
    gap: 7,
  },
  aiTitle: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
  aiSuggestion: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionEyebrow: {
    ...textStyles.eyebrow,
  },
  sectionTitle: {
    ...textStyles.sectionTitle,
    marginTop: spacing.xs,
  },
  timeline: {
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timelineRail: {
    alignItems: "center",
    width: 34,
  },
  timelineDot: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  timelineLine: {
    backgroundColor: colors.border,
    flex: 1,
    marginTop: 6,
    width: 2,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    flex: 1,
    padding: spacing.md,
  },
  timelineDate: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
  },
  timelineKicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
    textTransform: "uppercase",
  },
  timelineTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  timelineBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  analyticsTile: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 124,
    padding: spacing.md,
  },
  analyticsIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 36,
  },
  analyticsValue: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
    minHeight: 44,
  },
  analyticsLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  progressTrack: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.brandDark,
    borderRadius: 999,
    height: "100%",
  },
  aiForecastCard: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderRadius: 22,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  forecastPill: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  forecastText: {
    flex: 1,
  },
  forecastLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  forecastValue: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  preferenceCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
  },
  preferenceTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  preferenceTag: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  preferenceTagText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  preferenceRows: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  preferenceRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  preferenceLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  preferenceValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  galleryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
  },
  comparison: {
    borderRadius: 22,
    flexDirection: "row",
    height: 210,
    overflow: "hidden",
  },
  beforePane: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  afterPane: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  photoLabel: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  sliderHandle: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    left: "50%",
    marginLeft: -18,
    position: "absolute",
    width: 36,
  },
  photoTimeline: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoThumb: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flex: 1,
    minHeight: 72,
    padding: spacing.sm,
  },
  photoThumbDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  photoThumbTitle: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.md,
    padding: spacing.md,
  },
  uploadButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  sentimentCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
  },
  sentimentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  sentimentScore: {
    color: colors.brandInk,
    fontSize: 42,
    fontWeight: "800",
  },
  sentimentCopy: {
    flex: 1,
  },
  sentimentTitle: {
    color: colors.brandInk,
    fontSize: 17,
    fontWeight: "800",
  },
  sentimentText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  keywordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  keywordTag: {
    backgroundColor: colors.roseSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  keywordText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  reviewList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reviewMini: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: spacing.md,
  },
  reviewRating: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
  },
  reviewComment: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  alertGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  alertCard: {
    borderRadius: 18,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 132,
    padding: spacing.md,
  },
  alert_rose: {
    backgroundColor: colors.roseSoft,
  },
  alert_sky: {
    backgroundColor: colors.surfaceSky,
  },
  alert_sand: {
    backgroundColor: colors.surfaceSand,
  },
  alert_blue: {
    backgroundColor: colors.surfaceSoft,
  },
  alertTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  alertText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  loyaltyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
  },
  loyaltyHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  loyaltyLevel: {
    color: colors.brandInk,
    fontSize: 24,
    fontWeight: "800",
  },
  loyaltyMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  rewardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rewardBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  rewardText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
});
