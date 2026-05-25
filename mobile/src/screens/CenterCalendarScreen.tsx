import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { CenterBookingDetailModal } from "../components/CenterBookingDetailModal";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  AppointmentState,
  AppointmentStatus,
  getAppointmentStatusMeta,
  getPrimaryAppointmentAction,
  getSecondaryAppointmentActions,
  isAppointmentActive,
  normalizeAppointmentState,
  toApiBookingState,
} from "../lib/appointmentStatus";
import {
  cancelBooking,
  getCenterBookingSlots,
  getCenterBookings,
  updateBooking,
  updateBookingStatus,
  updateCenterAvailability,
} from "../lib/api";
import { toLocalDateKey } from "../lib/date";
import {
  buildBookingWhatsappValues,
  buildCenterWhatsappMessage,
  buildWhatsappUrl,
  isWhatsappConfigured,
  openWhatsappUrl,
} from "../lib/whatsapp";
import { colors } from "../theme/colors";
import { radius, shadows, spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import type { ActivationStatus, Booking, BookingSlot, Center } from "../types/api";

type CenterCalendarScreenProps = {
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
};

type AgendaViewMode = "day" | "month" | "list" | "staff" | "rooms";
type ResourceType = "global" | "operator" | "room";
type DayTone = "free" | "medium" | "busy" | "full" | "closed";

type AgendaResource = {
  id: string;
  name: string;
  subtitle: string;
  type: ResourceType;
};

type AgendaGap = {
  duration: number;
  end: string;
  start: string;
};

type CalendarDay = {
  availableSlots: number;
  bookingsCount: number;
  dateKey: string;
  dateNumber: string;
  defaultEnabled: boolean;
  defaultEnd: string;
  defaultStart: string;
  gaps: AgendaGap[];
  isCurrentMonth: boolean;
  isToday: boolean;
  label: string;
  occupancy: number;
  openMinutes: number;
  tone: DayTone;
  weekdayKey: string;
  override?: {
    enabled: boolean;
    end: string | null;
    note?: string | null;
    start: string | null;
  };
};

type TimelineItem =
  | { end: string; id: string; kind: "booking"; minutes: number; start: string; booking: Booking }
  | { end: string; id: string; kind: "free"; minutes: number; start: string }
  | { end: string; id: string; kind: "break"; minutes: number; start: string; title: string };

const weekdayMap = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const weekdayHeaders = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const roomCatalog = [
  { id: "room-laser", name: "Cabina Laser", match: ["laser"], subtitle: "Dispositivo" },
  { id: "room-nails", name: "Nails", match: ["nail", "ungh", "manicure", "pedicure"], subtitle: "Postazione" },
  { id: "room-face", name: "Cabina Viso", match: ["viso", "facial", "peeling", "glow"], subtitle: "Trattamenti" },
  { id: "room-wellness", name: "Wellness", match: ["massaggio", "relax", "corpo"], subtitle: "Cabina" },
];

const treatmentTones = {
  face: { accent: "#8FBDB7", background: "#EAF5F2", icon: "sparkles-outline", text: "#245C5A" },
  nails: { accent: "#9BB9D4", background: "#EDF5FB", icon: "color-palette-outline", text: "#365F7E" },
  laser: { accent: "#D6A978", background: "#FFF2E2", icon: "flash-outline", text: "#8A5A22" },
  body: { accent: "#A8C99F", background: "#EEF7EA", icon: "leaf-outline", text: "#426E3B" },
  default: { accent: colors.brandDark, background: colors.surfaceSky, icon: "rose-outline", text: colors.brandInk },
} as const;

function formatDateKey(date: Date) {
  return toLocalDateKey(date);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(date);
}

function formatLongDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(year, month - 1, day));
}

function timeToMinutes(value?: string | null) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getBookingStartMinutes(booking: Booking) {
  if (!booking.start_time) return timeToMinutes(booking.time_label);
  const start = new Date(booking.start_time);
  return start.getHours() * 60 + start.getMinutes();
}

function getBookingEndMinutes(booking: Booking) {
  if (booking.end_time) {
    const end = new Date(booking.end_time);
    return end.getHours() * 60 + end.getMinutes();
  }
  return getBookingStartMinutes(booking) + 60;
}

function getBookingDurationMinutes(booking: Booking) {
  return Math.max(15, getBookingEndMinutes(booking) - getBookingStartMinutes(booking));
}

function getBookingDateKey(booking: Booking) {
  if (!booking.start_time) return null;
  return formatDateKey(new Date(booking.start_time));
}

function isActiveBooking(booking: Booking) {
  return isAppointmentActive(normalizeAppointmentState(booking.status, booking.is_delayed).status);
}

function getDayHours(center: Center, date: Date) {
  const dateKey = formatDateKey(date);
  const weekdayKey = weekdayMap[date.getDay()];
  const override = center.availability_overrides?.[dateKey];
  const defaultEnabled = center.opening_days?.includes(weekdayKey) ?? false;
  const defaultHours = center.opening_hours?.[weekdayKey];
  const start = override?.start ?? defaultHours?.start ?? "09:00";
  const end = override?.end ?? defaultHours?.end ?? "19:00";
  const enabled = override?.enabled ?? defaultEnabled;

  return {
    breakEnd: defaultHours?.break_end ?? null,
    breakEnabled: defaultHours?.break_enabled ?? false,
    breakStart: defaultHours?.break_start ?? null,
    dateKey,
    defaultEnabled,
    defaultEnd: defaultHours?.end ?? "19:00",
    defaultStart: defaultHours?.start ?? "09:00",
    enabled,
    end,
    override,
    start,
    weekdayKey,
  };
}

function getTreatmentTone(service: string) {
  const value = service.toLowerCase();
  if (value.includes("laser")) return treatmentTones.laser;
  if (value.includes("ungh") || value.includes("nail") || value.includes("manicure") || value.includes("pedicure")) {
    return treatmentTones.nails;
  }
  if (value.includes("viso") || value.includes("facial") || value.includes("peeling") || value.includes("glow")) {
    return treatmentTones.face;
  }
  if (value.includes("massaggio") || value.includes("corpo") || value.includes("relax")) return treatmentTones.body;
  return treatmentTones.default;
}

function inferRoomId(booking: Booking) {
  const service = booking.service_name.toLowerCase();
  return roomCatalog.find((room) => room.match.some((token) => service.includes(token)))?.id ?? "room-face";
}

function getResourceBookingMatch(booking: Booking, resourceId: string) {
  if (resourceId === "global") return true;
  if (resourceId.startsWith("operator:")) {
    const operatorId = resourceId.replace("operator:", "");
    return booking.staff_member_id === operatorId || booking.operator_name === operatorId;
  }
  return booking.room_id === resourceId || inferRoomId(booking) === resourceId;
}

function getDailyBookings(bookings: Booking[], dateKey: string, resourceId = "global") {
  return bookings
    .filter((booking) => getBookingDateKey(booking) === dateKey)
    .filter((booking) => getResourceBookingMatch(booking, resourceId))
    .sort((left, right) => getBookingStartMinutes(left) - getBookingStartMinutes(right));
}

function calculateGaps(dayStart: string, dayEnd: string, bookings: Booking[], minGap = 30) {
  const gaps: AgendaGap[] = [];
  let cursor = timeToMinutes(dayStart);
  const close = timeToMinutes(dayEnd);

  bookings.filter(isActiveBooking).forEach((booking) => {
    const start = getBookingStartMinutes(booking);
    const end = getBookingEndMinutes(booking);
    if (start - cursor >= minGap) {
      gaps.push({ duration: start - cursor, end: minutesToTime(start), start: minutesToTime(cursor) });
    }
    cursor = Math.max(cursor, end);
  });

  if (close - cursor >= minGap) {
    gaps.push({ duration: close - cursor, end: minutesToTime(close), start: minutesToTime(cursor) });
  }

  return gaps;
}

function getDayTone(enabled: boolean, occupancy: number): DayTone {
  if (!enabled) return "closed";
  if (occupancy >= 92) return "full";
  if (occupancy >= 72) return "busy";
  if (occupancy >= 42) return "medium";
  return "free";
}

function getToneColor(tone: DayTone) {
  switch (tone) {
    case "full":
      return colors.danger;
    case "busy":
      return "#DDA35F";
    case "medium":
      return "#8FAFC6";
    case "closed":
      return colors.textSoft;
    default:
      return colors.success;
  }
}

