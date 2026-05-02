import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCenterClients, getCenters } from '../lib/api';
import type { Center, CenterClient } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function CenterClientsScreen() {
  const [center, setCenter] = useState<Center | null>(null);
  const [clients, setClients] = useState<CenterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCenters()
      .then(async (centers) => {
        const selectedCenter = centers[0] ?? null;
        if (!mounted) return;
        setCenter(selectedCenter);
        if (!selectedCenter) return;
        const response = await getCenterClients(selectedCenter.id);
        if (mounted) setClients(response);
      })
      .catch(() => {
        if (mounted) setError('Impossibile caricare i clienti del centro.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Clienti"
        title={center ? `CRM ${center.name}` : 'CRM clienti'}
        subtitle="Schede clienti reali aggregate dalle prenotazioni presenti nel database."
      />

      <SectionCard eyebrow="Anagrafica" title={`${clients.length} clienti reali`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.clientMeta}>{error}</Text> : null}
        {clients.map((client) => (
          <View key={client.id} style={styles.clientCard}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientMeta}>{client.phone}</Text>
            <Text style={styles.clientMeta}>{client.email ?? 'Email non disponibile'}</Text>
            <Text style={styles.clientBookings}>{client.bookings} prenotazioni totali</Text>
            <Text style={styles.clientMeta}>
              Ultima visita: {client.last_visit ?? 'non disponibile'}
            </Text>
          </View>
        ))}
      </SectionCard>
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
  clientCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  clientName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  clientMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  clientBookings: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
