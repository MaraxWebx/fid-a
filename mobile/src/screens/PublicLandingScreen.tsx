import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type PublicLandingScreenProps = {
  onOpenClientAuth: () => void;
  onOpenCenterAuth: () => void;
};

export function PublicLandingScreen({
  onOpenClientAuth,
  onOpenCenterAuth,
}: PublicLandingScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/FidèaLogo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoSub}>Powered by Fidest</Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Beauty digital experience</Text>
          <Text style={styles.heroTitle}>
            La tua bellezza, il nostro impegno.
          </Text>
          <Text style={styles.heroText}>
            Un ingresso piu pulito e luminoso, con immagine protagonista e toni
            soft blue piu vicini alla reference.
          </Text>
        </View>

        <View style={styles.heroFeature}>
          <View style={styles.previewPanelSky}>
            <Text style={styles.previewTitle}>
              Scopri i trattamenti pensati per te.
            </Text>
            <Text style={styles.previewBody}>
              Un percorso cliente e centro piu chiaro, piu leggero e piu vicino
              a un&apos;app beauty premium.
            </Text>
            <View style={styles.heroButtonWrap}>
              <PrimaryButton label="Scopri di piu" onPress={onOpenClientAuth} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.entryGrid}>
        <EntryCard
          eyebrow="Percorso pubblico"
          title="Accedi / Registrati come cliente!"
          description="Pagina di accesso cliente con CTA verso registrazione se non hai ancora un account."
          buttonLabel="Apri accesso cliente"
          onPress={onOpenClientAuth}
          accentStyle={styles.clientAccent}
          variant="primary"
        />
        <EntryCard
          eyebrow="Operativita centro"
          title="Accedi / Registrati come centro!"
          description="Pagina di accesso centro con CTA verso registrazione del centro se non sei ancora registrato."
          buttonLabel="Apri accesso centro"
          onPress={onOpenCenterAuth}
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
  variant: "primary" | "secondary";
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
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  logoImage: {
    height: 120,
    width: 120,
  },
  logoSub: {
    ...textStyles.bodyMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: "hidden",
    padding: spacing.xl,
    shadowColor: "#1F4F84",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  heroCopy: {
    marginBottom: spacing.lg,
  },
  heroEyebrow: {
    ...textStyles.eyebrow,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...textStyles.screenTitle,
    maxWidth: 320,
  },
  heroText: {
    ...textStyles.bodyMuted,
    marginTop: spacing.md,
    maxWidth: 330,
  },
  heroFeature: {
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 196,
  },
  previewPanelSky: {
    backgroundColor: colors.surfaceSky,
    borderRadius: 12,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 196,
    padding: spacing.lg,
  },
  heroImage: {
    borderRadius: 12,
    minHeight: 196,
    width: 146,
  },
  previewTitle: {
    ...textStyles.cardTitle,
  },
  previewBody: {
    ...textStyles.body,
    marginTop: spacing.sm,
    maxWidth: 180,
    opacity: 0.78,
  },
  heroButtonWrap: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
  },
  entryGrid: {
    gap: spacing.lg,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.overlayBorder,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: "#1F4F84",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  entryAccent: {
    borderRadius: 12,
    height: 8,
    marginBottom: spacing.lg,
    width: 72,
  },
  clientAccent: {
    backgroundColor: colors.brand,
  },
  centerAccent: {
    backgroundColor: "#CFE1F3",
  },
  entryEyebrow: {
    ...textStyles.eyebrow,
    marginBottom: spacing.sm,
  },
  entryTitle: {
    ...textStyles.cardTitle,
  },
  entryDescription: {
    ...textStyles.bodyMuted,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
});
