import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { textStyles } from '../theme/typography';
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
  onSelectTreatment: (category: string, treatment: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
};

export function ServiceCatalogPicker({
  catalog,
  configuredServices,
  onSelectTreatment,
  selectedCategory,
  onSelectCategory,
}: ServiceCatalogPickerProps) {
  const configuredMap = new Map(configuredServices.map((item) => [item.name, item]));
  const activeSection =
    catalog.find((section) => section.category === selectedCategory) ?? null;

  return (
    <View>
      <View style={styles.grid}>
        {catalog.map((section) => {
          const configuredCount = section.treatments.filter((name) =>
            configuredMap.has(name),
          ).length;
          const isActive = section.category === selectedCategory;

          return (
            <Pressable
              key={section.category}
              onPress={() => onSelectCategory(section.category)}
              style={[styles.categoryCard, isActive && styles.categoryCardActive]}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  color={isActive ? colors.surface : colors.brandInk}
                  name={section.icon}
                  size={20}
                />
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
        onRequestClose={() => onSelectCategory('')}
        transparent
        visible={Boolean(activeSection)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Categoria</Text>
                <Text style={styles.modalTitle}>{activeSection?.category ?? ''}</Text>
              </View>
              <Pressable onPress={() => onSelectCategory('')}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <View style={styles.treatmentList}>
              {activeSection?.treatments.map((treatment) => {
                const configured = configuredMap.get(treatment);

                return (
                  <Pressable
                    key={treatment}
                    onPress={() =>
                      onSelectTreatment(activeSection.category, treatment)
                    }
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
  categoryCardActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconWrapActive: {
    backgroundColor: colors.brand,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
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
});
