import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { updateCenterAvailability } from "../lib/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import type { ActivationStatus, Center } from "../types/api";

type CenterCalendarScreenProps = {
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
};

type CalendarDay = {
  dateKey: string;
  label: string;
  weekdayKey: string;
  defaultEnabled: boolean;
  defaultStart: string;
  defaultEnd: string;
  override?: {
    enabled: boolean;
    start: string | null;
    end: string | null;
    note?: string | null;
  };
};

const weekdayMap = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildCalendarDays(center: Center, totalDays = 14): CalendarDay[] {
  const today = new Date();
  const overrides = center.availability_overrides ?? {};

  return Array.from({ length: totalDays }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const weekdayKey = weekdayMap[date.getDay()];
    const dateKey = formatDateKey(date);
    const defaultEnabled = center.opening_days?.includes(weekdayKey) ?? false;
    const baseHours = center.opening_hours?.[weekdayKey];

    return {
      dateKey,
      label: formatDateLabel(date),
      weekdayKey,
      defaultEnabled,
      defaultStart: baseHours?.start ?? "09:00",
      defaultEnd: baseHours?.end ?? "19:00",
      override: overrides[dateKey],
    };
  });
}

export function CenterCalendarScreen({
  center,
  onCenterUpdated,
}: CenterCalendarScreenProps) {
  const calendarDays = useMemo(() => buildCalendarDays(center), [center]);
  const [selectedDateKey, setSelectedDateKey] = useState(
    calendarDays[0]?.dateKey ?? "",
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftStart, setDraftStart] = useState("09:00");
  const [draftEnd, setDraftEnd] = useState("19:00");
  const [draftNote, setDraftNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDay =
    calendarDays.find((day) => day.dateKey === selectedDateKey) ?? calendarDays[0];

  useEffect(() => {
    if (!selectedDay) {
      return;
    }

    const source = selectedDay.override;
    setDraftEnabled(source?.enabled ?? selectedDay.defaultEnabled);
    setDraftStart(source?.start ?? selectedDay.defaultStart);
    setDraftEnd(source?.end ?? selectedDay.defaultEnd);
    setDraftNote(source?.note ?? "");
  }, [selectedDay]);

  if (!selectedDay) {
    return null;
  }

  const handleSelectDay = (day: CalendarDay) => {
    setSelectedDateKey(day.dateKey);
    setDraftEnabled(day.override?.enabled ?? day.defaultEnabled);
    setDraftStart(day.override?.start ?? day.defaultStart);
    setDraftEnd(day.override?.end ?? day.defaultEnd);
    setDraftNote(day.override?.note ?? "");
    setError(null);
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    const nextOverrides = {
      ...(center.availability_overrides ?? {}),
      [selectedDay.dateKey]: {
        enabled: draftEnabled,
        start: draftEnabled ? draftStart || null : null,
        end: draftEnabled ? draftEnd || null : null,
        note: draftNote.trim() || null,
      },
    };

    try {
      const response = await updateCenterAvailability(center.id, {
        availability_overrides: nextOverrides,
      });
      onCenterUpdated(response.center, response.activation);
      setIsEditorOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Aggiornamento calendario non riuscito.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setIsSaving(true);

    const nextOverrides = { ...(center.availability_overrides ?? {}) };
    delete nextOverrides[selectedDay.dateKey];

    try {
      const response = await updateCenterAvailability(center.id, {
        availability_overrides: nextOverrides,
      });
      onCenterUpdated(response.center, response.activation);
      setDraftEnabled(selectedDay.defaultEnabled);
      setDraftStart(selectedDay.defaultStart);
      setDraftEnd(selectedDay.defaultEnd);
      setDraftNote("");
      setIsEditorOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Reset calendario non riuscito.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Agenda centro"
        title="Calendario disponibilita"
        subtitle="Il centro definisce la settimana base nell'onboarding e qui gestisce eccezioni reali giorno per giorno."
      />

      <SectionCard eyebrow="Calendario" title="Prossimi 14 giorni">
        <View style={styles.calendarGrid}>
          {calendarDays.map((day) => {
            const effectiveEnabled = day.override?.enabled ?? day.defaultEnabled;

            return (
              <Pressable
                key={day.dateKey}
                onPress={() => handleSelectDay(day)}
                style={[
                  styles.dateCard,
                  day.dateKey === selectedDateKey && styles.dateCardSelected,
                  !effectiveEnabled && styles.dateCardClosed,
                ]}
              >
                <Text style={styles.dateWeekday}>{day.weekdayKey}</Text>
                <Text style={styles.dateLabel}>{day.label}</Text>
                <Text style={styles.dateState}>
                  {effectiveEnabled ? "Aperto" : "Chiuso"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsEditorOpen(false)}
        transparent
        visible={isEditorOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Dettaglio giorno</Text>
                <Text style={styles.modalTitle}>
                  {selectedDay.weekdayKey} {selectedDay.label}
                </Text>
              </View>
              <Pressable onPress={() => setIsEditorOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setDraftEnabled((current) => !current)}
              style={[styles.toggleRow, draftEnabled && styles.toggleRowActive]}
            >
              <View>
                <Text style={styles.toggleTitle}>Disponibilita del giorno</Text>
                <Text style={styles.toggleMeta}>
                  Default settimanale:{" "}
                  {selectedDay.defaultEnabled
                    ? `${selectedDay.defaultStart} - ${selectedDay.defaultEnd}`
                    : "chiuso"}
                </Text>
              </View>
              <Text style={styles.toggleValue}>
                {draftEnabled ? "APERTO" : "CHIUSO"}
              </Text>
            </Pressable>

            {draftEnabled ? (
              <View style={styles.hoursRow}>
                <View style={styles.hoursField}>
                  <Text style={styles.inputLabel}>Dalle</Text>
                  <TextInput
                    keyboardType="numbers-and-punctuation"
                    onChangeText={setDraftStart}
                    placeholder="09:00"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={draftStart}
                  />
                </View>
                <View style={styles.hoursField}>
                  <Text style={styles.inputLabel}>Alle</Text>
                  <TextInput
                    keyboardType="numbers-and-punctuation"
                    onChangeText={setDraftEnd}
                    placeholder="19:00"
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                    value={draftEnd}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.noteWrap}>
              <Text style={styles.inputLabel}>Nota interna</Text>
              <TextInput
                multiline
                onChangeText={setDraftNote}
                placeholder="Es. staff ridotto, chiusura straordinaria, apertura solo pomeriggio"
                placeholderTextColor={colors.textSoft}
                style={[styles.input, styles.noteInput]}
                value={draftNote}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <PrimaryButton
                label="Ripristina default"
                onPress={() => {
                  void handleReset();
                }}
                variant="secondary"
              />
              <PrimaryButton
                disabled={isSaving}
                label={isSaving ? "Salvataggio..." : "Salva giorno"}
                onPress={() => {
                  void handleSave();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dateCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 102,
    padding: spacing.md,
  },
  dateCardSelected: {
    borderColor: colors.brandDark,
    borderWidth: 2,
  },
  dateCardClosed: {
    opacity: 0.55,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalEyebrow: {
    ...textStyles.caption,
    color: colors.textMuted,
  },
  modalTitle: {
    ...textStyles.titleBase,
    color: colors.text,
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
  dateWeekday: {
    ...textStyles.caption,
  },
  dateLabel: {
    ...textStyles.titleXs,
    color: colors.text,
    marginTop: spacing.xs,
  },
  dateState: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  toggleRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  toggleRowActive: {
    borderColor: colors.brandDark,
    borderWidth: 1,
  },
  toggleTitle: {
    ...textStyles.titleXs,
    color: colors.text,
  },
  toggleMeta: {
    ...textStyles.bodyMuted,
    marginTop: spacing.xs,
  },
  toggleValue: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  hoursRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  hoursField: {
    flex: 1,
  },
  inputLabel: {
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
  noteWrap: {
    marginTop: spacing.lg,
  },
  noteInput: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  error: {
    color: "#B42318",
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
