import { Pressable, StyleSheet, Text, View } from 'react-native';
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

      {activeSection ? (
        <View style={styles.listWrap}>
          <Text style={styles.listTitle}>{activeSection.category}</Text>
          <View style={styles.treatmentList}>
            {activeSection.treatments.map((treatment) => {
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
      ) : null}
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
    minHeight: 118,
    padding: spacing.md,
    width: '48%',
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
    ...textStyles.titleXs,
    color: colors.text,
    marginTop: spacing.md,
  },
  categoryMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  listWrap: {
    marginTop: spacing.lg,
  },
  listTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.sm,
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
