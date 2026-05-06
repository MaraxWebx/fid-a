import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  cancelBooking,
  getCenterBookingSlots,
  getCenterBookings,
  updateBooking,
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
    if (!booking.start_time || booking.status === "canceled") {
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
        <SectionCard eyebrow="Lista appuntamenti" title={`${agendaBookings.length} prenotazioni`}>
          {agendaLoading ? <ActivityIndicator color={colors.brand} /> : null}
          {agendaError ? <Text style={styles.error}>{agendaError}</Text> : null}
          {!agendaLoading && agendaBookings.length === 0 ? (
            <Text style={styles.toggleMeta}>Nessuna prenotazione registrata.</Text>
          ) : null}
          <View style={styles.agendaList}>
            {agendaBookingsSorted.map((booking) => (
              <Pressable
                key={booking.id}
                onPress={() => setBookingDetailId(booking.id)}
                style={styles.agendaRow}
              >
                <View style={styles.agendaDate}>
                  <Text style={styles.agendaDateDay}>{booking.date_label ?? "n/a"}</Text>
                  <Text style={styles.agendaDateTime}>{booking.time_label ?? "--:--"}</Text>
                </View>
                <View style={styles.agendaMain}>
                  <Text style={styles.bookingTitle}>{booking.service_name}</Text>
                  <Text style={styles.bookingMeta}>
                    {booking.client_name ?? "Cliente"} - {booking.operator_name}
                  </Text>
                </View>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    if (booking.start_time) {
                      const bookingDate = new Date(booking.start_time);
                      setVisibleMonth(bookingDate);
                      handleSelectDay(
                        buildCalendarDay(
                          center,
                          bookingDate,
                          bookingDate,
                          buildBookingCountMap(agendaBookings),
                        ),
                      );
                    }
                  }}
                  style={styles.manageDayButton}
                >
                  <Text style={styles.manageDayText}>Giorno</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        </SectionCard>
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
                  {bookings.map((booking) => (
                    <Pressable
                      key={booking.id}
                      onPress={() => setBookingDetailId(booking.id)}
                      style={styles.bookingCard}
                    >
                      <View style={styles.bookingHead}>
                        <View style={styles.bookingMetaWrap}>
                          <Text style={styles.bookingTitle}>{booking.service_name}</Text>
                          <Text style={styles.bookingMeta}>
                            {booking.time_label} - {booking.client_name ?? "Cliente"}
                          </Text>
                          <Text style={styles.bookingMeta}>
                            {booking.client_phone ?? "Telefono non disponibile"}
                          </Text>
                        </View>
                        {booking.status !== "confirmed" ? (
                          <Text
                            style={[
                              styles.bookingStatus,
                              booking.status === "canceled" && styles.bookingStatusCanceled,
                            ]}
                          >
                            {booking.status}
                          </Text>
                        ) : null}
                      </View>

                      {booking.status !== "canceled" ? (
                        <View style={styles.bookingActions}>
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              setBookingEditor(booking);
                            }}
                          >
                            <Text style={styles.linkAction}>Modifica slot</Text>
                          </Pressable>
                          <Pressable
                            disabled={bookingActionLoading}
                            onPress={(event) => {
                              event.stopPropagation();
                              void handleCancelBooking(booking);
                            }}
                          >
                            <Text style={[styles.linkAction, styles.linkDanger]}>
                              Annulla
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>
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
  viewToggle: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.xs,
  },
  viewToggleItem: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44,
  },
  viewToggleActive: {
    backgroundColor: colors.surfaceSky,
  },
  viewToggleLabel: {
    color: colors.textMuted,
    fontSize: 13,
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
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 38,
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
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: "13.45%",
    minHeight: 76,
    padding: spacing.xs,
  },
  dateCardSelected: {
    borderColor: colors.brandDark,
    borderWidth: 2,
  },
  dateCardMuted: {
    opacity: 0.45,
  },
  dateCardClosed: {
    opacity: 0.55,
  },
  bookingBadge: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 999,
    marginTop: spacing.xs,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bookingBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
  },
  agendaList: {
    gap: spacing.sm,
  },
  agendaRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
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
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: "92%",
    maxWidth: 560,
    padding: spacing.lg,
    width: "100%",
  },
  bookingModalCard: {
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
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
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
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  slotRowActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
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
