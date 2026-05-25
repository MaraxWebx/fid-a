import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {
  deleteCenterMonthlyNoShowReport,
  getCenterBusinessInsights,
  getCenterBusinessReportUrl,
  getCenterNoShowReportUrl,
} from '../lib/api';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import type { BusinessBreakdownItem, BusinessInsightPeriod, BusinessInsights, Center } from '../types/api';

type CenterBusinessInsightsScreenProps = {
  center: Center;
};

type GeneratedReport = 'business' | 'no-show';

const insightsLabels = {
  headerEyebrow: 'Centro estetico',
  headerTitle: 'Andamento Centro',
  headerSubtitle: 'Tieni sotto controllo incassi, agenda e performance del centro.',
  period: {
    today: 'Oggi',
    week: 'Settimana',
    month: 'Mese',
    quarter: 'Trimestre',
    year: 'Anno',
  },
  sections: {
    revenue: 'Riepilogo incassi',
    operations: 'Agenda e occupazione',
    breakdown: 'Analisi incassi',
    treatments: 'Trattamenti piu richiesti',
    staff: 'Performance operatrici',
    suggestions: 'Suggerimenti intelligenti',
    reports: 'Report e download',
  },
  emptyTitle: 'Nessun dato disponibile',
  emptyText: 'Completa piu appuntamenti per visualizzare questo dato.',
} as const;

const periods: BusinessInsightPeriod[] = ['today', 'week', 'month', 'quarter', 'year'];

