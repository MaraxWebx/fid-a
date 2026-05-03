import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CalendarDateOption } from "../lib/date";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type MiniDateCalendarProps = {
  dates: CalendarDateOption[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
};

const weekdayLabels = ["L", "M", "M", "G", "V", "S", "D"];

export function MiniDateCalendar({
  dates,
  selectedDateKey,
  onSelectDate,
}: MiniDateCalendarProps) {
  const months = useMemo(() => buildMonths(dates), [dates]);
  const selectedMonthIndex = Math.max(
    0,
    months.findIndex((month) =>
      month.dates.some((date) => date.key === selectedDateKey),
    ),
  );
  const [monthIndex, setMonthIndex] = useState(selectedMonthIndex);

  useEffect(() => {
    setMonthIndex(selectedMonthIndex);
  }, [selectedMonthIndex]);

  const month = months[monthIndex];

  if (!month) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.monthHeader}>
        <Pressable
          disabled={monthIndex === 0}
          onPress={() => setMonthIndex((current) => Math.max(0, current - 1))}
          style={[
            styles.navButton,
            monthIndex === 0 && styles.navButtonDisabled,
          ]}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.monthTitle}>{month.label}</Text>

        <Pressable
          disabled={monthIndex === months.length - 1}
          onPress={() =>
            setMonthIndex((current) => Math.min(months.length - 1, current + 1))
          }
          style={[
            styles.navButton,
            monthIndex === months.length - 1 && styles.navButtonDisabled,
          ]}
        >
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdaysRow}>
        {weekdayLabels.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={styles.weekdayLabel}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: month.leadingEmpty }).map((_, index) => (
          <View key={`empty-${month.label}-${index}`} style={styles.dayCellEmpty} />
        ))}

        {month.dates.map((date) => {
          const active = date.key === selectedDateKey;
          return (
            <Pressable
              key={date.key}
              onPress={() => onSelectDate(date.key)}
              style={[styles.dayCell, active && styles.dayCellActive]}
            >
              <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                {date.dayNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildMonths(dates: CalendarDateOption[]) {
  const groups: Array<{
    label: string;
    dates: CalendarDateOption[];
    leadingEmpty: number;
  }> = [];

  for (const date of dates) {
    const current = groups[groups.length - 1];
    if (!current || current.label !== date.monthLabel) {
      groups.push({
        label: date.monthLabel,
        dates: [date],
        leadingEmpty: date.weekdayIndex,
      });
      continue;
    }
    current.dates.push(date);
  }

  return groups;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  navButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  monthTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
    justifyContent: "space-between",
  },
  weekdayLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    width: "14.285%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCellEmpty: {
    width: "14.285%",
  },
  dayCell: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: spacing.xs,
    minHeight: 62,
    width: "14.285%",
  },
  dayCellActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  dayNumberActive: {
    color: colors.brandInk,
  },
});
