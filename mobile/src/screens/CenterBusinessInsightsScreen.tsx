import { useEffect, useMemo, useState } from 'react';
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

const periods: Array<{ key: BusinessInsightPeriod; label: string }> = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
];

function formatMoney(value: number) {
  return `EUR ${Math.round(value).toLocaleString('it-IT')}`;
}

function formatMonthLabel(value?: string) {
  if (!value) return 'this month';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'this month';
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function CenterBusinessInsightsScreen({ center }: CenterBusinessInsightsScreenProps) {
  const [period, setPeriod] = useState<BusinessInsightPeriod>('month');
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletePromptOpen, setDeletePromptOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const noShowMonthLabel = formatMonthLabel(insights?.period.start);

  const loadInsights = () => {
    setLoading(true);
    setError(null);
    return getCenterBusinessInsights(center.id, period)
      .then((response) => {
        setInsights(response);
      })
      .catch(() => {
        setError('Impossibile caricare i business insights.');
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
        if (mounted) setError('Impossibile caricare i business insights.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [center.id, period]);

  const kpis = useMemo(
    () => [
      {
        icon: 'trending-up-outline',
        label: 'Expected Revenue',
        value: formatMoney(insights?.kpis.expected_revenue ?? 0),
      },
      {
        icon: 'checkmark-circle-outline',
        label: 'Confirmed Revenue',
        value: formatMoney(insights?.kpis.confirmed_revenue ?? 0),
      },
      {
        icon: 'alert-circle-outline',
        label: 'No-show Losses',
        tone: 'warning' as const,
        value: formatMoney(insights?.kpis.no_show_losses ?? 0),
      },
    ],
    [insights],
  );

  const openReport = (type: 'business' | 'no-show') => {
    const url =
      type === 'business'
        ? getCenterBusinessReportUrl(center.id, period)
        : getCenterNoShowReportUrl(center.id, period);
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
      setError('Cancellazione report no-show non riuscita.');
    } finally {
      setDeletingReport(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Business</Text>
        <Text style={styles.title}>Business Insights</Text>
        <Text style={styles.subtitle}>Revenue, losses and operational decisions in one calm view.</Text>
      </View>

      <View style={styles.periodSwitch}>
        {periods.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setPeriod(item.key)}
            style={[styles.periodItem, period === item.key ? styles.periodItemActive : null]}
          >
            <Text style={[styles.periodText, period === item.key ? styles.periodTextActive : null]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={colors.brandDark} style={styles.loader} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <Text style={styles.sectionSubtitle}>{insights?.period.label ?? ''}</Text>
      </View>
      <View style={styles.kpiGrid}>
        {kpis.map((item) => (
          <View key={item.label} style={[styles.kpiCard, item.tone === 'warning' ? styles.kpiWarning : null]}>
            <View style={styles.kpiHeader}>
              <View style={styles.kpiIcon}>
                <Ionicons color={colors.brandInk} name={item.icon} size={17} />
              </View>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
            <Text style={styles.kpiValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <Section title="Revenue Breakdown" subtitle={insights?.period.label ?? ''}>
        <BreakdownBlock title="Treatment category" items={insights?.breakdowns.categories ?? []} />
        <BreakdownBlock title="Staff member" items={insights?.breakdowns.staff ?? []} />
        <BreakdownBlock title="Weekday" items={insights?.breakdowns.weekdays ?? []} />
        <BreakdownBlock title="Time slot" items={insights?.breakdowns.time_slots ?? []} />
      </Section>

      <Section title="Smart Insights">
        <View style={styles.insightList}>
          {(insights?.insights ?? []).map((item) => (
            <View key={item} style={styles.insightCard}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{item}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Export Reports" subtitle="Select period, generate PDF, then download or share.">
        <View style={styles.exportGrid}>
          <ExportCard
            label="Business Report"
            text="Revenue, breakdowns and operational insights."
            onPress={() => openReport('business')}
          />
          <ExportCard
            label="No-show Report"
            text="Estimated losses, clients, slots and services affected."
            disabled={period !== 'month' || Boolean(insights?.no_show_report.deleted)}
            disabledText={period !== 'month' ? 'Select Month to export' : 'Monthly report cleaned'}
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
            <Text style={styles.confirmEyebrow}>Report exported successfully</Text>
            <Text style={styles.confirmTitle}>
              Do you want to permanently delete {noShowMonthLabel} no-show report data?
            </Text>
            <Text style={styles.confirmText}>
              This removes only the monthly no-show report totals and event list. Customer profiles and reliability intelligence stay available.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                disabled={deletingReport}
                onPress={deleteMonthlyReport}
                style={[styles.deleteButton, deletingReport ? styles.disabledAction : null]}
              >
                <Text style={styles.deleteButtonText}>{deletingReport ? 'Deleting...' : 'Delete Report'}</Text>
              </Pressable>
              <Pressable onPress={() => setDeletePromptOpen(false)} style={styles.keepButton}>
                <Text style={styles.keepButtonText}>Keep Report</Text>
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
  children: React.ReactNode;
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

function BreakdownBlock({ items, title }: { items: BusinessBreakdownItem[]; title: string }) {
  return (
    <View style={styles.breakdownBlock}>
      <Text style={styles.breakdownTitle}>{title}</Text>
      {items.length === 0 ? <Text style={styles.emptyText}>No data yet.</Text> : null}
      {items.slice(0, 4).map((item) => (
        <View key={item.label} style={styles.breakdownRow}>
          <View style={styles.breakdownCopy}>
            <Text numberOfLines={1} style={styles.breakdownLabel}>{item.label}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.percent}%` }]} />
            </View>
          </View>
          <Text style={styles.breakdownValue}>{formatMoney(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function ExportCard({
  disabled = false,
  disabledText = 'Unavailable',
  label,
  onPress,
  text,
}: {
  disabled?: boolean;
  disabledText?: string;
  label: string;
  onPress: () => void;
  text: string;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.exportCard, disabled ? styles.exportCardDisabled : null]}>
      <View style={styles.exportTop}>
        <Text style={styles.exportTitle}>{label}</Text>
        <Ionicons color={colors.brandInk} name="download-outline" size={19} />
      </View>
      <Text style={styles.exportText}>{text}</Text>
      <Text style={styles.exportAction}>{disabled ? disabledText : 'Generate PDF / Download'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
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
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  periodSwitch: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.xs,
  },
  periodItem: {
    alignItems: 'center',
    borderRadius: radius.round,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  periodItemActive: {
    backgroundColor: colors.surfaceSky,
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
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  kpiGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 116,
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
    fontSize: 14,
    fontWeight: '700',
  },
  kpiValue: {
    color: colors.brandInk,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginTop: spacing.md,
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
    marginTop: 2,
  },
  breakdownBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
  breakdownValue: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  insightList: {
    gap: spacing.xs,
  },
  insightCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  insightDot: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.round,
    height: 8,
    marginTop: 5,
    width: 8,
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
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  exportCardDisabled: {
    opacity: 0.58,
  },
  exportTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportTitle: {
    color: colors.brandInk,
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
