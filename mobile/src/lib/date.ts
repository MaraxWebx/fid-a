export type CalendarDateOption = {
  key: string;
  label: string;
  weekdayShort: string;
  dayNumber: string;
  monthShort: string;
  monthLabel: string;
  weekdayIndex: number;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildUpcomingDateOptions(totalDays = 30): CalendarDateOption[] {
  const today = new Date();

  return Array.from({ length: totalDays }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return {
      key: toLocalDateKey(date),
      label: new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(date),
      weekdayShort: new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
      }).format(date),
      dayNumber: new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
      }).format(date),
      monthShort: new Intl.DateTimeFormat("it-IT", {
        month: "short",
      }).format(date),
      monthLabel: new Intl.DateTimeFormat("it-IT", {
        month: "long",
        year: "numeric",
      }).format(date),
      weekdayIndex: (date.getDay() + 6) % 7,
    };
  });
}
