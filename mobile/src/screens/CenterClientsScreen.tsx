import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getCenterClients } from '../lib/api';
import type { Center, CenterClient } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type CenterClientsScreenProps = {
  center: Center;
  onOpenClient: (clientId: string) => void;
};

export function CenterClientsScreen({ center, onOpenClient }: CenterClientsScreenProps) {
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
        title="Clienti"
        subtitle="Anagrafica essenziale e storico appuntamenti."
      />

      <SectionCard eyebrow="Anagrafica" title={`${clients.length} clienti`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.clientMeta}>{error}</Text> : null}
        {!loading && !error && clients.length === 0 ? (
          <Text style={styles.clientMeta}>Nessun cliente disponibile.</Text>
        ) : null}
        {clients.map((client) => (
          <Pressable
            key={client.id}
            onPress={() => onOpenClient(client.id)}
            style={styles.clientCard}
          >
            <View style={styles.clientMain}>
              <Text style={styles.clientName}>{client.name || 'Cliente senza nome'}</Text>
              <Text style={styles.clientMeta}>{client.phone || 'Telefono non disponibile'}</Text>
              <Text style={styles.clientMeta}>
                {client.bookings ?? 0} prenotazioni · ultima visita {client.last_visit ?? 'n/d'}
              </Text>
            </View>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
          </Pressable>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  clientCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 72,
    padding: spacing.md,
  },
  clientMain: {
    flex: 1,
  },
  clientName: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: '800',
  },
  clientMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 3,
  },
  clientBookings: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
