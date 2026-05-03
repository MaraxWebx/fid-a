import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCenterClients } from '../lib/api';
import type { Center, CenterClient } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type CenterClientsScreenProps = {
  center: Center;
};

export function CenterClientsScreen({ center }: CenterClientsScreenProps) {
  const [clients, setClients] = useState<CenterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCenterClients(center.id)
      .then((response) => {
        if (!mounted) return;
        setClients(Array.isArray(response) ? response : []);
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
  }, [center.id]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Clienti"
        title={`CRM ${center.name}`}
        subtitle="Schede clienti reali aggregate dalle prenotazioni presenti nel database."
      />

      <SectionCard eyebrow="Anagrafica" title={`${clients.length} clienti reali`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.clientMeta}>{error}</Text> : null}
        {!loading && !error && clients.length === 0 ? (
          <Text style={styles.clientMeta}>Nessun cliente disponibile.</Text>
        ) : null}
        {clients.map((client) => (
          <View key={client.id} style={styles.clientCard}>
            <Text style={styles.clientName}>{client.name || 'Cliente senza nome'}</Text>
            <Text style={styles.clientMeta}>{client.phone || 'Telefono non disponibile'}</Text>
            <Text style={styles.clientMeta}>{client.email ?? 'Email non disponibile'}</Text>
            <Text style={styles.clientBookings}>{client.bookings ?? 0} prenotazioni totali</Text>
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
