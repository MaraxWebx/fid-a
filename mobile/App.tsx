import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { BottomTabs } from "./src/components/BottomTabs";
import { CenterBookingDetailModal } from "./src/components/CenterBookingDetailModal";
import { PrimaryButton } from "./src/components/PrimaryButton";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CenterOnboardingScreen } from "./src/screens/CenterOnboardingScreen";
import { CenterPaymentScreen } from "./src/screens/CenterPaymentScreen";
import { CenterRegistrationScreen } from "./src/screens/CenterRegistrationScreen";
import { ClientAppointmentsScreen } from "./src/screens/ClientAppointmentsScreen";
import { ClientBookingScreen } from "./src/screens/ClientBookingScreen";
import { ClientCenterDetailScreen } from "./src/screens/ClientCenterDetailScreen";
import { ClientFavoritesScreen } from "./src/screens/ClientFavoritesScreen";
import { ClientHomeScreen } from "./src/screens/ClientHomeScreen";
import { ClientProfileScreen } from "./src/screens/ClientProfileScreen";
import { ClientRegistrationScreen } from "./src/screens/ClientRegistrationScreen";
import { CenterCalendarScreen } from "./src/screens/CenterCalendarScreen";
import { CenterBusinessInsightsScreen } from "./src/screens/CenterBusinessInsightsScreen";
import { CenterClientDetailScreen } from "./src/screens/CenterClientDetailScreen";
import { CenterClientsScreen } from "./src/screens/CenterClientsScreen";
import { CenterDashboardScreen } from "./src/screens/CenterDashboardScreen";
import { CenterSettingsScreen } from "./src/screens/CenterSettingsScreen";
import { PublicLandingScreen } from "./src/screens/PublicLandingScreen";
import {
  createReview,
  getNotifications,
  loginCenter,
  loginClient,
  markNotificationsRead,
} from "./src/lib/api";
import { colors } from "./src/theme/colors";
import type {
  ActivationStatus,
  AppNotification,
  Center,
  UserProfile,
} from "./src/types/api";

type ClientTab =
  | "home"
  | "appointments"
  | "favorites"
  | "profile"
  | "booking"
  | "center-detail";
type CenterTab =
  | "home"
  | "calendar"
  | "insights"
  | "clients"
  | "settings"
  | "onboarding"
  | "client-detail";
type PublicRoute =
  | "landing"
  | "client-auth"
  | "client-register"
  | "center-auth"
  | "center-register"
  | "center-payment"
  | "center-onboarding";

type AppSession =
  | { role: "client"; user: UserProfile }
  | { role: "center"; center: Center; activation: ActivationStatus };

