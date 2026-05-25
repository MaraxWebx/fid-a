import { Linking, Platform } from "react-native";

import type { Booking, BookingSlot, Center, Service, UserProfile } from "../types/api";

export type WhatsappTemplateValues = {
  address?: string | null;
  centerName?: string | null;
  clientName?: string | null;
  date?: string | null;
  staffName?: string | null;
  time?: string | null;
  treatmentName?: string | null;
};

export function normalizeWhatsappNumber(phoneNumber?: string | null) {
  return (phoneNumber ?? "").replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(phoneNumber: string | null | undefined, message: string) {
  const normalized = normalizeWhatsappNumber(phoneNumber);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function hasWhatsappPrefixWarning(phoneNumber?: string | null) {
  const value = (phoneNumber ?? "").trim();
  const normalized = normalizeWhatsappNumber(value);
  return normalized.length > 0 && normalized.startsWith("3") && !value.startsWith("+");
}

export function isWhatsappConfigured(center?: Center | null, forClient = false) {
  if (!center?.enableWhatsapp) return false;
  if (forClient && !center.showWhatsappButtonToClients) return false;
  return normalizeWhatsappNumber(center.whatsappPhoneNumber).length >= 8;
}

export function applyWhatsappTemplate(template: string, values: WhatsappTemplateValues) {
  return template.replace(/\{(centerName|clientName|treatmentName|date|time|staffName|address)\}/g, (_match, key) => {
    const value = values[key as keyof WhatsappTemplateValues];
    return value ?? "";
  });
}

export function getWhatsappTemplate(center: Center, type: "booking" | "info" | "reminder") {
  if (type === "booking") {
    return center.whatsappBookingMessageTemplate || "Ciao, vorrei prenotare {treatmentName} il giorno {date} alle {time}.";
  }
  if (type === "reminder") {
    return center.whatsappAppointmentReminderTemplate || "Ciao {clientName}, ti ricordiamo l'appuntamento per {treatmentName} il {date} alle {time} presso {centerName}.";
  }
  return center.whatsappInfoMessageTemplate || "Ciao {centerName}, vorrei ricevere informazioni sui vostri trattamenti.";
}

export function buildCenterWhatsappMessage(
  center: Center,
  type: "booking" | "info" | "reminder",
  values: WhatsappTemplateValues = {},
) {
  return applyWhatsappTemplate(getWhatsappTemplate(center, type), {
    address: center.address,
    centerName: center.name,
    ...values,
  });
}

export function buildBookingWhatsappValues(params: {
  booking?: Booking | null;
  center?: Center | null;
  client?: UserProfile | null;
  service?: Service | null;
  slot?: BookingSlot | null;
}): WhatsappTemplateValues {
  return {
    address: params.center?.address,
    centerName: params.center?.name,
    clientName: params.booking?.client_name ?? params.client?.name,
    date: params.booking?.date_label ?? params.slot?.date_label,
    staffName: params.booking?.operator_name ?? params.slot?.staff_member_name,
    time: params.booking?.time_label ?? params.slot?.time_label,
    treatmentName: params.booking?.service_name ?? params.service?.name,
  };
}

export async function openWhatsappUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank");
    return;
  }
  await Linking.openURL(url);
}

export async function openCenterWhatsapp(
  center: Center,
  type: "booking" | "info" | "reminder",
  values: WhatsappTemplateValues = {},
) {
  const url = buildWhatsappUrl(
    center.whatsappPhoneNumber,
    buildCenterWhatsappMessage(center, type, values),
  );
  if (!url) return;
  await openWhatsappUrl(url);
}
