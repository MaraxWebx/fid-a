import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { PrimaryButton } from '../components/PrimaryButton';
import { getUserProfile, getUserStats, updateUserProfile } from '../lib/api';
import type { BeautyStatItem, UserBeautyStats, UserProfile } from '../types/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ClientProfileScreenProps = {
  onLogout: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
  profileEmail: string;
};

export function ClientProfileScreen({
  onLogout,
  onProfileUpdated,
  profileEmail,
}: ClientProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserBeautyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([getUserProfile(profileEmail), getUserStats(profileEmail)])
      .then(([response, statsResponse]) => {
        if (mounted) {
          setProfile(response);
          setStats(statsResponse);
          setProfileName(response.name);
          setProfilePhone(response.phone ?? '');
        }
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
  }, [profileEmail]);

  const handleOpenProfileModal = () => {
    setProfileName(profile?.name ?? '');
    setProfilePhone(profile?.phone ?? '');
    setError(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError(null);

    try {
      const response = await updateUserProfile(profileEmail, {
        name: profileName.trim(),
        phone: profilePhone.trim(),
      });
      setProfile(response);
      onProfileUpdated(response);
      setIsProfileModalOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Aggiornamento profilo non riuscito.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.profileMain}>
              <Text style={styles.profileTitle}>{profile.name}</Text>
              <Text style={styles.profileMeta}>{profile.email}</Text>
              <Text style={styles.profileMeta}>
                Telefono: {profile.phone || 'non configurato'}
              </Text>
              <Text style={styles.profileMeta}>
                Centro: {profile.center_id ?? 'nessun centro collegato'}
              </Text>
            </View>
            <Pressable onPress={handleOpenProfileModal} style={styles.editButton}>
              <Ionicons color={colors.brandInk} name="create-outline" size={18} />
              <Text style={styles.editButtonLabel}>Modifica</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Statistiche" title="Beauty analytics">
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {!stats || stats.summary.total_treatments === 0 ? (
          <Text style={styles.note}>
            Le statistiche compariranno dopo i primi trattamenti effettuati.
          </Text>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.total_treatments}</Text>
                <Text style={styles.statLabel}>Trattamenti effettuati</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_category}</Text>
                <Text style={styles.statLabel}>Categoria preferita</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.summary.top_time_slot}</Text>
                <Text style={styles.statLabel}>Orario preferito</Text>
              </View>
            </View>

            <Text style={styles.chartTitle}>Per categoria</Text>
            <View style={styles.chartList}>
              {stats.categories.map((item) => (
                <StatBar key={item.label} item={item} />
              ))}
            </View>

            <Text style={styles.chartTitle}>Per trattamento</Text>
            <View style={styles.chartList}>
              {stats.treatments.map((item) => (
                <StatBar key={item.label} item={item} />
              ))}
            </View>

            <Text style={styles.chartTitle}>Per fascia oraria</Text>
            <View style={styles.chartList}>
              {stats.time_slots.map((item) => (
                <StatBar key={item.label} item={item} />
              ))}
            </View>
          </>
        )}
      </SectionCard>

      <SectionCard eyebrow="Preferenze" title="Note beauty">
        <Text style={styles.note}>
          Profilo reale caricato da MongoDB. Le preferenze beauty dettagliate restano da modellare
          in una collection o in un campo dedicato.
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Sessione" title="Esci dall'account">
        <Text style={styles.note}>Chiudi la sessione e torna alla home pubblica dell&apos;app.</Text>
        <View style={styles.logoutWrap}>
          <PrimaryButton label="Log out" onPress={onLogout} variant="secondary" />
        </View>
      </SectionCard>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsProfileModalOpen(false)}
        transparent
        visible={isProfileModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>Profilo cliente</Text>
                <Text style={styles.modalTitle}>Modifica informazioni</Text>
              </View>
              <Pressable onPress={() => setIsProfileModalOpen(false)}>
                <Text style={styles.modalClose}>Chiudi</Text>
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Nome</Text>
              <TextInput
                onChangeText={setProfileName}
                placeholder="Nome cliente"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profileName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Telefono</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setProfilePhone}
                placeholder="Numero di telefono"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profilePhone}
              />
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setIsProfileModalOpen(false)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={savingProfile || !profileName.trim()}
                label={savingProfile ? 'Salvataggio...' : 'Salva profilo'}
                onPress={() => {
                  void handleSaveProfile();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatBar({ item }: { item: BeautyStatItem }) {
  return (
    <View style={styles.statBarRow}>
      <View style={styles.statBarHeader}>
        <Text style={styles.statBarLabel}>{item.label}</Text>
        <Text style={styles.statBarCount}>{item.count}</Text>
      </View>
      <View style={styles.statBarTrack}>
        <View style={[styles.statBarFill, { width: `${item.percent}%` }]} />
      </View>
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 24,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  profileMain: {
    flex: 1,
  },
  profileTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
  },
  profileMeta: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editButtonLabel: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statTile: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  statValue: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  chartTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chartList: {
    gap: spacing.sm,
  },
  statBarRow: {
    gap: spacing.xs,
  },
  statBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBarLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    paddingRight: spacing.sm,
  },
  statBarCount: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '800',
  },
  statBarTrack: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  statBarFill: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    height: '100%',
  },
  logoutWrap: {
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 94, 114, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  modalClose: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
