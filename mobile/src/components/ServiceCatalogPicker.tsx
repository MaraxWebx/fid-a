import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
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
  const activeSection =
    catalog.find((section) => section.category === selectedCategory) ?? null;

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
        {catalog.map((section) => {
          const configuredCount = section.treatments.filter((name) =>
            configuredMap.has(name),
          ).length;

          return (
            <Pressable
              key={section.category}
              onPress={() => openCategory(section.category)}
              style={styles.categoryCard}
            >
              <View style={styles.iconWrap}>
                <Ionicons color={colors.brandInk} name={section.icon} size={20} />
              </View>
              <Text style={styles.categoryTitle}>{section.category}</Text>
              <Text style={styles.categoryMeta}>
                {configuredCount}/{section.treatments.length} configurati
              </Text>
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
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 102,
    padding: spacing.sm,
    width: '31%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  categoryTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  categoryMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
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
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
