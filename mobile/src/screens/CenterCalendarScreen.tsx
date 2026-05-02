import { ScrollView, StyleSheet, Text, View } from "react-native";

import { centerCalendarDays, slotTemplates } from "../data/mockData";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

export function CenterCalendarScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Calendario"
        title="Slot e disponibilita"
        subtitle="Vista per gestire disponibilita, creazione slot e appuntamenti manuali."
      />

      <SectionCard eyebrow="Settimana" title="Carico appuntamenti">
        <View style={styles.dayRow}>
          {centerCalendarDays.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Text style={styles.dayValue}>{day.booked}</Text>
              <Text style={styles.dayMeta}>{day.free} slot liberi</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard eyebrow="Gestione slot" title="Template attivi">
        {slotTemplates.map((slot) => (
          <View key={slot.id} style={styles.slotRow}>
            <View>
              <Text style={styles.slotTitle}>{slot.label}</Text>
              <Text style={styles.slotMeta}>
                {slot.operator} - {slot.type}
              </Text>
            </View>
            <Text style={styles.slotStatus}>{slot.status}</Text>
          </View>
        ))}
        <View style={styles.buttonWrap}>
          <PrimaryButton label="Aggiungi slot" onPress={() => {}} />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dayCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    minWidth: 140,
    padding: spacing.md,
  },
  dayLabel: {
    ...textStyles.caption,
  },
  dayValue: {
    ...textStyles.metricValue,
    color: colors.brandDark,
    marginTop: spacing.sm,
  },
  dayMeta: {
    color: colors.text,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  slotRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  slotTitle: {
    ...textStyles.titleXs,
    color: colors.text,
  },
  slotMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  slotStatus: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonWrap: {
    marginTop: spacing.lg,
  },
});
