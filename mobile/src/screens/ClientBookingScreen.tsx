import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bookingOperators, bookingSlots } from '../data/mockData';
import { getCenterServices, getCenters } from '../lib/api';
import type { Center, Service } from '../types/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ClientBookingScreenProps = {
  selectedCenterId: string | null;
  selectedServiceId: string | null;
  onBookingConfirmed: () => void;
};

export function ClientBookingScreen({
  selectedCenterId,
  selectedServiceId,
  onBookingConfirmed,
}: ClientBookingScreenProps) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(selectedServiceId);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCenters().then((response) => {
      if (mounted) setCenters(response);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCenterId) {
      setServices([]);
      setServicesLoading(false);
      return;
    }

    let mounted = true;
    setServicesLoading(true);
    setServicesError(null);

    getCenterServices(selectedCenterId)
      .then((response) => {
        if (!mounted) return;
        setServices(response);
        const defaultServiceId = selectedServiceId ?? response[0]?.id ?? null;
        setServiceId(defaultServiceId);
        setOperatorId(null);
        setSlotId(null);
      })
      .catch(() => {
        if (!mounted) return;
        setServicesError('Impossibile caricare i trattamenti del centro.');
      })
      .finally(() => {
        if (mounted) setServicesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCenterId, selectedServiceId]);

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) ?? null,
    [serviceId, services]
  );
  const selectedCenter = useMemo(
    () => centers.find((center) => center.id === selectedCenterId) ?? null,
    [centers, selectedCenterId]
  );

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <ScreenHeader
        eyebrow="Booking flow"
        title="Prenota dal centro scelto"
        subtitle="Selezione centro, servizio, operatore e slot. Base locale pronta per il backend reale."
      />

      <SectionCard eyebrow="Centro" title={selectedCenter?.name ?? 'Centro non selezionato'}>
        <Text style={styles.notice}>
          {selectedCenter
            ? `${selectedCenter.email} - ${selectedCenter.branding?.primary_color ?? 'palette non impostata'}`
            : 'Torna in Home e scegli prima il centro.'}
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Step 1" title="Scegli il servizio">
        {servicesLoading ? <ActivityIndicator color={colors.brand} /> : null}
        {servicesError ? <Text style={styles.notice}>{servicesError}</Text> : null}
        {services.map((service) => (
          <SelectableRow
            key={service.id}
            active={service.id === serviceId}
            title={service.name}
            subtitle={`${service.category} - ${service.duration ?? '-'} min - ${service.price ?? '-'} EUR`}
            onPress={() => setServiceId(service.id)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 2" title="Scegli l'operatore">
        {bookingOperators.map((operator) => (
          <SelectableRow
            key={operator.id}
            active={operator.id === operatorId}
            title={operator.name}
            subtitle={operator.skill}
            onPress={() => setOperatorId(operator.id)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 3" title="Scegli data e ora">
        {bookingSlots.map((slot) => (
          <SelectableRow
            key={slot.id}
            active={slot.id === slotId}
            title={slot.dateLabel}
            subtitle={`${slot.timeLabel} - ${slot.availabilityLabel}`}
            onPress={() => setSlotId(slot.id)}
          />
        ))}
      </SectionCard>

      <SectionCard eyebrow="Step 4" title="Conferma prenotazione">
        <Text style={styles.summaryLine}>Centro: {selectedCenter?.name ?? 'Da selezionare'}</Text>
        <Text style={styles.summaryLine}>Servizio: {selectedService?.name ?? 'Da selezionare'}</Text>
        <Text style={styles.summaryLine}>
          Operatore:{' '}
          {bookingOperators.find((operator) => operator.id === operatorId)?.name ?? 'Seleziona un operatore'}
        </Text>
        <Text style={styles.summaryLine}>
          Slot: {bookingSlots.find((slot) => slot.id === slotId)?.timeLabel ?? 'Seleziona uno slot'}
        </Text>
        <Text style={styles.notice}>
          Demo locale: availability e lock slot verranno collegati al backend reale.
        </Text>
        <View style={styles.buttonRow}>
          <PrimaryButton label="Conferma booking" onPress={onBookingConfirmed} />
        </View>
      </SectionCard>
    </ScrollView>
  );
}

type SelectableRowProps = {
  active: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function SelectableRow({ active, onPress, subtitle, title }: SelectableRowProps) {
  return (
    <Pressable onPress={onPress} style={[styles.row, active ? styles.rowActive : null]}>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active ? styles.radioActive : null]} />
    </Pressable>
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
  row: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  rowActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.brand,
  },
  rowContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  radio: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  radioActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  summaryLine: {
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  notice: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  buttonRow: {
    marginTop: spacing.lg,
  },
});
