import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { activateCenterSubscription, getCenterActivationStatus } from "../lib/api";
import type { ActivationStatus, Center } from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type CenterPaymentScreenProps = {
  activation: ActivationStatus;
  center: Center;
  checkoutUrl: string | null;
  onBack: () => void;
  onPaid: (center: Center, activation: ActivationStatus) => void;
};

export function CenterPaymentScreen({
  activation,
  center,
  checkoutUrl,
  onBack,
  onPaid,
}: CenterPaymentScreenProps) {
  const [status, setStatus] = useState(activation);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await activateCenterSubscription(center.id);
      setStatus(response.activation);
      onPaid(response.center, response.activation);
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Attivazione abbonamento non riuscita.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleVerify = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await getCenterActivationStatus(center.id);
      setStatus(response.activation);
      if (response.activation.subscription_status === "active") {
        onPaid(
          {
            ...center,
            subscription_status: response.activation.subscription_status,
            is_listable: response.activation.is_listable,
            registration_status: response.activation.state,
          },
          response.activation,
        );
      }
    } catch (checkError) {
      setError(
        checkError instanceof Error
          ? checkError.message
          : "Verifica pagamento non riuscita.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Step 2 di 3"
        title="Attiva l'abbonamento"
        subtitle="La struttura e pronta per Stripe, Apple Pay e Google Pay. Oggi simuliamo l'attivazione per completare il flusso."
      />

      <SectionCard
        eyebrow="Abbonamento"
        title={`Piano ${(center.subscription_plan ?? status.subscription_plan ?? "growth").replace("_", " ")}`}
        tone="sky"
      >
        <Text style={styles.price}>{planPrice(center.subscription_plan ?? status.subscription_plan)} / mese</Text>
        <Text style={styles.body}>
          Il tuo Center ID resta permanente anche se in futuro lo stato passa a past_due o cancelled.
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Identita privata" title={center.center_uid ?? center.id}>
        <Text style={styles.body}>{status.message}</Text>
        <Text style={styles.meta}>
          Stato abbonamento: {status.subscription_status}
        </Text>
        <Text style={styles.meta}>Codice invito: {center.invitation_code ?? "in creazione"}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={isChecking}
          label={isChecking ? "Attivazione..." : "Attiva abbonamento"}
          onPress={() => {
            void handleActivate();
          }}
        />
        {checkoutUrl ? (
          <PrimaryButton
            disabled={isChecking}
            label={isChecking ? "Verifica in corso..." : "Verifica Stripe"}
            onPress={() => {
              void handleVerify();
            }}
            variant="secondary"
          />
        ) : null}
        <PrimaryButton
          label="Torna indietro"
          onPress={onBack}
          variant="secondary"
        />
      </View>
    </ScrollView>
  );
}

function planPrice(plan?: string) {
  if (plan === "starter") return "EUR 29";
  if (plan === "studio_plus") return "EUR 79";
  return "EUR 49";
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
  price: {
    ...textStyles.metricValue,
  },
  body: {
    ...textStyles.body,
    marginTop: spacing.sm,
  },
  meta: {
    ...textStyles.caption,
    marginTop: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
