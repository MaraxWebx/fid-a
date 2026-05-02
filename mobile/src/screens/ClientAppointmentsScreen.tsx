import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getUserBookings } from '../lib/api';
import type { Booking } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ClientAppointmentsScreenProps = {
  profileEmail: string;
};

export function ClientAppointmentsScreen({ profileEmail }: ClientAppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getUserBookings(profileEmail)
      .then((response) => {
        if (mounted) setAppointments(response);
      })
      .catch(() => {
        if (mounted) setError('Impossibile caricare lo storico prenotazioni.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [profileEmail]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Prenotazioni"
        title="Storico cliente"
        subtitle="Lista delle prenotazioni cliente caricate dal database reale."
      />

      <SectionCard eyebrow="Storico completo" title={`${appointments.length} prenotazioni`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.meta}>{error}</Text> : null}
        {appointments.map((appointment) => (
          <AppointmentRow key={appointment.id} appointment={appointment} />
        ))}
      </SectionCard>
    </ScrollView>
  );
}

function AppointmentRow({ appointment }: { appointment: Booking }) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.service}>{appointment.service_name}</Text>
        <Text style={styles.meta}>
          {appointment.date_label} - {appointment.time_label}
        </Text>
        <Text style={styles.meta}>
          {appointment.operator_name} - {appointment.status}
        </Text>
      </View>
      <Text style={styles.price}>
        {appointment.price !== null ? `EUR ${appointment.price}` : 'n/a'}
      </Text>
    </View>
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
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  service: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  price: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