function formatCurrencyIT(value?: number | null) {
  const amount = Number.isFinite(value ?? 0) ? value ?? 0 : 0;
  return `€ ${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatPercentageIT(value?: number | null) {
  const amount = Number.isFinite(value ?? 0) ? value ?? 0 : 0;
  return `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(amount)}%`;
}

function getPeriodLabel(period: BusinessInsightPeriod) {
  return insightsLabels.period[period];
}

function getDisplayPeriod(insights: BusinessInsights | null, period: BusinessInsightPeriod) {
  return insights?.period.label ?? getPeriodLabel(period);
}

function formatMonthLabel(value?: string) {
  if (!value) return 'mese corrente';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'mese corrente';
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date);
}

function hasAnyBreakdownData(insights: BusinessInsights | null) {
  if (!insights) return false;
  return [
    insights.breakdowns.categories,
    insights.breakdowns.staff,
    insights.breakdowns.weekdays,
    insights.breakdowns.time_slots,
  ].some((items) => items.length > 0);
}

function buildSmartSuggestions(insights: BusinessInsights | null) {
  if (!insights || !hasAnyBreakdownData(insights)) {
    return ['Dati ancora limitati: completa piu appuntamenti per ricevere suggerimenti affidabili.'];
  }

  const suggestions: string[] = [];
  const topSlot = insights.breakdowns.time_slots[0];
  const topCategory = insights.breakdowns.categories[0];
  const weakDay = [...insights.breakdowns.weekdays].sort((left, right) => left.value - right.value)[0];
  const noShows = insights.operations?.no_shows ?? 0;
  const freeSlots = insights.operations?.free_slots ?? 0;

  if (weakDay) suggestions.push(`${weakDay.label} ha piu margine: valuta una promo mirata o una lista richiamo.`);
  if (topSlot) suggestions.push(`La fascia ${topSlot.label} e tra le piu richieste: proteggila per i trattamenti ad alto valore.`);
  if (topCategory) suggestions.push(`${topCategory.label} sta generando piu incasso rispetto alla media del periodo.`);
  if (noShows > 0) suggestions.push(`Ci sono ${noShows} no-show nel periodo: rafforza promemoria e conferme automatiche.`);
  if (freeSlots > 0) suggestions.push(`Hai ${freeSlots} slot liberi stimati: promuovi trattamenti brevi o pacchetti last minute.`);

  return suggestions.slice(0, 4);
}

export function CenterBusinessInsightsScreen({ center }: CenterBusinessInsightsScreenProps) {
  const [period, setPeriod] = useState<BusinessInsightPeriod>('month');
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletePromptOpen, setDeletePromptOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const noShowMonthLabel = formatMonthLabel(insights?.period.start);
  const selectedPeriodLabel = getDisplayPeriod(insights, period);

  const loadInsights = () => {
    setLoading(true);
    setError(null);
    return getCenterBusinessInsights(center.id, period)
      .then((response) => {
        setInsights(response);
      })
      .catch(() => {
        setError('Impossibile caricare i dati di andamento del centro.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getCenterBusinessInsights(center.id, period)
      .then((response) => {
        if (mounted) setInsights(response);
      })
      .catch(() => {
        if (mounted) setError('Impossibile caricare i dati di andamento del centro.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [center.id, period]);

  const revenueCards = useMemo(
    () => [
      {
        description: 'Totale stimato dagli appuntamenti prenotati.',
        icon: 'trending-up-outline',
        label: 'Incasso previsto',
        value: formatCurrencyIT(insights?.kpis.expected_revenue),
      },
      {
        description: 'Totale dagli appuntamenti completati o pagati.',
        icon: 'checkmark-circle-outline',
        label: 'Incasso confermato',
        value: formatCurrencyIT(insights?.kpis.confirmed_revenue),
      },
      {
        description: 'No-show, cancellazioni tardive o slot non recuperati.',
        icon: 'alert-circle-outline',
        label: 'Mancato incasso',
        tone: 'warning' as const,
        value: formatCurrencyIT(insights?.kpis.no_show_losses),
      },
      {
        description: 'Valore medio per appuntamento completato.',
        icon: 'receipt-outline',
        label: 'Ticket medio',
        value: formatCurrencyIT(insights?.kpis.average_ticket),
      },
    ],
    [insights],
  );

  const operationCards = useMemo(
    () => [
      { icon: 'calendar-clear-outline', label: 'Appuntamenti totali', value: String(insights?.operations?.total_appointments ?? 0) },
      { icon: 'time-outline', label: 'Slot liberi', value: String(insights?.operations?.free_slots ?? 0) },
      { icon: 'speedometer-outline', label: 'Tasso di occupazione', value: formatPercentageIT(insights?.operations?.occupancy_rate) },
      { icon: 'close-circle-outline', label: 'Cancellazioni', value: String(insights?.operations?.cancellations ?? 0) },
      { icon: 'alert-outline', label: 'No-show', value: String(insights?.operations?.no_shows ?? 0) },
    ],
    [insights],
  );

  const suggestions = useMemo(() => buildSmartSuggestions(insights), [insights]);

  const openReport = (type: GeneratedReport) => {
    const url =
      type === 'business'
        ? getCenterBusinessReportUrl(center.id, period)
        : getCenterNoShowReportUrl(center.id, period);
    setGeneratedReports((current) => (current.includes(type) ? current : [...current, type]));
    void Linking.openURL(url);
    if (type === 'no-show' && period === 'month' && !insights?.no_show_report.deleted) {
      setDeletePromptOpen(true);
    }
  };

  const deleteMonthlyReport = async () => {
    setDeletingReport(true);
    setError(null);
    try {
      await deleteCenterMonthlyNoShowReport(center.id, 'month');
      setDeletePromptOpen(false);
      await loadInsights();
    } catch {
      setError('Eliminazione del report mancati appuntamenti non riuscita.');
    } finally {
      setDeletingReport(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{insightsLabels.headerEyebrow}</Text>
        <Text style={styles.title}>{insightsLabels.headerTitle}</Text>
        <Text style={styles.subtitle}>{insightsLabels.headerSubtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.periodSwitch} horizontal showsHorizontalScrollIndicator={false}>
        {periods.map((item) => (
          <Pressable
            key={item}
            onPress={() => setPeriod(item)}
            style={[styles.periodItem, period === item ? styles.periodItemActive : null]}
          >
            <Text style={[styles.periodText, period === item ? styles.periodTextActive : null]}>{getPeriodLabel(item)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.brandDark} style={styles.loader} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Section title={insightsLabels.sections.revenue} subtitle={selectedPeriodLabel}>
        <View style={styles.kpiGrid}>
          {revenueCards.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </View>
      </Section>

      <Section title={insightsLabels.sections.operations} subtitle="Agenda, presenze e spazi disponibili.">
        <View style={styles.operationGrid}>
          {operationCards.map((item) => (
            <SmallMetric key={item.label} {...item} />
          ))}
        </View>
      </Section>

      <Section title={insightsLabels.sections.breakdown} subtitle="Dove si concentrano gli incassi del periodo.">
        <BreakdownBlock title="Categorie trattamenti" items={insights?.breakdowns.categories ?? []} />
        <BreakdownBlock title="Operatrici" items={insights?.breakdowns.staff ?? []} />
        <BreakdownBlock title="Giorni della settimana" items={insights?.breakdowns.weekdays ?? []} />
        <BreakdownBlock title="Fasce orarie" items={insights?.breakdowns.time_slots ?? []} />
      </Section>

      <Section title={insightsLabels.sections.treatments}>
        <TreatmentList items={insights?.top_treatments ?? []} />
      </Section>

      <Section title={insightsLabels.sections.staff} subtitle="Vista gestionale, non una classifica.">
        <StaffPerformanceList items={insights?.staff_performance ?? []} />
      </Section>

      <Section title={insightsLabels.sections.suggestions}>
        <View style={styles.insightList}>
          {suggestions.map((item) => (
            <View key={item} style={styles.insightCard}>
              <Ionicons color={colors.brandDark} name="sparkles-outline" size={17} />
              <Text style={styles.insightText}>{item}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={insightsLabels.sections.reports} subtitle="Crea un file da archiviare o condividere.">
        <View style={styles.exportGrid}>
          <ExportCard
            generated={generatedReports.includes('business')}
            label="Report andamento centro"
            text="Incassi, appuntamenti, trattamenti e performance del centro."
            onPress={() => openReport('business')}
          />
          <ExportCard
            disabled={Boolean(insights?.no_show_report.deleted)}
            disabledText="Report mensile gia ripulito"
            generated={generatedReports.includes('no-show')}
            label="Report mancati appuntamenti"
            text="Cancellazioni, no-show e mancato incasso stimato."
            onPress={() => openReport('no-show')}
          />
        </View>
      </Section>

      <Modal
        animationType="slide"
        onRequestClose={() => setDeletePromptOpen(false)}
        transparent
        visible={deletePromptOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmHandle} />
            <Text style={styles.confirmEyebrow}>Report generato</Text>
            <Text style={styles.confirmTitle}>
              Vuoi eliminare in modo permanente i dati del report mancati appuntamenti di {noShowMonthLabel}?
            </Text>
            <Text style={styles.confirmText}>
              L'azione rimuove solo totali ed eventi del report mensile. Le schede cliente restano disponibili.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                disabled={deletingReport}
                onPress={deleteMonthlyReport}
                style={[styles.deleteButton, deletingReport ? styles.disabledAction : null]}
              >
                <Text style={styles.deleteButtonText}>{deletingReport ? 'Eliminazione...' : 'Elimina report'}</Text>
              </Pressable>
              <Pressable onPress={() => setDeletePromptOpen(false)} style={styles.keepButton}>
                <Text style={styles.keepButtonText}>Conserva report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Section({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function MetricCard({
  description,
  icon,
  label,
  tone,
  value,
}: {
  description: string;
  icon: string;
  label: string;
  tone?: 'warning';
  value: string;
}) {
  return (
    <View style={[styles.kpiCard, tone === 'warning' ? styles.kpiWarning : null]}>
      <View style={styles.kpiHeader}>
        <View style={styles.kpiIcon}>
          <Ionicons color={colors.brandInk} name={icon} size={17} />
        </View>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiDescription}>{description}</Text>
    </View>
  );
}

function SmallMetric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.operationCard}>
      <View style={styles.operationIcon}>
        <Ionicons color={colors.brandDark} name={icon} size={16} />
      </View>
      <Text style={styles.operationValue}>{value}</Text>
      <Text style={styles.operationLabel}>{label}</Text>
    </View>
  );
}

function EmptyData({ text = insightsLabels.emptyText, title = insightsLabels.emptyTitle }: { text?: string; title?: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function BreakdownBlock({ items, title }: { items: BusinessBreakdownItem[]; title: string }) {
  return (
    <View style={styles.breakdownBlock}>
      <Text style={styles.breakdownTitle}>{title}</Text>
      {items.length === 0 ? <EmptyData /> : null}
      {items.slice(0, 4).map((item) => (
        <View key={item.label} style={styles.breakdownRow}>
          <View style={styles.breakdownCopy}>
            <Text numberOfLines={1} style={styles.breakdownLabel}>{item.label}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, item.percent))}%` }]} />
            </View>
          </View>
          <View style={styles.breakdownValueWrap}>
            <Text style={styles.breakdownValue}>{formatCurrencyIT(item.value)}</Text>
            <Text style={styles.breakdownPercent}>{formatPercentageIT(item.percent)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TreatmentList({ items }: { items: NonNullable<BusinessInsights['top_treatments']> }) {
  if (items.length === 0) {
    return <EmptyData title="Nessun trattamento completato nel periodo selezionato." text="Gli incassi appariranno dopo i primi appuntamenti completati." />;
  }

  return (
    <View style={styles.listStack}>
      {items.map((item) => (
        <View key={item.label} style={styles.detailRow}>
          <View style={styles.detailMain}>
            <Text style={styles.detailTitle}>{item.label}</Text>
            <Text style={styles.detailMeta}>{item.bookings} prenotazioni - durata media {item.average_duration} min</Text>
          </View>
          <Text style={styles.detailValue}>{formatCurrencyIT(item.revenue)}</Text>
        </View>
      ))}
    </View>
  );
}

function StaffPerformanceList({ items }: { items: NonNullable<BusinessInsights['staff_performance']> }) {
  if (items.length === 0) {
    return <EmptyData title="Nessun dato disponibile" text="Assegna gli appuntamenti alle operatrici per leggere la performance." />;
  }

  return (
    <View style={styles.listStack}>
      {items.map((item) => (
        <View key={item.label} style={styles.staffCard}>
          <View style={styles.staffTop}>
            <Text style={styles.detailTitle}>{item.label}</Text>
            <Text style={styles.detailValue}>{formatCurrencyIT(item.revenue)}</Text>
          </View>
          <View style={styles.staffStats}>
            <InfoPill label={`${item.appointments} appuntamenti`} />
            <InfoPill label={`${formatPercentageIT(item.occupancy_rate)} occupazione`} />
            <InfoPill label={item.average_review ? `${item.average_review.toFixed(1)} recensione media` : 'Recensioni n/d'} />
          </View>
        </View>
      ))}
    </View>
  );
}

function InfoPill({ label }: { label: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

function ExportCard({
  disabled = false,
  disabledText = 'Non disponibile',
  generated,
  label,
  onPress,
  text,
}: {
  disabled?: boolean;
  disabledText?: string;
  generated: boolean;
  label: string;
  onPress: () => void;
  text: string;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.exportCard, disabled ? styles.exportCardDisabled : null]}>
      <View style={styles.exportTop}>
        <View style={styles.exportIcon}>
          <Ionicons color={colors.brandInk} name={generated ? 'cloud-download-outline' : 'document-text-outline'} size={18} />
        </View>
        <Text style={styles.exportTitle}>{label}</Text>
      </View>
      <Text style={styles.exportText}>{text}</Text>
      <Text style={styles.exportAction}>{disabled ? disabledText : generated ? 'Scarica PDF' : 'Genera PDF'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl + 48,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.brandInk,
    fontSize: 29,
    fontWeight: '800',
    lineHeight: 35,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  periodSwitch: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  periodItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: radius.round,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 94,
    paddingHorizontal: spacing.md,
  },
  periodItemActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brandDark,
  },
  periodText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  periodTextActive: {
    color: colors.brandInk,
  },
  loader: {
    marginBottom: spacing.md,
  },
  errorText: {
    backgroundColor: colors.roseSoft,
    borderRadius: radius.lg,
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  kpiGrid: {
    gap: spacing.sm,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.soft,
  },
  kpiWarning: {
    backgroundColor: '#FFF8EC',
  },
  kpiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  kpiLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  kpiValue: {
    color: colors.brandInk,
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 33,
    marginTop: spacing.sm,
  },
  kpiDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  operationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  operationCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexBasis: '47.5%',
    minHeight: 104,
    padding: spacing.md,
  },
  operationIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.round,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  operationValue: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  operationLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
  breakdownBlock: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  breakdownTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '800',
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  breakdownCopy: {
    flex: 1,
  },
  breakdownLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    height: 6,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.round,
    height: 6,
  },
  breakdownValueWrap: {
    alignItems: 'flex-end',
    minWidth: 86,
  },
  breakdownValue: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownPercent: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  emptyTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  listStack: {
    gap: spacing.sm,
  },
  detailRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailMain: {
    flex: 1,
  },
  detailTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '800',
  },
  detailMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  detailValue: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '800',
  },
  staffCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  staffTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  staffStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  infoPill: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  infoPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  insightList: {
    gap: spacing.xs,
  },
  insightCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  insightText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  exportGrid: {
    gap: spacing.sm,
  },
  exportCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  exportCardDisabled: {
    opacity: 0.58,
  },
  exportTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  exportIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.round,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  exportTitle: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  exportText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  exportAction: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(23, 63, 74, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  confirmHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.round,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  confirmEyebrow: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  confirmTitle: {
    color: colors.brandInk,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: spacing.xs,
  },
  confirmText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  confirmActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.roseSoft,
    borderColor: 'rgba(190,106,116,0.16)',
    borderRadius: radius.round,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  keepButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    justifyContent: 'center',
    minHeight: 50,
  },
  keepButtonText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.58,
  },
});
