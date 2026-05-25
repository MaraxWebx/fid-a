import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { PrimaryButton } from "../components/PrimaryButton";
import { activateCenterSubscription, registerCenter, updateCenterOnboarding } from "../lib/api";
import type { CenterRegistrationInput, CenterRegistrationResponse } from "../types/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type CenterRegistrationScreenProps = {
  onBack: () => void;
  onRegistered: (response: CenterRegistrationResponse) => void;
};

type Step =
  | "welcome"
  | "center"
  | "contact"
  | "location"
  | "brand"
  | "operations"
  | "generating"
  | "ready"
  | "plans";

const steps: Step[] = [
  "welcome",
  "center",
  "contact",
  "location",
  "brand",
  "operations",
  "generating",
  "ready",
  "plans",
];

const serviceCategories = [
  "Nails",
  "Lashes",
  "Brows",
  "Skincare",
  "Laser",
  "Massage",
  "Hair Removal",
];

const planOptions = [
  {
    id: "starter",
    name: "Essential",
    price: "29 EUR",
    cta: "Attiva il tuo spazio",
    features: ["QR permanente", "Agenda essenziale", "Clienti collegati"],
  },
  {
    id: "growth",
    name: "Studio",
    price: "49 EUR",
    cta: "Continua con Studio",
    features: ["Reminder", "Fidelizzazione", "Profilo premium"],
  },
  {
    id: "studio_plus",
    name: "Salon",
    price: "79 EUR",
    cta: "Continua con Salon",
    features: ["Team e postazioni", "Percorsi beauty", "Insight avanzati"],
  },
];

const initialForm: CenterRegistrationInput = {
  name: "",
  owner_name: "",
  email: "",
  password: "",
  phone: "",
  subscription_plan: "growth",
  vat_number: "",
  address: "",
  city: "",
  postal_code: "",
  province: "",
  country: "Italia",
};