function buildCalendarDay(center: Center, date: Date, visibleMonth: Date, bookings: Booking[], resourceId: string): CalendarDay {
  const hours = getDayHours(center, date);
  const dayBookings = getDailyBookings(bookings, hours.dateKey, resourceId);
  const activeBookings = dayBookings.filter(isActiveBooking);
  const openMinutes = hours.enabled ? Math.max(0, timeToMinutes(hours.end) - timeToMinutes(hours.start)) : 0;
  const bookedMinutes = activeBookings.reduce((total, booking) => total + getBookingDurationMinutes(booking), 0);
  const occupancy = openMinutes > 0 ? Math.min(100, Math.round((bookedMinutes / openMinutes) * 100)) : 0;
  const gaps = hours.enabled ? calculateGaps(hours.start, hours.end, activeBookings) : [];

  return {
    availableSlots: gaps.filter((gap) => gap.duration >= 30).length,
    bookingsCount: activeBookings.length,
    dateKey: hours.dateKey,
    dateNumber: String(date.getDate()),
    defaultEnabled: hours.defaultEnabled,
    defaultEnd: hours.defaultEnd,
    defaultStart: hours.defaultStart,
    gaps,
    isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
    isToday: hours.dateKey === formatDateKey(new Date()),
    label: formatDateLabel(date),
    occupancy,
    openMinutes,
    override: hours.override,
    tone: getDayTone(hours.enabled, occupancy),
    weekdayKey: hours.weekdayKey,
  };
}

function buildMonthCalendarDays(center: Center, visibleMonth: Date, bookings: Booking[], resourceId: string) {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, offset) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + offset);
    return buildCalendarDay(center, date, visibleMonth, bookings, resourceId);
  });
}

function buildResources(bookings: Booking[], center?: Center): AgendaResource[] {
  const operators = Array.from(new Set(bookings.map((booking) => booking.operator_name).filter(Boolean))).map(
    (name) => ({
      id: `operator:${name}`,
      name,
      subtitle: "Operatore",
      type: "operator" as const,
    }),
  );
  const configuredOperators = (center?.staff_members ?? []).map((member) => ({
    id: `operator:${member.id}`,
    name: member.name,
    subtitle: member.role ?? "Operatrice",
    type: "operator" as const,
  }));
  const configuredRooms = (center?.rooms ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    subtitle: room.type ?? "Cabina",
    type: "room" as const,
  }));

  return [
    { id: "global", name: "Tutto il centro", subtitle: "Agenda completa", type: "global" },
    ...(configuredOperators.length > 0 ? configuredOperators : operators),
    ...(configuredRooms.length > 0 ? configuredRooms : roomCatalog.map((room) => ({ id: room.id, name: room.name, subtitle: room.subtitle, type: "room" as const }))),
  ];
}

function buildTimelineItems(center: Center, dateKey: string, bookings: Booking[], selectedResource: string): TimelineItem[] {
  const [year, month, day] = dateKey.split("-").map(Number);
  const hours = getDayHours(center, new Date(year, month - 1, day));
  if (!hours.enabled) {
    return [{ end: hours.end, id: "closed", kind: "break", minutes: 60, start: hours.start, title: "Giornata chiusa" }];
  }

  const dayBookings = getDailyBookings(bookings, dateKey, selectedResource).filter((booking) => {
    const status = normalizeAppointmentState(booking.status, booking.is_delayed).status;
    return status !== AppointmentStatus.CANCELLED;
  });
  const items: TimelineItem[] = [];
  let cursor = timeToMinutes(hours.start);
  const close = timeToMinutes(hours.end);

  if (hours.breakEnabled && hours.breakStart && hours.breakEnd) {
    dayBookings.push({
      center_id: center.id,
      client_name: "Pausa",
      date_label: dateKey,
      end_time: `${dateKey}T${hours.breakEnd}:00`,
      id: "break-lunch",
      operator_name: "",
      price: null,
      service_id: "break",
      service_name: "Pausa pranzo",
      start_time: `${dateKey}T${hours.breakStart}:00`,
      status: "completed",
      time_label: hours.breakStart,
      user_id: "system",
    });
  }

  dayBookings
    .sort((left, right) => getBookingStartMinutes(left) - getBookingStartMinutes(right))
    .forEach((booking) => {
      const start = Math.max(timeToMinutes(hours.start), getBookingStartMinutes(booking));
      const end = Math.min(close, getBookingEndMinutes(booking));

      if (start - cursor >= 30) {
        items.push({
          end: minutesToTime(start),
          id: `free-${cursor}-${start}`,
          kind: "free",
          minutes: start - cursor,
          start: minutesToTime(cursor),
        });
      }

      if (booking.id === "break-lunch") {
        items.push({
          end: minutesToTime(end),
          id: booking.id,
          kind: "break",
          minutes: Math.max(15, end - start),
          start: minutesToTime(start),
          title: "Pausa pranzo",
        });
      } else {
        items.push({
          booking,
          end: minutesToTime(end),
          id: booking.id,
          kind: "booking",
          minutes: Math.max(15, end - start),
          start: minutesToTime(start),
        });
      }
      cursor = Math.max(cursor, end);
    });

  if (close - cursor >= 30) {
    items.push({ end: minutesToTime(close), id: `free-${cursor}-${close}`, kind: "free", minutes: close - cursor, start: minutesToTime(cursor) });
  }

  return items.length > 0 ? items : [{ end: hours.end, id: "empty-day", kind: "free", minutes: openMinutesFromHours(hours.start, hours.end), start: hours.start }];
}

function getNextAvailabilityLabel(center: Center, dateKey: string, bookings: Booking[], resourceId: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const hours = getDayHours(center, new Date(year, month - 1, day));
  if (!hours.enabled) return "giorno chiuso";

  const gaps = calculateGaps(hours.start, hours.end, getDailyBookings(bookings, dateKey, resourceId).filter(isActiveBooking));
  const nextGap = gaps.find((gap) => gap.duration >= 30);
  return nextGap ? `${nextGap.start} (${nextGap.duration} min)` : "nessuno slot libero";
}

