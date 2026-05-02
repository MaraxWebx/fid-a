import { ImageBackground, StyleSheet, Text, View, Image } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { textStyles } from "../theme/typography";
import { LinearGradient } from "expo-linear-gradient";
type PublicLandingScreenProps = {
  onOpenClientAuth: () => void;
  onOpenCenterAuth: () => void;
};

export function PublicLandingScreen({
  onOpenClientAuth,
  onOpenCenterAuth,
}: PublicLandingScreenProps) {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/imgCard.jpeg")}
        style={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(255, 255, 255, 0)", "rgb(255, 255, 255)"]}
          style={styles.overlay}
        >
          <Text style={styles.title}>Skincare Made Simple.</Text>
          <Text style={styles.subtitle}>Radiance Made Easy.</Text>

          <View style={styles.buttonRow}>
            <PrimaryButton
              label="Cliente"
              onPress={onOpenClientAuth}
              variant="secondary"
            />
            <PrimaryButton
              label="Centro"
              onPress={onOpenCenterAuth}
              variant="primary"
            />
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  image: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    padding: spacing.xl,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
  },
  title: {
    ...textStyles.screenTitle,
    textAlign: "center",
  },
  subtitle: {
    ...textStyles.titleBase,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  logoImage: {
    height: 120,
    width: 120,
  },
});
