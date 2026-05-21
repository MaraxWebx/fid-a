import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { PrimaryButton } from "../components/PrimaryButton";
import { CenterBookingDetailModal } from "../components/CenterBookingDetailModal";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import {
  AppointmentState,
  AppointmentStatus,
  AppointmentStatusAction,
  getAppointmentTemporalState,
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
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import type {
  ActivationStatus,
  Booking,
  BookingSlot,
  Center,
} from "../types/api";

type CenterCalendarScreenProps = {
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
};

type CalendarDay = {
  dateKey: string;
  dateNumber: string;
  label: string;
  weekdayKey: string;
  isCurrentMonth: boolean;
  defaultEnabled: boolean;
  defaultStart: string;
  defaultEnd: string;
  bookingsCount: number;
  override?: {
    enabled: boolean;
    start: string | null;
    end: string | null;
    note?: string | null;
  };
};

type CalendarViewMode = "calendar" | "list";

const weekdayMap = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const weekdayHeaders = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const treatmentTones = {
  viso: {
    accent: "#B9E7F6",
    background: "#EEF9FD",
    icon: "sparkles-outline",
    label: "Viso",
    text: "#2F6F8C",
  },
  unghie: {
    accent: "#A9D8FF",
    background: "#EAF6FF",
    icon: "color-palette-outline",
    label: "Unghie",
    text: "#326A9C",
  },
  lashes: {
    accent: "#B8CBE8",
    background: "#EEF4FC",
    icon: "eye-outline",
    label: "Brows & lashes",
    text: "#435F87",
  },
  massaggi: {
    accent: "#B7EEF4",
    background: "#ECFBFD",
    icon: "leaf-outline",
    label: "Massaggi",
    text: "#347B87",
  },
  default: {
    accent: colors.brand,
    background: colors.surfaceSky,
    icon: "rose-outline",
    label: "Beauty",
    text: colors.brandInk,
  },
} as const;

function formatDateKey(date: Date) {
  return toLocalDateKey(date);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function buildBookingCountMap(bookings: Booking[]) {
  const counts = new Map<string, number>();

  bookings.forEach((booking) => {
    if (!booking.start_time || !isAppointmentActive(normalizeAppointmentState(booking.status, booking.is_delayed).status)) {
      return;
    }
    const dateKey = formatDateKey(new Date(booking.start_time));
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  });

  return counts;
}

function buildCalendarDay(
  center: Center,
  date: Date,
  visibleMonth: Date,
  bookingCounts: Map<string, number>,
): CalendarDay {
  const overrides = center.availability_overrides ?? {};
  const weekdayKey = weekdayMap[date.getDay()];
  const dateKey = formatDateKey(date);
  const defaultEnabled = center.opening_days?.includes(weekdayKey) ?? false;
  const baseHours = center.opening_hours?.[weekdayKey];

  return {
    dateKey,
    dateNumber: String(date.getDate()),
    label: formatDateLabel(date),
    weekdayKey,
    isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
    defaultEnabled,
    defaultStart: baseHours?.start ?? "09:00",
    defaultEnd: baseHours?.end ?? "19:00",
    bookingsCount: bookingCounts.get(dateKey) ?? 0,
    override: overrides[dateKey],
  };
}

function buildMonthCalendarDays(
  center: Center,
  visibleMonth: Date,
  bookings: Booking[],
): CalendarDay[] {
  const bookingCounts = buildBookingCountMap(bookings);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, offset) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + offset);
    return buildCalendarDay(center, date, visibleMonth, bookingCounts);
  });
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTreatmentTone(service: string) {
  const value = service.toLowerCase();
  if (value.includes("viso") || value.includes("facial") || value.includes("glow")) {
    return treatmentTones.viso;
  }
  if (value.includes("ungh") || value.includes("manicure") || value.includes("pedicure")) {
    return treatmentTones.unghie;
  }
  if (
    value.includes("laminazione") ||
    value.includes("brow") ||
    value.includes("lash") ||
    value.includes("ciglia")
  ) {
    return treatmentTones.lashes;
  }
  if (value.includes("massaggio") || value.includes("relax")) {
    return treatmentTones.massaggi;
  }
  return treatmentTones.default;
}

