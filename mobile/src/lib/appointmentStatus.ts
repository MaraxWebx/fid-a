import type Ionicons from "react-native-vector-icons/Ionicons";

export enum AppointmentStatus {
  BOOKED = "BOOKED",
  CONFIRMED = "CONFIRMED",
  ARRIVED = "ARRIVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

export type AppointmentState = {
  isDelayed: boolean;
  status: AppointmentStatus;
};

export type AppointmentStatusAction = {
  label: string;
  nextState: AppointmentState;
};

export type AppointmentStatusMeta = {
  background: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
};

export type AppointmentStatusCounts = {
  active: number;
  arrived: number;
  cancelled: number;
  confirmed: number;
  completed: number;
  current: number;
  delayed: number;
  noShow: number;
  totalScheduled: number;
  upcoming: number;
  requiringAction: number;
  warnings: string[];
};

export type AppointmentTemporalState = "past" | "current" | "upcoming" | "unscheduled";

export type AppointmentCountInput = {
  endTime?: string | null;
  startTime?: string | null;
  isDelayed?: boolean | null;
  status: AppointmentStatus | string | null | undefined;
};

const statusAliases: Record<string, AppointmentStatus> = {
  booked: AppointmentStatus.BOOKED,
  prenotato: AppointmentStatus.BOOKED,
  prenotata: AppointmentStatus.BOOKED,
  confirmed: AppointmentStatus.CONFIRMED,
  confermato: AppointmentStatus.CONFIRMED,
  confermata: AppointmentStatus.CONFIRMED,
  arrived: AppointmentStatus.ARRIVED,
  arrivata: AppointmentStatus.ARRIVED,
  arrivato: AppointmentStatus.ARRIVED,
  completed: AppointmentStatus.COMPLETED,
  completato: AppointmentStatus.COMPLETED,
  completata: AppointmentStatus.COMPLETED,
  late: AppointmentStatus.CONFIRMED,
  delayed: AppointmentStatus.CONFIRMED,
  "in ritardo": AppointmentStatus.CONFIRMED,
  canceled: AppointmentStatus.CANCELLED,
  cancelled: AppointmentStatus.CANCELLED,
  annullato: AppointmentStatus.CANCELLED,
  annullata: AppointmentStatus.CANCELLED,
  "disdetta cliente": AppointmentStatus.CANCELLED,
  no_show: AppointmentStatus.NO_SHOW,
  "no-show": AppointmentStatus.NO_SHOW,
  noshow: AppointmentStatus.NO_SHOW,
};

export const statusMeta: Record<AppointmentStatus, AppointmentStatusMeta> = {
  [AppointmentStatus.BOOKED]: {
    background: "#EEF7FA",
    icon: "calendar-outline",
    label: "Prenotato",
    text: "#315E72",
  },
  [AppointmentStatus.CONFIRMED]: {
    background: "#DDF3FF",
    icon: "checkmark-circle-outline",
    label: "Confermato",
    text: "#216A8A",
  },
  [AppointmentStatus.ARRIVED]: {
    background: "#DDF7EE",
    icon: "person-circle-outline",
    label: "Arrivata",
    text: "#28745D",
  },
  [AppointmentStatus.COMPLETED]: {
    background: "#EEF2F6",
    icon: "checkmark-done-circle-outline",
    label: "Completato",
    text: "#5F7285",
  },
  [AppointmentStatus.CANCELLED]: {
    background: "#F8E8EA",
    icon: "close-circle-outline",
    label: "Annullato",
    text: "#A1424D",
  },
  [AppointmentStatus.NO_SHOW]: {
    background: "#F1ECEE",
    icon: "alert-circle-outline",
    label: "No-show",
    text: "#8A4A52",
  },
};

export function normalizeAppointmentStatus(status: string | null | undefined): AppointmentStatus {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return statusAliases[normalized] ?? AppointmentStatus.CONFIRMED;
}

export function normalizeAppointmentState(
  status: AppointmentStatus | string | null | undefined,
  isDelayed?: boolean | null,
): AppointmentState {
  const rawStatus = String(status ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const primaryStatus =
    typeof status === "string" ? normalizeAppointmentStatus(status) : status ?? AppointmentStatus.CONFIRMED;
  const canBeDelayed = [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED].includes(primaryStatus);
  return {
    isDelayed: canBeDelayed && (Boolean(isDelayed) || ["late", "delayed", "in ritardo"].includes(rawStatus)),
    status: primaryStatus,
  };
}

export function getAppointmentStatusMeta(
  status: AppointmentStatus | AppointmentState | string | null | undefined,
) {
  const state =
    typeof status === "object" && status !== null && "status" in status
      ? status
      : normalizeAppointmentState(status);

  if (state.isDelayed && isAppointmentActive(state.status)) {
    return {
      background: "#FFE9CC",
      icon: "time-outline" as const,
      label: "In ritardo",
      text: "#A15C12",
    };
  }

  return statusMeta[state.status];
}

export function isAppointmentActive(status: AppointmentStatus) {
  return [
    AppointmentStatus.BOOKED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
  ].includes(status);
}

export function appointmentRequiresAction(status: AppointmentStatus) {
  return [AppointmentStatus.BOOKED, AppointmentStatus.NO_SHOW].includes(status);
}

function parseDateTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getAppointmentTemporalState(
  appointment: Pick<AppointmentCountInput, "endTime" | "startTime">,
  now: Date,
): AppointmentTemporalState {
  const start = parseDateTime(appointment.startTime);
  const end = parseDateTime(appointment.endTime);
  const current = now.getTime();

  if (start === null) return "unscheduled";
  if (start > current) return "upcoming";
  if (end !== null && end > current) return "current";
  return "past";
}

export function appointmentRequiresImmediateAction(
  appointment: AppointmentCountInput,
  now: Date,
) {
  const state = normalizeAppointmentState(appointment.status, appointment.isDelayed);
  const status = state.status;
  const temporalState = getAppointmentTemporalState(appointment, now);

  if (state.isDelayed && isAppointmentActive(status)) return true;
  if (status === AppointmentStatus.BOOKED) return true;
  if (status === AppointmentStatus.CONFIRMED && temporalState === "upcoming") {
    const start = parseDateTime(appointment.startTime);
    return start !== null && start - now.getTime() <= 15 * 60 * 1000;
  }
  if (status === AppointmentStatus.CONFIRMED && temporalState === "past") return true;
  if (status === AppointmentStatus.ARRIVED && temporalState === "past") return true;
  return false;
}

function validateAppointmentCounts(counts: Omit<AppointmentStatusCounts, "warnings">) {
  const warnings: string[] = [];

  if (counts.totalScheduled !== counts.active) {
    warnings.push("Active appointment total does not reconcile with active primary states.");
  }
  if (counts.arrived > counts.active) {
    warnings.push("Arrived appointments exceed active appointments.");
  }
  if (counts.delayed > counts.active) {
    warnings.push("Delayed appointments exceed active appointments.");
  }
  if (counts.requiringAction > counts.active) {
    warnings.push("Urgent appointment flags exceed active appointments.");
  }

  if (warnings.length > 0) {
    console.warn("Appointment count validation warning", { counts, warnings });
  }

  return warnings;
}

export function getAppointmentStatusCounts(
  appointments: AppointmentCountInput[],
  now: Date = new Date(),
): AppointmentStatusCounts {
  const counts = appointments.reduce<Omit<AppointmentStatusCounts, "warnings">>(
    (counts, appointment) => {
      const state = normalizeAppointmentState(appointment.status, appointment.isDelayed);
      const status = state.status;
      const temporalState = getAppointmentTemporalState(appointment, now);
      const countedInSchedule = isAppointmentActive(status);

      return {
        active: counts.active + (isAppointmentActive(status) ? 1 : 0),
        arrived: counts.arrived + (status === AppointmentStatus.ARRIVED ? 1 : 0),
        cancelled: counts.cancelled + (status === AppointmentStatus.CANCELLED ? 1 : 0),
        confirmed: counts.confirmed + (status === AppointmentStatus.CONFIRMED ? 1 : 0),
        completed: counts.completed + (status === AppointmentStatus.COMPLETED ? 1 : 0),
        current: counts.current + (temporalState === "current" && isAppointmentActive(status) ? 1 : 0),
        delayed: counts.delayed + (state.isDelayed && isAppointmentActive(status) ? 1 : 0),
        noShow: counts.noShow + (status === AppointmentStatus.NO_SHOW ? 1 : 0),
        requiringAction:
          counts.requiringAction + (appointmentRequiresImmediateAction(appointment, now) ? 1 : 0),
        totalScheduled: counts.totalScheduled + (countedInSchedule ? 1 : 0),
        upcoming:
          counts.upcoming + (temporalState === "upcoming" && isAppointmentActive(status) ? 1 : 0),
      };
    },
    {
      active: 0,
      arrived: 0,
      cancelled: 0,
      confirmed: 0,
      completed: 0,
      current: 0,
      delayed: 0,
      noShow: 0,
      requiringAction: 0,
      totalScheduled: 0,
      upcoming: 0,
    },
  );

  return {
    ...counts,
    warnings: validateAppointmentCounts(counts),
  };
}

export function getNextAppointment<T extends AppointmentCountInput>(appointments: T[], now: Date) {
  const current = now.getTime();
  return [...appointments]
    .filter((appointment) => {
      const status = normalizeAppointmentStatus(
        typeof appointment.status === "string" ? appointment.status : appointment.status,
      );
      const start = parseDateTime(appointment.startTime);
      return (
        start !== null &&
        start > current &&
        ![AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW].includes(status)
      );
    })
    .sort((left, right) => (parseDateTime(left.startTime) ?? 0) - (parseDateTime(right.startTime) ?? 0))[0] ?? null;
}

export function getAppointmentActions(stateOrStatus: AppointmentState | AppointmentStatus): AppointmentStatusAction[] {
  const state =
    typeof stateOrStatus === "object"
      ? stateOrStatus
      : { status: stateOrStatus, isDelayed: false };

  if (state.isDelayed && isAppointmentActive(state.status)) {
    return [
      { label: "Arrivata", nextState: { status: AppointmentStatus.ARRIVED, isDelayed: false } },
      { label: "Annulla", nextState: { status: AppointmentStatus.CANCELLED, isDelayed: false } },
    ];
  }

  switch (state.status) {
    case AppointmentStatus.BOOKED:
      return [
        { label: "Conferma", nextState: { status: AppointmentStatus.CONFIRMED, isDelayed: false } },
        { label: "Annulla", nextState: { status: AppointmentStatus.CANCELLED, isDelayed: false } },
      ];
    case AppointmentStatus.CONFIRMED:
      return [
        { label: "Arrivata", nextState: { status: AppointmentStatus.ARRIVED, isDelayed: false } },
        { label: "Ritardo", nextState: { status: AppointmentStatus.CONFIRMED, isDelayed: true } },
        { label: "No-show", nextState: { status: AppointmentStatus.NO_SHOW, isDelayed: false } },
        { label: "Annulla", nextState: { status: AppointmentStatus.CANCELLED, isDelayed: false } },
      ];
    case AppointmentStatus.ARRIVED:
      return [{ label: "Completa", nextState: { status: AppointmentStatus.COMPLETED, isDelayed: false } }];
    case AppointmentStatus.CANCELLED:
      return [{ label: "Ripristina", nextState: { status: AppointmentStatus.CONFIRMED, isDelayed: false } }];
    case AppointmentStatus.NO_SHOW:
      return [
        { label: "Arrivata", nextState: { status: AppointmentStatus.ARRIVED, isDelayed: false } },
        { label: "Annulla", nextState: { status: AppointmentStatus.CANCELLED, isDelayed: false } },
      ];
    case AppointmentStatus.COMPLETED:
    default:
      return [];
  }
}

export function getPrimaryAppointmentAction(status: AppointmentState | AppointmentStatus) {
  return getAppointmentActions(status)[0] ?? null;
}

export function getSecondaryAppointmentActions(status: AppointmentState | AppointmentStatus) {
  return getAppointmentActions(status).slice(1);
}

export function toApiBookingStatus(status: AppointmentStatus) {
  const apiStatuses: Record<AppointmentStatus, string> = {
    [AppointmentStatus.BOOKED]: "booked",
    [AppointmentStatus.CONFIRMED]: "confirmed",
    [AppointmentStatus.ARRIVED]: "arrived",
    [AppointmentStatus.COMPLETED]: "completed",
    [AppointmentStatus.CANCELLED]: "canceled",
    [AppointmentStatus.NO_SHOW]: "no_show",
  };
  return apiStatuses[status];
}

export function toApiBookingState(state: AppointmentState) {
  return state.isDelayed && isAppointmentActive(state.status) ? "late" : toApiBookingStatus(state.status);
}
