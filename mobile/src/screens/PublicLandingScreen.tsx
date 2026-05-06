import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
} from "react-native";
import { useState } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";

type PublicLandingScreenProps = {
  clientEmail: string;
  clientPassword: string;
  clientError: string | null;
  clientLoading: boolean;
  onClientEmailChange: (value: string) => void;
  onClientPasswordChange: (value: string) => void;
  onClientLogin: () => void;
  onGoToClientRegister: () => void;
  centerEmail: string;
  centerPassword: string;
  centerError: string | null;
  centerLoading: boolean;
  onCenterEmailChange: (value: string) => void;
  onCenterPasswordChange: (value: string) => void;
  onCenterLogin: () => void;
  onGoToCenterRegister: () => void;
};

type TabType = "cliente" | "centro";

export function PublicLandingScreen({
  clientEmail,
  clientPassword,
  clientError,
  clientLoading,
  onClientEmailChange,
  onClientPasswordChange,
  onClientLogin,
  onGoToClientRegister,
  centerEmail,
  centerPassword,
  centerError,
  centerLoading,
  onCenterEmailChange,
  onCenterPasswordChange,
  onCenterLogin,
  onGoToCenterRegister,
}: PublicLandingScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>("cliente");

  const handleLogin = () => {
    if (activeTab === "cliente") {
      onClientLogin();
    } else {
      onCenterLogin();
    }
  };

  const email = activeTab === "cliente" ? clientEmail : centerEmail;
  const password = activeTab === "cliente" ? clientPassword : centerPassword;
  const error = activeTab === "cliente" ? clientError : centerError;
  const isLoading = activeTab === "cliente" ? clientLoading : centerLoading;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/FidèaLogo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View
        style={{
          flex: 1,
          borderTopEndRadius: 40,

          backgroundColor: colors.surface,
        }}
      >
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === "cliente" && styles.tabActive]}
            onPress={() => setActiveTab("cliente")}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === "cliente" && styles.tabLabelActive,
              ]}
            >
              Cliente
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "centro" && styles.tabActive]}
            onPress={() => setActiveTab("centro")}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === "centro" && styles.tabLabelActive,
              ]}
            >
              Centro
            </Text>
          </Pressable>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {activeTab === "cliente"
              ? "Accedi come Cliente"
              : "Accedi come Centro"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            value={email}
            onChangeText={
              activeTab === "cliente"
                ? onClientEmailChange
                : onCenterEmailChange
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={
              activeTab === "cliente"
                ? onClientPasswordChange
                : onCenterPasswordChange
            }
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            label={isLoading ? "Accesso in corso..." : "Accedi"}
            onPress={handleLogin}
            variant="primary"
          />

          <Pressable
            onPress={() => {
              if (activeTab === "cliente") {
                onGoToClientRegister();
              } else {
                onGoToCenterRegister();
              }
            }}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              {activeTab === "cliente"
                ? "Non hai un account? Registrati"
                : "Non hai un account? Registrati"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...textStyles.screenTitle,
    color: colors.brand,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 0,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    /* s */
  },
  tabLabel: {
    ...textStyles.titleBase,
    color: colors.textMuted,
  },
  tabLabelActive: {
    fontWeight: "600",
    color: colors.brand,
  },
  formContainer: {
    padding: spacing.xl,
    flex: 1,
    justifyContent: "flex-start",
  },
  formTitle: {
    ...textStyles.screenTitle,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.brand,
  },
  registerLink: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  registerText: {
    ...textStyles.titleBase,
    color: colors.brand,
    textDecorationLine: "underline",
  },
  errorText: {
    ...textStyles.titleBase,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  logoImage: {
    height: 120,
    width: 120,
  },
});
