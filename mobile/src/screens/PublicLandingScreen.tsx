import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type PublicLandingScreenProps = {
  onGoToCenterAuth: () => void;
  onGoToCenterRegister: () => void;
  onGoToClientAuth: () => void;
  onGoToClientRegister: () => void;
};

type EntryType = "client" | "center";

const entryCards = {
  client: {
    title: "Cliente",
    subtitle:
      "Prenota trattamenti, gestisci appuntamenti e resta sempre connessa ai tuoi centri preferiti.",
    cta: "Continua come cliente",
    icon: "sparkles-outline",
  },
  center: {
    title: "Centro estetico",
    subtitle:
      "Gestisci clienti, appuntamenti e fidelizzazione in un unico spazio professionale.",
    cta: "Continua come professionista",
    icon: "business-outline",
  },
} as const;

export function PublicLandingScreen({
  onGoToCenterAuth,
  onGoToCenterRegister,
  onGoToClientAuth,
  onGoToClientRegister,
}: PublicLandingScreenProps) {
  const [entryType, setEntryType] = useState<EntryType | null>(null);

  const goToAuth = entryType === "center" ? onGoToCenterAuth : onGoToClientAuth;
  const goToRegister =
    entryType === "center" ? onGoToCenterRegister : onGoToClientRegister;

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.container}
    >
      <View style={styles.glow} />

      <View style={styles.hero}>
        <Image
          resizeMode="contain"
          source={require("../../assets/fidea-logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Il tuo centro, più vicino alle tue clienti.</Text>
        <Text style={styles.subtitle}>
          Clienti, appuntamenti e fidelizzazione in un'unica esperienza elegante e professionale.
        </Text>
      </View>

      <View style={styles.choiceHeader}>
        <Text style={styles.choiceTitle}>Come vuoi vivere Fidéa?</Text>
        <Text style={styles.choiceSubtitle}>Scegli l'esperienza più adatta a te.</Text>
      </View>

      <View style={styles.cards}>
        <EntryCard
          active={entryType === "client"}
          onPress={() => setEntryType("client")}
          tone="soft"
          {...entryCards.client}
        />
        <EntryCard
          active={entryType === "center"}
          onPress={() => setEntryType("center")}
          tone="strong"
          {...entryCards.center}
        />
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionTitle}>
          {entryType ? entryCards[entryType].title : "Seleziona un'esperienza"}
        </Text>
        <Text style={styles.actionSubtitle}>
          {entryType
            ? "Accedi al tuo spazio oppure crea un nuovo profilo."
            : "Le azioni appariranno appena scegli come proseguire."}
        </Text>
        <View style={styles.actionButtons}>
          <PrimaryButton
            disabled={!entryType}
            label="Accedi"
            onPress={goToAuth}
          />
          <PrimaryButton
            disabled={!entryType}
            label="Registrati"
            onPress={goToRegister}
            variant="secondary"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function EntryCard({
  active,
  cta,
  icon,
  onPress,
  subtitle,
  title,
  tone,
}: {
  active: boolean;
  cta: string;
  icon: string;
  onPress: () => void;
  subtitle: string;
  title: string;
  tone: "soft" | "strong";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.entryCard,
        tone === "strong" ? styles.entryCardStrong : styles.entryCardSoft,
        active ? styles.entryCardActive : null,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWrap, tone === "strong" ? styles.iconStrong : null]}>
          <Ionicons color={colors.brandInk} name={icon} size={22} />
        </View>
        {active ? (
          <Ionicons color={colors.brandDark} name="checkmark-circle" size={22} />
        ) : null}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <Text style={styles.cardCta}>{cta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    paddingTop: 22,
  },
  glow: {
    backgroundColor: "rgba(217,154,165,0.18)",
    borderRadius: 999,
    height: 190,
    position: "absolute",
    right: -80,
    top: -48,
    width: 190,
  },
  hero: {
    alignItems: "center",
    paddingBottom: 26,
    paddingTop: 10,
  },
  logo: {
    height: 94,
    width: 94,
  },
  title: {
    color: colors.brandInk,
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 18,
    maxWidth: 380,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 360,
    textAlign: "center",
  },
  choiceHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  choiceTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  choiceSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  cards: {
    gap: 14,
  },
  entryCard: {
    borderColor: "rgba(40,111,112,0.10)",
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 176,
    padding: 20,
  },
  entryCardSoft: {
    backgroundColor: "#FFFDFC",
  },
  entryCardStrong: {
    backgroundColor: "#F2EEE6",
  },
  entryCardActive: {
    borderColor: colors.brandDark,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.11,
    shadowRadius: 20,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceLavender,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  iconStrong: {
    backgroundColor: colors.surfaceSky,
  },
  cardTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  cardCta: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 16,
  },
  actionPanel: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(40,111,112,0.10)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  actionTitle: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
  },
});
