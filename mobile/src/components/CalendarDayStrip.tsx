import { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { toLocalDateKey } from "../lib/date";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CalendarDayStripProps = {
  appointmentCounts?: Record<string, number>;
  sideDays?: number;
};

const weekdayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
});

export function CalendarDayStrip({
  appointmentCounts = {},
  sideDays = 1,
}: CalendarDayStripProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const todayKey = toLocalDateKey(today);
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const days = useMemo(
    () =>
      Array.from({ length: sideDays * 2 + 1 }, (_, index) => {
        const offset = index - sideDays;
        const date = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + offset,
        );
        const key = toLocalDateKey(date);

        return {
          count: appointmentCounts[key] ?? (offset === 0 ? 3 : offset === 1 ? 2 : 1),
          dayNumber: date.getDate().toString(),
          key,
          weekday: weekdayFormatter
            .format(date)
            .replace(".", "")
            .slice(0, 3)
            .toUpperCase(),
        };
      }),
    [appointmentCounts, sideDays, today],
  );

  return (
    <View style={styles.outer}>
      <View style={styles.glowLayer} />
      <View style={styles.content}>
        {days.map((day) => (
          <CalendarDay
            active={day.key === selectedKey}
            appointmentCount={day.count}
            dayNumber={day.dayNumber}
            isToday={day.key === todayKey}
            key={day.key}
            onPress={() => setSelectedKey(day.key)}
            weekday={day.weekday}
          />
        ))}
      </View>
    </View>
  );
}

function CalendarDay({
  active,
  appointmentCount,
  dayNumber,
  isToday,
  onPress,
  weekday,
}: {
  active: boolean;
  appointmentCount: number;
  dayNumber: string;
  isToday: boolean;
  onPress: () => void;
  weekday: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      friction: 8,
      tension: 150,
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      friction: 6,
      tension: 120,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.day,
          isToday ? styles.dayToday : null,
          active && !isToday ? styles.daySelected : null,
        ]}
      >
        <Text style={[styles.dayNumber, isToday ? styles.dayNumberToday : null]}>
          {dayNumber}
        </Text>
        <Text style={[styles.weekday, isToday ? styles.weekdayToday : null]}>
          {weekday}
        </Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: Math.min(appointmentCount, 3) }).map((_, index) => (
            <View
              key={`${dayNumber}-${index}`}
              style={[styles.dot, isToday ? styles.dotToday : null]}
            />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "rgba(255, 255, 255, 0.74)",
    borderColor: "rgba(174, 218, 245, 0.58)",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: "hidden",
    paddingVertical: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 4,
  },
  glowLayer: {
    backgroundColor: "rgba(185, 231, 246, 0.28)",
    borderRadius: 999,
    height: 92,
    left: "33%",
    position: "absolute",
    top: -34,
    width: 92,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  day: {
    alignItems: "center",
    backgroundColor: "rgba(244, 251, 255, 0.82)",
    borderColor: "rgba(174, 218, 245, 0.42)",
    borderRadius: 18,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    paddingVertical: spacing.xs,
    width: 66,
  },
  daySelected: {
    backgroundColor: "#EAF6FF",
    borderColor: "#A9D8FF",
  },
  dayToday: {
    backgroundColor: "#8DDCFF",
    borderColor: "#C9F1FF",
    borderRadius: 22,
    shadowColor: "#5DBFEA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 6,
  },
  dayNumber: {
    color: "#6B91AB",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontSize: 23,
  },
  weekday: {
    color: "#85A9BE",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  weekdayToday: {
    color: "#FFFFFF",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    height: 8,
    marginTop: 7,
  },
  dot: {
    backgroundColor: "#A9D8FF",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotToday: {
    backgroundColor: "#FFFFFF",
  },
});
