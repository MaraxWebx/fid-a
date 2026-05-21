import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
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

const categoryColors = ['#FFF8EC', '#F7EEF3', '#EEF7FA', '#F6FBF8', '#FFF3D8'];
const accentColors = ['#D6A978', '#DFA0A9', '#8FBDB7', '#9BB9D4', '#A8C99F'];

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

  const configuredMap = useMemo(
    () => new Map(configuredServices.map((item) => [item.name, item])),
    [configuredServices],
  );

  const categoryStats = useMemo(
    () =>
      new Map(
        catalog.map((section) => {
          const configured = section.treatments.filter((name) => configuredMap.has(name));
          const hasIncomplete = configured.some((name) => {
            const service = configuredMap.get(name);
            return service?.duration === null || service?.price === null;
          });

          return [
            section.category,
            {
              configuredCount: configured.length,
              hasIncomplete,
            },
          ];
        }),
      ),
    [catalog, configuredMap],
  );

  const activeSection = catalog.find((section) => section.category === selectedCategory) ?? null;

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
      configured?.price !== null && configured?.price !== undefined ? String(configured.price) : '',
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
    if (!selectedCategory || !selectedTreatment) return;

    const parsedPrice = priceInput.trim().length > 0 ? Number(priceInput.replace(',', '.')) : null;
    const parsedDuration = durationInput.trim().length > 0 ? Number(durationInput) : null;

    if (
      (parsedPrice !== null && Number.isNaN(parsedPrice)) ||
      (parsedDuration !== null && Number.isNaN(parsedDuration))
    ) {
      setError('Inserisci prezzo e durata validi.');
      return;
    }

    try {
      await onSaveTreatment(selectedCategory, selectedTreatment, parsedPrice, parsedDuration);
      setModalStep('list');
      setSelectedTreatment(null);
      setError(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Salvataggio trattamento non riuscito.',
      );
    }
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        contentContainerStyle={styles.categoryRail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {catalog.map((section, index) => {
          const stats = categoryStats.get(section.category);
          const configuredCount = stats?.configuredCount ?? 0;
          const backgroundColor = categoryColors[index % categoryColors.length];
          const accentColor = accentColors[index % accentColors.length];

          return (
            <Pressable
              key={section.category}
              onLongPress={() => openCategory(section.category)}
              onPress={() => openCategory(section.category)}
              style={[styles.categoryCard, { backgroundColor }]}
            >
              <View style={[styles.categoryAccent, { backgroundColor: accentColor }]} />
              <View style={styles.categoryCopy}>
                <Text numberOfLines={2} style={styles.categoryTitle}>
                  {section.category}
                </Text>
                <View style={styles.categoryMetaRow}>
                  <Text style={styles.categoryMeta}>{configuredCount} servizi</Text>
                  {stats?.hasIncomplete ? <View style={styles.statusDot} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        transparent
        visible={Boolean(activeSection)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalEyebrow}>Trattamenti</Text>
                <Text style={styles.modalTitle}>
                  {modalStep === 'config' ? selectedTreatment : activeSection?.category}
                </Text>
              </View>
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeText}>Chiudi</Text>
              </Pressable>
            </View>

            {modalStep === 'list' ? (
              <ScrollView contentContainerStyle={styles.treatmentList} showsVerticalScrollIndicator={false}>
                {activeSection?.treatments.map((treatment) => {
                  const configured = configuredMap.get(treatment);
                  return (
                    <Pressable
                      key={treatment}
                      onPress={() => openTreatmentConfig(activeSection.category, treatment)}
                      style={styles.treatmentRow}
                    >
                      <View style={styles.treatmentMain}>
                        <Text style={styles.treatmentName}>{treatment}</Text>
                        {configured ? (
                          <Text style={styles.treatmentMeta}>
                            {configured.duration ?? '-'} min · EUR {configured.price ?? '-'}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.treatmentState, configured ? styles.treatmentStateActive : null]} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Prezzo EUR</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    onChangeText={setPriceInput}
                    placeholder="45"
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
                    placeholder="60"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={durationInput}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actions}>
                  <PrimaryButton
                    label="Torna alla categoria"
                    onPress={() => {
                      setModalStep('list');
                      setSelectedTreatment(null);
                      setError(null);
                    }}
                    variant="secondary"
                  />
                  <PrimaryButton
                    disabled={isBusy}
                    label={isBusy ? 'Salvataggio...' : 'Salva'}
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
  wrap: {
    marginTop: spacing.sm,
  },
  categoryRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  categoryCard: {
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 104,
    overflow: 'hidden',
    padding: spacing.md,
    width: 178,
    ...shadows.soft,
  },
  categoryAccent: {
    borderRadius: radius.round,
    width: 5,
  },
  categoryCopy: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  categoryMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categoryMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusDot: {
    backgroundColor: colors.warning,
    borderRadius: radius.round,
    height: 7,
    width: 7,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(23, 63, 74, 0.26)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    maxHeight: '88%',
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
  modalTitleBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalEyebrow: {
    ...textStyles.eyebrow,
    color: colors.textMuted,
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  closeButton: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeText: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '800',
  },
  treatmentList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  treatmentRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 62,
    padding: spacing.md,
  },
  treatmentMain: {
    flex: 1,
  },
  treatmentName: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '800',
  },
  treatmentMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  treatmentState: {
    backgroundColor: colors.textSoft,
    borderRadius: radius.round,
    height: 8,
    width: 8,
  },
  treatmentStateActive: {
    backgroundColor: colors.success,
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
    borderRadius: radius.lg,
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
