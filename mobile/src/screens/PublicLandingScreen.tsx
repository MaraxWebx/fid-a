import { ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Role = 'client' | 'center';

type PublicLandingScreenProps = {
  onComplete: (role: Role) => void;
};

export function PublicLandingScreen({ onComplete }: PublicLandingScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoMark}>
          <View style={styles.logoStroke} />
          <View style={[styles.logoStroke, styles.logoStrokeMid]} />
          <View style={[styles.logoStroke, styles.logoStrokeSmall]} />
        </View>
        <Text style={styles.logoTitle}>FIDÈA</Text>
        <Text style={styles.logoSub}>Powered by Fidest</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Beauty digital experience</Text>
          <Text style={styles.heroTitle}>Una demo piu soft, editoriale e premium.</Text>
          <Text style={styles.heroText}>
            Palette chiara, card sospese e navigazione gentile ispirate alla reference e al
            design system aggiornato.
          </Text>
        </View>
        <View style={styles.heroPreview}>
          <View style={styles.previewPanelSky}>
            <Text style={styles.previewKicker}>Cliente</Text>
            <Text style={styles.previewTitle}>Routine su misura</Text>
            <Text style={styles.previewBody}>Scegli il centro e apri il booking.</Text>
          </View>
          <View style={styles.previewPanelSand}>
            <Text style={styles.previewKicker}>Centro</Text>
            <Text style={styles.previewTitle}>Dashboard morbida</Text>
            <Text style={styles.previewBody}>KPI, agenda e gestione elegante.</Text>
          </View>
        </View>
      </View>

      <View style={styles.entryGrid}>
        <EntryCard
          eyebrow="Percorso pubblico"
          title="Accedi come cliente"
          description="Home con centro selezionabile, prenotazioni prossime e flusso booking piu lineare."
          buttonLabel="Entra lato cliente"
          onPress={() => onComplete('client')}
          accentStyle={styles.clientAccent}
          variant="primary"
        />
        <EntryCard
          eyebrow="Operativita centro"
          title="Accedi come centro"
          description="Dashboard, agenda, clienti e impostazioni con un tono piu beauty-tech che gestionale."
          buttonLabel="Entra lato centro"
          onPress={() => onComplete('center')}
          accentStyle={styles.centerAccent}
          variant="secondary"
        />
      </View>
    </ScrollView>
  );
}

type EntryCardProps = {
  accentStyle: ViewStyle;
  buttonLabel: string;
  description: string;
  eyebrow: string;
  onPress: () => void;
  title: string;
  variant: 'primary' | 'secondary';
};

function EntryCard({
  accentStyle,
  buttonLabel,
  description,
  eyebrow,
  onPress,
  title,
  variant,
}: EntryCardProps) {
  return (
    <View style={styles.entryCard}>
      <View style={[styles.entryAccent, accentStyle]} />
      <Text style={styles.entryEyebrow}>{eyebrow}</Text>
      <Text style={styles.entryTitle}>{title}</Text>
      <Text style={styles.entryDescription}>{description}</Text>
      <PrimaryButton label={buttonLabel} onPress={onPress} variant={variant} />
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
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  logoMark: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 54,
  },
  logoStroke: {
    backgroundColor: colors.brand,
    borderRadius: 999,
    height: 10,
    position: 'absolute',
    top: 14,
    transform: [{ rotate: '-34deg' }],
    width: 28,
  },
  logoStrokeMid: {
    top: 22,
    width: 24,
  },
  logoStrokeSmall: {
    top: 30,
    width: 18,
  },
  logoTitle: {
    color: colors.brandInk,
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: 5,
  },
  logoSub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 34,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    shadowColor: '#243F5C',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
  heroCopy: {
    marginBottom: spacing.xl,
  },
  heroEyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.brandInk,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
    maxWidth: 310,
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
    maxWidth: 320,
  },
  heroPreview: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewPanelSky: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 26,
    flex: 1,
    minHeight: 170,
    padding: spacing.lg,
  },
  previewPanelSand: {
    backgroundColor: colors.surfaceSand,
    borderRadius: 26,
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 170,
    padding: spacing.lg,
  },
  previewKicker: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  previewBody: {
    color: colors.brandInk,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    opacity: 0.75,
  },
  entryGrid: {
    gap: spacing.lg,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.xl,
  },
  entryAccent: {
    borderRadius: 999,
    height: 8,
    marginBottom: spacing.lg,
    width: 72,
  },
  clientAccent: {
    backgroundColor: colors.brand,
  },
  centerAccent: {
    backgroundColor: colors.surfaceLavender,
  },
  entryEyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  entryTitle: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  entryDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
});