export default function App() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>("landing");
  const [clientTab, setClientTab] = useState<ClientTab>("home");
  const [centerTab, setCenterTab] = useState<CenterTab>("calendar");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [selectedClientCenter, setSelectedClientCenter] = useState<Center | null>(null);
  const [centerDetailBackTab, setCenterDetailBackTab] = useState<ClientTab>("home");
  const [selectedCenterClientId, setSelectedCenterClientId] = useState<string | null>(null);
  const [centerClientBackTab, setCenterClientBackTab] = useState<CenterTab>("home");
  const [registeredCenter, setRegisteredCenter] = useState<Center | null>(null);
  const [registeredCenterActivation, setRegisteredCenterActivation] =
    useState<ActivationStatus | null>(null);
  const [registeredCenterCheckoutUrl, setRegisteredCenterCheckoutUrl] =
    useState<string | null>(null);
  const [clientAuth, setClientAuth] = useState({
    email: "",
    password: "",
    error: "",
    loading: false,
  });
  const [centerAuth, setCenterAuth] = useState({
    email: "",
    password: "",
    error: "",
    loading: false,
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewNotification, setSelectedReviewNotification] =
    useState<AppNotification | null>(null);
  const [selectedCenterBookingId, setSelectedCenterBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const handleLogout = () => {
    setSession(null);
    setPublicRoute("landing");
    setClientTab("home");
    setCenterTab("home");
    setSelectedServiceId(null);
    setSelectedCenterId(null);
    setSelectedClientCenter(null);
    setCenterDetailBackTab("home");
    setSelectedCenterClientId(null);
    setCenterClientBackTab("home");
    setRegisteredCenter(null);
    setRegisteredCenterActivation(null);
    setRegisteredCenterCheckoutUrl(null);
  };

  const handleCenterSessionUpdated = (center: Center, activation: ActivationStatus) => {
    setSession((current) =>
      current?.role === "center" ? { role: "center", center, activation } : current,
    );
  };

  const handleClientProfileUpdated = (user: UserProfile) => {
    setSession((current) =>
      current?.role === "client" ? { role: "client", user } : current,
    );
  };

  const handleOpenClientCenter = (center: Center, backTab: ClientTab) => {
    setSelectedClientCenter(center);
    setCenterDetailBackTab(backTab);
    setClientTab("center-detail");
  };

  const handleOpenCenterClient = (clientId: string, backTab: CenterTab) => {
    setSelectedCenterClientId(clientId);
    setCenterClientBackTab(backTab);
    setCenterTab("client-detail");
  };

  const loadNotifications = async () => {
    if (!session) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    try {
      const response =
        session.role === "center"
          ? await getNotifications({ role: "center", centerId: session.center.id })
          : await getNotifications({ role: "client", email: session.user.email });
      setNotifications(response);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [session]);

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const openNotifications = async () => {
    setNotificationsOpen(true);
    await loadNotifications();
    const unreadIds = notifications
      .filter((item) => !item.is_read && item.type !== "review_prompt")
      .map((item) => item.id);
    if (unreadIds.length > 0) {
      try {
        await markNotificationsRead(unreadIds);
        await loadNotifications();
      } catch {}
    }
  };

  const handleOpenReview = (notification: AppNotification) => {
    setSelectedReviewNotification(notification);
    setReviewRating(5);
    setReviewComment("");
    setReviewModalOpen(true);
  };

  const handleOpenCenterBookingNotification = (notification: AppNotification) => {
    if (!session || session.role !== "center" || notification.type !== "new_booking") {
      return;
    }

    const bookingId = String(notification.metadata?.booking_id ?? "");
    if (!bookingId) {
      return;
    }

    setNotificationsOpen(false);
    setCenterTab("calendar");
    setSelectedCenterBookingId(bookingId);
  };

  const handleSubmitReview = async () => {
    if (!session || session.role !== "client" || !selectedReviewNotification) {
      return;
    }

    const bookingId = String(selectedReviewNotification.metadata?.booking_id ?? "");
    if (!bookingId || !reviewComment.trim()) {
      return;
    }

    setReviewSubmitting(true);
    try {
      await createReview({
        booking_id: bookingId,
        user_email: session.user.email,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewModalOpen(false);
      setNotifications((current) =>
        current.filter((item) => item.id !== selectedReviewNotification.id),
      );
      setSelectedReviewNotification(null);
      await loadNotifications();
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleClientLogin = async () => {
    if (!clientAuth.email.trim() || !clientAuth.password.trim()) {
      setClientAuth((current) => ({
        ...current,
        error: "Inserisci email e password.",
      }));
      return;
    }

    setClientAuth((current) => ({ ...current, error: "", loading: true }));

    try {
      const response = await loginClient({
        email: clientAuth.email,
        password: clientAuth.password,
      });
      setSession({ role: "client", user: response.user });
      setClientTab("home");
    } catch (error) {
      setClientAuth((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "Accesso cliente non riuscito.",
      }));
    } finally {
      setClientAuth((current) => ({ ...current, loading: false }));
    }
  };

  const handleCenterLogin = async () => {
    if (!centerAuth.email.trim() || !centerAuth.password.trim()) {
      setCenterAuth((current) => ({
        ...current,
        error: "Inserisci email e password.",
      }));
      return;
    }

    setCenterAuth((current) => ({ ...current, error: "", loading: true }));

    try {
      const response = await loginCenter({
        email: centerAuth.email,
        password: centerAuth.password,
      });
      if (response.activation.subscription_status !== "active") {
        setRegisteredCenter(response.center);
        setRegisteredCenterActivation(response.activation);
        setRegisteredCenterCheckoutUrl(null);
        setPublicRoute("center-payment");
      } else if (!response.activation.is_listable) {
        setRegisteredCenter(response.center);
        setRegisteredCenterActivation(response.activation);
        setPublicRoute("center-onboarding");
      } else {
        setSession({
          role: "center",
          center: response.center,
          activation: response.activation,
        });
        setCenterTab("home");
      }
    } catch (error) {
      setCenterAuth((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "Accesso centro non riuscito.",
      }));
    } finally {
      setCenterAuth((current) => ({ ...current, loading: false }));
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {publicRoute === "landing" ? (
          <PublicLandingScreen
            onGoToClientAuth={() => setPublicRoute("client-auth")}
            onGoToClientRegister={() => setPublicRoute("client-register")}
            onGoToCenterAuth={() => setPublicRoute("center-auth")}
            onGoToCenterRegister={() => setPublicRoute("center-register")}
          />
        ) : null}
        {publicRoute === "client-auth" ? (
          <AuthScreen
            ctaLabel="Registrati come cliente"
            ctaText="Non sei registrato? Crea ora il tuo account cliente."
            eyebrow="Accesso cliente"
            email={clientAuth.email}
            error={clientAuth.error || null}
            isSubmitting={clientAuth.loading}
            onBack={() => setPublicRoute("landing")}
            onChangeEmail={(value) =>
              setClientAuth((current) => ({ ...current, email: value }))
            }
            onChangePassword={(value) =>
              setClientAuth((current) => ({ ...current, password: value }))
            }
            onPrimaryAction={() => {
              void handleClientLogin();
            }}
            onSecondaryAction={() => setPublicRoute("client-register")}
            password={clientAuth.password}
            primaryLabel="Accedi come cliente"
            roleLabel="Cliente"
            subtitle="Accedi al tuo spazio personale."
            title="Bentornata"
          />
        ) : null}
        {publicRoute === "client-register" ? (
          <ClientRegistrationScreen
            onBack={() => setPublicRoute("client-auth")}
            onRegistered={(user) => {
              setSession({ role: "client", user });
              setClientTab("home");
            }}
          />
        ) : null}
        {publicRoute === "center-auth" ? (
          <AuthScreen
            ctaLabel="Registrati come centro"
            ctaText="Non sei registrato? Crea ora l'account del tuo centro."
            eyebrow="Accesso centro"
            email={centerAuth.email}
            error={centerAuth.error || null}
            isSubmitting={centerAuth.loading}
            onBack={() => setPublicRoute("landing")}
            onChangeEmail={(value) =>
              setCenterAuth((current) => ({ ...current, email: value }))
            }
            onChangePassword={(value) =>
              setCenterAuth((current) => ({ ...current, password: value }))
            }
            onPrimaryAction={() => {
              void handleCenterLogin();
            }}
            onSecondaryAction={() => setPublicRoute("center-register")}
            password={centerAuth.password}
            primaryLabel="Accedi come centro"
            roleLabel="Centro estetico"
            subtitle="Accedi al tuo spazio personale."
            title="Bentornata"
          />
        ) : null}
        {publicRoute === "center-register" ? (
          <CenterRegistrationScreen
            onBack={() => setPublicRoute("center-auth")}
            onRegistered={(response) => {
              setRegisteredCenter(response.center);
              setRegisteredCenterActivation(response.activation);
              setRegisteredCenterCheckoutUrl(response.checkout_url);
              setSession({
                role: "center",
                center: response.center,
                activation: response.activation,
              });
              setCenterTab("home");
            }}
          />
        ) : null}
        {publicRoute === "center-payment" &&
        registeredCenter &&
        registeredCenterActivation ? (
          <CenterPaymentScreen
            activation={registeredCenterActivation}
            center={registeredCenter}
            checkoutUrl={registeredCenterCheckoutUrl}
            onBack={() => setPublicRoute("center-register")}
            onPaid={(center, activation) => {
              setRegisteredCenter(center);
              setRegisteredCenterActivation(activation);
              setPublicRoute("center-onboarding");
            }}
          />
        ) : null}
        {publicRoute === "center-onboarding" &&
        registeredCenter &&
        registeredCenterActivation ? (
          <CenterOnboardingScreen
            center={registeredCenter}
            initialActivation={registeredCenterActivation}
            onBack={() => setPublicRoute("center-payment")}
            onComplete={(center, activation) => {
              setRegisteredCenter(center);
              setRegisteredCenterActivation(activation);
              setSession({ role: "center", center, activation });
              setCenterTab("home");
            }}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {session.role === "client" ? (
        <>
          {clientTab === "home" ? (
            <ClientHomeScreen
              userName={session.user.name}
              userEmail={session.user.email}
              selectedCenterId={selectedCenterId}
              onChangeCenter={setSelectedCenterId}
              onOpenCenter={(center) => handleOpenClientCenter(center, "home")}
              onOpenBooking={(serviceId) => {
                setSelectedServiceId(serviceId);
                setClientTab("booking");
              }}
            />
          ) : null}
          {clientTab === "booking" ? (
            <ClientBookingScreen
              userEmail={session.user.email}
              selectedCenterId={selectedCenterId}
              selectedServiceId={selectedServiceId}
              onBookingConfirmed={() => setClientTab("appointments")}
            />
          ) : null}
          {clientTab === "appointments" ? (
            <ClientAppointmentsScreen profileEmail={session.user.email} />
          ) : null}
          {clientTab === "favorites" ? (
            <ClientFavoritesScreen
              profileEmail={session.user.email}
              selectedCenterId={selectedCenterId}
              onOpenCenter={(center) => handleOpenClientCenter(center, "favorites")}
            />
          ) : null}
          {clientTab === "center-detail" ? (
            <ClientCenterDetailScreen
              center={selectedClientCenter}
              selectedCenterId={selectedCenterId}
              userEmail={session.user.email}
              onBack={() => setClientTab(centerDetailBackTab)}
              onBookCenter={(centerId) => {
                setSelectedCenterId(centerId);
                setSelectedServiceId(null);
                setClientTab("booking");
              }}
              onSelectCenter={setSelectedCenterId}
            />
          ) : null}
          {clientTab === "profile" ? (
            <ClientProfileScreen
              onLogout={handleLogout}
              onProfileUpdated={handleClientProfileUpdated}
              profileEmail={session.user.email}
            />
          ) : null}
          <BottomTabs
            items={[
              { key: "home", label: "Home", icon: "home" },
              { key: "appointments", label: "Prenot.", icon: "appointments" },
              { key: "favorites", label: "Preferiti", icon: "favorites" },
              { key: "profile", label: "Profilo", icon: "profile" },
            ]}
            activeKey={
              clientTab === "booking"
                ? "home"
                : clientTab === "center-detail"
                  ? centerDetailBackTab === "favorites"
                    ? "favorites"
                    : "home"
                  : clientTab
            }
            onChange={(key) => setClientTab(key as ClientTab)}
          />
        </>
      ) : (
        <>
          {centerTab === "home" ? (
            <CenterDashboardScreen
              activation={session.activation}
              center={session.center}
              onOpenClient={(clientId) => handleOpenCenterClient(clientId, "home")}
              onOpenNewAppointment={() => setCenterTab("calendar")}
              onOpenOnboarding={() => setCenterTab("onboarding")}
            />
          ) : null}
          {centerTab === "onboarding" ? (
            <CenterOnboardingScreen
              center={session.center}
              initialActivation={session.activation}
              onBack={() => setCenterTab("home")}
              onComplete={(center, activation) => {
                handleCenterSessionUpdated(center, activation);
                setCenterTab("home");
              }}
            />
          ) : null}
          {centerTab === "calendar" ? (
            <CenterCalendarScreen
              center={session.center}
              onCenterUpdated={handleCenterSessionUpdated}
            />
          ) : null}
          {centerTab === "insights" ? (
            <CenterBusinessInsightsScreen center={session.center} />
          ) : null}
          {centerTab === "clients" ? (
            <CenterClientsScreen
              center={session.center}
              onOpenClient={(clientId) => handleOpenCenterClient(clientId, "clients")}
            />
          ) : null}
          {centerTab === "client-detail" ? (
            <CenterClientDetailScreen
              center={session.center}
              clientId={selectedCenterClientId}
              onBack={() => setCenterTab(centerClientBackTab)}
            />
          ) : null}
          {centerTab === "settings" ? (
            <CenterSettingsScreen
              activation={session.activation}
              center={session.center}
              onCenterUpdated={handleCenterSessionUpdated}
              onLogout={handleLogout}
            />
          ) : null}
          <BottomTabs
            items={[
              { key: "calendar", label: "Agenda", icon: "calendar" },
              { key: "insights", label: "Insights", icon: "insights" },
              { key: "clients", label: "Clienti", icon: "clients" },
              { key: "home", label: "Dashboard", icon: "home" },
              { key: "settings", label: "Config", icon: "settings" },
            ]}
            activeKey={
              centerTab === "onboarding"
                ? "home"
                : centerTab === "client-detail"
                  ? centerClientBackTab === "clients"
                    ? "clients"
                    : "home"
                  : centerTab
            }
            onChange={(key) => setCenterTab(key as CenterTab)}
          />
        </>
      )}
      <Pressable onPress={() => void openNotifications()} style={styles.notificationFab}>
        <Ionicons color={colors.brandInk} name="notifications" size={20} />
        {unreadNotifications > 0 ? (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifiche</Text>
              <Pressable onPress={() => setNotificationsOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalList}>
              {notificationsLoading ? (
                <Text style={styles.modalMeta}>Caricamento notifiche...</Text>
              ) : null}
              {!notificationsLoading && notifications.length === 0 ? (
                <Text style={styles.modalMeta}>Nessuna notifica disponibile.</Text>
              ) : null}
              {notifications.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleOpenCenterBookingNotification(item)}
                  style={styles.notificationRow}
                >
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  {session.role === "client" && item.type === "review_prompt" ? (
                    <View style={styles.reviewPromptBox}>
                      <Text style={styles.reviewPromptTitle}>
                        {String(item.metadata?.service_name ?? "Trattamento")}
                      </Text>
                      <Text style={styles.reviewPromptMeta}>
                        {String(item.metadata?.date_label ?? "Data non disponibile")}
                        {" - "}
                        {String(item.metadata?.time_label ?? "Orario non disponibile")}
                      </Text>
                    </View>
                  ) : null}
                  {session.role === "center" && item.type === "new_booking" ? (
                    <Text style={styles.notificationHint}>Apri scheda prenotazione</Text>
                  ) : null}
                  {session.role === "client" && item.type === "review_prompt" ? (
                    <View style={styles.notificationActionWrap}>
                      <PrimaryButton
                        label="Valuta ora"
                        onPress={() => handleOpenReview(item)}
                      />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setReviewModalOpen(false)}
        transparent
        visible={reviewModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Valuta il tuo trattamento</Text>
              <Pressable onPress={() => setReviewModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>
            <Text style={styles.modalMeta}>
              Lascia da 1 a 5 stelle e un commento massimo di 128 caratteri.
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Text style={[styles.star, star <= reviewRating && styles.starActive]}>
                    ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              maxLength={128}
              multiline
              onChangeText={setReviewComment}
              placeholder="Scrivi un commento breve"
              placeholderTextColor={colors.textSoft}
              style={styles.reviewInput}
              value={reviewComment}
            />
            <Text style={styles.modalMeta}>{reviewComment.length}/128</Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setReviewModalOpen(false)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={reviewSubmitting || !reviewComment.trim()}
                label={reviewSubmitting ? "Invio..." : "Invia recensione"}
                onPress={() => void handleSubmitReview()}
              />
            </View>
          </View>
        </View>
      </Modal>
      {session.role === "center" ? (
        <CenterBookingDetailModal
          bookingId={selectedCenterBookingId}
          center={session.center}
          centerId={session.center.id}
          onClose={() => setSelectedCenterBookingId(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  notificationFab: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 22,
    elevation: 6,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 16,
    width: 44,
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: colors.rose,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -4,
    top: -4,
  },
  notificationBadgeText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: "800",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(49,94,114,0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: 20,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "700",
  },
  modalList: {
    gap: 12,
    paddingBottom: 8,
  },
  modalMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  notificationRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 14,
  },
  notificationTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  notificationMessage: {
    color: colors.text,
    fontSize: 14,
    marginTop: 6,
  },
  notificationHint: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  reviewPromptBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  reviewPromptTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: "800",
  },
  reviewPromptMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  notificationActionWrap: {
    marginTop: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  star: {
    color: colors.textSoft,
    fontSize: 30,
  },
  starActive: {
    color: colors.warning,
  },
  reviewInput: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginTop: 16,
    minHeight: 110,
    padding: 14,
    textAlignVertical: "top",
  },
  modalActions: {
    gap: 12,
    marginTop: 16,
  },
});