function openMinutesFromHours(start: string, end: string) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function CenterCalendarScreen({ center, onCenterUpdated }: CenterCalendarScreenProps) {
  const [activeAgendaView, setActiveAgendaView] = useState<AgendaViewMode>("day");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(new Date()));
  const [selectedResourceId, setSelectedResourceId] = useState("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftStart, setDraftStart] = useState("09:00");
  const [draftEnd, setDraftEnd] = useState("19:00");
  const [draftNote, setDraftNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [agendaBookings, setAgendaBookings] = useState<Booking[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [bookingEditor, setBookingEditor] = useState<Booking | null>(null);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [bookingSlotsLoading, setBookingSlotsLoading] = useState(false);
  const [bookingSlotsError, setBookingSlotsError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [bookingDetailId, setBookingDetailId] = useState<string | null>(null);

  const resources = useMemo(() => buildResources(agendaBookings, center), [agendaBookings, center]);
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? resources[0];

  const calendarDays = useMemo(
    () => buildMonthCalendarDays(center, visibleMonth, agendaBookings, selectedResourceId),
    [agendaBookings, center, selectedResourceId, visibleMonth],
  );

  const selectedDay =
    calendarDays.find((day) => day.dateKey === selectedDateKey) ??
    buildCalendarDay(center, new Date(), visibleMonth, agendaBookings, selectedResourceId);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);

  const selectedHours = useMemo(() => getDayHours(center, selectedDate), [center, selectedDate]);
  const selectedDayBookings = useMemo(
    () => getDailyBookings(agendaBookings, selectedDateKey, selectedResourceId),
    [agendaBookings, selectedDateKey, selectedResourceId],
  );
  const selectedActiveBookings = selectedDayBookings.filter(isActiveBooking);
  const selectedGaps = selectedHours.enabled ? calculateGaps(selectedHours.start, selectedHours.end, selectedActiveBookings) : [];
  const timelineItems = useMemo(
    () => buildTimelineItems(center, selectedDateKey, agendaBookings, selectedResourceId),
    [agendaBookings, center, selectedDateKey, selectedResourceId],
  );

  const listBookings = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return [...agendaBookings]
      .filter((booking) => getResourceBookingMatch(booking, selectedResourceId))
      .filter((booking) => {
        if (!normalizedQuery) return true;
        return [booking.client_name, booking.service_name, booking.operator_name, booking.time_label, booking.date_label]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftTime = left.start_time ? new Date(left.start_time).getTime() : 0;
        const rightTime = right.start_time ? new Date(right.start_time).getTime() : 0;
        return leftTime - rightTime;
      });
  }, [agendaBookings, searchQuery, selectedResourceId]);

  const todayMetrics = useMemo(() => {
    const activeMinutes = selectedActiveBookings.reduce((sum, booking) => sum + getBookingDurationMinutes(booking), 0);
    const openMinutes = selectedHours.enabled ? openMinutesFromHours(selectedHours.start, selectedHours.end) : 0;
    const occupancy = openMinutes > 0 ? Math.min(100, Math.round((activeMinutes / openMinutes) * 100)) : 0;
    return {
      freeSlots: selectedGaps.filter((gap) => gap.duration >= 30).length,
      occupancy,
      warning: selectedGaps.find((gap) => gap.duration >= 30 && gap.duration <= 45),
    };
  }, [selectedActiveBookings, selectedGaps, selectedHours]);

  const loadAgendaBookings = async () => {
    setAgendaLoading(true);
    setAgendaError(null);
    try {
      setAgendaBookings(await getCenterBookings(center.id));
    } catch {
      setAgendaError("Impossibile caricare l'agenda.");
    } finally {
      setAgendaLoading(false);
    }
  };

  useEffect(() => {
    void loadAgendaBookings();
  }, [center.id]);

  useEffect(() => {
    setDraftEnabled(selectedHours.enabled);
    setDraftStart(selectedHours.start);
    setDraftEnd(selectedHours.end);
    setDraftNote(selectedHours.override?.note ?? "");
  }, [selectedHours]);

  useEffect(() => {
    if (!bookingEditor) {
      setBookingSlots([]);
      return;
    }

    let mounted = true;
    setBookingSlotsLoading(true);
    setBookingSlotsError(null);
    setSelectedSlotId(null);

    getCenterBookingSlots(center.id, {
      bookingId: bookingEditor.id,
      date: selectedDateKey,
      serviceId: bookingEditor.service_id,
    })
      .then((response) => {
        if (mounted) setBookingSlots(response.slots);
      })
      .catch(() => {
        if (mounted) setBookingSlotsError("Nessuno slot disponibile per questa prenotazione.");
      })
      .finally(() => {
        if (mounted) setBookingSlotsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookingEditor, center.id, selectedDateKey]);

  const handleSelectDay = (day: CalendarDay, nextView: AgendaViewMode = "day") => {
    setSelectedDateKey(day.dateKey);
    setVisibleMonth(new Date(day.dateKey));
    setActiveAgendaView(nextView);
    setPanelError(null);
  };

  const handleSaveDay = async () => {
    setPanelError(null);
    setIsSaving(true);

    const nextOverrides = {
      ...(center.availability_overrides ?? {}),
      [selectedDateKey]: {
        enabled: draftEnabled,
        end: draftEnabled ? draftEnd || null : null,
        note: draftNote.trim() || null,
        start: draftEnabled ? draftStart || null : null,
      },
    };

    try {
      const response = await updateCenterAvailability(center.id, { availability_overrides: nextOverrides });
      onCenterUpdated(response.center, response.activation);
      await loadAgendaBookings();
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Aggiornamento giorno non riuscito.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDay = async () => {
    setPanelError(null);
    setIsSaving(true);
    const nextOverrides = { ...(center.availability_overrides ?? {}) };
    delete nextOverrides[selectedDateKey];

    try {
      const response = await updateCenterAvailability(center.id, { availability_overrides: nextOverrides });
      onCenterUpdated(response.center, response.activation);
      await loadAgendaBookings();
    } catch (saveError) {
      setPanelError(saveError instanceof Error ? saveError.message : "Reset giorno non riuscito.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeBookingStatus = async (booking: Booking, nextState: AppointmentState) => {
    setStatusSavingId(booking.id);
    setAgendaError(null);

    try {
      const updatedBooking = await updateBookingStatus(booking.id, {
        center_id: center.id,
        role: "center",
        status: toApiBookingState(nextState),
      });
      setAgendaBookings((current) => current.map((item) => (item.id === booking.id ? updatedBooking : item)));
      await loadAgendaBookings();
    } catch {
      setAgendaError("Aggiornamento stato appuntamento non riuscito.");
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleUpdateBooking = async () => {
    if (!bookingEditor || !selectedSlotId) {
      setBookingSlotsError("Seleziona un nuovo orario.");
      return;
    }

    setBookingActionLoading(true);
    setBookingSlotsError(null);
    try {
      await updateBooking(bookingEditor.id, {
        center_id: center.id,
        role: "center",
        service_id: bookingEditor.service_id,
        slot_id: selectedSlotId,
      });
      setBookingEditor(null);
      await loadAgendaBookings();
    } catch (updateError) {
      setBookingSlotsError(updateError instanceof Error ? updateError.message : "Modifica prenotazione non riuscita.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setBookingActionLoading(true);
    setBookingSlotsError(null);
    try {
      await cancelBooking({ bookingId: booking.id, centerId: center.id, role: "center" });
      setBookingEditor(null);
      await loadAgendaBookings();
    } catch (cancelError) {
      setBookingSlotsError(cancelError instanceof Error ? cancelError.message : "Annullamento prenotazione non riuscito.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleNewAppointment = (slot?: TimelineItem) => {
    const label = slot?.kind === "free" ? `${slot.start} - ${slot.end}` : selectedDay.label;
    Alert.alert(
      "Nuovo appuntamento",
      `Flusso pronto per creare una prenotazione su ${label}. Serve collegare selezione cliente e trattamento.`,
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.eyebrow}>Agenda centro</Text>
              <Text style={styles.title}>Agenda</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setIsDayPanelOpen(true)} style={styles.iconButton}>
                <Ionicons color={colors.brandInk} name="options-outline" size={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.heroMetrics}>
            <MetricPill icon="calendar-clear-outline" label={`${selectedActiveBookings.length} appuntamenti`} />
            <MetricPill icon="speedometer-outline" label={`${todayMetrics.occupancy}% occupazione`} />
            <MetricPill icon="time-outline" label={`${todayMetrics.freeSlots} slot liberi`} />
          </View>

          {todayMetrics.warning ? (
            <Pressable onPress={() => handleNewAppointment()} style={styles.smartAlert}>
              <Ionicons color="#9A641E" name="sparkles-outline" size={16} />
              <Text style={styles.smartAlertText}>
                Buco da {todayMetrics.warning.duration} min alle {todayMetrics.warning.start}. Suggerisci lista attesa.
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.viewSwitcher}>
          {[
            ["day", "Giorno", "today-outline"],
            ["month", "Mese", "calendar-outline"],
            ["list", "Lista", "list-outline"],
            ["staff", "Staff", "people-outline"],
            ["rooms", "Cabine", "business-outline"],
          ].map(([key, label, icon]) => (
            <Pressable
              key={key}
              onPress={() => setActiveAgendaView(key as AgendaViewMode)}
              style={[styles.viewSwitcherItem, activeAgendaView === key ? styles.viewSwitcherItemActive : null]}
            >
              <Ionicons color={activeAgendaView === key ? colors.brandInk : colors.textMuted} name={icon} size={16} />
              <Text style={[styles.viewSwitcherText, activeAgendaView === key ? styles.viewSwitcherTextActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {activeAgendaView === "day" || activeAgendaView === "month" || activeAgendaView === "list" ? (
          <AgendaResourcesPanel
            resources={resources}
            selectedResourceId={selectedResourceId}
            onSelect={(resource) => setSelectedResourceId(resource.id)}
            bookings={agendaBookings}
            dateKey={selectedDateKey}
          />
        ) : null}

        {agendaLoading ? <AgendaSkeleton /> : null}
        {agendaError ? <Text style={styles.error}>{agendaError}</Text> : null}

        {activeAgendaView === "month" ? (
          <MonthView
            calendarDays={calendarDays}
            bookings={agendaBookings}
            resourceId={selectedResourceId}
            selectedDateKey={selectedDateKey}
            visibleMonth={visibleMonth}
            onMonthChange={setVisibleMonth}
            onOpenBooking={setBookingDetailId}
            onSelectDay={(day) => handleSelectDay(day, "month")}
          />
        ) : null}

        {activeAgendaView === "day" ? (
          <DayTimelineView
            center={center}
            dateLabel={formatLongDate(selectedDateKey)}
            items={timelineItems}
            occupancy={todayMetrics.occupancy}
            resourceName={selectedResource?.name ?? "Tutto il centro"}
            onChangeStatus={handleChangeBookingStatus}
            onEditBooking={setBookingEditor}
            onNewAppointment={handleNewAppointment}
            onOpenBooking={setBookingDetailId}
            savingId={statusSavingId}
          />
        ) : null}

        {activeAgendaView === "list" ? (
          <ListView
            bookings={listBookings}
            center={center}
            query={searchQuery}
            savingId={statusSavingId}
            onChangeQuery={setSearchQuery}
            onChangeStatus={handleChangeBookingStatus}
            onEditBooking={setBookingEditor}
            onOpenBooking={setBookingDetailId}
          />
        ) : null}

        {activeAgendaView === "staff" ? (
          <StaffAgendaView
            bookings={agendaBookings}
            dateKey={selectedDateKey}
            resources={resources.filter((resource) => resource.type === "operator")}
            onOpenBooking={setBookingDetailId}
            onSelect={(resource) => {
              setSelectedResourceId(resource.id);
              setActiveAgendaView("day");
            }}
          />
        ) : null}

        {activeAgendaView === "rooms" ? (
          <RoomsAgendaView
            bookings={agendaBookings}
            center={center}
            dateKey={selectedDateKey}
            resources={resources.filter((resource) => resource.type === "room")}
            onOpenBooking={setBookingDetailId}
            onSelect={(resource) => {
              setSelectedResourceId(resource.id);
              setActiveAgendaView("day");
            }}
          />
        ) : null}
      </ScrollView>

      <Pressable onPress={() => handleNewAppointment()} style={styles.fab}>
        <Ionicons color={colors.surface} name="add" size={26} />
        <Text style={styles.fabText}>Nuovo appunt.</Text>
      </Pressable>

      <DayOperationsPanel
        bookings={selectedDayBookings}
        dateLabel={formatLongDate(selectedDateKey)}
        draftEnabled={draftEnabled}
        draftEnd={draftEnd}
        draftNote={draftNote}
        draftStart={draftStart}
        error={panelError}
        gaps={selectedGaps}
        isSaving={isSaving}
        onClose={() => setIsDayPanelOpen(false)}
        onNewAppointment={() => handleNewAppointment()}
        onReset={() => void handleResetDay()}
        onSave={() => void handleSaveDay()}
        onSetDraftEnabled={setDraftEnabled}
        onSetDraftEnd={setDraftEnd}
        onSetDraftNote={setDraftNote}
        onSetDraftStart={setDraftStart}
        onBlockDay={() => {
          setDraftEnabled(false);
          setDraftNote((current) => current || "Chiusura straordinaria");
        }}
        open={isDayPanelOpen}
        occupancy={todayMetrics.occupancy}
        resourceName={selectedResource?.name ?? "Tutto il centro"}
      />

      <BookingEditorModal
        booking={bookingEditor}
        loading={bookingSlotsLoading}
        actionLoading={bookingActionLoading}
        error={bookingSlotsError}
        selectedSlotId={selectedSlotId}
        slots={bookingSlots}
        onCancelBooking={handleCancelBooking}
        onClose={() => setBookingEditor(null)}
        onSave={() => void handleUpdateBooking()}
        onSelectSlot={setSelectedSlotId}
      />

      <CenterBookingDetailModal bookingId={bookingDetailId} center={center} centerId={center.id} onClose={() => setBookingDetailId(null)} />
    </View>
  );
}

function MetricPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons color={colors.brandInk} name={icon} size={14} />
      <Text style={styles.metricPillText}>{label}</Text>
    </View>
  );
}

function AgendaResourcesPanel({
  bookings,
  dateKey,
  onSelect,
  resources,
  selectedResourceId,
}: {
  bookings: Booking[];
  dateKey: string;
  onSelect: (resource: AgendaResource) => void;
  resources: AgendaResource[];
  selectedResourceId: string;
}) {
  const globalResource = resources.find((resource) => resource.id === "global");
  const staffResources = resources.filter((resource) => resource.type === "operator");
  const roomResources = resources.filter((resource) => resource.type === "room");

  return (
    <View style={styles.resourcePanel}>
      {globalResource ? (
        <Pressable
          onPress={() => onSelect(globalResource)}
          style={[styles.globalResourceCard, selectedResourceId === "global" ? styles.globalResourceCardActive : null]}
        >
          <View>
            <Text style={styles.resourceSectionLabel}>Vista</Text>
            <Text style={styles.globalResourceTitle}>Tutto il centro</Text>
          </View>
          <Text style={styles.globalResourceCount}>
            {getDailyBookings(bookings, dateKey, "global").filter(isActiveBooking).length} app.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.resourceSection}>
        <Text style={styles.resourceSectionLabel}>Staff</Text>
        <ScrollView contentContainerStyle={styles.staffRail} horizontal showsHorizontalScrollIndicator={false}>
          {staffResources.map((resource) => {
            const activeBookings = getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking);
            const selected = selectedResourceId === resource.id;
            return (
              <Pressable
                key={resource.id}
                onPress={() => onSelect(resource)}
                style={[styles.staffCard, selected ? styles.staffCardActive : null]}
              >
                <View style={styles.staffAvatar}>
                  <Text style={styles.staffAvatarText}>{resource.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.staffCopy}>
                  <Text numberOfLines={1} style={[styles.staffName, selected ? styles.staffNameActive : null]}>
                    {resource.name}
                  </Text>
                  <Text style={[styles.staffMeta, selected ? styles.staffMetaActive : null]}>
                    {activeBookings.length} app.
                  </Text>
                </View>
                <View style={[styles.availabilityDot, activeBookings.length >= 4 ? styles.availabilityBusy : null]} />
              </Pressable>
            );
          })}
          {staffResources.length === 0 ? <Text style={styles.resourceEmpty}>Nessun operatore assegnato.</Text> : null}
        </ScrollView>
      </View>

      <View style={styles.resourceSection}>
        <Text style={styles.resourceSectionLabel}>Cabine / rooms</Text>
        <ScrollView contentContainerStyle={styles.roomRail} horizontal showsHorizontalScrollIndicator={false}>
          {roomResources.map((resource) => {
            const activeBookings = getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking);
            const selected = selectedResourceId === resource.id;
            const occupancyLabel = activeBookings.length >= 4 ? "Piena" : activeBookings.length > 0 ? "In uso" : "Libera";
            return (
              <Pressable
                key={resource.id}
                onPress={() => onSelect(resource)}
                style={[styles.roomCard, selected ? styles.roomCardActive : null]}
              >
                <View style={styles.roomCardTop}>
                  <Text numberOfLines={1} style={styles.roomName}>{resource.name}</Text>
                  <View style={[styles.roomStatusDot, activeBookings.length > 0 ? styles.roomStatusBusy : null]} />
                </View>
                <Text style={styles.roomMeta}>{occupancyLabel}</Text>
                <Text style={styles.roomCount}>{activeBookings.length} appuntamenti</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function MonthView({
  bookings,
  calendarDays,
  onMonthChange,
  onOpenBooking,
  onSelectDay,
  resourceId,
  selectedDateKey,
  visibleMonth,
}: {
  bookings: Booking[];
  calendarDays: CalendarDay[];
  onMonthChange: (date: Date) => void;
  onOpenBooking: (bookingId: string) => void;
  onSelectDay: (day: CalendarDay) => void;
  resourceId: string;
  selectedDateKey: string;
  visibleMonth: Date;
}) {
  const selectedDayBookings = getDailyBookings(bookings, selectedDateKey, resourceId).filter(isActiveBooking);
  const currentMonthBookings = calendarDays
    .filter((day) => day.isCurrentMonth)
    .reduce((total, day) => total + day.bookingsCount, 0);

  return (
    <View style={styles.surface}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} style={styles.monthButton}>
          <Ionicons color={colors.brandInk} name="chevron-back" size={18} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <Text style={styles.sectionEyebrow}>Overview mensile</Text>
          <Text style={styles.sectionTitle}>{formatMonthLabel(visibleMonth)}</Text>
        </View>
        <Pressable onPress={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} style={styles.monthButton}>
          <Ionicons color={colors.brandInk} name="chevron-forward" size={18} />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {weekdayHeaders.map((weekday) => (
          <Text key={weekday} style={styles.weekHeaderText}>{weekday}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => (
          <SmartDayCell day={day} key={day.dateKey} onPress={() => onSelectDay(day)} selected={selectedDateKey === day.dateKey} />
        ))}
      </View>

      <View style={styles.monthSummary}>
        <View style={styles.monthSummaryHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Giorno selezionato</Text>
            <Text style={styles.monthSummaryTitle}>{formatLongDate(selectedDateKey)}</Text>
          </View>
          <Text style={styles.monthSummaryCount}>{selectedDayBookings.length} app.</Text>
        </View>
        {currentMonthBookings === 0 ? (
          <EmptyState title="Nessun appuntamento in questo mese" text="I giorni del calendario si illumineranno appena arrivano prenotazioni." />
        ) : selectedDayBookings.length === 0 ? (
          <EmptyState title="Nessun appuntamento per questo giorno" text="Seleziona un giorno con pallino o crea un nuovo appuntamento." />
        ) : (
          <View style={styles.monthBookingList}>
            {selectedDayBookings.map((booking) => (
              <CompactBookingCard booking={booking} key={booking.id} onPress={() => onOpenBooking(booking.id)} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function SmartDayCell({ day, onPress, selected }: { day: CalendarDay; onPress: () => void; selected: boolean }) {
  const toneColor = getToneColor(day.tone);
  const isClosed = day.tone === "closed";
  const warning = day.gaps.some((gap) => gap.duration >= 30 && gap.duration <= 45);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayCell,
        selected ? styles.dayCellSelected : null,
        day.isToday ? styles.dayCellToday : null,
        !day.isCurrentMonth ? styles.dayCellMuted : null,
      ]}
    >
      <View style={styles.dayCellTop}>
        <Text style={[styles.dayNumber, selected ? styles.dayNumberSelected : null]}>{day.dateNumber}</Text>
        {warning ? <Ionicons color="#BD7A24" name="warning-outline" size={13} /> : null}
      </View>
      <View style={styles.dayCellMetaRow}>
        <Text style={styles.dayCellMeta}>{isClosed ? "Chiuso" : `${day.bookingsCount} app.`}</Text>
        {day.bookingsCount > 0 ? <View style={styles.dayBookingDot} /> : null}
      </View>
      <View style={styles.dayProgressTrack}>
        <View style={[styles.dayProgressFill, { backgroundColor: toneColor, width: `${isClosed ? 0 : day.occupancy}%` }]} />
      </View>
      <Text style={styles.dayCellBottom}>{isClosed ? "non disp." : `${day.occupancy}% · ${day.availableSlots} slot`}</Text>
    </Pressable>
  );
}

function DayTimelineView({
  center,
  dateLabel,
  items,
  occupancy,
  onChangeStatus,
  onEditBooking,
  onNewAppointment,
  onOpenBooking,
  resourceName,
  savingId,
}: {
  center: Center;
  dateLabel: string;
  items: TimelineItem[];
  occupancy: number;
  onChangeStatus: (booking: Booking, state: AppointmentState) => void;
  onEditBooking: (booking: Booking) => void;
  onNewAppointment: (slot?: TimelineItem) => void;
  onOpenBooking: (bookingId: string) => void;
  resourceName: string;
  savingId: string | null;
}) {
  const hasAppointments = items.some((item) => item.kind === "booking");

  return (
    <View style={styles.surface}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>{resourceName}</Text>
          <Text style={styles.sectionTitle}>{dateLabel}</Text>
        </View>
        <View style={[styles.occupancyRing, { borderColor: getToneColor(getDayTone(true, occupancy)) }]}>
          <Text style={styles.occupancyRingText}>{occupancy}%</Text>
        </View>
      </View>

      {!hasAppointments ? <EmptyState title="Nessun appuntamento oggi" text="Gli slot liberi restano disponibili per nuove prenotazioni." /> : null}

      <View style={styles.timeline}>
        <View style={styles.timelineRule} />
        {items.map((item) => {
          if (item.kind === "booking") {
            return (
              <AppointmentCard
                booking={item.booking}
                center={center}
                end={item.end}
                key={item.id}
                onChangeStatus={(state) => onChangeStatus(item.booking, state)}
                onEdit={() => onEditBooking(item.booking)}
                onOpen={() => onOpenBooking(item.booking.id)}
                saving={savingId === item.booking.id}
                start={item.start}
              />
            );
          }
          if (item.kind === "break") {
            return <BreakBlock item={item} key={item.id} />;
          }
          return <FreeSlotCard item={item} key={item.id} onPress={() => onNewAppointment(item)} />;
        })}
      </View>
    </View>
  );
}

function AppointmentCard({
  booking,
  center,
  end,
  onChangeStatus,
  onEdit,
  onOpen,
  saving,
  start,
}: {
  booking: Booking;
  center: Center;
  end: string;
  onChangeStatus: (state: AppointmentState) => void;
  onEdit: () => void;
  onOpen: () => void;
  saving: boolean;
  start: string;
}) {
  const tone = getTreatmentTone(booking.service_name);
  const status = normalizeAppointmentState(booking.status, booking.is_delayed);
  const statusTone = getAppointmentStatusMeta(status);
  const primaryAction = getPrimaryAppointmentAction(status);
  const secondaryActions = getSecondaryAppointmentActions(status);
  const [moreOpen, setMoreOpen] = useState(false);
  const canWriteWhatsapp = Boolean(booking.client_phone) && isWhatsappConfigured(center);
  const openClientWhatsapp = () => {
    if (!booking.client_phone) return;
    const url = buildWhatsappUrl(
      booking.client_phone,
      buildCenterWhatsappMessage(center, "reminder", buildBookingWhatsappValues({ booking, center })),
    );
    if (url) void openWhatsappUrl(url);
  };

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{start}</Text>
        <Text style={styles.timeEnd}>{end}</Text>
        <View style={[styles.timelineDot, { backgroundColor: tone.accent }]} />
      </View>

      <Pressable onLongPress={onEdit} onPress={onOpen} style={[styles.appointmentCard, { borderLeftColor: tone.accent }]}>
        <View style={styles.appointmentTop}>
          <View style={styles.appointmentMain}>
            <Text style={styles.clientName}>{booking.client_name ?? "Cliente"}</Text>
            <Text style={styles.serviceName}>{booking.service_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTone.background }]}>
            <Ionicons color={statusTone.text} name={statusTone.icon} size={12} />
            <Text style={[styles.statusText, { color: statusTone.text }]}>{statusTone.label}</Text>
          </View>
        </View>

        <View style={styles.appointmentMetaGrid}>
          <InfoChip icon="hourglass-outline" label={`${getBookingDurationMinutes(booking)} min`} />
          <InfoChip icon="person-outline" label={booking.operator_name || "Staff"} />
          <InfoChip icon="business-outline" label={roomCatalog.find((room) => room.id === inferRoomId(booking))?.name ?? "Cabina"} />
          <InfoChip icon={booking.price ? "card-outline" : "wallet-outline"} label={booking.price ? `EUR ${booking.price}` : "Da saldare"} />
        </View>

        <View style={styles.appointmentActions}>
          <Pressable
            disabled={saving || !primaryAction}
            onPress={() => primaryAction && onChangeStatus(primaryAction.nextState)}
            style={[styles.primaryAction, !primaryAction ? styles.primaryActionDisabled : null]}
          >
            <Text style={styles.primaryActionText}>{primaryAction?.label ?? "Gestito"}</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={onEdit} style={styles.secondaryAction}>
            <Ionicons color={colors.brandInk} name="calendar-outline" size={16} />
          </Pressable>
          <Pressable disabled={saving || secondaryActions.length === 0} onPress={() => setMoreOpen((current) => !current)} style={styles.secondaryAction}>
            <Ionicons color={colors.brandInk} name="ellipsis-horizontal" size={17} />
          </Pressable>
          {canWriteWhatsapp ? (
            <Pressable disabled={saving} onPress={openClientWhatsapp} style={styles.secondaryAction}>
              <Ionicons color="#25D366" name="logo-whatsapp" size={17} />
            </Pressable>
          ) : null}
        </View>

        {moreOpen ? (
          <View style={styles.morePanel}>
            {secondaryActions.map((action) => (
              <Pressable
                key={`${action.label}-${action.nextState.status}-${action.nextState.isDelayed}`}
                onPress={() => {
                  setMoreOpen(false);
                  onChangeStatus(action.nextState);
                }}
                style={styles.moreAction}
              >
                <Text style={styles.moreActionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {saving ? <ActivityIndicator color={colors.brandDark} style={styles.saving} /> : null}
      </Pressable>
    </View>
  );
}

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.infoChip}>
      <Ionicons color={colors.textMuted} name={icon} size={12} />
      <Text numberOfLines={1} style={styles.infoChipText}>{label}</Text>
    </View>
  );
}

function FreeSlotCard({ item, onPress }: { item: Extract<TimelineItem, { kind: "free" }>; onPress: () => void }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{item.start}</Text>
        <Text style={styles.timeEnd}>{item.end}</Text>
      </View>
      <Pressable onPress={onPress} style={styles.freeSlotCard}>
        <View>
          <Text style={styles.freeSlotTitle}>Slot libero · {item.minutes} min</Text>
          <Text style={styles.freeSlotMeta}>Prenota, blocca slot o proponi lista attesa</Text>
        </View>
        <Ionicons color={colors.brandDark} name="add-circle-outline" size={22} />
      </Pressable>
    </View>
  );
}

function CompactBookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const roomName = roomCatalog.find((room) => room.id === inferRoomId(booking))?.name ?? "Cabina";

  return (
    <Pressable onPress={onPress} style={styles.compactBookingCard}>
      <View style={styles.compactBookingTime}>
        <Text style={styles.compactBookingHour}>{booking.time_label ?? "--:--"}</Text>
        <Text style={styles.compactBookingDuration}>{getBookingDurationMinutes(booking)} min</Text>
      </View>
      <View style={styles.compactBookingBody}>
        <Text style={styles.compactBookingClient}>{booking.client_name ?? "Cliente"}</Text>
        <Text style={styles.compactBookingService}>{booking.service_name}</Text>
        <Text style={styles.compactBookingMeta}>{booking.operator_name || "Staff"} - {roomName}</Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
    </Pressable>
  );
}

function BreakBlock({ item }: { item: Extract<TimelineItem, { kind: "break" }> }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{item.start}</Text>
        <Text style={styles.timeEnd}>{item.end}</Text>
      </View>
      <View style={styles.breakCard}>
        <Ionicons color={colors.textMuted} name="cafe-outline" size={17} />
        <Text style={styles.breakText}>{item.title}</Text>
      </View>
    </View>
  );
}

function ListView({
  bookings,
  center,
  onChangeQuery,
  onChangeStatus,
  onEditBooking,
  onOpenBooking,
  query,
  savingId,
}: {
  bookings: Booking[];
  center: Center;
  onChangeQuery: (value: string) => void;
  onChangeStatus: (booking: Booking, state: AppointmentState) => void;
  onEditBooking: (booking: Booking) => void;
  onOpenBooking: (bookingId: string) => void;
  query: string;
  savingId: string | null;
}) {
  return (
    <View style={styles.surface}>
      <View style={styles.searchBox}>
        <Ionicons color={colors.textMuted} name="search-outline" size={18} />
        <TextInput
          onChangeText={onChangeQuery}
          placeholder="Cerca cliente, trattamento, operatore"
          placeholderTextColor={colors.textSoft}
          style={styles.searchInput}
          value={query}
        />
      </View>
      {bookings.length === 0 ? <EmptyState title="Nessun appuntamento in agenda" text="Prova con un altro filtro o crea un nuovo appuntamento." /> : null}
      <View style={styles.listRows}>
        {bookings.map((booking) => (
          <ListAppointmentRow
            booking={booking}
            center={center}
            key={booking.id}
            onChangeStatus={(state) => onChangeStatus(booking, state)}
            onEdit={() => onEditBooking(booking)}
            onOpen={() => onOpenBooking(booking.id)}
            saving={savingId === booking.id}
          />
        ))}
      </View>
    </View>
  );
}

function ListAppointmentRow({
  booking,
  center,
  onChangeStatus,
  onEdit,
  onOpen,
  saving,
}: {
  booking: Booking;
  center: Center;
  onChangeStatus: (state: AppointmentState) => void;
  onEdit: () => void;
  onOpen: () => void;
  saving: boolean;
}) {
  const status = normalizeAppointmentState(booking.status, booking.is_delayed);
  const statusTone = getAppointmentStatusMeta(status);
  const primaryAction = getPrimaryAppointmentAction(status);
  const roomName = roomCatalog.find((room) => room.id === inferRoomId(booking))?.name ?? "Cabina";
  const canWriteWhatsapp = Boolean(booking.client_phone) && isWhatsappConfigured(center);

  return (
    <Pressable onPress={onOpen} style={styles.listRow}>
      <View style={styles.listTime}>
        <Text style={styles.listTimeText}>{booking.time_label ?? "--:--"}</Text>
        <Text style={styles.listDateText}>{booking.date_label ?? ""}</Text>
      </View>
      <View style={styles.listMain}>
        <Text style={styles.listClient}>{booking.client_name ?? "Cliente"}</Text>
        <Text style={styles.listService}>{booking.service_name}</Text>
        <Text style={styles.listMeta}>{booking.operator_name || "Staff"} - {roomName} - {getBookingDurationMinutes(booking)} min</Text>
      </View>
      <View style={styles.listActions}>
        <View style={[styles.statusDot, { backgroundColor: statusTone.text }]} />
        <Pressable disabled={saving || !primaryAction} onPress={() => primaryAction && onChangeStatus(primaryAction.nextState)} style={styles.rowIconButton}>
          <Ionicons color={colors.brandInk} name="checkmark-outline" size={17} />
        </Pressable>
        <Pressable onPress={onEdit} style={styles.rowIconButton}>
          <Ionicons color={colors.brandInk} name="create-outline" size={17} />
        </Pressable>
        {canWriteWhatsapp ? (
          <Pressable
            onPress={() => {
              if (!booking.client_phone) return;
              const url = buildWhatsappUrl(
                booking.client_phone,
                buildCenterWhatsappMessage(center, "reminder", buildBookingWhatsappValues({ booking, center })),
              );
              if (url) void openWhatsappUrl(url);
            }}
            style={styles.rowIconButton}
          >
            <Ionicons color="#25D366" name="logo-whatsapp" size={17} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function StaffAgendaView({
  bookings,
  dateKey,
  onOpenBooking,
  onSelect,
  resources,
}: {
  bookings: Booking[];
  dateKey: string;
  onOpenBooking: (bookingId: string) => void;
  onSelect: (resource: AgendaResource) => void;
  resources: AgendaResource[];
}) {
  const totalStaffAppointments = resources.reduce(
    (total, resource) => total + getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking).length,
    0,
  );

  return (
    <View style={styles.surface}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Coordinamento</Text>
          <Text style={styles.sectionTitle}>Vista staff</Text>
        </View>
      </View>
      {resources.length === 0 || totalStaffAppointments === 0 ? (
        <EmptyState title="Nessun appuntamento assegnato allo staff" text="Quando una prenotazione avra un operatore, comparira qui." />
      ) : null}
      <View style={styles.resourceBoard}>
        {resources.map((resource) => {
          const resourceBookings = getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking);
          const nextBookings = resourceBookings.slice(0, 3);
          return (
            <Pressable key={resource.id} onPress={() => onSelect(resource)} style={styles.resourceCard}>
              <View style={styles.resourceCardTop}>
                <View>
                  <Text style={styles.resourceCardName}>{resource.name}</Text>
                  <Text style={styles.resourceCardMeta}>{resource.subtitle}</Text>
                </View>
                <Text style={styles.resourcePercent}>{resourceBookings.length}</Text>
              </View>
              <Text style={styles.resourceCardBottom}>{resourceBookings.length === 1 ? "1 appuntamento oggi" : `${resourceBookings.length} appuntamenti oggi`}</Text>
              {nextBookings.length === 0 ? (
                <Text style={styles.resourceEmptyLine}>Nessun appuntamento</Text>
              ) : (
                <View style={styles.resourceMiniList}>
                  {nextBookings.map((booking) => (
                    <Pressable key={booking.id} onPress={() => onOpenBooking(booking.id)} style={styles.resourceMiniRow}>
                      <Text style={styles.resourceMiniTime}>{booking.time_label ?? "--:--"}</Text>
                      <Text numberOfLines={1} style={styles.resourceMiniText}>{booking.client_name ?? "Cliente"} - {booking.service_name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RoomsAgendaView({
  bookings,
  center,
  dateKey,
  onOpenBooking,
  onSelect,
  resources,
}: {
  bookings: Booking[];
  center: Center;
  dateKey: string;
  onOpenBooking: (bookingId: string) => void;
  onSelect: (resource: AgendaResource) => void;
  resources: AgendaResource[];
}) {
  const occupiedRooms = resources.filter((resource) => getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking).length > 0);

  return (
    <View style={styles.surface}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Cabine e risorse</Text>
          <Text style={styles.sectionTitle}>Vista cabine</Text>
        </View>
      </View>
      {occupiedRooms.length === 0 ? <EmptyState title="Nessuna cabina occupata" text="Le cabine risultano libere nella giornata selezionata." /> : null}
      <View style={styles.resourceBoard}>
        {resources.map((resource) => {
          const roomBookings = getDailyBookings(bookings, dateKey, resource.id).filter(isActiveBooking);
          const occupied = roomBookings.length > 0;
          const nextAvailability = getNextAvailabilityLabel(center, dateKey, bookings, resource.id);
          return (
            <Pressable key={resource.id} onPress={() => onSelect(resource)} style={styles.resourceCard}>
              <View style={styles.resourceCardTop}>
                <View>
                  <Text style={styles.resourceCardName}>{resource.name}</Text>
                  <Text style={styles.resourceCardMeta}>{resource.subtitle}</Text>
                </View>
                <View style={[styles.roomStatusPill, occupied ? styles.roomStatusPillBusy : styles.roomStatusPillFree]}>
                  <Text style={[styles.roomStatusPillText, occupied ? styles.roomStatusPillTextBusy : styles.roomStatusPillTextFree]}>
                    {occupied ? "Occupata" : "Libera"}
                  </Text>
                </View>
              </View>
              <Text style={styles.resourceCardBottom}>Prossima disponibilita: {nextAvailability}</Text>
              {roomBookings.length === 0 ? (
                <Text style={styles.resourceEmptyLine}>Nessun appuntamento</Text>
              ) : (
                <View style={styles.resourceMiniList}>
                  {roomBookings.slice(0, 3).map((booking) => (
                    <Pressable key={booking.id} onPress={() => onOpenBooking(booking.id)} style={styles.resourceMiniRow}>
                      <Text style={styles.resourceMiniTime}>{booking.time_label ?? "--:--"}</Text>
                      <Text numberOfLines={1} style={styles.resourceMiniText}>{booking.client_name ?? "Cliente"} - {booking.service_name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DayOperationsPanel({
  bookings,
  dateLabel,
  draftEnabled,
  draftEnd,
  draftNote,
  draftStart,
  error,
  gaps,
  isSaving,
  occupancy,
  onBlockDay,
  onClose,
  onNewAppointment,
  onReset,
  onSave,
  onSetDraftEnabled,
  onSetDraftEnd,
  onSetDraftNote,
  onSetDraftStart,
  open,
  resourceName,
}: {
  bookings: Booking[];
  dateLabel: string;
  draftEnabled: boolean;
  draftEnd: string;
  draftNote: string;
  draftStart: string;
  error: string | null;
  gaps: AgendaGap[];
  isSaving: boolean;
  occupancy: number;
  onBlockDay: () => void;
  onClose: () => void;
  onNewAppointment: () => void;
  onReset: () => void;
  onSave: () => void;
  onSetDraftEnabled: (value: boolean) => void;
  onSetDraftEnd: (value: string) => void;
  onSetDraftNote: (value: string) => void;
  onSetDraftStart: (value: string) => void;
  open: boolean;
  resourceName: string;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.modalBackdrop}>
        <View style={styles.panel}>
          <View style={styles.panelHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Pannello operativo</Text>
              <Text style={styles.panelTitle}>{dateLabel}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={colors.brandInk} name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.panelScroll}>
            <View style={styles.panelStats}>
              <MetricPill icon="speedometer-outline" label={`${occupancy}% pieno`} />
              <MetricPill icon="people-outline" label={resourceName} />
              <MetricPill icon="time-outline" label={`${gaps.length} buchi`} />
            </View>

            <View style={styles.quickGrid}>
              <QuickAction icon="ban-outline" label="Blocca slot" onPress={onBlockDay} />
              <QuickAction icon="cafe-outline" label="Aggiungi pausa" onPress={() => onSetDraftNote("Pausa extra")} />
              <QuickAction icon="copy-outline" label="Copia orari" onPress={() => onSetDraftNote("Orari copiati da giorno tipo")} />
            </View>

            <Pressable onPress={() => onSetDraftEnabled(!draftEnabled)} style={[styles.availabilitySwitch, draftEnabled ? styles.availabilitySwitchActive : null]}>
              <View>
                <Text style={styles.switchTitle}>Disponibilita giornata</Text>
                <Text style={styles.switchMeta}>{draftEnabled ? `${draftStart} - ${draftEnd}` : "Chiusura straordinaria"}</Text>
              </View>
              <Text style={styles.switchValue}>{draftEnabled ? "Aperto" : "Chiuso"}</Text>
            </Pressable>

            {draftEnabled ? (
              <View style={styles.hoursRow}>
                <View style={styles.hoursField}>
                  <Text style={styles.inputLabel}>Dalle</Text>
                  <TextInput onChangeText={onSetDraftStart} placeholder="09:00" placeholderTextColor={colors.textSoft} style={styles.input} value={draftStart} />
                </View>
                <View style={styles.hoursField}>
                  <Text style={styles.inputLabel}>Alle</Text>
                  <TextInput onChangeText={onSetDraftEnd} placeholder="19:00" placeholderTextColor={colors.textSoft} style={styles.input} value={draftEnd} />
                </View>
              </View>
            ) : null}

            <View style={styles.noteWrap}>
              <Text style={styles.inputLabel}>Nota interna</Text>
              <TextInput
                multiline
                onChangeText={onSetDraftNote}
                placeholder="Staff ridotto, ferie, chiusura, cabina non disponibile"
                placeholderTextColor={colors.textSoft}
                style={[styles.input, styles.noteInput]}
                value={draftNote}
              />
            </View>

            <View style={styles.panelBlock}>
              <Text style={styles.panelBlockTitle}>Preview appuntamenti</Text>
              {bookings.slice(0, 4).map((booking) => (
                <View key={booking.id} style={styles.previewRow}>
                  <Text style={styles.previewTime}>{booking.time_label}</Text>
                  <Text numberOfLines={1} style={styles.previewText}>{booking.client_name ?? "Cliente"} · {booking.service_name}</Text>
                </View>
              ))}
              {bookings.length === 0 ? <Text style={styles.mutedText}>Nessuna prenotazione in questa vista.</Text> : null}
            </View>

            <View style={styles.panelBlock}>
              <Text style={styles.panelBlockTitle}>Booking intelligence</Text>
              {gaps.slice(0, 3).map((gap) => (
                <View key={`${gap.start}-${gap.end}`} style={styles.intelligenceRow}>
                  <Ionicons color="#9A641E" name="sparkles-outline" size={15} />
                  <Text style={styles.intelligenceText}>Slot da {gap.duration} min alle {gap.start}: proponi trattamento breve o lista attesa.</Text>
                </View>
              ))}
              {gaps.length === 0 ? <Text style={styles.mutedText}>Nessun buco rilevante. Giornata compatta.</Text> : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.panelActions}>
              <PrimaryButton label="Ripristina default" onPress={onReset} variant="secondary" />
              <PrimaryButton disabled={isSaving} label={isSaving ? "Salvataggio..." : "Salva giornata"} onPress={onSave} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <Ionicons color={colors.brandInk} name={icon} size={19} />
      <Text style={styles.quickActionText}>{label}</Text>
    </Pressable>
  );
}

function BookingEditorModal({
  actionLoading,
  booking,
  error,
  loading,
  onCancelBooking,
  onClose,
  onSave,
  onSelectSlot,
  selectedSlotId,
  slots,
}: {
  actionLoading: boolean;
  booking: Booking | null;
  error: string | null;
  loading: boolean;
  onCancelBooking: (booking: Booking) => void;
  onClose: () => void;
  onSave: () => void;
  onSelectSlot: (slotId: string) => void;
  selectedSlotId: string | null;
  slots: BookingSlot[];
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={booking !== null}>
      <View style={styles.modalBackdrop}>
        <View style={styles.panel}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Modifica appuntamento</Text>
              <Text style={styles.panelTitle}>{booking?.client_name ?? "Cliente"}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color={colors.brandInk} name="close" size={20} />
            </Pressable>
          </View>

          <Text style={styles.mutedText}>{booking?.service_name} · attuale {booking?.time_label}</Text>
          {loading ? <ActivityIndicator color={colors.brandDark} style={styles.modalLoader} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && slots.length === 0 && !error ? <EmptyState title="Nessuno slot disponibile" text="Prova un altro giorno o riduci la durata." /> : null}

          <ScrollView contentContainerStyle={styles.slotList}>
            {slots.map((slot) => (
              <Pressable key={slot.id} onPress={() => onSelectSlot(slot.id)} style={[styles.slotRow, selectedSlotId === slot.id ? styles.slotRowActive : null]}>
                <View>
                  <Text style={styles.slotTitle}>{slot.time_label}</Text>
                  <Text style={styles.slotMeta}>{slot.availability_label}</Text>
                </View>
                <Ionicons color={selectedSlotId === slot.id ? colors.brandDark : colors.textSoft} name={selectedSlotId === slot.id ? "radio-button-on" : "radio-button-off"} size={20} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.panelActions}>
            <PrimaryButton
              label="Annulla prenotazione"
              onPress={() => {
                if (booking) onCancelBooking(booking);
              }}
              variant="secondary"
            />
            <PrimaryButton disabled={actionLoading || !selectedSlotId} label={actionLoading ? "Salvataggio..." : "Salva modifica"} onPress={onSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AgendaSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonLine} />
      ))}
    </View>
  );
}

function EmptyState({ text, title }: { text: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons color={colors.textSoft} name="calendar-clear-outline" size={26} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    paddingBottom: 112,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  hero: {
    backgroundColor: "#FFFDF8",
    borderColor: "rgba(23,63,74,0.07)",
    borderRadius: radius.xxl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    ...textStyles.eyebrow,
    color: colors.brandDark,
  },
  title: {
    color: colors.brandInk,
    fontSize: 31,
    fontWeight: "700",
    lineHeight: 36,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  metricPill: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.round,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  metricPillText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "700",
  },
  smartAlert: {
    alignItems: "center",
    backgroundColor: "#FFF3DE",
    borderColor: "rgba(154,100,30,0.12)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  smartAlertText: {
    color: "#8A5A22",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  viewSwitcher: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.xs,
  },
  viewSwitcherItem: {
    alignItems: "center",
    borderRadius: radius.lg,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 48,
  },
  viewSwitcherItemActive: {
    backgroundColor: colors.surfaceSky,
  },
  viewSwitcherText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  viewSwitcherTextActive: {
    color: colors.brandInk,
  },
  resourcePanel: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  globalResourceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.07)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    padding: spacing.md,
  },
  globalResourceCardActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.overlayBorder,
  },
  globalResourceTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  globalResourceCount: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  resourceSection: {
    gap: spacing.xs,
  },
  resourceSectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  staffRail: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  staffCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.07)",
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 64,
    minWidth: 154,
    paddingHorizontal: spacing.sm,
  },
  staffCardActive: {
    backgroundColor: colors.brandInk,
    borderColor: colors.brandInk,
  },
  staffAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceLavender,
    borderRadius: radius.round,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  staffAvatarText: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  staffCopy: {
    flex: 1,
  },
  staffName: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
  },
  staffNameActive: {
    color: colors.surface,
  },
  staffMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  staffMetaActive: {
    color: "rgba(255,255,255,0.76)",
  },
  availabilityDot: {
    backgroundColor: colors.success,
    borderRadius: radius.round,
    height: 8,
    width: 8,
  },
  availabilityBusy: {
    backgroundColor: colors.warning,
  },
  roomRail: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  roomCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 82,
    minWidth: 142,
    padding: spacing.md,
  },
  roomCardActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.overlayBorder,
  },
  roomCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  roomName: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  roomStatusDot: {
    backgroundColor: colors.success,
    borderRadius: radius.round,
    height: 8,
    width: 8,
  },
  roomStatusBusy: {
    backgroundColor: colors.warning,
  },
  roomMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  roomCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  resourceEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  surface: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(23,63,74,0.07)",
    borderRadius: radius.xxl,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 3,
    textTransform: "capitalize",
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthTitleWrap: {
    alignItems: "center",
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 42,
  },
  weekHeader: {
    flexDirection: "row",
    gap: 5,
    marginBottom: spacing.xs,
  },
  weekHeaderText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  dayCell: {
    backgroundColor: colors.surfaceSoft,
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "13.48%",
    minHeight: 92,
    padding: 7,
  },
  dayCellSelected: {
    backgroundColor: colors.surfaceSky,
    borderColor: "rgba(47,126,132,0.28)",
  },
  dayCellToday: {
    borderColor: colors.brandDark,
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayCellTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  dayNumberSelected: {
    color: colors.brandInk,
  },
  dayCellMeta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },
  dayCellMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
  },
  dayBookingDot: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.round,
    height: 6,
    width: 6,
  },
  dayProgressTrack: {
    backgroundColor: "rgba(23,63,74,0.08)",
    borderRadius: radius.round,
    height: 5,
    marginTop: 7,
    overflow: "hidden",
  },
  dayProgressFill: {
    borderRadius: radius.round,
    height: "100%",
  },
  dayCellBottom: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 6,
  },
  monthSummary: {
    borderTopColor: "rgba(23,63,74,0.08)",
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  monthSummaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  monthSummaryTitle: {
    color: colors.brandInk,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
    textTransform: "capitalize",
  },
  monthSummaryCount: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
  },
  monthBookingList: {
    gap: spacing.xs,
  },
  occupancyRing: {
    alignItems: "center",
    borderRadius: radius.round,
    borderWidth: 4,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  occupancyRingText: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
  },
  timeline: {
    position: "relative",
  },
  timelineRule: {
    backgroundColor: "rgba(23,63,74,0.08)",
    bottom: spacing.md,
    left: 49,
    position: "absolute",
    top: spacing.md,
    width: 2,
  },
  timelineRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timeColumn: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: 58,
  },
  timeText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  timeEnd: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  timelineDot: {
    borderColor: colors.surface,
    borderRadius: radius.round,
    borderWidth: 3,
    height: 17,
    marginTop: spacing.xs,
    width: 17,
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderLeftWidth: 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
    ...shadows.soft,
  },
  appointmentTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  appointmentMain: {
    flex: 1,
  },
  clientName: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
  serviceName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: radius.round,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  appointmentMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  infoChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    flexDirection: "row",
    gap: 4,
    maxWidth: "48%",
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  infoChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  appointmentActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.brandInk,
    borderRadius: radius.lg,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  primaryActionDisabled: {
    backgroundColor: colors.textSoft,
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 44,
  },
  morePanel: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  moreAction: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  moreActionText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  saving: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
  freeSlotCard: {
    alignItems: "center",
    backgroundColor: "#F2FAF7",
    borderColor: "rgba(125,183,159,0.24)",
    borderRadius: radius.xl,
    borderStyle: "dashed",
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  freeSlotTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  freeSlotMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  breakCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xl,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.md,
  },
  breakText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  compactBookingCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  compactBookingTime: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    minWidth: 58,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  compactBookingHour: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  compactBookingDuration: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  compactBookingBody: {
    flex: 1,
  },
  compactBookingClient: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  compactBookingService: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  compactBookingMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 48,
  },
  listRows: {
    gap: spacing.xs,
  },
  listRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  listTime: {
    width: 58,
  },
  listTimeText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  listDateText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  listMain: {
    flex: 1,
  },
  listClient: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  listService: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  listMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  listActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  statusDot: {
    borderRadius: radius.round,
    height: 8,
    width: 8,
  },
  rowIconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  resourceBoard: {
    gap: spacing.sm,
  },
  resourceCard: {
    backgroundColor: colors.surface,
    borderColor: "rgba(23,63,74,0.06)",
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  resourceCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resourceCardName: {
    color: colors.brandInk,
    fontSize: 17,
    fontWeight: "800",
  },
  resourceCardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  resourcePercent: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
  },
  resourceProgress: {
    backgroundColor: "rgba(23,63,74,0.08)",
    borderRadius: radius.round,
    height: 7,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  resourceProgressFill: {
    borderRadius: radius.round,
    height: "100%",
  },
  resourceCardBottom: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  resourceMiniList: {
    gap: 6,
    marginTop: spacing.sm,
  },
  resourceMiniRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  resourceMiniTime: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
    width: 45,
  },
  resourceMiniText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  resourceEmptyLine: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  roomStatusPill: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  roomStatusPillBusy: {
    backgroundColor: "#FFF2E2",
  },
  roomStatusPillFree: {
    backgroundColor: "#EAF5F2",
  },
  roomStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  roomStatusPillTextBusy: {
    color: "#8A5A22",
  },
  roomStatusPillTextFree: {
    color: colors.success,
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.brandInk,
    borderRadius: radius.round,
    bottom: spacing.xxl,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 58,
    paddingHorizontal: spacing.xl,
    position: "absolute",
    right: spacing.lg,
    ...shadows.floating,
  },
  fabText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
  },
  modalBackdrop: {
    backgroundColor: "rgba(23,63,74,0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    maxHeight: "92%",
    maxWidth: 620,
    padding: spacing.md,
    width: "100%",
  },
  panelHandle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: radius.round,
    height: 4,
    marginBottom: spacing.md,
    width: 42,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  panelTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 4,
    textTransform: "capitalize",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  panelScroll: {
    paddingBottom: spacing.md,
  },
  panelStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    flexBasis: "48.5%",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
  },
  quickActionText: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  availabilitySwitch: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  availabilitySwitchActive: {
    backgroundColor: colors.surfaceSky,
  },
  switchTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  switchMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  switchValue: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  hoursRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  hoursField: {
    flex: 1,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  noteWrap: {
    marginTop: spacing.md,
  },
  noteInput: {
    minHeight: 90,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  panelBlock: {
    marginTop: spacing.lg,
  },
  panelBlockTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  previewRow: {
    alignItems: "center",
    borderBottomColor: "rgba(23,63,74,0.06)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  previewTime: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
    width: 48,
  },
  previewText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  intelligenceRow: {
    alignItems: "center",
    backgroundColor: "#FFF3DE",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  intelligenceText: {
    color: "#8A5A22",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  panelActions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  slotList: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  slotRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: "transparent",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  slotRowActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brandDark,
  },
  slotTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  slotMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  modalLoader: {
    marginVertical: spacing.md,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  skeletonWrap: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  skeletonLine: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: radius.lg,
    height: 58,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
});
