import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useState } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { registerCenter } from "../lib/api";
import type {
  CenterRegistrationInput,
  CenterRegistrationResponse,
} from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type CenterRegistrationScreenProps = {
  onBack: () => void;
  onRegistered: (response: CenterRegistrationResponse) => void;
};

const initialForm: CenterRegistrationInput = {
  name: "",
  email: "",
  password: "",
  vat_number: "",
  address: "",
  city: "",
  postal_code: "",
  province: "",
  country: "Italia",
};

export function CenterRegistrationScreen({
  onBack,
  onRegistered,
}: CenterRegistrationScreenProps) {
  const [step, setStep] = useState<"plan" | "form">("plan");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CenterRegistrationResponse | null>(null);

  const isFormValid = Object.values(form).every(
    (value) => value.trim().length > 0,
  );

  const handleChange = (
    field: keyof CenterRegistrationInput,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await registerCenter(form);
      setResult(response);
      onRegistered(response);

      if (response.checkout_url) {
        await Linking.openURL(response.checkout_url);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registrazione non completata. Riprova.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Registrazione centro"
        title="Attiva il tuo centro"
        subtitle="Inizia scegliendo il piano, poi inserisci i dati."
        onBack={onBack}
      />

      {step === "plan" ? (
        <PlanCard onContinue={() => setStep("form")} />
      ) : (
        <View style={styles.card}>
          <Field
            label="Nome centro"
            value={form.name}
            onChangeText={(v) => handleChange("name", v)}
            placeholder="Maison Glow Milano"
          />

          <Field
            label="Email"
            value={form.email}
            onChangeText={(v) => handleChange("email", v)}
            placeholder="centro@dominio.it"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Field
            label="Password"
            value={form.password}
            onChangeText={(v) => handleChange("password", v)}
            placeholder="Minimo 6 caratteri"
            secureTextEntry
          />

          <Field
            label="Partita IVA"
            value={form.vat_number}
            onChangeText={(v) => handleChange("vat_number", v)}
            placeholder="IT12345678901"
          />

          <Field
            label="Indirizzo"
            value={form.address}
            onChangeText={(v) => handleChange("address", v)}
            placeholder="Via Roma 24"
          />

          <Field
            label="Città"
            value={form.city}
            onChangeText={(v) => handleChange("city", v)}
            placeholder="Milano"
          />

          <View style={styles.row}>
            <Field
              compact
              label="CAP"
              value={form.postal_code}
              onChangeText={(v) => handleChange("postal_code", v)}
              placeholder="20100"
            />
            <Field
              compact
              label="Provincia"
              value={form.province}
              onChangeText={(v) => handleChange("province", v)}
              placeholder="MI"
            />
          </View>

          <Field
            label="Paese"
            value={form.country}
            onChangeText={(v) => handleChange("country", v)}
            placeholder="Italia"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              disabled={!isFormValid || isSubmitting}
              label={
                isSubmitting
                  ? "Preparazione checkout..."
                  : "Continua al checkout"
              }
              onPress={handleSubmit}
            />
          </View>
        </View>
      )}

      {result && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{result.center.name}</Text>
          <Text>{result.activation.message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

/* ---------------- COMPONENTS ---------------- */

function PlanCard({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.planCard}>
      <Text style={styles.planTitle}>Piano Centro</Text>

      <Text style={styles.planPrice}>
        €20<Text style={styles.planSmall}>/mese</Text>
      </Text>

      <View style={styles.features}>
        <Feature text="Gestione clienti" />
        <Feature text="Agenda trattamenti" />
        <Feature text="Prenotazioni online" />
        <Feature text="Dashboard analytics" />
      </View>

      <PrimaryButton label="Continua" onPress={onContinue} />
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.check}>✓</Text>
      <Text>{text}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & {
  compact?: boolean;
  label: string;
  value: string;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  compact,
  ...props
}: FieldProps) {
  return (
    <View style={[styles.field, compact && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        {...props}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.lg,
  },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 16,
  },

  row: {
    flexDirection: "row",
    gap: spacing.md,
  },

  field: {
    marginBottom: spacing.md,
  },

  label: {
    ...textStyles.fieldLabel,
    marginBottom: 4,
  },

  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 14,
  },

  actions: {
    marginTop: spacing.lg,
  },

  error: {
    color: "red",
    marginTop: 8,
  },

  /* PLAN */

  planCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 16,
  },

  planTitle: {
    textAlign: "center",
    ...textStyles.eyebrow,
  },

  planPrice: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "700",
    marginVertical: spacing.md,
  },

  planSmall: {
    fontSize: 16,
  },

  features: {
    marginBottom: spacing.lg,
    gap: 8,
  },

  featureRow: {
    flexDirection: "row",
    gap: 8,
  },

  check: {
    color: colors.brand,
  },

  /* STATUS */

  statusCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSand,
    borderRadius: 12,
  },

  statusTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
});