function getBookingDurationLabel(booking: Booking) {
  if (!booking.start_time || !booking.end_time) {
    return "60 min";
  }

  const start = new Date(booking.start_time).getTime();
  const end = new Date(booking.end_time).getTime();
  const minutes = Math.round((end - start) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} min` : "60 min";
}

export function CenterCalendarScreen({
  center,
  onCenterUpdated,
}: CenterCalendarScreenProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("calendar");
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    formatDateKey(new Date()),
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftStart, setDraftStart] = useState("09:00");
  const [draftEnd, setDraftEnd] = useState("19:00");
  const [draftNote, setDraftNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingEditor, setBookingEditor] = useState<Booking | null>(null);
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [bookingSlotsLoading, setBookingSlotsLoading] = useState(false);
  const [bookingSlotsError, setBookingSlotsError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [bookingDetailId, setBookingDetailId] = useState<string | null>(null);
  const [agendaBookings, setAgendaBookings] = useState<Booking[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  const calendarDays = useMemo(
    () => buildMonthCalendarDays(center, visibleMonth, agendaBookings),
    [agendaBookings, center, visibleMonth],
  );

  const selectedDay =
    calendarDays.find((day) => day.dateKey === selectedDateKey) ??
    buildCalendarDay(center, new Date(), visibleMonth, buildBookingCountMap(agendaBookings));

  const agendaBookingsSorted = useMemo(
    () => {
      const now = Date.now();
      return [...agendaBookings].sort((left, right) => {
        const leftTime = left.start_time ? new Date(left.start_time).getTime() : 0;
        const rightTime = right.start_time ? new Date(right.start_time).getTime() : 0;
        const leftFuture = leftTime >= now;
        const rightFuture = rightTime >= now;

        if (leftFuture && !rightFuture) return -1;
        if (!leftFuture && rightFuture) return 1;

        return leftFuture ? leftTime - rightTime : rightTime - leftTime;
      });
    },
    [agendaBookings],
  );

  const loadDayBookings = async (dateKey: string) => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const response = await getCenterBookings(center.id, dateKey);
      setBookings(response);
    } catch {
      setBookingsError("Impossibile caricare le prenotazioni del giorno.");
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadAgendaBookings = async () => {
    setAgendaLoading(true);
    setAgendaError(null);
    try {
      const response = await getCenterBookings(center.id);
      setAgendaBookings(response);
    } catch {
      setAgendaError("Impossibile caricare la lista appuntamenti.");
    } finally {
      setAgendaLoading(false);
    }
  };

  useEffect(() => {
    void loadAgendaBookings();
  }, [center.id]);

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

  useEffect(() => {
    if (!isEditorOpen || !selectedDay) {
      return;
    }

    void loadDayBookings(selectedDay.dateKey);
  }, [isEditorOpen, selectedDay, center.id]);

  useEffect(() => {
    if (!bookingEditor || !selectedDay) {
      setBookingSlots([]);
      return;
    }

    let mounted = true;
    setBookingSlotsLoading(true);
    setBookingSlotsError(null);
    setSelectedSlotId(null);

    getCenterBookingSlots(center.id, {
      serviceId: bookingEditor.service_id,
      date: selectedDay.dateKey,
      bookingId: bookingEditor.id,
    })
      .then((response) => {
        if (!mounted) return;
        setBookingSlots(response.slots);
      })
      .catch(() => {
        if (!mounted) return;
        setBookingSlots([]);
        setBookingSlotsError("Nessuno slot disponibile per questa prenotazione.");
      })
      .finally(() => {
        if (mounted) setBookingSlotsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [bookingEditor, selectedDay, center.id]);

  if (!selectedDay) {
    return null;
  }

  const handleSelectDay = (day: CalendarDay) => {
    setSelectedDateKey(day.dateKey);
    setDraftEnabled(day.override?.enabled ?? day.defaultEnabled);
    setDraftStart(day.override?.start ?? day.defaultStart);
    setDraftEnd(day.override?.end ?? day.defaultEnd);
    setDraftNote(day.override?.note ?? "");
    setBookings([]);
    setBookingsError(null);
    setBookingEditor(null);
    setSelectedSlotId(null);
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
      await loadDayBookings(selectedDay.dateKey);
      await loadAgendaBookings();
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
      await loadDayBookings(selectedDay.dateKey);
      await loadAgendaBookings();
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

  const handleUpdateBooking = async () => {
    if (!bookingEditor || !selectedSlotId) {
      setBookingSlotsError("Seleziona un nuovo orario.");
      return;
    }

    setBookingActionLoading(true);
    setBookingSlotsError(null);

    try {
      await updateBooking(bookingEditor.id, {
        role: "center",
        center_id: center.id,
        service_id: bookingEditor.service_id,
        slot_id: selectedSlotId,
      });
      setBookingEditor(null);
      await loadDayBookings(selectedDay.dateKey);
      await loadAgendaBookings();
    } catch (updateError) {
      setBookingSlotsError(
        updateError instanceof Error
          ? updateError.message
          : "Modifica prenotazione non riuscita.",
      );
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setBookingActionLoading(true);
    setBookingSlotsError(null);
    try {
      await cancelBooking({
        bookingId: booking.id,
        role: "center",
        centerId: center.id,
      });
      if (bookingEditor?.id === booking.id) {
        setBookingEditor(null);
      }
      await loadDayBookings(selectedDay.dateKey);
      await loadAgendaBookings();
    } catch (cancelError) {
      setBookingSlotsError(
        cancelError instanceof Error
          ? cancelError.message
          : "Annullamento prenotazione non riuscito.",
      );
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleChangeBookingStatus = async (booking: Booking, nextState: AppointmentState) => {
    setStatusSavingId(booking.id);
    setBookingsError(null);
    setAgendaError(null);

    try {
      const updatedBooking = await updateBookingStatus(booking.id, {
        center_id: center.id,
        role: "center",
        status: toApiBookingState(nextState),
      });
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? updatedBooking : item)),
      );
      setAgendaBookings((current) =>
        current.map((item) => (item.id === booking.id ? updatedBooking : item)),
      );
      await loadAgendaBookings();
      if (selectedDay?.dateKey) {
        await loadDayBookings(selectedDay.dateKey);
      }
    } catch {
      setAgendaError("Aggiornamento stato appuntamento non riuscito.");
    } finally {
      setStatusSavingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Agenda centro"
        title="Agenda"
        subtitle="Gestisci disponibilita e appuntamenti con vista calendario o lista."
      />

      <View style={styles.viewToggle}>
        <Pressable
          onPress={() => setViewMode("calendar")}
          style={[styles.viewToggleItem, viewMode === "calendar" && styles.viewToggleActive]}
        >
          <Ionicons
            color={viewMode === "calendar" ? colors.brandDark : colors.textMuted}
            name="calendar-outline"
            size={18}
          />
          <Text
            style={[
              styles.viewToggleLabel,
              viewMode === "calendar" && styles.viewToggleLabelActive,
            ]}
          >
            Calendario
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("list")}
          style={[styles.viewToggleItem, viewMode === "list" && styles.viewToggleActive]}
        >
          <Ionicons
            color={viewMode === "list" ? colors.brandDark : colors.textMuted}
            name="list-outline"
            size={18}
          />
          <Text
            style={[
              styles.viewToggleLabel,
              viewMode === "list" && styles.viewToggleLabelActive,
            ]}
          >
            Lista
          </Text>
        </Pressable>
      </View>

      {viewMode === "calendar" ? (
        <SectionCard eyebrow="Calendario" title={formatMonthLabel(visibleMonth)}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
              style={styles.monthButton}
            >
              <Ionicons color={colors.brandDark} name="chevron-back" size={18} />
            </Pressable>
            <Pressable
              onPress={() => {
                const today = new Date();
                setVisibleMonth(today);
                setSelectedDateKey(formatDateKey(today));
              }}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Oggi</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              style={styles.monthButton}
            >
              <Ionicons color={colors.brandDark} name="chevron-forward" size={18} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {weekdayHeaders.map((weekday) => (
              <Text key={weekday} style={styles.weekHeaderText}>
                {weekday}
              </Text>
            ))}
          </View>

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
                    !day.isCurrentMonth && styles.dateCardMuted,
                    !effectiveEnabled && styles.dateCardClosed,
                  ]}
                >
                  <Text style={styles.dateWeekday}>{day.weekdayKey}</Text>
                  <Text style={styles.dateLabel}>{day.dateNumber}</Text>
                  {day.bookingsCount > 0 ? (
                    <View style={styles.bookingBadge}>
                      <Text style={styles.bookingBadgeText}>{day.bookingsCount}</Text>
                    </View>
                  ) : (
                    <Text style={styles.dateState}>
                      {effectiveEnabled ? "Aperto" : "Chiuso"}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </SectionCard>
      ) : (
        <View style={styles.premiumAgendaSection}>
          <View style={styles.premiumAgendaHeader}>
            <View>
              <Text style={styles.premiumKicker}>Lista appuntamenti</Text>
              <Text style={styles.premiumTitle}>{agendaBookings.length} prenotazioni</Text>
            </View>
            <View style={styles.premiumHeaderPill}>
              <Ionicons color="#4D7D9B" name="sparkles-outline" size={15} />
              <Text style={styles.premiumHeaderPillText}>timeline</Text>
            </View>
          </View>
          {agendaLoading ? <ActivityIndicator color={colors.brand} /> : null}
          {agendaError ? <Text style={styles.error}>{agendaError}</Text> : null}
          {!agendaLoading && agendaBookings.length === 0 ? (
            <Text style={styles.toggleMeta}>Nessuna prenotazione registrata.</Text>
          ) : null}
          <View style={styles.premiumTimeline}>
            <View style={styles.timelineLine} />
            {agendaBookingsSorted.map((booking, index) => (
              <AppointmentTimelineCard
                booking={booking}
                isLast={index === agendaBookingsSorted.length - 1}
                key={booking.id}
                onChangeStatus={(nextState) => void handleChangeBookingStatus(booking, nextState)}
                saving={statusSavingId === booking.id}
              />
            ))}
          </View>
        </View>
      )}

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

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Pressable
                onPress={() => setDraftEnabled((current) => !current)}
                style={[
                  styles.toggleRow,
                  draftEnabled && styles.toggleRowActive,
                ]}
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

              <View style={styles.bookingsBlock}>
                <Text style={styles.bookingsTitle}>Prenotazioni del giorno</Text>
                {bookingsLoading ? <ActivityIndicator color={colors.brand} /> : null}
                {bookingsError ? <Text style={styles.error}>{bookingsError}</Text> : null}
                {!bookingsLoading && bookings.length === 0 ? (
                  <Text style={styles.toggleMeta}>Nessuna prenotazione per questa data.</Text>
                ) : null}

                <View style={styles.bookingList}>
                  {bookings.map((booking, index) => (
                    <AppointmentTimelineCard
                      booking={booking}
                      isCompact
                      isLast={index === bookings.length - 1}
                      key={booking.id}
                      onChangeStatus={(nextState) => void handleChangeBookingStatus(booking, nextState)}
                      onEditSlot={() => setBookingEditor(booking)}
                      saving={statusSavingId === booking.id || bookingActionLoading}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setBookingEditor(null)}
        transparent
        visible={bookingEditor !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.bookingModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Modifica prenotazione</Text>
                <Text style={styles.modalTitle}>
                  {bookingEditor?.client_name ?? "Cliente"}
                </Text>
              </View>
              <Pressable onPress={() => setBookingEditor(null)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <Text style={styles.modalMeta}>
              {bookingEditor?.service_name} - attuale {bookingEditor?.time_label}
            </Text>

            {bookingSlotsLoading ? <ActivityIndicator color={colors.brand} /> : null}
            {bookingSlotsError ? <Text style={styles.error}>{bookingSlotsError}</Text> : null}
            {!bookingSlotsLoading && bookingSlots.length === 0 && !bookingSlotsError ? (
              <Text style={styles.toggleMeta}>Nessuno slot disponibile.</Text>
            ) : null}

            <View style={styles.slotList}>
              {bookingSlots.map((slot) => (
                <Pressable
                  key={slot.id}
                  onPress={() => setSelectedSlotId(slot.id)}
                  style={[
                    styles.slotRow,
                    selectedSlotId === slot.id && styles.slotRowActive,
                  ]}
                >
                  <View>
                    <Text style={styles.slotTitle}>{slot.time_label}</Text>
                    <Text style={styles.slotMeta}>{slot.availability_label}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      selectedSlotId === slot.id && styles.radioActive,
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="Annulla prenotazione"
                onPress={() => {
                  if (bookingEditor) {
                    void handleCancelBooking(bookingEditor);
                  }
                }}
                variant="secondary"
              />
              <PrimaryButton
                disabled={bookingActionLoading || !selectedSlotId}
                label={bookingActionLoading ? "Salvataggio..." : "Salva modifica"}
                onPress={() => {
                  void handleUpdateBooking();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      <CenterBookingDetailModal
        bookingId={bookingDetailId}
        centerId={center.id}
        onClose={() => setBookingDetailId(null)}
      />
    </ScrollView>
  );
}

function AppointmentTimelineCard({
  booking,
  isCompact = false,
  isLast,
  onChangeStatus,
  onEditSlot,
  saving,
}: {
  booking: Booking;
  isCompact?: boolean;
  isLast: boolean;
  onChangeStatus: (state: AppointmentState) => void;
  onEditSlot?: () => void;
  saving: boolean;
}) {
  const tone = getTreatmentTone(booking.service_name ?? "");
  const status = normalizeAppointmentState(booking.status, booking.is_delayed);
  const statusTone = getAppointmentStatusMeta(status);
  const temporalState = getAppointmentTemporalState(
    { endTime: booking.end_time, startTime: booking.start_time },
    new Date(),
  );
  const primaryAction = getPrimaryAppointmentAction(status);
  const secondaryActions = getSecondaryAppointmentActions(status);
  const scale = useRef(new Animated.Value(1)).current;
  const [moreOpen, setMoreOpen] = useState(false);

  const handleActionPress = (action: AppointmentStatusAction) => {
    Animated.sequence([
      Animated.timing(scale, {
        duration: 90,
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        friction: 5,
        tension: 100,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    onChangeStatus(action.nextState);
  };

  return (
    <Animated.View
      style={[
        styles.timelineAppointmentRow,
        isLast ? styles.timelineAppointmentRowLast : null,
        temporalState === "past" ? styles.timelineAppointmentRowPast : null,
        temporalState === "current" ? styles.timelineAppointmentRowCurrent : null,
        status.isDelayed ? styles.timelineAppointmentRowDelayed : null,
        { transform: [{ scale }] },
      ]}
    >
      <View style={styles.timelineTimeColumn}>
        <Text style={styles.timelineTime}>{booking.time_label ?? "--:--"}</Text>
        <Text style={styles.timelineTemporalLabel}>
          {temporalState === "current"
            ? "ora"
            : temporalState === "past"
              ? "passato"
              : temporalState === "upcoming"
                ? "prossimo"
                : ""}
        </Text>
        <View style={[styles.timelineNode, { borderColor: tone.accent }]}>
          <View style={[styles.timelineNodeCore, { backgroundColor: tone.accent }]} />
        </View>
      </View>

      <View style={[styles.timelineCard, isCompact ? styles.timelineCardCompact : null]}>
        <View style={styles.timelineCardHeader}>
          <View style={styles.timelineClientBlock}>
            <Text style={styles.timelineClient}>{booking.client_name ?? "Cliente"}</Text>
            <Text style={styles.timelineSubMeta}>
              {getBookingDurationLabel(booking)} · {booking.date_label ?? "oggi"}
            </Text>
          </View>
          <View style={[styles.timelineStatusBadge, { backgroundColor: statusTone.background }]}>
            <Ionicons color={statusTone.text} name={statusTone.icon} size={13} />
            <Text style={[styles.timelineStatusText, { color: statusTone.text }]}>
              {statusTone.label}
            </Text>
          </View>
        </View>

        <View style={styles.timelineServiceRow}>
          <View style={[styles.timelineServiceIcon, { backgroundColor: tone.background }]}>
            <Ionicons color={tone.text} name={tone.icon} size={15} />
          </View>
          <Text style={styles.timelineServiceName}>{booking.service_name}</Text>
        </View>

        <View style={styles.timelineMetaRow}>
          <View style={styles.timelineDurationChip}>
            <Ionicons color="#4D7D9B" name="hourglass-outline" size={13} />
            <Text style={styles.timelineDurationText}>{getBookingDurationLabel(booking)}</Text>
          </View>
        </View>

        <View style={styles.timelineActions}>
          <Pressable
            disabled={saving || !primaryAction}
            onPress={() => primaryAction && handleActionPress(primaryAction)}
            style={[styles.timelinePrimaryAction, !primaryAction ? styles.timelinePrimaryActionDisabled : null]}
          >
            {primaryAction ? (
              <>
                <Ionicons
                  color={colors.surface}
                  name={getAppointmentStatusMeta(primaryAction.nextState).icon}
                  size={16}
                />
                <Text style={styles.timelinePrimaryActionText}>{primaryAction.label}</Text>
              </>
            ) : (
              <Text style={styles.timelinePrimaryActionText}>Completato</Text>
            )}
          </Pressable>
          <Pressable
            disabled={saving || secondaryActions.length === 0}
            onPress={() => setMoreOpen((current) => !current)}
            style={[
              styles.timelineMoreAction,
              secondaryActions.length === 0 ? styles.timelineMoreActionDisabled : null,
            ]}
          >
            <Ionicons color={colors.brandInk} name="ellipsis-horizontal" size={18} />
          </Pressable>
        </View>
        {moreOpen && secondaryActions.length > 0 ? (
          <View style={styles.timelineMorePanel}>
            {secondaryActions.map((action) => {
              const actionTone = getAppointmentStatusMeta(action.nextState);
              return (
                <Pressable
                  disabled={saving}
                  key={`${action.nextState.status}-${action.nextState.isDelayed ? "delayed" : "regular"}`}
                  onPress={() => {
                    setMoreOpen(false);
                    handleActionPress(action);
                  }}
                  style={styles.timelineMorePanelAction}
                >
                  <Ionicons color={actionTone.text} name={actionTone.icon} size={15} />
                  <Text style={[styles.timelineMorePanelText, { color: actionTone.text }]}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {onEditSlot && status.status !== AppointmentStatus.CANCELLED ? (
          <Pressable onPress={onEditSlot} style={styles.editSlotButton}>
            <Ionicons color="#4D7D9B" name="calendar-outline" size={14} />
            <Text style={styles.editSlotText}>Modifica slot</Text>
          </Pressable>
        ) : null}

        {saving ? <ActivityIndicator color={colors.brand} style={styles.timelineSaving} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  viewToggle: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.xs,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  viewToggleItem: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
  },
  viewToggleActive: {
    backgroundColor: "#DFF3FF",
  },
  viewToggleLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  viewToggleLabelActive: {
    color: colors.brandInk,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 38,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: "#DFF3FF",
    borderRadius: 14,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  todayButtonText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "800",
  },
  weekHeader: {
    flexDirection: "row",
    gap: 6,
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
    gap: 6,
  },
  dateCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flexBasis: "13.45%",
    minHeight: 66,
    padding: spacing.xs,
  },
  dateCardSelected: {
    backgroundColor: "#8DDCFF",
    shadowColor: "#5DBFEA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  dateCardMuted: {
    opacity: 0.45,
  },
  dateCardClosed: {
    opacity: 0.55,
  },
  bookingBadge: {
    alignItems: "center",
    backgroundColor: "#A9D8FF",
    borderRadius: 999,
    marginTop: spacing.xs,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bookingBadgeText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: "800",
  },
  premiumAgendaSection: {
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 1,
  },
  premiumAgendaHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  premiumKicker: {
    color: "#6F9DB9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  premiumTitle: {
    color: "#1F4F70",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 3,
  },
  premiumHeaderPill: {
    alignItems: "center",
    backgroundColor: "#EAF6FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  premiumHeaderPillText: {
    color: "#4D7D9B",
    fontSize: 11,
    fontWeight: "800",
  },
  premiumTimeline: {
    position: "relative",
  },
  timelineLine: {
    backgroundColor: "rgba(174, 218, 245, 0.46)",
    borderRadius: 999,
    bottom: spacing.lg,
    left: 31,
    position: "absolute",
    top: spacing.xl,
    width: 2,
  },
  timelineAppointmentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 104,
  },
  timelineAppointmentRowLast: {
    marginBottom: 0,
  },
  timelineAppointmentRowPast: {
    opacity: 0.58,
  },
  timelineAppointmentRowCurrent: {
    backgroundColor: "rgba(221, 243, 250, 0.35)",
    borderRadius: 18,
  },
  timelineAppointmentRowDelayed: {
    backgroundColor: "rgba(255, 244, 231, 0.55)",
    borderRadius: 18,
  },
  timelineTimeColumn: {
    alignItems: "center",
    paddingTop: spacing.sm,
    width: 46,
  },
  timelineTime: {
    color: "#1F4F70",
    fontSize: 14,
    fontWeight: "800",
  },
  timelineTemporalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  timelineNode: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    marginTop: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 24,
  },
  timelineNodeCore: {
    borderRadius: 7,
    height: 10,
    width: 10,
  },
  timelineCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    flex: 1,
    padding: spacing.sm,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  timelineCardCompact: {
    shadowOpacity: 0.04,
  },
  timelineCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  timelineClientBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  timelineClient: {
    color: "#183F5C",
    fontSize: 17,
    fontWeight: "800",
  },
  timelineSubMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  timelineStatusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  timelineStatusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  timelineServiceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timelineServiceIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  timelineServiceName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  timelineMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timelineDurationChip: {
    alignItems: "center",
    backgroundColor: "#F4FBFF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  timelineDurationText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  timelineCategoryChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  timelineCategoryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  timelineActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  timelinePrimaryAction: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  timelinePrimaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  timelinePrimaryActionDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  timelineMoreAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 46,
  },
  timelineMoreActionDisabled: {
    opacity: 0.42,
  },
  timelineMorePanel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  timelineMorePanelAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  timelineMorePanelText: {
    fontSize: 12,
    fontWeight: "800",
  },
  timelineAction: {
    alignItems: "center",
    backgroundColor: "rgba(244, 251, 255, 0.72)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 10,
    shadowColor: "#8EC8EA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  timelineCancelAction: {
    borderStyle: "dashed",
  },
  timelineActionText: {
    color: "#6B91AB",
    fontSize: 12,
    fontWeight: "800",
  },
  editSlotButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EAF6FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  editSlotText: {
    color: "#4D7D9B",
    fontSize: 12,
    fontWeight: "800",
  },
  timelineSaving: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
  agendaList: {
    gap: spacing.sm,
  },
  agendaRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  agendaDate: {
    width: 78,
  },
  agendaDateDay: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
  },
  agendaDateTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  agendaMain: {
    flex: 1,
  },
  manageDayButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  manageDayText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(49, 94, 114, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    maxHeight: "92%",
    maxWidth: 560,
    padding: spacing.md,
    width: "100%",
  },
  bookingModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    maxWidth: 560,
    padding: spacing.md,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalScroll: {
    paddingBottom: spacing.sm,
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
  modalMeta: {
    ...textStyles.bodyMuted,
    marginBottom: spacing.md,
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
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  toggleRowActive: {
    backgroundColor: colors.surfaceSky,
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
    borderRadius: 14,
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
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  bookingsBlock: {
    marginTop: spacing.xl,
  },
  bookingsTitle: {
    ...textStyles.titleXs,
    color: colors.text,
  },
  bookingList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: spacing.md,
  },
  bookingHead: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  bookingMetaWrap: {
    flex: 1,
  },
  bookingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  bookingMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  bookingStatus: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bookingStatusCanceled: {
    color: colors.danger,
  },
  bookingActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  linkAction: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "700",
  },
  linkDanger: {
    color: colors.danger,
  },
  slotList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slotRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  slotRowActive: {
    backgroundColor: colors.surfaceSky,
  },
  slotTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  slotMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  radio: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
});
