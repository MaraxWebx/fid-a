import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import { demoAppointments } from './src/data/mockData';
import { BottomTabs } from './src/components/BottomTabs';
import { CenterRegistrationScreen } from './src/screens/CenterRegistrationScreen';
import { ClientAppointmentsScreen } from './src/screens/ClientAppointmentsScreen';
import { ClientBookingScreen } from './src/screens/ClientBookingScreen';
import { ClientHomeScreen } from './src/screens/ClientHomeScreen';
import { ClientProfileScreen } from './src/screens/ClientProfileScreen';
import { CenterCalendarScreen } from './src/screens/CenterCalendarScreen';
import { CenterClientsScreen } from './src/screens/CenterClientsScreen';
import { CenterDashboardScreen } from './src/screens/CenterDashboardScreen';
import { CenterSettingsScreen } from './src/screens/CenterSettingsScreen';
import { PublicLandingScreen } from './src/screens/PublicLandingScreen';
import { colors } from './src/theme/colors';

type Role = 'client' | 'center';
type ClientTab = 'home' | 'appointments' | 'profile' | 'booking';
type CenterTab = 'home' | 'calendar' | 'clients' | 'settings';
type PublicRoute = 'landing' | 'center-registration';

export default function App() {
  const [sessionRole, setSessionRole] = useState<Role | null>(null);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>('landing');
  const [clientTab, setClientTab] = useState<ClientTab>('home');
  const [centerTab, setCenterTab] = useState<CenterTab>('home');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const handleLogout = () => {
    setSessionRole(null);
    setPublicRoute('landing');
    setClientTab('home');
    setCenterTab('home');
    setSelectedServiceId(null);
    setSelectedCenterId(null);
  };

  if (!sessionRole) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {publicRoute === 'landing' ? (
          <PublicLandingScreen
            onComplete={(role) => {
              setSessionRole(role);
              if (role === 'client') {
                setClientTab('home');
              } else {
                setCenterTab('home');
              }
            }}
            onOpenCenterRegistration={() => setPublicRoute('center-registration')}
          />
        ) : (
          <CenterRegistrationScreen onBack={() => setPublicRoute('landing')} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {sessionRole === 'client' ? (
        <>
          {clientTab === 'home' ? (
            <ClientHomeScreen
              selectedCenterId={selectedCenterId}
              onChangeCenter={setSelectedCenterId}
              onOpenAppointments={() => setClientTab('appointments')}
              onOpenBooking={(serviceId) => {
                setSelectedServiceId(serviceId);
                setClientTab('booking');
              }}
            />
          ) : null}
          {clientTab === 'booking' ? (
            <ClientBookingScreen
              selectedCenterId={selectedCenterId}
              selectedServiceId={selectedServiceId}
              onBookingConfirmed={() => setClientTab('appointments')}
            />
          ) : null}
          {clientTab === 'appointments' ? <ClientAppointmentsScreen /> : null}
          {clientTab === 'profile' ? <ClientProfileScreen onLogout={handleLogout} /> : null}
          <BottomTabs
            items={[
              { key: 'home', label: 'Home', icon: 'home' },
              { key: 'appointments', label: 'Prenot.', icon: 'appointments' },
              { key: 'profile', label: 'Profilo', icon: 'profile' },
            ]}
            activeKey={clientTab === 'booking' ? 'home' : clientTab}
            onChange={(key) => setClientTab(key as ClientTab)}
          />
        </>
      ) : (
        <>
          {centerTab === 'home' ? <CenterDashboardScreen /> : null}
          {centerTab === 'calendar' ? <CenterCalendarScreen /> : null}
          {centerTab === 'clients' ? <CenterClientsScreen /> : null}
          {centerTab === 'settings' ? <CenterSettingsScreen onLogout={handleLogout} /> : null}
          <BottomTabs
            items={[
              { key: 'home', label: 'Home', icon: 'home' },
              { key: 'calendar', label: 'Agenda', icon: 'calendar' },
              { key: 'clients', label: 'Clienti', icon: 'clients' },
              { key: 'settings', label: 'Config', icon: 'settings' },
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
