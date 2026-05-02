import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { BottomTabs } from "./src/components/BottomTabs";
import { AuthScreen } from "./src/screens/AuthScreen";
import { CenterOnboardingScreen } from "./src/screens/CenterOnboardingScreen";
import { CenterPaymentScreen } from "./src/screens/CenterPaymentScreen";
import { CenterRegistrationScreen } from "./src/screens/CenterRegistrationScreen";
import { ClientAppointmentsScreen } from "./src/screens/ClientAppointmentsScreen";
import { ClientBookingScreen } from "./src/screens/ClientBookingScreen";
import { ClientHomeScreen } from "./src/screens/ClientHomeScreen";
import { ClientProfileScreen } from "./src/screens/ClientProfileScreen";
import { ClientRegistrationScreen } from "./src/screens/ClientRegistrationScreen";
import { CenterCalendarScreen } from "./src/screens/CenterCalendarScreen";
import { CenterClientsScreen } from "./src/screens/CenterClientsScreen";
import { CenterDashboardScreen } from "./src/screens/CenterDashboardScreen";
import { CenterSettingsScreen } from "./src/screens/CenterSettingsScreen";
import { PublicLandingScreen } from "./src/screens/PublicLandingScreen";
import { loginCenter, loginClient } from "./src/lib/api";
import { colors } from "./src/theme/colors";
import type { ActivationStatus, Center, UserProfile } from "./src/types/api";

type ClientTab = "home" | "appointments" | "profile" | "booking";
type CenterTab = "home" | "calendar" | "clients" | "settings";
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
  const [centerTab, setCenterTab] = useState<CenterTab>("home");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
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

  const handleLogout = () => {
    setSession(null);
    setPublicRoute("landing");
    setClientTab("home");
    setCenterTab("home");
    setSelectedServiceId(null);
    setSelectedCenterId(null);
    setRegisteredCenter(null);
    setRegisteredCenterActivation(null);
    setRegisteredCenterCheckoutUrl(null);
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
            clientEmail={clientAuth.email}
            clientPassword={clientAuth.password}
            clientError={clientAuth.error || null}
            clientLoading={clientAuth.loading}
            onClientEmailChange={(value) =>
              setClientAuth((current) => ({ ...current, email: value }))
            }
            onClientPasswordChange={(value) =>
              setClientAuth((current) => ({ ...current, password: value }))
            }
            onClientLogin={() => {
              void handleClientLogin();
            }}
            onGoToClientRegister={() => setPublicRoute("client-register")}
            centerEmail={centerAuth.email}
            centerPassword={centerAuth.password}
            centerError={centerAuth.error || null}
            centerLoading={centerAuth.loading}
            onCenterEmailChange={(value) =>
              setCenterAuth((current) => ({ ...current, email: value }))
            }
            onCenterPasswordChange={(value) =>
              setCenterAuth((current) => ({ ...current, password: value }))
            }
            onCenterLogin={() => {
              void handleCenterLogin();
            }}
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
            subtitle="Pagina di accesso cliente. Se non hai un account, da qui puoi andare alla registrazione."
            title="Accedi come cliente"
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
            roleLabel="Centro"
            subtitle="Pagina di accesso centro. Se non sei registrato, da qui puoi aprire la registrazione del centro."
            title="Accedi come centro"
          />
        ) : null}
        {publicRoute === "center-register" ? (
          <CenterRegistrationScreen
            onBack={() => setPublicRoute("center-auth")}
            onRegistered={(response) => {
              setRegisteredCenter(response.center);
              setRegisteredCenterActivation(response.activation);
              setRegisteredCenterCheckoutUrl(response.checkout_url);
              setPublicRoute("center-payment");
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
              selectedCenterId={selectedCenterId}
              onChangeCenter={setSelectedCenterId}
              onOpenAppointments={() => setClientTab("appointments")}
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
          {clientTab === "profile" ? (
            <ClientProfileScreen
              onLogout={handleLogout}
              profileEmail={session.user.email}
            />
          ) : null}
          <BottomTabs
            items={[
              { key: "home", label: "Home", icon: "home" },
              { key: "appointments", label: "Prenot.", icon: "appointments" },
              { key: "profile", label: "Profilo", icon: "profile" },
            ]}
            activeKey={clientTab === "booking" ? "home" : clientTab}
            onChange={(key) => setClientTab(key as ClientTab)}
          />
        </>
      ) : (
        <>
          {centerTab === "home" ? (
            <CenterDashboardScreen center={session.center} />
          ) : null}
          {centerTab === "calendar" ? <CenterCalendarScreen /> : null}
          {centerTab === "clients" ? (
            <CenterClientsScreen center={session.center} />
          ) : null}
          {centerTab === "settings" ? (
            <CenterSettingsScreen
              activation={session.activation}
              center={session.center}
              onLogout={handleLogout}
            />
          ) : null}
          <BottomTabs
            items={[
              { key: "home", label: "Home", icon: "home" },
              { key: "calendar", label: "Agenda", icon: "calendar" },
              { key: "clients", label: "Clienti", icon: "clients" },
              { key: "settings", label: "Config", icon: "settings" },
            ]}
            activeKey={centerTab}
            onChange={(key) => setCenterTab(key as CenterTab)}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
