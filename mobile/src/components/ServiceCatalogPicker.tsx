import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ColorValue,
  type DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { textStyles } from '../theme/typography';
import { PrimaryButton } from './PrimaryButton';
import type { TreatmentCatalogSection } from '../data/treatmentCatalog';

type ConfiguredService = {
  category: string;
  duration: number | null;
  name: string;
  price: number | null;
};

type ServiceCatalogPickerProps = {
  catalog: TreatmentCatalogSection[];
  configuredServices: ConfiguredService[];
  isBusy?: boolean;
  onSaveTreatment: (
    category: string,
    treatment: string,
    price: number | null,
    duration: number | null,
  ) => Promise<void> | void;
};

type ModalStep = 'list' | 'config';

const categoryLooks: Array<{
  accent: string;
  gradient: readonly [ColorValue, ColorValue, ...ColorValue[]];
  insightIcon: string;
}> = [
  {
    gradient: ['#FFF8EC', '#F7EEF3'],
    accent: colors.rose,
    insightIcon: 'trending-up-outline',
  },
  {
    gradient: ['#F6FBF8', '#EEF7FA'],
    accent: colors.success,
    insightIcon: 'star-outline',
  },
  {
    gradient: ['#F7EEF3', '#FFFFFF'],
    accent: colors.brandDark,
    insightIcon: 'sparkles-outline',
  },
  {
    gradient: ['#FFF7DE', '#FFFFFF'],
    accent: colors.warning,
    insightIcon: 'diamond-outline',
  },
];