export function CenterRegistrationScreen({ onBack, onRegistered }: CenterRegistrationScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [logoPreview, setLogoPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stations, setStations] = useState("2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const step = steps[stepIndex];
  const identity = useMemo(() => buildLocalIdentity(form.name), [form.name]);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      duration: 260,
      toValue: 1,
      useNativeDriver: true,
    }).start();

    if (step === "generating") {
      const timer = setTimeout(() => setStepIndex((current) => current + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [fade, step]);

  const handleChange = (field: keyof CenterRegistrationInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canContinue = () => {
    if (step === "center") {
      return form.name.trim().length > 1 && form.owner_name.trim().length > 1;
    }
    if (step === "contact") {
      return (
        form.email.trim().length > 4 &&
        form.password.trim().length >= 6 &&
        form.phone.trim().length > 4
      );
    }
    if (step === "location") {
      return (
        form.address.trim().length > 3 &&
        form.city.trim().length > 1 &&
        form.postal_code.trim().length > 2 &&
        form.province.trim().length > 1
      );
    }
    if (step === "operations") {
      return selectedCategories.length > 0 && Number(stations) > 0;
    }
    return true;
  };

  const next = () => {
    setError(null);
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const back = () => {
    if (stepIndex === 0) {
      onBack();
      return;
    }
    if (step === "generating") return;
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await registerCenter({
        ...form,
        vat_number: form.vat_number || selectedCategories.join(", "),
      });
      const activationResponse = await activateCenterSubscription(response.center.id);
      const onboardingResponse = await updateCenterOnboarding(response.center.id, {
        logo_url: logoPreview,
        opening_days: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
        opening_hours: {
          Lun: { start: "09:00", end: "19:00" },
          Mar: { start: "09:00", end: "19:00" },
          Mer: { start: "09:00", end: "19:00" },
          Gio: { start: "09:00", end: "19:00" },
          Ven: { start: "09:00", end: "19:00" },
          Sab: { start: "09:00", end: "18:00" },
        },
        primary_services: selectedCategories,
      });
      onRegistered({
        ...response,
        center: onboardingResponse.center,
        activation: onboardingResponse.activation.subscription_status === "active"
          ? onboardingResponse.activation
          : activationResponse.activation,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attivazione non completata. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressValue, { width: `${progress}%` }]} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <Pressable onPress={back} style={styles.backButton}>
          <Ionicons color={colors.brandInk} name="chevron-back" size={20} />
        </Pressable>

        <Animated.View style={[styles.stage, { opacity: fade }]}>
          {step === "welcome" ? (
            <CenteredIntro
              subtitle="Configura il tuo spazio professionale in pochi minuti."
              title="Pensato per il tuo centro."
            />
          ) : null}

          {step === "center" ? (
            <StepCard
              eyebrow="Step 1"
              subtitle="Iniziamo solo dalle informazioni essenziali."
              title="Parlaci del tuo centro"
            >
              <Field
                label="Nome del centro"
                onChangeText={(value) => handleChange("name", value)}
                placeholder="Beauty Maison"
                value={form.name}
              />
              <Field
                label="Nome e cognome della titolare"
                onChangeText={(value) => handleChange("owner_name", value)}
                placeholder="Martina Bianchi"
                value={form.owner_name}
              />
            </StepCard>
          ) : null}

          {step === "contact" ? (
            <StepCard
              eyebrow="Step 1"
              subtitle="Ti serviranno per accedere al tuo spazio privato."
              title="I tuoi contatti"
            >
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email professionale"
                onChangeText={(value) => handleChange("email", value)}
                placeholder="centro@dominio.it"
                value={form.email}
              />
              <Field
                keyboardType="phone-pad"
                label="Numero di telefono"
                onChangeText={(value) => handleChange("phone", value)}
                placeholder="+39 02 1234 5678"
                value={form.phone}
              />
              <Field
                autoCapitalize="none"
                label="Password"
                onChangeText={(value) => handleChange("password", value)}
                placeholder="Minimo 6 caratteri"
                secureTextEntry
                value={form.password}
              />
            </StepCard>
          ) : null}

          {step === "location" ? (
            <StepCard
              eyebrow="Step 2"
              subtitle="Pronto per l'autocomplete Google Places."
              title="Dove si trova il tuo centro?"
            >
              <Field
                label="Indirizzo"
                onChangeText={(value) => handleChange("address", value)}
                placeholder="Via Roma 24"
                value={form.address}
              />
              <Field
                label="Città"
                onChangeText={(value) => handleChange("city", value)}
                placeholder="Milano"
                value={form.city}
              />
              <View style={styles.row}>
                <Field
                  compact
                  keyboardType="number-pad"
                  label="CAP"
                  onChangeText={(value) => handleChange("postal_code", value)}
                  placeholder="20100"
                  value={form.postal_code}
                />
                <Field
                  compact
                  label="Provincia"
                  onChangeText={(value) => handleChange("province", value)}
                  placeholder="MI"
                  value={form.province}
                />
              </View>
            </StepCard>
          ) : null}

          {step === "brand" ? (
            <StepCard
              eyebrow="Step 3"
              subtitle="Un profilo elegante, semplice da riconoscere."
              title="Personalizza il tuo spazio"
            >
              <UploadCard
                icon="image-outline"
                label="Logo del centro"
                onChangeText={setLogoPreview}
                placeholder="URL logo opzionale"
                value={logoPreview}
              />
              <UploadCard
                icon="albums-outline"
                label="Immagine cover"
                onChangeText={setCoverPreview}
                placeholder="URL cover opzionale"
                value={coverPreview}
              />
            </StepCard>
          ) : null}

          {step === "operations" ? (
            <StepCard
              eyebrow="Step 4"
              subtitle="Scegli solo ciò che rappresenta il tuo centro."
              title="Configura il tuo centro"
            >
              <View style={styles.categoryGrid}>
                {serviceCategories.map((category) => {
                  const active = selectedCategories.includes(category);
                  return (
                    <Pressable
                      key={category}
                      onPress={() => toggleCategory(category)}
                      style={[styles.categoryCard, active ? styles.categoryCardActive : null]}
                    >
                      <Text style={styles.categoryText}>{category}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.softQuestion}>Quante postazioni operative hai?</Text>
              <View style={styles.stationRow}>
                {["1", "2", "3", "4", "5+"].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setStations(value)}
                    style={[styles.stationButton, stations === value ? styles.stationActive : null]}
                  >
                    <Text style={styles.stationText}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            </StepCard>
          ) : null}

          {step === "generating" ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.brandDark} size="large" />
              <Text style={styles.loadingTitle}>Stiamo preparando il tuo spazio professionale...</Text>
            </View>
          ) : null}

          {step === "ready" ? (
            <ReadyScreen identity={identity} />
          ) : null}

          {step === "plans" ? (
            <StepCard
              eyebrow="Step 7"
              subtitle="L'identità del centro resta separata dal piano."
              title="Scegli come attivare il tuo spazio"
            >
              <View style={styles.plans}>
                {planOptions.map((plan) => {
                  const selected = form.subscription_plan === plan.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => handleChange("subscription_plan", plan.id)}
                      style={[styles.planCard, selected ? styles.planSelected : null]}
                    >
                      <View style={styles.planTop}>
                        <View>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <Text style={styles.planPrice}>
                            {plan.price}
                            <Text style={styles.planMonth}> / mese</Text>
                          </Text>
                        </View>
                        <View style={[styles.planRadio, selected ? styles.planRadioActive : null]} />
                      </View>
                      {plan.features.map((feature) => (
                        <Text key={feature} style={styles.feature}>
                          {feature}
                        </Text>
                      ))}
                      <Text style={styles.planCta}>{plan.cta}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </StepCard>
          ) : null}
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step !== "generating" ? (
          <View style={styles.actions}>
            {step === "plans" ? (
              <PrimaryButton
                disabled={isSubmitting}
                label={isSubmitting ? "Attivazione..." : "Attiva il tuo spazio"}
                onPress={() => void handleSubmit()}
              />
            ) : (
              <PrimaryButton
                disabled={!canContinue()}
                label={step === "welcome" ? "Inizia" : step === "ready" ? "Scegli il piano" : "Continua"}
                onPress={next}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function CenteredIntro({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <View style={styles.intro}>
      <View style={styles.logoMark}>
        <Ionicons color={colors.brandInk} name="sparkles-outline" size={28} />
      </View>
      <Text style={styles.introTitle}>{title}</Text>
      <Text style={styles.introSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StepCard({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.stepCard}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

type FieldProps = TextInputProps & {
  compact?: boolean;
  label: string;
  value: string;
};

function Field({ compact, label, value, onChangeText, placeholder, ...props }: FieldProps) {
  return (
    <View style={[styles.field, compact ? styles.fieldCompact : null]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
        value={value}
        {...props}
      />
    </View>
  );
}

function UploadCard({
  icon,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  icon: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.uploadCard}>
      <View style={styles.uploadIcon}>
        <Ionicons color={colors.brandInk} name={icon} size={22} />
      </View>
      <Text style={styles.uploadLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.uploadInput}
        value={value}
      />
    </View>
  );
}

function ReadyScreen({ identity }: { identity: ReturnType<typeof buildLocalIdentity> }) {
  return (
    <View style={styles.ready}>
      <Text style={styles.readyTitle}>Il tuo centro virtuale è pronto ✨</Text>
      <Text style={styles.readyCopy}>
        Le tue clienti potranno accedere direttamente al tuo spazio tramite QR o codice invito.
      </Text>
      <View style={styles.qrCard}>
        <QrPreview value={identity.qrPayload} />
        <Text style={styles.centerId}>{identity.centerId}</Text>
        <Text selectable style={styles.invitationCode}>
          {identity.invitationCode}
        </Text>
      </View>
      <View style={styles.readyActions}>
        <MiniAction icon="download-outline" label="Scarica QR" />
        <MiniAction icon="share-outline" label="Condividi QR" />
        <MiniAction icon="copy-outline" label="Copia codice invito" />
      </View>
      <View style={styles.previewCard}>
        <Text style={styles.previewName}>{identity.slug}</Text>
        <Text style={styles.previewMeta}>{identity.deepLink}</Text>
      </View>
    </View>
  );
}

function MiniAction({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.miniAction}>
      <Ionicons color={colors.brandInk} name={icon} size={15} />
      <Text style={styles.miniActionText}>{label}</Text>
    </View>
  );
}

function QrPreview({ value }: { value: string }) {
  const seed = Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
  const cells = Array.from({ length: 100 }, (_, index) => {
    const row = Math.floor(index / 10);
    const col = index % 10;
    const finder =
      (row < 3 && col < 3) ||
      (row < 3 && col > 6) ||
      (row > 6 && col < 3);
    return finder || (index * 13 + seed + row * col) % 4 < 2;
  });

  return (
    <View style={styles.qrPreview}>
      {cells.map((filled, index) => (
        <View key={index} style={[styles.qrCell, filled ? styles.qrCellFilled : null]} />
      ))}
    </View>
  );
}

function buildLocalIdentity(name: string) {
  const base = name.trim() || "Beauty Maison";
  const letters = base
    .replace(/[^A-Za-zÀ-ÿ\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 3)
    .padEnd(3, "B");
  const number = Array.from(base).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 9000 + 1000;
  const slug = `${base.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "beautymaison"}_21`;
  const invitationCode = `${letters}-${number}`;

  return {
    centerId: invitationCode,
    deepLink: `fidea://join?code=${invitationCode}`,
    invitationCode,
    qrPayload: `fidea://join?code=${invitationCode}&center=${slug}`,
    slug,
  };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  progressTrack: {
    backgroundColor: "rgba(40,111,112,0.10)",
    height: 5,
  },
  progressValue: {
    backgroundColor: colors.brandDark,
    height: 5,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 42,
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: colors.overlayBorder,
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  stage: {
    marginTop: 22,
  },
  intro: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 520,
    paddingVertical: 40,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.surfaceLavender,
    borderRadius: 26,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  introTitle: {
    color: colors.brandInk,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    marginTop: 24,
    textAlign: "center",
  },
  introSubtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 320,
    textAlign: "center",
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderColor: "rgba(40,111,112,0.10)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  eyebrow: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  stepTitle: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: 10,
  },
  stepSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  cardBody: {
    marginTop: 22,
  },
  field: {
    marginBottom: 15,
  },
  fieldCompact: {
    flex: 1,
  },
  label: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    color: colors.text,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  uploadCard: {
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    borderColor: colors.overlayBorder,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  uploadIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceLavender,
    borderRadius: 22,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  uploadLabel: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  uploadInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    color: colors.text,
    fontSize: 14,
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    width: "100%",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryCardActive: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brandDark,
  },
  categoryText: {
    color: colors.brandInk,
    fontSize: 13,
    fontWeight: "800",
  },
  softQuestion: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 24,
  },
  stationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  stationButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 54,
  },
  stationActive: {
    backgroundColor: colors.surfaceLavender,
    borderColor: colors.brandDark,
  },
  stationText: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: "800",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    minHeight: 440,
    justifyContent: "center",
    padding: 26,
  },
  loadingTitle: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 29,
    marginTop: 22,
    textAlign: "center",
  },
  ready: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(40,111,112,0.10)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  readyTitle: {
    color: colors.brandInk,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 33,
    textAlign: "center",
  },
  readyCopy: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center",
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: "#FFFDFC",
    borderColor: colors.overlayBorder,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
    width: "100%",
  },
  qrPreview: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    padding: 12,
    width: 172,
  },
  qrCell: {
    backgroundColor: "rgba(24,63,61,0.08)",
    borderRadius: 2,
    height: 12,
    width: 12,
  },
  qrCellFilled: {
    backgroundColor: colors.brandInk,
  },
  centerId: {
    color: colors.brandInk,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
  },
  invitationCode: {
    color: colors.brandDark,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  readyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
  },
  miniAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceSky,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  miniActionText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: "800",
  },
  previewCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
    width: "100%",
  },
  previewName: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: "800",
  },
  previewMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  plans: {
    gap: 12,
  },
  planCard: {
    backgroundColor: "#FFFDFC",
    borderColor: colors.overlayBorder,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  planSelected: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brandDark,
  },
  planTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planName: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: "800",
  },
  planPrice: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  planMonth: {
    fontSize: 13,
    fontWeight: "700",
  },
  planRadio: {
    borderColor: colors.brandDark,
    borderRadius: 11,
    borderWidth: 1,
    height: 22,
    width: 22,
  },
  planRadioActive: {
    backgroundColor: colors.brandInk,
  },
  feature: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  planCta: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 14,
  },
  actions: {
    marginTop: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    textAlign: "center",
  },
});
