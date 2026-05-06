import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { getFavoriteCenters, toggleFavoriteCenter } from "../lib/api";
import type { Center } from "../types/api";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ClientFavoritesScreenProps = {
  profileEmail: string;
  selectedCenterId: string | null;
  onOpenCenter: (center: Center) => void;
};

export function ClientFavoritesScreen({
  profileEmail,
  selectedCenterId,
  onOpenCenter,
}: ClientFavoritesScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [favoriteCenterIds, setFavoriteCenterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingCenterId, setUpdatingCenterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFavoriteCenters(profileEmail);
      setCenters(response.centers);
      setFavoriteCenterIds(response.favorite_center_ids);
    } catch {
      setError("Impossibile caricare i centri preferiti.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFavorites();
  }, [profileEmail]);

  const handleRemoveFavorite = async (centerId: string) => {
    setUpdatingCenterId(centerId);
    setError(null);
    try {
      const response = await toggleFavoriteCenter(profileEmail, centerId);
      setCenters(response.centers);
      setFavoriteCenterIds(response.favorite_center_ids);
    } catch {
      setError("Impossibile aggiornare i preferiti.");
    } finally {
      setUpdatingCenterId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Preferiti"
        title="Centri preferiti"
        subtitle="Ritrova velocemente i centri estetici che hai salvato."
      />

      <SectionCard eyebrow="Lista preferiti" title={`${centers.length} centri`}>
        {loading ? <ActivityIndicator color={colors.brand} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && centers.length === 0 ? (
          <Text style={styles.empty}>
            Nessun centro preferito. Tocca il cuore nella home per salvarne uno.
          </Text>
        ) : null}
        <View style={styles.list}>
          {centers.map((center) => {
            const selected = center.id === selectedCenterId;
            const isFavorite = favoriteCenterIds.includes(center.id);

            return (
              <Pressable
                key={center.id}
                onPress={() => onOpenCenter(center)}
                style={[styles.centerCard, selected ? styles.centerCardSelected : null]}
              >
                {center.branding.logo ? (
                  <Image source={{ uri: center.branding.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoText}>
                      {center.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.main}>
                  <Text style={styles.name}>{center.name}</Text>
                  <Text style={styles.meta}>
                    {(center.primary_services ?? []).slice(0, 2).join(" - ") ||
                      "Centro estetico"}
                  </Text>
                </View>
                <Pressable
                  disabled={updatingCenterId === center.id}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleRemoveFavorite(center.id);
                  }}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    color={isFavorite ? colors.rose : colors.textMuted}
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={22}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>
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
  list: {
    gap: spacing.sm,
  },
  centerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  centerCardSelected: {
    backgroundColor: colors.surfaceSky,
    borderColor: colors.brand,
  },
  logo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 48,
    width: 48,
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  main: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  favoriteButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});
