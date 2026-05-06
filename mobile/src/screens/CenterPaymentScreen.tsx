import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { getCenterActivationStatus } from "../lib/api";
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
        title="Completa il pagamento"
        subtitle="Dopo il checkout attiviamo il centro e ti portiamo all'onboarding guidato del profilo."
      />

      <SectionCard
        eyebrow="Abbonamento"
        title="Piano centro mensile"
        tone="sky"
      >
        <Text style={styles.price}>EUR 20 / mese</Text>
        <Text style={styles.body}>
          Il centro viene attivato appena Stripe conferma il pagamento.
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Stato" title="Verifica attivazione">
        <Text style={styles.body}>{status.message}</Text>
        <Text style={styles.meta}>
          Stato pagamento: {status.subscription_status}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SectionCard>

      <View style={styles.actions}>
        <PrimaryButton
          disabled={!checkoutUrl}
          label="Apri checkout Stripe"
          onPress={() => {
            if (checkoutUrl) {
              void Linking.openURL(checkoutUrl);
            }
          }}
        />
        <PrimaryButton
          disabled={isChecking}
          label={isChecking ? "Verifica in corso..." : "Ho pagato, continua"}
          onPress={() => {
            void handleVerify();
          }}
          variant="secondary"
        />
        <PrimaryButton
          label="Torna indietro"
          onPress={onBack}
          variant="secondary"
        />
      </View>
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
