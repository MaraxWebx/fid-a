import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { getUserProfile } from '../lib/api';
import type { UserProfile } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const demoProfileEmail =
  process.env.EXPO_PUBLIC_PROFILE_EMAIL ?? 'anotniomarettax@gmail.com';

type ClientProfileScreenProps = {
  onLogout: () => void;
};

export function ClientProfileScreen({ onLogout }: ClientProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getUserProfile(demoProfileEmail)
      .then((response) => {
        if (mounted) setProfile(response);
      })
      .catch(() => {
        if (mounted) setError('Impossibile caricare il profilo cliente.');
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
        eyebrow="Profilo"
        title="Profilo cliente"
        subtitle="Dati base, centro preferito e note personali del profilo cliente."
      />

      <SectionCard eyebrow="Anagrafica" title={profile?.name ?? 'Profilo'}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.note}>{error}</Text> : null}
        {profile ? (
          <>
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Ruolo" value={profile.role} />
            <ProfileRow label="Center ID" value={profile.center_id ?? 'Nessun centro collegato'} />
          </>
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Preferenze" title="Note beauty">
        <Text style={styles.note}>
          Profilo reale caricato da MongoDB. Le preferenze beauty dettagliate restano da
          modellare in una collection o in un campo dedicato.
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Sessione" title="Esci dall'account">
        <Text style={styles.note}>
          Chiudi la sessione demo e torna alla home pubblica dell&apos;app Fidèa.
        </Text>
        <View style={styles.logoutWrap}>
          <PrimaryButton label="Log out" onPress={onLogout} variant="secondary" />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  note: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  logoutWrap: {
    marginTop: spacing.lg,
  },
});