export function ServiceCatalogPicker({
  catalog,
  configuredServices,
  isBusy = false,
  onSaveTreatment,
}: ServiceCatalogPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>('list');
  const [priceInput, setPriceInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState(() =>
    catalog.map((section) => section.category),
  );

  const configuredMap = useMemo(
    () => new Map(configuredServices.map((item) => [item.name, item])),
    [configuredServices],
  );
  const orderedCatalog = useMemo(() => {
    const byCategory = new Map(catalog.map((section) => [section.category, section]));
    const ordered = categoryOrder
      .map((category) => byCategory.get(category))
      .filter((section): section is TreatmentCatalogSection => Boolean(section));
    const newSections = catalog.filter((section) => !categoryOrder.includes(section.category));

    return [...ordered, ...newSections];
  }, [catalog, categoryOrder]);
  const activeSection =
    catalog.find((section) => section.category === selectedCategory) ?? null;

  useEffect(() => {
    setCategoryOrder((current) => {
      const available = new Set(catalog.map((section) => section.category));
      const retained = current.filter((category) => available.has(category));
      const added = catalog
        .map((section) => section.category)
        .filter((category) => !retained.includes(category));

      return [...retained, ...added];
    });
  }, [catalog]);

  const categoryInsights = useMemo(() => {
    const stats = catalog.map((section) => {
      const configured = section.treatments
        .map((name) => configuredMap.get(name))
        .filter((service): service is ConfiguredService => Boolean(service));
      const prices = configured
        .map((service) => service.price)
        .filter((price): price is number => typeof price === 'number');
      const averagePrice =
        prices.length > 0
          ? Math.round(prices.reduce((total, price) => total + price, 0) / prices.length)
          : null;

      return {
        averagePrice,
        category: section.category,
        configuredCount: configured.length,
        startingPrice: prices.length > 0 ? Math.min(...prices) : null,
        totalTreatments: section.treatments.length,
      };
    });
    const mostConfigured = [...stats].sort((a, b) => b.configuredCount - a.configuredCount)[0];
    const highestRevenue = [...stats]
      .filter((item) => item.averagePrice !== null)
      .sort((a, b) => (b.averagePrice ?? 0) - (a.averagePrice ?? 0))[0];

    return new Map(
      stats.map((item) => {
        const completion = item.totalTreatments > 0 ? item.configuredCount / item.totalTreatments : 0;
        let label = 'Hidden online';
        let tone: 'success' | 'warning' | 'neutral' | 'rose' = 'neutral';

        if (item.configuredCount === 0) {
          label = 'Hidden online';
          tone = 'neutral';
        } else if (completion < 0.5) {
          label = 'Incomplete setup';
          tone = 'warning';
        } else if (highestRevenue?.category === item.category) {
          label = 'High revenue';
          tone = 'rose';
        } else if (mostConfigured?.category === item.category) {
          label = 'Most booked';
          tone = 'success';
        } else {
          label = 'Online ready';
          tone = 'success';
        }

        return [
          item.category,
          {
            ...item,
            completion,
            label,
            tone,
          },
        ];
      }),
    );
  }, [catalog, configuredMap]);

  const moveCategory = (category: string, direction: -1 | 1) => {
    setCategoryOrder((current) => {
      const index = current.indexOf(category);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const openCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedTreatment(null);
    setModalStep('list');
    setPriceInput('');
    setDurationInput('');
    setError(null);
  };

  const closeModal = () => {
    setSelectedCategory(null);
    setSelectedTreatment(null);
    setModalStep('list');
    setPriceInput('');
    setDurationInput('');
    setError(null);
  };

  const openTreatmentConfig = (category: string, treatment: string) => {
    const configured = configuredMap.get(treatment);
    setSelectedCategory(category);
    setSelectedTreatment(treatment);
    setPriceInput(
      configured?.price !== null && configured?.price !== undefined
        ? String(configured.price)
        : '',
    );
    setDurationInput(
      configured?.duration !== null && configured?.duration !== undefined
        ? String(configured.duration)
        : '',
    );
    setModalStep('config');
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedCategory || !selectedTreatment) {
      return;
    }

    const parsedPrice =
      priceInput.trim().length > 0 ? Number(priceInput.replace(',', '.')) : null;
    const parsedDuration =
      durationInput.trim().length > 0 ? Number(durationInput) : null;

    if (
      (parsedPrice !== null && Number.isNaN(parsedPrice)) ||
      (parsedDuration !== null && Number.isNaN(parsedDuration))
    ) {
      setError('Inserisci prezzo e durata validi.');
      return;
    }

    try {
      await onSaveTreatment(
        selectedCategory,
        selectedTreatment,
        parsedPrice,
        parsedDuration,
      );
      setPriceInput(
        parsedPrice !== null && parsedPrice !== undefined ? String(parsedPrice) : '',
      );
      setDurationInput(
        parsedDuration !== null && parsedDuration !== undefined
          ? String(parsedDuration)
          : '',
      );
      setModalStep('list');
      setSelectedTreatment(null);
      setError(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Salvataggio trattamento non riuscito.',
      );
    }
  };

  return (
    <View>
      <View style={styles.grid}>
        {orderedCatalog.map((section, index) => {
          const insight = categoryInsights.get(section.category);
          const look = categoryLooks[index % categoryLooks.length];
          const configuredCount = insight?.configuredCount ?? 0;
          const totalTreatments = insight?.totalTreatments ?? section.treatments.length;
          const progressWidth = `${Math.max(
            8,
            Math.round((insight?.completion ?? 0) * 100),
          )}%` as DimensionValue;

          return (
            <Pressable
              key={section.category}
              onPress={() => openCategory(section.category)}
              style={styles.categoryCard}
            >
              <LinearGradient colors={look.gradient} style={styles.categoryCover}>
                <View style={[styles.iconWrap, { backgroundColor: `${look.accent}22` }]}>
                  <Ionicons color={colors.brandInk} name={section.icon} size={19} />
                </View>
                <View style={styles.reorderControls}>
                  <Ionicons color={colors.textMuted} name="reorder-three-outline" size={18} />
                  <View style={styles.reorderArrows}>
                    <Pressable
                      disabled={index === 0}
                      onPress={() => moveCategory(section.category, -1)}
                      style={[styles.reorderButton, index === 0 ? styles.reorderButtonDisabled : null]}
                    >
                      <Ionicons color={colors.brandInk} name="chevron-up" size={13} />
                    </Pressable>
                    <Pressable
                      disabled={index === orderedCatalog.length - 1}
                      onPress={() => moveCategory(section.category, 1)}
                      style={[
                        styles.reorderButton,
                        index === orderedCatalog.length - 1 ? styles.reorderButtonDisabled : null,
                      ]}
                    >
                      <Ionicons color={colors.brandInk} name="chevron-down" size={13} />
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.categoryBody}>
                <View style={styles.categoryTitleRow}>
                  <Text numberOfLines={2} style={styles.categoryTitle}>
                    {section.category}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      insight?.tone === 'success' ? styles.statusSuccess : null,
                      insight?.tone === 'warning' ? styles.statusWarning : null,
                      insight?.tone === 'rose' ? styles.statusRose : null,
                    ]}
                  />
                </View>

                <View style={styles.categoryMetrics}>
                  <Text style={styles.categoryMetric}>
                    {configuredCount}/{totalTreatments} servizi
                  </Text>
                  <Text style={styles.categoryMetricStrong}>
                    {insight?.startingPrice !== null && insight?.startingPrice !== undefined
                      ? `da EUR ${insight.startingPrice}`
                      : 'prezzo da inserire'}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: look.accent, width: progressWidth },
                    ]}
                  />
                </View>

                <View style={styles.insightRow}>
                  <View style={styles.insightPill}>
                    <Ionicons color={colors.brandInk} name={look.insightIcon} size={13} />
                    <Text numberOfLines={1} style={styles.insightText}>
                      {insight?.label ?? 'Hidden online'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    const firstMissing = section.treatments.find((name) => !configuredMap.has(name));
                    if (firstMissing) {
                      openTreatmentConfig(section.category, firstMissing);
                    } else {
                      openCategory(section.category);
                    }
                  }}
                  style={styles.quickAddButton}
                >
                  <Ionicons color={colors.brandInk} name="add" size={15} />
                  <Text style={styles.quickAddText}>Quick add</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        transparent
        visible={Boolean(activeSection)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {modalStep === 'config' ? (
                  <Pressable
                    onPress={() => {
                      setModalStep('list');
                      setSelectedTreatment(null);
                      setError(null);
                    }}
                    style={styles.backButton}
                  >
                    <Ionicons color={colors.brandInk} name="arrow-back" size={18} />
                  </Pressable>
                ) : null}
                <View>
                  <Text style={styles.modalEyebrow}>Categoria</Text>
                  <Text style={styles.modalTitle}>
                    {modalStep === 'config'
                      ? selectedTreatment ?? ''
                      : activeSection?.category ?? ''}
                  </Text>
                </View>
              </View>
              <Pressable onPress={closeModal}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            {modalStep === 'list' ? (
              <View style={styles.treatmentList}>
                {activeSection?.treatments.map((treatment) => {
                  const configured = configuredMap.get(treatment);

                  return (
                    <Pressable
                      key={treatment}
                      onPress={() => openTreatmentConfig(activeSection.category, treatment)}
                      style={[
                        styles.treatmentCard,
                        configured ? styles.treatmentCardActive : null,
                      ]}
                    >
                      <Text style={styles.treatmentName}>{treatment}</Text>
                      <Text style={styles.treatmentMeta}>
                        {configured
                          ? `${configured.duration ?? '-'} min · EUR ${configured.price ?? '-'}`
                          : 'Tocca per configurare'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Prezzo EUR</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={setPriceInput}
                    placeholder="Es. 45"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={priceInput}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Durata minuti</Text>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={setDurationInput}
                    placeholder="Es. 60"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={durationInput}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actions}>
                  <PrimaryButton
                    label="Torna alla lista"
                    onPress={() => {
                      setModalStep('list');
                      setSelectedTreatment(null);
                      setError(null);
                    }}
                    variant="secondary"
                  />
                  <PrimaryButton
                    disabled={isBusy}
                    label={isBusy ? 'Salvataggio...' : 'Salva trattamento'}
                    onPress={() => {
                      void handleSave();
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(33, 77, 99, 0.07)',
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 238,
    overflow: 'hidden',
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    width: '48%',
  },
  categoryCover: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    height: 74,
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  reorderControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reorderArrows: {
    gap: 3,
  },
  reorderButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius.round,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  reorderButtonDisabled: {
    opacity: 0.28,
  },
  categoryBody: {
    flex: 1,
    padding: spacing.sm,
    paddingTop: spacing.md,
  },
  categoryTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  categoryTitle: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  statusDot: {
    backgroundColor: colors.textSoft,
    borderRadius: radius.round,
    height: 9,
    marginTop: 5,
    width: 9,
  },
  statusSuccess: {
    backgroundColor: colors.success,
  },
  statusWarning: {
    backgroundColor: colors.warning,
  },
  statusRose: {
    backgroundColor: colors.rose,
  },
  categoryMetrics: {
    gap: 3,
    marginTop: spacing.sm,
  },
  categoryMetric: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  categoryMetricStrong: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    height: 5,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.round,
    height: 5,
  },
  insightRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  insightPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  insightText: {
    color: colors.brandInk,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  quickAddButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  quickAddText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 94, 114, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    maxWidth: 560,
    padding: spacing.md,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: '700',
  },
  treatmentList: {
    gap: spacing.sm,
  },
  treatmentCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: spacing.sm,
  },
  treatmentCardActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  treatmentName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  treatmentMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...textStyles.fieldLabel,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
