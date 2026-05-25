import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { PrimaryButton } from '../components/PrimaryButton';
import { ServiceCatalogPicker } from '../components/ServiceCatalogPicker';
import { treatmentCatalog } from '../data/treatmentCatalog';
import {
  getCenterReviews,
  getCenterServices,
  updateCenterOnboarding,
  updateCenterProfile,
  updateCenterServices,
} from '../lib/api';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { textStyles } from '../theme/typography';
import type {
  ActivationStatus,
  Center,
  CenterOnboardingInput,
  Review,
  Service,
} from '../types/api';

type CenterSettingsScreenProps = {
  activation: ActivationStatus;
  center: Center;
  onCenterUpdated: (center: Center, activation: ActivationStatus) => void;
  onLogout: () => void;
};

type WeekdayKey = 'Lun' | 'Mar' | 'Mer' | 'Gio' | 'Ven' | 'Sab' | 'Dom';
type TimeSlot = {
  end: string;
  start: string;
};
type DaySchedule = {
  breakEnabled: boolean;
  breakEnd: string;
  breakStart: string;
  enabled: boolean;
  slots: TimeSlot[];
};

type DashboardSectionProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

type StatusTone = 'success' | 'warning' | 'neutral' | 'rose';
type OperatorDraft = {
  active: boolean;
  color: string;
  hours: string;
  id: string;
  imageUrl: string;
  name: string;
  role: string;
  specialties: string;
};
type CabinDraft = {
  active: boolean;
  color: string;
  id: string;
  name: string;
  treatments: string;
};
type PackageDraft = {
  active: boolean;
  discount: string;
  duration: string;
  expiration: string;
  id: string;
  installments: boolean;
  name: string;
  notes: string;
  price: string;
  promoBadge: string;
  sessions: string;
  treatments: string;
};

const weekdayOptions: { key: WeekdayKey; fullLabel: string }[] = [
  { key: 'Lun', fullLabel: 'Lunedi' },
  { key: 'Mar', fullLabel: 'Martedi' },
  { key: 'Mer', fullLabel: 'Mercoledi' },
  { key: 'Gio', fullLabel: 'Giovedi' },
  { key: 'Ven', fullLabel: 'Venerdi' },
  { key: 'Sab', fullLabel: 'Sabato' },
  { key: 'Dom', fullLabel: 'Domenica' },
];

const operatorColorOptions = ['#8FBDB7', '#D6A978', '#9BB9D4', '#DFA0A9', '#A8C99F'];

const initialOperators: OperatorDraft[] = [
  {
    active: true,
    color: '#8FBDB7',
    hours: '09:00 - 18:00',
    id: 'op-martina',
    imageUrl: '',
    name: 'Martina',
    role: 'Estetista',
    specialties: 'Viso, laser',
  },
  {
    active: true,
    color: '#9BB9D4',
    hours: '10:00 - 19:00',
    id: 'op-sofia',
    imageUrl: '',
    name: 'Sofia',
    role: 'Nails Specialist',
    specialties: 'Nails, pedicure',
  },
];

const initialCabins: CabinDraft[] = [
  {
    active: true,
    color: '#D6A978',
    id: 'cabin-laser',
    name: 'Cabina Laser',
    treatments: 'Laser, epilazione',
  },
  {
    active: true,
    color: '#9BB9D4',
    id: 'cabin-nails',
    name: 'Cabina Nails',
    treatments: 'Manicure, pedicure',
  },
];

const initialPackages: PackageDraft[] = [
  {
    active: true,
    discount: '15',
    duration: '12 mesi',
    expiration: '12 mesi',
    id: 'pkg-laser',
    installments: true,
    name: 'Laser Package',
    notes: 'Ideale per percorso completo con richiamo incluso.',
    price: '499',
    promoBadge: 'Best value',
    sessions: '6',
    treatments: 'Laser',
  },
  {
    active: true,
    discount: '',
    duration: '90 min ciascuno',
    expiration: '6 mesi',
    id: 'pkg-relax',
    installments: false,
    name: 'Relax Ritual Package',
    notes: 'Percorso corpo e benessere stagionale.',
    price: '210',
    promoBadge: '',
    sessions: '3',
    treatments: 'Massaggio relax, rituale corpo',
  },
];

function buildInitialSchedule(center: Center): Record<WeekdayKey, DaySchedule> {
  return weekdayOptions.reduce(
    (accumulator, day) => {
      const currentHours = center.opening_hours?.[day.key];
      const isEnabled = center.opening_days?.includes(day.key) ?? false;

      accumulator[day.key] = {
        breakEnabled: currentHours?.break_enabled ?? false,
        breakEnd: currentHours?.break_end ?? '14:00',
        breakStart: currentHours?.break_start ?? '13:00',
        enabled: isEnabled,
        slots:
          currentHours?.slots && currentHours.slots.length > 0
            ? currentHours.slots.map((slot) => ({
                start: slot.start ?? '09:00',
                end: slot.end ?? '19:00',
              }))
            : [
                {
                  start: currentHours?.start ?? '09:00',
                  end: currentHours?.end ?? '19:00',
                },
              ],
      };
      return accumulator;
    },
    {} as Record<WeekdayKey, DaySchedule>,
  );
}

function DashboardSection({ eyebrow, title, subtitle, children }: DashboardSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === 'success' ? styles.statusSuccess : null,
        tone === 'warning' ? styles.statusWarning : null,
        tone === 'rose' ? styles.statusRose : null,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          tone === 'success' ? styles.statusDotSuccess : null,
          tone === 'warning' ? styles.statusDotWarning : null,
          tone === 'rose' ? styles.statusDotRose : null,
        ]}
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: string;
  label: string;
  value: string;
  tone?: StatusTone;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTopRow}>
        <View style={styles.metricIcon}>
          <Ionicons color={colors.brandInk} name={icon} size={17} />
        </View>
        <StatusPill
          label={tone === 'success' ? 'Ok' : tone === 'warning' ? 'Check' : 'Info'}
          tone={tone}
        />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SettingTile({
  icon,
  title,
  detail,
  status,
  tone = 'neutral',
  onPress,
  right,
}: {
  icon: string;
  title: string;
  detail: string;
  status?: string;
  tone?: StatusTone;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const content = (
    <>
      <View style={styles.tileIcon}>
        <Ionicons color={colors.brandInk} name={icon} size={18} />
      </View>
      <View style={styles.tileCopy}>
        <View style={styles.tileTitleRow}>
          <Text style={styles.tileTitle}>{title}</Text>
          {status ? <StatusPill label={status} tone={tone} /> : null}
        </View>
        <Text style={styles.tileDetail}>{detail}</Text>
      </View>
      {right ? (
        right
      ) : onPress ? (
        <Ionicons color={colors.textSoft} name="chevron-forward" size={18} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.settingTile}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.settingTile}>{content}</View>;
}

function CenterQrPreview({ value }: { value: string }) {
  const seed = Array.from(value || 'fidea').reduce((total, character) => total + character.charCodeAt(0), 0);
  const cells = Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const finder =
      (row < 3 && column < 3) ||
      (row < 3 && column > 5) ||
      (row > 5 && column < 3);
    return finder || (index * 17 + seed + row * column) % 5 < 2;
  });

  return (
    <View style={styles.qrPreview}>
      {cells.map((filled, index) => (
        <View key={index} style={[styles.qrCell, filled ? styles.qrCellFilled : null]} />
      ))}
    </View>
  );
}

function OperatorManagement({
  onAdd,
  onDelete,
  onUpdate,
  operators,
}: {
  onAdd: () => void;
  onDelete: (operatorId: string) => void;
  onUpdate: (operatorId: string, field: keyof OperatorDraft, value: string | boolean) => void;
  operators: OperatorDraft[];
}) {
  return (
    <View style={styles.managementPanel}>
      <View style={styles.managementHeader}>
        <View>
          <Text style={styles.cardMiniTitle}>Staff / operators</Text>
          <Text style={styles.cardHint}>Gestisci presenze, ruoli e specialita in agenda.</Text>
        </View>
        <Pressable onPress={onAdd} style={styles.addMiniButton}>
          <Ionicons color={colors.brandInk} name="add" size={16} />
          <Text style={styles.addMiniButtonText}>Add Operator</Text>
        </Pressable>
      </View>

      <View style={styles.managementList}>
        {operators.map((operator) => (
          <View key={operator.id} style={[styles.operatorCard, !operator.active ? styles.managementCardDisabled : null]}>
            <View style={styles.managementCardTop}>
              <View style={[styles.operatorAvatar, { backgroundColor: operator.color }]}>
                {operator.imageUrl ? (
                  <Image source={{ uri: operator.imageUrl }} style={styles.operatorAvatarImage} />
                ) : (
                  <Text style={styles.operatorAvatarText}>{operator.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.managementCardMain}>
                <TextInput
                  onChangeText={(value) => onUpdate(operator.id, 'name', value)}
                  placeholder="Nome operatore"
                  placeholderTextColor={colors.textSoft}
                  style={styles.inlineNameInput}
                  value={operator.name}
                />
                <TextInput
                  onChangeText={(value) => onUpdate(operator.id, 'role', value)}
                  placeholder="Ruolo"
                  placeholderTextColor={colors.textSoft}
                  style={styles.inlineMetaInput}
                  value={operator.role}
                />
              </View>
              <Switch
                onValueChange={(value) => onUpdate(operator.id, 'active', value)}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={operator.active}
              />
            </View>

            <View style={styles.managementFields}>
              <TextInput
                onChangeText={(value) => onUpdate(operator.id, 'hours', value)}
                placeholder="09:00 - 18:00"
                placeholderTextColor={colors.textSoft}
                style={styles.managementInput}
                value={operator.hours}
              />
              <TextInput
                onChangeText={(value) => onUpdate(operator.id, 'specialties', value)}
                placeholder="Specialita / trattamenti"
                placeholderTextColor={colors.textSoft}
                style={styles.managementInput}
                value={operator.specialties}
              />
            </View>

            <View style={styles.colorRail}>
              {operatorColorOptions.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => onUpdate(operator.id, 'color', color)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    operator.color === color ? styles.colorDotSelected : null,
                  ]}
                />
              ))}
              <Pressable onPress={() => onDelete(operator.id)} style={styles.deleteMiniButton}>
                <Ionicons color={colors.danger} name="trash-outline" size={15} />
                <Text style={styles.deleteMiniText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function CabinManagement({
  cabins,
  onAdd,
  onDelete,
  onUpdate,
}: {
  cabins: CabinDraft[];
  onAdd: () => void;
  onDelete: (cabinId: string) => void;
  onUpdate: (cabinId: string, field: keyof CabinDraft, value: string | boolean) => void;
}) {
  return (
    <View style={styles.managementPanel}>
      <View style={styles.managementHeader}>
        <View>
          <Text style={styles.cardMiniTitle}>Cabins / rooms</Text>
          <Text style={styles.cardHint}>Personalizza cabine, stanze e risorse prenotabili.</Text>
        </View>
        <Pressable onPress={onAdd} style={styles.addMiniButton}>
          <Ionicons color={colors.brandInk} name="add" size={16} />
          <Text style={styles.addMiniButtonText}>Add Cabin</Text>
        </Pressable>
      </View>

      <View style={styles.cabinGrid}>
        {cabins.map((cabin) => (
          <View key={cabin.id} style={[styles.cabinCard, !cabin.active ? styles.managementCardDisabled : null]}>
            <View style={styles.managementCardTop}>
              <View style={[styles.cabinColorBar, { backgroundColor: cabin.color }]} />
              <View style={styles.managementCardMain}>
                <TextInput
                  onChangeText={(value) => onUpdate(cabin.id, 'name', value)}
                  placeholder="Nome cabina"
                  placeholderTextColor={colors.textSoft}
                  style={styles.inlineNameInput}
                  value={cabin.name}
                />
                <TextInput
                  onChangeText={(value) => onUpdate(cabin.id, 'treatments', value)}
                  placeholder="Trattamenti assegnati"
                  placeholderTextColor={colors.textSoft}
                  style={styles.inlineMetaInput}
                  value={cabin.treatments}
                />
              </View>
              <Switch
                onValueChange={(value) => onUpdate(cabin.id, 'active', value)}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={cabin.active}
              />
            </View>
            <View style={styles.colorRail}>
              {operatorColorOptions.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => onUpdate(cabin.id, 'color', color)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    cabin.color === color ? styles.colorDotSelected : null,
                  ]}
                />
              ))}
              <Pressable onPress={() => onDelete(cabin.id)} style={styles.deleteMiniButton}>
                <Ionicons color={colors.danger} name="trash-outline" size={15} />
                <Text style={styles.deleteMiniText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PackagesManagement({
  onAdd,
  onArchive,
  onDuplicate,
  onUpdate,
  packages,
}: {
  onAdd: () => void;
  onArchive: (packageId: string) => void;
  onDuplicate: (item: PackageDraft) => void;
  onUpdate: (packageId: string, field: keyof PackageDraft, value: string | boolean) => void;
  packages: PackageDraft[];
}) {
  return (
    <View style={styles.packagesPanel}>
      <View style={styles.managementHeader}>
        <View>
          <Text style={styles.cardMiniTitle}>Packages</Text>
          <Text style={styles.cardHint}>Percorsi, abbonamenti e rituali vendibili dal centro.</Text>
        </View>
        <Pressable onPress={onAdd} style={styles.addMiniButton}>
          <Ionicons color={colors.brandInk} name="add" size={16} />
          <Text style={styles.addMiniButtonText}>Create Package</Text>
        </Pressable>
      </View>

      <View style={styles.packageList}>
        {packages.map((item) => (
          <View key={item.id} style={[styles.packageCard, !item.active ? styles.managementCardDisabled : null]}>
            <View style={styles.packageTop}>
              <View style={styles.packageTitleBlock}>
                <TextInput
                  onChangeText={(value) => onUpdate(item.id, 'name', value)}
                  placeholder="Package name"
                  placeholderTextColor={colors.textSoft}
                  style={styles.packageNameInput}
                  value={item.name}
                />
                <TextInput
                  onChangeText={(value) => onUpdate(item.id, 'treatments', value)}
                  placeholder="Included treatments"
                  placeholderTextColor={colors.textSoft}
                  style={styles.packageTreatmentsInput}
                  value={item.treatments}
                />
              </View>
              <Switch
                onValueChange={(value) => onUpdate(item.id, 'active', value)}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={item.active}
              />
            </View>

            <View style={styles.packagePriceRow}>
              <Text style={styles.packageCurrency}>EUR</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => onUpdate(item.id, 'price', value)}
                placeholder="499"
                placeholderTextColor={colors.textSoft}
                style={styles.packagePriceInput}
                value={item.price}
              />
              {item.promoBadge.trim() ? (
                <View style={styles.packageBadge}>
                  <Text style={styles.packageBadgeText}>{item.promoBadge}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.packageFields}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => onUpdate(item.id, 'sessions', value)}
                placeholder="Sessions"
                placeholderTextColor={colors.textSoft}
                style={styles.packageField}
                value={item.sessions}
              />
              <TextInput
                onChangeText={(value) => onUpdate(item.id, 'duration', value)}
                placeholder="Duration"
                placeholderTextColor={colors.textSoft}
                style={styles.packageField}
                value={item.duration}
              />
              <TextInput
                onChangeText={(value) => onUpdate(item.id, 'expiration', value)}
                placeholder="Expiration"
                placeholderTextColor={colors.textSoft}
                style={styles.packageField}
                value={item.expiration}
              />
            </View>

            <View style={styles.packageFields}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => onUpdate(item.id, 'discount', value)}
                placeholder="Discount %"
                placeholderTextColor={colors.textSoft}
                style={styles.packageField}
                value={item.discount}
              />
              <TextInput
                onChangeText={(value) => onUpdate(item.id, 'promoBadge', value)}
                placeholder="Promo badge"
                placeholderTextColor={colors.textSoft}
                style={styles.packageField}
                value={item.promoBadge}
              />
            </View>

            <TextInput
              multiline
              onChangeText={(value) => onUpdate(item.id, 'notes', value)}
              placeholder="Notes"
              placeholderTextColor={colors.textSoft}
              style={[styles.packageField, styles.packageNotes]}
              value={item.notes}
            />

            <View style={styles.packageFooter}>
              <Pressable
                onPress={() => onUpdate(item.id, 'installments', !item.installments)}
                style={[styles.packageToggle, item.installments ? styles.packageToggleActive : null]}
              >
                <Text style={styles.packageToggleText}>
                  {item.installments ? 'Installments on' : 'Installments off'}
                </Text>
              </Pressable>
              <Pressable onPress={() => onDuplicate(item)} style={styles.serviceAction}>
                <Ionicons color={colors.brandInk} name="copy-outline" size={15} />
                <Text style={styles.serviceActionText}>Duplicate</Text>
              </Pressable>
              <Pressable onPress={() => onArchive(item.id)} style={[styles.serviceAction, styles.serviceActionDanger]}>
                <Ionicons color={colors.danger} name="archive-outline" size={15} />
                <Text style={[styles.serviceActionText, styles.serviceActionDangerText]}>Archive</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CenterSettingsScreen({
  activation,
  center,
  onCenterUpdated,
  onLogout,
}: CenterSettingsScreenProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceOrder, setServiceOrder] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(center.name);
  const [profileLogoUrl, setProfileLogoUrl] = useState(center.branding.logo ?? '');
  const [profileDescription, setProfileDescription] = useState(center.branding.description ?? '');
  const [profileInstagramUrl, setProfileInstagramUrl] = useState(center.branding.instagram_url ?? '');
  const [profileTiktokUrl, setProfileTiktokUrl] = useState(center.branding.tiktok_url ?? '');
  const [schedule, setSchedule] = useState(() => buildInitialSchedule(center));
  const [selectedDayKey, setSelectedDayKey] = useState<WeekdayKey>('Lun');
  const [copiedSchedule, setCopiedSchedule] = useState<DaySchedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(activation.is_listable);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [noShowProtectionEnabled, setNoShowProtectionEnabled] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editingServicePrice, setEditingServicePrice] = useState('');
  const [editingServiceDuration, setEditingServiceDuration] = useState('');
  const [operators, setOperators] = useState<OperatorDraft[]>(initialOperators);
  const [cabins, setCabins] = useState<CabinDraft[]>(initialCabins);
  const [packages, setPackages] = useState<PackageDraft[]>(initialPackages);
  const [qrActionMessage, setQrActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(center.name);
    setProfileLogoUrl(center.branding.logo ?? '');
    setProfileDescription(center.branding.description ?? '');
    setProfileInstagramUrl(center.branding.instagram_url ?? '');
    setProfileTiktokUrl(center.branding.tiktok_url ?? '');
    setSchedule(buildInitialSchedule(center));
  }, [center]);

  useEffect(() => {
    setOnlineBookingEnabled(activation.is_listable);
  }, [activation.is_listable]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getCenterServices(center.id), getCenterReviews(center.id)])
      .then(([servicesResult, reviewsResult]) => {
        if (!mounted) {
          return;
        }

        if (servicesResult.status === 'fulfilled') {
          setServices(servicesResult.value);
          setServiceOrder(servicesResult.value.map((service) => service.id));
        } else {
          setCatalogError('Impossibile caricare i trattamenti del centro.');
        }

        if (reviewsResult.status === 'fulfilled') {
          setReviews(reviewsResult.value);
        } else {
          setReviews([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingServices(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [center.id]);

  const configuredServices = useMemo(
    () => services.filter((service) => service.visibility === 'active'),
    [services],
  );
  const managedServices = useMemo(() => {
    const orderIndex = new Map(serviceOrder.map((id, index) => [id, index]));

    return [...services].sort((left, right) => {
      const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
    });
  }, [serviceOrder, services]);

  const ratingAverage =
    center.rating_average ??
    (reviews.length > 0
      ? Number(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1),
        )
      : null);
  const reviewsCount = center.reviews_count ?? reviews.length;
  const activeDays = weekdayOptions.filter(({ key }) => schedule[key].enabled);
  const closingOverridesCount = Object.values(center.availability_overrides ?? {}).filter(
    (override) => !override.enabled,
  ).length;
  const scheduleChanged = useMemo(
    () => JSON.stringify(schedule) !== JSON.stringify(buildInitialSchedule(center)),
    [center, schedule],
  );
  const businessStatusTone: StatusTone = activation.is_listable ? 'success' : 'warning';
  const topServiceLabel =
    center.primary_services?.[0] ??
    configuredServices[0]?.name ??
    'Da definire';
  const centerCreatedAt = center.created_at ? new Date(center.created_at) : null;
  const sinceLabel = centerCreatedAt && !Number.isNaN(centerCreatedAt.getTime())
    ? new Intl.DateTimeFormat('it-IT', { year: 'numeric' }).format(centerCreatedAt)
    : null;
  const serviceCategoriesCount = new Set(configuredServices.map((service) => service.category)).size;
  const completedServiceDetails = configuredServices.filter(
    (service) => service.price !== null && service.duration !== null,
  ).length;
  const hiddenServicesCount = services.filter((service) => service.visibility === 'hidden').length;
  const draftServicesCount = services.filter((service) => service.visibility === 'draft').length;
  const incompleteServicesCount = services.filter(
    (service) => service.price === null || service.duration === null,
  ).length;
  const reviewInsights = useMemo(() => {
    const positiveReviews = reviews.filter((review) => review.rating >= 4);
    const neutralReviews = reviews.filter((review) => review.rating === 3);
    const criticalReviews = reviews.filter((review) => review.rating <= 2);
    const recentReviews = reviews.slice(0, 5);
    const previousReviews = reviews.slice(5, 10);
    const averageFor = (items: Review[]) =>
      items.length > 0
        ? items.reduce((total, review) => total + review.rating, 0) / items.length
        : null;
    const recentAverage = averageFor(recentReviews);
    const previousAverage = averageFor(previousReviews);
    const trend =
      recentAverage !== null && previousAverage !== null
        ? Number((recentAverage - previousAverage).toFixed(1))
        : null;
    const serviceMentions = reviews.reduce<Record<string, number>>((accumulator, review) => {
      const serviceName = review.service_name ?? 'Trattamento';
      accumulator[serviceName] = (accumulator[serviceName] ?? 0) + 1;
      return accumulator;
    }, {});
    const mostMentionedService =
      Object.entries(serviceMentions).sort((left, right) => right[1] - left[1])[0]?.[0] ??
      'trattamenti';
    const strengthKeywords = ['gentile', 'brava', 'pulizia', 'professional', 'accoglienza', 'risultato', 'puntuale'];
    const complaintKeywords = ['attesa', 'ritardo', 'prezzo', 'dolore', 'confusione', 'tempo', 'cancell'];
    const countKeywords = (keywords: string[]) =>
      keywords
        .map((keyword) => ({
          count: reviews.filter((review) =>
            review.comment.toLowerCase().includes(keyword),
          ).length,
          label: keyword,
        }))
        .filter((item) => item.count > 0)
        .sort((left, right) => right.count - left.count)
        .slice(0, 3);
    const strengths = countKeywords(strengthKeywords);
    const complaints = countKeywords(complaintKeywords);

    return {
      complaints,
      criticalCount: criticalReviews.length,
      mostMentionedService,
      neutralCount: neutralReviews.length,
      positiveCount: positiveReviews.length,
      recentAverage,
      strengths,
      summary:
        reviews.length > 0
          ? `La fiducia e guidata soprattutto da ${mostMentionedService}. Le recensioni positive sono ${positiveReviews.length}/${reviews.length}.`
          : 'Appena arriveranno nuove recensioni, qui compariranno media, trend e ultime opinioni.',
      trend,
    };
  }, [reviews]);

  const addOperator = () => {
    setOperators((current) => [
      ...current,
      {
        active: true,
        color: operatorColorOptions[current.length % operatorColorOptions.length],
        hours: '09:00 - 18:00',
        id: `op-${Date.now()}`,
        imageUrl: '',
        name: 'Nuovo operatore',
        role: 'Estetista',
        specialties: '',
      },
    ]);
  };

  const updateOperator = (operatorId: string, field: keyof OperatorDraft, value: string | boolean) => {
    setOperators((current) =>
      current.map((operator) => (operator.id === operatorId ? { ...operator, [field]: value } : operator)),
    );
  };

  const deleteOperator = (operatorId: string) => {
    setOperators((current) => current.filter((operator) => operator.id !== operatorId));
  };

  const addCabin = () => {
    setCabins((current) => [
      ...current,
      {
        active: true,
        color: operatorColorOptions[current.length % operatorColorOptions.length],
        id: `cabin-${Date.now()}`,
        name: 'Nuova cabina',
        treatments: '',
      },
    ]);
  };

  const updateCabin = (cabinId: string, field: keyof CabinDraft, value: string | boolean) => {
    setCabins((current) =>
      current.map((cabin) => (cabin.id === cabinId ? { ...cabin, [field]: value } : cabin)),
    );
  };

  const deleteCabin = (cabinId: string) => {
    setCabins((current) => current.filter((cabin) => cabin.id !== cabinId));
  };

  const addPackage = () => {
    setPackages((current) => [
      ...current,
      {
        active: true,
        discount: '',
        duration: '60 min ciascuno',
        expiration: '6 mesi',
        id: `pkg-${Date.now()}`,
        installments: false,
        name: 'New Package',
        notes: '',
        price: '',
        promoBadge: '',
        sessions: '3',
        treatments: '',
      },
    ]);
  };

  const updatePackage = (packageId: string, field: keyof PackageDraft, value: string | boolean) => {
    setPackages((current) =>
      current.map((item) => (item.id === packageId ? { ...item, [field]: value } : item)),
    );
  };

  const duplicatePackage = (item: PackageDraft) => {
    setPackages((current) => [
      ...current,
      {
        ...item,
        active: false,
        id: `pkg-${Date.now()}`,
        name: `${item.name} copia`,
      },
    ]);
  };

  const archivePackage = (packageId: string) => {
    setPackages((current) => current.filter((item) => item.id !== packageId));
  };

  const toggleDayEnabled = (dayKey: WeekdayKey) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        enabled: !current[dayKey].enabled,
      },
    }));
  };

  const cloneDaySchedule = (daySchedule: DaySchedule): DaySchedule => ({
    ...daySchedule,
    slots: daySchedule.slots.map((slot) => ({ ...slot })),
  });

  const updateDaySlot = (
    dayKey: WeekdayKey,
    slotIndex: number,
    field: keyof TimeSlot,
    value: string,
  ) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        slots: current[dayKey].slots.map((slot, index) =>
          index === slotIndex ? { ...slot, [field]: value } : slot,
        ),
      },
    }));
  };

  const addDaySlot = (dayKey: WeekdayKey) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        enabled: true,
        slots: [...current[dayKey].slots, { start: '15:00', end: '19:00' }],
      },
    }));
  };

  const removeDaySlot = (dayKey: WeekdayKey, slotIndex: number) => {
    setSchedule((current) => {
      const nextSlots = current[dayKey].slots.filter((_, index) => index !== slotIndex);

      return {
        ...current,
        [dayKey]: {
          ...current[dayKey],
          slots: nextSlots.length > 0 ? nextSlots : [{ start: '09:00', end: '19:00' }],
        },
      };
    });
  };

  const updateDayBreak = (
    dayKey: WeekdayKey,
    field: 'breakEnabled' | 'breakStart' | 'breakEnd',
    value: boolean | string,
  ) => {
    setSchedule((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        [field]: value,
      },
    }));
  };

  const copyDaySchedule = (dayKey: WeekdayKey) => {
    setCopiedSchedule(cloneDaySchedule(schedule[dayKey]));
  };

  const pasteDaySchedule = (dayKey: WeekdayKey) => {
    if (!copiedSchedule) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      [dayKey]: cloneDaySchedule(copiedSchedule),
    }));
  };

  const applyScheduleToDays = (sourceDayKey: WeekdayKey, targetDays: WeekdayKey[]) => {
    const sourceSchedule = cloneDaySchedule(schedule[sourceDayKey]);

    setSchedule((current) => ({
      ...current,
      ...Object.fromEntries(
        targetDays.map((dayKey) => [dayKey, cloneDaySchedule(sourceSchedule)]),
      ),
    }));
  };

  const applyPreviousDaySchedule = (dayKey: WeekdayKey) => {
    const dayIndex = weekdayOptions.findIndex((day) => day.key === dayKey);
    const previousDay = weekdayOptions[dayIndex - 1];

    if (!previousDay) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      [dayKey]: cloneDaySchedule(current[previousDay.key]),
    }));
  };

  const handleSaveTreatment = async (
    selectedCategory: string,
    selectedTreatment: string,
    parsedPrice: number | null,
    parsedDuration: number | null,
  ) => {
    setSavingService(true);
    setCatalogError(null);

    try {
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: selectedTreatment,
            category: selectedCategory,
            duration: parsedDuration,
            price: parsedPrice,
            visibility: 'active',
          },
        ],
      });
      setServices(response);
      setServiceOrder((current) => {
        const known = current.filter((id) => response.some((service) => service.id === id));
        const added = response.map((service) => service.id).filter((id) => !known.includes(id));
        return [...known, ...added];
      });
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Salvataggio trattamento non riuscito.',
      );
      throw error;
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceVisibility = async (service: Service) => {
    setSavingService(true);
    setCatalogError(null);

    try {
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: service.name,
            category: service.category,
            duration: service.duration,
            price: service.price,
            description: service.description,
            visibility: service.visibility === 'active' ? 'hidden' : 'active',
          },
        ],
      });
      setServices(response);
      setServiceOrder((current) => {
        const known = current.filter((id) => response.some((item) => item.id === id));
        const added = response.map((item) => item.id).filter((id) => !known.includes(id));
        return [...known, ...added];
      });
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Aggiornamento visibilita non riuscito.',
      );
    } finally {
      setSavingService(false);
    }
  };

  const openServiceEditor = (service: Service) => {
    setEditingService(service);
    setEditingServiceName(service.name);
    setEditingServicePrice(service.price !== null && service.price !== undefined ? String(service.price) : '');
    setEditingServiceDuration(
      service.duration !== null && service.duration !== undefined ? String(service.duration) : '',
    );
  };

  const getServiceStatus = (service: Service): { label: string; tone: StatusTone } => {
    if (service.visibility === 'draft') {
      return { label: 'Draft', tone: 'neutral' };
    }

    if (service.price === null || service.duration === null) {
      return { label: 'needs-attention', tone: 'warning' };
    }

    if (service.visibility === 'hidden') {
      return { label: 'hidden', tone: 'rose' };
    }

    return { label: 'Active', tone: 'success' };
  };

  const refreshServiceOrder = (response: Service[]) => {
    setServiceOrder((current) => {
      const known = current.filter((id) => response.some((service) => service.id === id));
      const added = response.map((service) => service.id).filter((id) => !known.includes(id));
      return [...known, ...added];
    });
  };

  const handleSaveServiceEdit = async () => {
    if (!editingService) {
      return;
    }

    const parsedPrice =
      editingServicePrice.trim().length > 0
        ? Number(editingServicePrice.replace(',', '.'))
        : null;
    const parsedDuration =
      editingServiceDuration.trim().length > 0 ? Number(editingServiceDuration) : null;

    if (
      (parsedPrice !== null && Number.isNaN(parsedPrice)) ||
      (parsedDuration !== null && Number.isNaN(parsedDuration))
    ) {
      setCatalogError('Inserisci prezzo e durata validi.');
      return;
    }

    setSavingService(true);
    setCatalogError(null);

    try {
      const nextName = editingServiceName.trim() || editingService.name;
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: nextName,
            category: editingService.category,
            duration: parsedDuration,
            price: parsedPrice,
            description: editingService.description,
            visibility: editingService.visibility ?? 'active',
          },
          ...(nextName !== editingService.name
            ? [
                {
                  name: editingService.name,
                  category: editingService.category,
                  duration: editingService.duration,
                  price: editingService.price,
                  description: editingService.description,
                  visibility: 'archived',
                },
              ]
            : []),
        ],
      });
      setServices(response);
      refreshServiceOrder(response);
      setEditingService(null);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Aggiornamento servizio non riuscito.');
    } finally {
      setSavingService(false);
    }
  };

  const handleDuplicateService = async (service: Service) => {
    setSavingService(true);
    setCatalogError(null);

    try {
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: `${service.name} copia`,
            category: service.category,
            duration: service.duration,
            price: service.price,
            description: service.description,
            visibility: 'draft',
          },
        ],
      });
      setServices(response);
      refreshServiceOrder(response);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Duplicazione servizio non riuscita.');
    } finally {
      setSavingService(false);
    }
  };

  const handleArchiveService = async (service: Service) => {
    setSavingService(true);
    setCatalogError(null);

    try {
      const response = await updateCenterServices(center.id, {
        services: [
          {
            name: service.name,
            category: service.category,
            duration: service.duration,
            price: service.price,
            description: service.description,
            visibility: 'archived',
          },
        ],
      });
      setServices(response);
      refreshServiceOrder(response);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Archiviazione servizio non riuscita.');
    } finally {
      setSavingService(false);
    }
  };

  const moveService = (serviceId: string, direction: -1 | 1) => {
    setServiceOrder((current) => {
      const order = current.length > 0 ? current : managedServices.map((service) => service.id);
      const index = order.indexOf(serviceId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
        return order;
      }

      const next = [...order];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setCatalogError(null);

    try {
      const response = await updateCenterProfile(center.id, {
        description: profileDescription.trim(),
        instagram_url: profileInstagramUrl.trim(),
        name: profileName,
        logo_url: profileLogoUrl,
        tiktok_url: profileTiktokUrl.trim(),
      });
      onCenterUpdated(response.center, response.activation);
      setIsProfileModalOpen(false);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Aggiornamento profilo non riuscito.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    setCatalogError(null);

    const openingDays = weekdayOptions
      .filter(({ key }) => schedule[key].enabled)
      .map(({ key }) => key);
    const openingHours: CenterOnboardingInput['opening_hours'] = Object.fromEntries(
      openingDays.map((day) => [
        day,
        {
          break_enabled: schedule[day].breakEnabled,
          break_end: schedule[day].breakEnabled ? schedule[day].breakEnd || null : null,
          break_start: schedule[day].breakEnabled ? schedule[day].breakStart || null : null,
          start: schedule[day].slots[0]?.start || null,
          end: schedule[day].slots[schedule[day].slots.length - 1]?.end || null,
          slots: schedule[day].slots.map((slot) => ({
            start: slot.start || null,
            end: slot.end || null,
          })),
        },
      ]),
    );

    try {
      const response = await updateCenterOnboarding(center.id, {
        logo_url: center.branding.logo ?? '',
        opening_days: openingDays,
        opening_hours: openingHours,
        primary_services: configuredServices.map((service) => service.name),
      });
      onCenterUpdated(response.center, response.activation);
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : 'Aggiornamento orari non riuscito.',
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          scheduleChanged ? styles.contentWithStickyAction : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Pressable
            accessibilityLabel="Modifica logo centro estetico"
            onPress={() => setIsProfileModalOpen(true)}
            style={styles.heroLogoButton}
          >
            {center.branding.logo ? (
              <Image source={{ uri: center.branding.logo }} style={styles.heroLogo} />
            ) : (
              <View style={styles.heroLogoFallback}>
                <Text style={styles.heroLogoText}>{center.name.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.heroLogoEditBadge}>
              <Ionicons color={colors.surface} name="camera-outline" size={15} />
            </View>
          </Pressable>
          <Text style={styles.heroTitle}>{center.name}</Text>
          <Text numberOfLines={2} style={styles.heroSubtitle}>
            {center.branding.description ||
              'Configura profilo, operativita e catalogo del tuo beauty center.'}
          </Text>
          <View style={styles.heroTrustRow}>
            <View style={styles.heroRatingPill}>
              <Ionicons color={colors.warning} name="star" size={15} />
              <Text style={styles.heroRatingText}>
                {ratingAverage !== null ? ratingAverage.toFixed(1) : '-'} ({reviewsCount} recensioni)
              </Text>
            </View>
            <StatusPill
              label={activation.is_listable ? 'Verified Center' : 'Da completare'}
              tone={businessStatusTone}
            />
          </View>

          <View style={styles.heroIdentityGrid}>
            <View style={styles.heroIdentityBadge}>
              <Ionicons color={colors.brandInk} name="sparkles-outline" size={16} />
              <View style={styles.heroIdentityCopy}>
                <Text style={styles.heroIdentityLabel}>Top service</Text>
                <Text numberOfLines={1} style={styles.heroIdentityValue}>{topServiceLabel}</Text>
              </View>
            </View>
            {sinceLabel ? (
              <View style={styles.heroIdentityBadge}>
                <Ionicons color={colors.brandInk} name="ribbon-outline" size={16} />
                <View style={styles.heroIdentityCopy}>
                  <Text style={styles.heroIdentityLabel}>Since</Text>
                  <Text style={styles.heroIdentityValue}>{sinceLabel}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {!activation.is_listable ? (
          <View style={styles.activationCard}>
            <View style={styles.activationIcon}>
              <Ionicons color={colors.brandInk} name="alert-circle-outline" size={20} />
            </View>
            <View style={styles.activationCopy}>
              <Text style={styles.activationTitle}>Centro non ancora visibile</Text>
              <Text style={styles.activationText}>{activation.message}</Text>
              <Text style={styles.activationMeta}>
                Mancano: {activation.missing_fields.join(', ') || 'nessun campo'}
              </Text>
            </View>
          </View>
        ) : null}

        <DashboardSection
          eyebrow="Centro"
          title="Spazio digitale privato"
          subtitle="QR, codice invito e piano restano collegati al tuo centro, non allo stato dell'abbonamento."
        >
          <View style={styles.qrKitCard}>
            <View style={styles.qrKitTop}>
              <CenterQrPreview value={center.qr_payload ?? center.invitation_code ?? center.id} />
              <View style={styles.qrKitCopy}>
                <Text style={styles.qrKitLabel}>Center ID</Text>
                <Text selectable style={styles.qrKitValue}>{center.center_uid ?? center.id}</Text>
                <Text style={styles.qrKitLabel}>Codice invito</Text>
                <Text selectable style={styles.qrKitCode}>{center.invitation_code ?? 'in creazione'}</Text>
                <View style={styles.subscriptionMiniPanel}>
                  <Text style={styles.qrKitLabel}>Stato abbonamento</Text>
                  <Text style={styles.subscriptionMiniText}>{activation.subscription_status}</Text>
                  <Text style={styles.qrKitLabel}>Piano attuale</Text>
                  <Text style={styles.subscriptionMiniText}>{center.subscription_plan ?? activation.subscription_plan ?? 'Studio'}</Text>
                </View>
              </View>
            </View>
            <Text selectable style={styles.qrLinkText}>
              {center.onboarding_link ?? center.qr_payload ?? 'Link onboarding in creazione'}
            </Text>
            {qrActionMessage ? <Text style={styles.qrActionMessage}>{qrActionMessage}</Text> : null}
            <View style={styles.qrActions}>
              <Pressable onPress={() => setQrActionMessage('Codice invito pronto per essere copiato.')} style={styles.qrActionButton}>
                <Ionicons color={colors.brandInk} name="copy-outline" size={16} />
                <Text style={styles.qrActionText}>Copia codice invito</Text>
              </Pressable>
              <Pressable onPress={() => setQrActionMessage('Download QR preparato per integrazione file nativa.')} style={styles.qrActionButton}>
                <Ionicons color={colors.brandInk} name="download-outline" size={16} />
                <Text style={styles.qrActionText}>Download QR</Text>
              </Pressable>
              <Pressable onPress={() => setQrActionMessage('Share QR preparato per integrazione share sheet.')} style={styles.qrActionButton}>
                <Ionicons color={colors.brandInk} name="share-outline" size={16} />
                <Text style={styles.qrActionText}>Share onboarding link</Text>
              </Pressable>
            </View>
          </View>
        </DashboardSection>

        {catalogError ? <Text style={styles.errorText}>{catalogError}</Text> : null}

        <DashboardSection
          eyebrow="01 Business"
          title="Identita e team"
          subtitle="Le informazioni che i clienti usano per riconoscere il centro."
        >
          <SettingTile
            detail={center.email}
            icon="business-outline"
            onPress={() => setIsProfileModalOpen(true)}
            status={center.branding.logo ? 'Completo' : 'Logo mancante'}
            title="Center profile"
            tone={center.branding.logo ? 'success' : 'warning'}
          />
          <OperatorManagement
            onAdd={addOperator}
            onDelete={deleteOperator}
            onUpdate={updateOperator}
            operators={operators}
          />
        </DashboardSection>

        <DashboardSection
          eyebrow="02 Operations"
          title="Operations"
          subtitle="Orari, eccezioni e regole di prenotazione in una vista compatta."
        >
          <CabinManagement
            cabins={cabins}
            onAdd={addCabin}
            onDelete={deleteCabin}
            onUpdate={updateCabin}
          />

          <View style={styles.weekCard}>
            <View style={styles.weekHeader}>
              <View>
                <Text style={styles.cardMiniTitle}>Weekly hours</Text>
                <Text style={styles.cardHint}>Apri un giorno, modifica inline, copia il ritmo sugli altri.</Text>
              </View>
              <StatusPill
                label={scheduleChanged ? 'Modifiche' : 'Salvato'}
                tone={scheduleChanged ? 'warning' : 'success'}
              />
            </View>

            <View style={styles.scheduleActions}>
              <Pressable
                onPress={() => applyScheduleToDays('Lun', ['Mar', 'Mer', 'Gio', 'Ven'])}
                style={styles.scheduleActionButton}
              >
                <Ionicons color={colors.brandInk} name="copy-outline" size={16} />
                <Text style={styles.scheduleActionText}>Lun-Ven</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  applyScheduleToDays(selectedDayKey, weekdayOptions.map((day) => day.key))
                }
                style={styles.scheduleActionButton}
              >
                <Ionicons color={colors.brandInk} name="albums-outline" size={16} />
                <Text style={styles.scheduleActionText}>Copia settimana</Text>
              </Pressable>
              <StatusPill label={`${activeDays.length} aperti`} tone={activeDays.length ? 'success' : 'warning'} />
            </View>

            <View style={styles.dayGrid}>
              {weekdayOptions.map((day) => {
                const entry = schedule[day.key];
                const isSelected = selectedDayKey === day.key;
                const firstSlot = entry.slots[0];
                const lastSlot = entry.slots[entry.slots.length - 1];

                return (
                  <View
                    key={day.key}
                    style={[
                      styles.dayChip,
                      entry.enabled ? styles.dayChipActive : styles.dayChipClosed,
                      isSelected ? styles.dayChipSelected : null,
                    ]}
                  >
                    <Pressable
                      onPress={() => setSelectedDayKey(day.key)}
                      style={styles.dayChipHeader}
                    >
                      <View>
                        <Text
                          style={[
                            styles.dayChipLabel,
                            entry.enabled ? styles.dayChipLabelActive : null,
                          ]}
                        >
                          {day.key}
                        </Text>
                        <Text style={styles.dayChipMeta}>
                          {entry.enabled
                            ? `${firstSlot?.start ?? '09:00'} - ${lastSlot?.end ?? '19:00'}`
                            : 'Chiuso'}
                        </Text>
                      </View>
                      <Switch
                        onValueChange={() => toggleDayEnabled(day.key)}
                        thumbColor={colors.surface}
                        trackColor={{ false: colors.border, true: colors.success }}
                        value={entry.enabled}
                      />
                    </Pressable>

                    {isSelected ? (
                      <View style={styles.inlineEditor}>
                        <View style={styles.inlineEditorTop}>
                          <StatusPill label={entry.enabled ? 'Open' : 'Closed'} tone={entry.enabled ? 'success' : 'neutral'} />
                          <View style={styles.inlineIconActions}>
                            <Pressable
                              onPress={() => copyDaySchedule(day.key)}
                              style={styles.iconActionButton}
                            >
                              <Ionicons color={colors.brandInk} name="copy-outline" size={16} />
                            </Pressable>
                            <Pressable
                              disabled={!copiedSchedule}
                              onPress={() => pasteDaySchedule(day.key)}
                              style={[
                                styles.iconActionButton,
                                !copiedSchedule ? styles.iconActionDisabled : null,
                              ]}
                            >
                              <Ionicons color={colors.brandInk} name="clipboard-outline" size={16} />
                            </Pressable>
                            {day.key !== 'Lun' ? (
                              <Pressable
                                onPress={() => applyPreviousDaySchedule(day.key)}
                                style={styles.samePreviousButton}
                              >
                                <Text style={styles.samePreviousText}>Come prima</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>

                        {entry.enabled ? (
                          <>
                            {entry.slots.map((slot, slotIndex) => (
                              <View key={`${day.key}-${slotIndex}`} style={styles.slotRow}>
                                <View style={styles.slotFields}>
                                  <TextInput
                                    keyboardType="numbers-and-punctuation"
                                    onChangeText={(value) =>
                                      updateDaySlot(day.key, slotIndex, 'start', value)
                                    }
                                    placeholder="09:00"
                                    placeholderTextColor={colors.textSoft}
                                    style={styles.compactInput}
                                    value={slot.start}
                                  />
                                  <Text style={styles.slotDash}>-</Text>
                                  <TextInput
                                    keyboardType="numbers-and-punctuation"
                                    onChangeText={(value) =>
                                      updateDaySlot(day.key, slotIndex, 'end', value)
                                    }
                                    placeholder="19:00"
                                    placeholderTextColor={colors.textSoft}
                                    style={styles.compactInput}
                                    value={slot.end}
                                  />
                                </View>
                                {entry.slots.length > 1 ? (
                                  <Pressable
                                    onPress={() => removeDaySlot(day.key, slotIndex)}
                                    style={styles.removeSlotButton}
                                  >
                                    <Ionicons color={colors.danger} name="remove-circle-outline" size={18} />
                                  </Pressable>
                                ) : null}
                              </View>
                            ))}

                            <View style={styles.editorControls}>
                              <Pressable onPress={() => addDaySlot(day.key)} style={styles.softButton}>
                                <Ionicons color={colors.brandInk} name="add" size={16} />
                                <Text style={styles.softButtonText}>Slot</Text>
                              </Pressable>
                              <View style={styles.breakToggle}>
                                <Text style={styles.breakToggleText}>Pausa pranzo</Text>
                                <Switch
                                  onValueChange={(value) =>
                                    updateDayBreak(day.key, 'breakEnabled', value)
                                  }
                                  thumbColor={colors.surface}
                                  trackColor={{ false: colors.border, true: colors.warning }}
                                  value={entry.breakEnabled}
                                />
                              </View>
                            </View>

                            {entry.breakEnabled ? (
                              <View style={styles.breakRow}>
                                <TextInput
                                  keyboardType="numbers-and-punctuation"
                                  onChangeText={(value) =>
                                    updateDayBreak(day.key, 'breakStart', value)
                                  }
                                  placeholder="13:00"
                                  placeholderTextColor={colors.textSoft}
                                  style={styles.compactInput}
                                  value={entry.breakStart}
                                />
                                <Text style={styles.slotDash}>-</Text>
                                <TextInput
                                  keyboardType="numbers-and-punctuation"
                                  onChangeText={(value) =>
                                    updateDayBreak(day.key, 'breakEnd', value)
                                  }
                                  placeholder="14:00"
                                  placeholderTextColor={colors.textSoft}
                                  style={styles.compactInput}
                                  value={entry.breakEnd}
                                />
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <View style={styles.closedState}>
                            <Text style={styles.closedStateText}>Giorno chiuso</Text>
                            {day.key !== 'Lun' ? (
                              <Pressable
                                onPress={() => applyPreviousDaySchedule(day.key)}
                                style={styles.softButton}
                              >
                                <Ionicons color={colors.brandInk} name="arrow-undo-outline" size={16} />
                                <Text style={styles.softButtonText}>Come precedente</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.compactGrid}>
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Breaks</Text>
              <Text style={styles.compactValue}>Smart slot</Text>
              <Text style={styles.compactMeta}>Buffer tra appuntamenti</Text>
            </View>
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Closing days</Text>
              <Text style={styles.compactValue}>{closingOverridesCount}</Text>
              <Text style={styles.compactMeta}>eccezioni agenda</Text>
            </View>
            <View style={styles.compactCard}>
              <Text style={styles.compactLabel}>Booking rules</Text>
              <Text style={styles.compactValue}>24h</Text>
              <Text style={styles.compactMeta}>anticipo minimo</Text>
            </View>
          </View>
        </DashboardSection>

        <DashboardSection
          eyebrow="03 Services"
          title="Catalogo e listino"
          subtitle="Categorie, prezzi, durate e visibilita online."
        >
          {loadingServices ? <ActivityIndicator color={colors.brand} /> : null}
          <ServiceCatalogPicker
            catalog={treatmentCatalog}
            configuredServices={configuredServices.map((service) => ({
              category: service.category,
              duration: service.duration,
              name: service.name,
              price: service.price,
            }))}
            isBusy={savingService}
            onSaveTreatment={handleSaveTreatment}
          />

          <PackagesManagement
            onAdd={addPackage}
            onArchive={archivePackage}
            onDuplicate={duplicatePackage}
            onUpdate={updatePackage}
            packages={packages}
          />
        </DashboardSection>

        <DashboardSection
          eyebrow="04 Clients"
          title="Fiducia e retention"
          subtitle="Recensioni, reminder e strumenti per ridurre assenze."
        >
          <View style={styles.reviewsPanel}>
            <View style={styles.reviewHero}>
              <View style={styles.reviewScore}>
                <Text style={styles.reviewScoreValue}>
                  {ratingAverage !== null ? ratingAverage.toFixed(1) : '-'}
                </Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      color={colors.warning}
                      name={ratingAverage !== null && ratingAverage >= star ? 'star' : 'star-outline'}
                      size={13}
                    />
                  ))}
                </View>
                <Text style={styles.reviewScoreLabel}>{reviewsCount} recensioni</Text>
              </View>
              <View style={styles.reviewCopy}>
                <View style={styles.reviewTitleRow}>
                  <Text style={styles.cardMiniTitle}>Trust growth</Text>
                  <StatusPill
                    label={
                      reviewInsights.trend === null
                        ? 'Trend nuovo'
                        : reviewInsights.trend >= 0
                          ? `+${reviewInsights.trend}`
                          : `${reviewInsights.trend}`
                    }
                    tone={reviewInsights.trend === null || reviewInsights.trend >= 0 ? 'success' : 'warning'}
                  />
                </View>
                <Text style={styles.reviewInsightText}>{reviewInsights.summary}</Text>
              </View>
            </View>

            <View style={styles.sentimentGrid}>
              <View style={styles.sentimentCard}>
                <Text style={styles.sentimentValue}>{reviewInsights.positiveCount}</Text>
                <Text style={styles.sentimentLabel}>positive</Text>
              </View>
              <View style={styles.sentimentCard}>
                <Text style={styles.sentimentValue}>{reviewInsights.neutralCount}</Text>
                <Text style={styles.sentimentLabel}>neutre</Text>
              </View>
              <View style={styles.sentimentCard}>
                <Text style={styles.sentimentValue}>{reviewInsights.criticalCount}</Text>
                <Text style={styles.sentimentLabel}>critiche</Text>
              </View>
            </View>

            <View style={styles.reviewList}>
              {reviews.length === 0 ? (
                <Text style={styles.emptyText}>
                  Le recensioni dei clienti appariranno qui con media, data e testo.
                </Text>
              ) : (
                reviews.slice(0, 4).map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewItemHeader}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>
                          {(review.user_name ?? 'Cliente').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewItemCopy}>
                        <Text style={styles.reviewCustomer}>{review.user_name ?? 'Cliente'}</Text>
                        <Text style={styles.reviewService}>{review.service_name ?? 'Trattamento'}</Text>
                      </View>
                      <View style={styles.ratingPill}>
                        <Ionicons color={colors.warning} name="star" size={13} />
                        <Text style={styles.ratingPillText}>{review.rating}.0</Text>
                      </View>
                    </View>
                    <Text numberOfLines={4} style={styles.reviewText}>
                      {review.comment}
                    </Text>
                    <Text style={styles.reviewDate}>
                      {review.created_at
                        ? new Intl.DateTimeFormat('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          }).format(new Date(review.created_at))
                        : 'Data non disponibile'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <SettingTile
            detail="Punti, premi e ritorni clienti"
            icon="gift-outline"
            right={
              <Switch
                onValueChange={setLoyaltyEnabled}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={loyaltyEnabled}
              />
            }
            status={loyaltyEnabled ? 'On' : 'Off'}
            title="Loyalty tools"
            tone={loyaltyEnabled ? 'success' : 'neutral'}
          />
          <SettingTile
            detail="Promemoria automatici prima dell'appuntamento"
            icon="chatbubble-ellipses-outline"
            right={
              <Switch
                onValueChange={setRemindersEnabled}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={remindersEnabled}
              />
            }
            status={remindersEnabled ? 'Attivi' : 'Off'}
            title="Reminder settings"
            tone={remindersEnabled ? 'success' : 'neutral'}
          />
          <SettingTile
            detail="Policy e protezione per cancellazioni tardive"
            icon="shield-checkmark-outline"
            right={
              <Switch
                onValueChange={setNoShowProtectionEnabled}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={noShowProtectionEnabled}
              />
            }
            status={noShowProtectionEnabled ? 'Attiva' : 'Off'}
            title="No-show protection"
            tone={noShowProtectionEnabled ? 'success' : 'neutral'}
          />
        </DashboardSection>

        <DashboardSection
          eyebrow="05 App"
          title="Account e sicurezza"
          subtitle="Preferenze essenziali senza appesantire la configurazione."
        >
          <SettingTile
            detail="Avvisi su prenotazioni, recensioni e agenda"
            icon="notifications-outline"
            right={
              <Switch
                onValueChange={setNotificationsEnabled}
                thumbColor={colors.surface}
                trackColor={{ false: colors.border, true: colors.success }}
                value={notificationsEnabled}
              />
            }
            status={notificationsEnabled ? 'On' : 'Off'}
            title="Notifications"
            tone={notificationsEnabled ? 'success' : 'neutral'}
          />
          <SettingTile
            detail="Dati, consenso e visibilita del profilo"
            icon="lock-closed-outline"
            status="Protetto"
            title="Privacy"
            tone="success"
          />
          <View style={styles.logoutCard}>
            <View>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutMeta}>Torna alla schermata iniziale pubblica.</Text>
            </View>
            <PrimaryButton label="Esci" onPress={onLogout} variant="secondary" />
          </View>
        </DashboardSection>
      </ScrollView>

      {scheduleChanged ? (
        <View style={styles.stickySaveBar}>
          <View style={styles.stickyCopy}>
            <Text style={styles.stickyTitle}>Orari modificati</Text>
            <Text style={styles.stickyMeta}>Salva per aggiornare le prenotazioni.</Text>
          </View>
          <PrimaryButton
            disabled={savingSchedule}
            label={savingSchedule ? 'Saving...' : 'Save Hours'}
            onPress={() => {
              void handleSaveSchedule();
            }}
          />
        </View>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setIsProfileModalOpen(false)}
        transparent
        visible={isProfileModalOpen}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>Business profile</Text>
                <Text style={styles.modalTitle}>Modifica centro</Text>
              </View>
              <Pressable onPress={() => setIsProfileModalOpen(false)} style={styles.closeIconButton}>
                <Ionicons color={colors.brandInk} name="close" size={20} />
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Nome centro</Text>
              <TextInput
                onChangeText={setProfileName}
                placeholder="Nome centro"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profileName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Beauty Center Logo Upload</Text>
              <TextInput
                autoCapitalize="none"
                onChangeText={setProfileLogoUrl}
                placeholder="https://..."
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={profileLogoUrl}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Descrizione del centro</Text>
              <TextInput
                maxLength={300}
                multiline
                onChangeText={setProfileDescription}
                placeholder="Atmosfera, specialita e promessa del tuo beauty salon"
                placeholderTextColor={colors.textSoft}
                style={[styles.input, styles.textArea]}
                value={profileDescription}
              />
              <Text style={styles.charCounter}>{profileDescription.length}/300</Text>
            </View>

            <View style={styles.socialFieldsBlock}>
              <Text style={styles.cardMiniTitle}>Profili social</Text>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Instagram URL</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={setProfileInstagramUrl}
                  placeholder="https://instagram.com/nomecentro"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={profileInstagramUrl}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>TikTok URL</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={setProfileTiktokUrl}
                  placeholder="https://tiktok.com/@nomecentro"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={profileTiktokUrl}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setIsProfileModalOpen(false)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={savingProfile}
                label={savingProfile ? 'Salvataggio...' : 'Salva profilo'}
                onPress={() => {
                  void handleSaveProfile();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setEditingService(null)}
        transparent
        visible={Boolean(editingService)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalEyebrow}>Quick edit</Text>
                <Text style={styles.modalTitle}>{editingService?.category}</Text>
              </View>
              <Pressable onPress={() => setEditingService(null)} style={styles.closeIconButton}>
                <Ionicons color={colors.brandInk} name="close" size={20} />
              </Pressable>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Nome servizio</Text>
              <TextInput
                onChangeText={setEditingServiceName}
                placeholder="Nome trattamento"
                placeholderTextColor={colors.textSoft}
                style={styles.input}
                value={editingServiceName}
              />
            </View>

            <View style={styles.serviceEditFields}>
              <View style={styles.serviceEditField}>
                <Text style={styles.fieldLabel}>Prezzo EUR</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setEditingServicePrice}
                  placeholder="45"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={editingServicePrice}
                />
              </View>
              <View style={styles.serviceEditField}>
                <Text style={styles.fieldLabel}>Durata min</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setEditingServiceDuration}
                  placeholder="60"
                  placeholderTextColor={colors.textSoft}
                  style={styles.input}
                  value={editingServiceDuration}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Annulla"
                onPress={() => setEditingService(null)}
                variant="secondary"
              />
              <PrimaryButton
                disabled={savingService}
                label={savingService ? 'Salvataggio...' : 'Salva servizio'}
                onPress={() => {
                  void handleSaveServiceEdit();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FBF7F1',
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  contentWithStickyAction: {
    paddingBottom: 112,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 3,
  },
  heroLogo: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 34,
    height: 96,
    width: 96,
  },
  heroLogoButton: {
    borderRadius: 34,
    position: 'relative',
  },
  heroLogoFallback: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLavender,
    borderRadius: 34,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  heroLogoText: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: '700',
  },
  heroLogoEditBadge: {
    alignItems: 'center',
    backgroundColor: colors.brandInk,
    borderColor: colors.surface,
    borderRadius: radius.round,
    borderWidth: 2,
    bottom: 2,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    width: 30,
  },
  heroEyebrow: {
    ...textStyles.eyebrow,
    color: colors.rose,
    letterSpacing: 0,
  },
  heroTitle: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  heroTrustRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  heroRatingPill: {
    alignItems: 'center',
    backgroundColor: '#FFF8EA',
    borderColor: 'rgba(210, 151, 52, 0.12)',
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  heroRatingText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  heroIdentityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    width: '100%',
  },
  heroIdentityBadge: {
    alignItems: 'center',
    backgroundColor: '#F8FCFB',
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroIdentityCopy: {
    flex: 1,
  },
  heroIdentityLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroIdentityValue: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metricCard: {
    backgroundColor: '#F8FCFB',
    borderRadius: radius.lg,
    flex: 1,
    minHeight: 108,
    padding: spacing.sm,
  },
  metricTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  metricValue: {
    color: colors.brandInk,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginTop: spacing.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionEyebrow: {
    color: colors.rose,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
    marginTop: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  activationCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF7DE',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  activationIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  activationCopy: {
    flex: 1,
  },
  activationTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  activationText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  activationMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  qrKitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.md,
    padding: spacing.md,
  },
  qrKitTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  qrPreview: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: spacing.sm,
    width: 138,
  },
  qrCell: {
    backgroundColor: 'rgba(24,63,61,0.08)',
    borderRadius: 2,
    height: 10,
    width: 10,
  },
  qrCellFilled: {
    backgroundColor: colors.brandInk,
  },
  qrKitCopy: {
    flex: 1,
  },
  qrKitLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  qrKitValue: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  qrKitCode: {
    color: colors.brandDark,
    fontSize: 20,
    fontWeight: '800',
  },
  subscriptionMiniPanel: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    gap: spacing.xxs,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  subscriptionMiniText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  qrLinkText: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: 12,
    padding: spacing.sm,
  },
  qrActionMessage: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '700',
  },
  qrActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  qrActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  qrActionText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '800',
  },
  settingTile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 76,
    padding: spacing.md,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  tileIcon: {
    alignItems: 'center',
    backgroundColor: '#F7EEF3',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  tileCopy: {
    flex: 1,
  },
  tileTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tileTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  tileDetail: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  statusSuccess: {
    backgroundColor: 'rgba(140, 199, 178, 0.18)',
  },
  statusWarning: {
    backgroundColor: 'rgba(246, 217, 141, 0.24)',
  },
  statusRose: {
    backgroundColor: colors.roseSoft,
  },
  statusDot: {
    backgroundColor: colors.textSoft,
    borderRadius: radius.round,
    height: 6,
    width: 6,
  },
  statusDotSuccess: {
    backgroundColor: colors.success,
  },
  statusDotWarning: {
    backgroundColor: colors.warning,
  },
  statusDotRose: {
    backgroundColor: colors.rose,
  },
  statusText: {
    color: colors.brandInk,
    fontSize: 10,
    fontWeight: '700',
  },
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  weekHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scheduleActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  scheduleActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  scheduleActionText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  cardMiniTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  cardHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xxs,
  },
  dayGrid: {
    gap: spacing.sm,
  },
  dayChip: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  dayChipActive: {
    backgroundColor: '#F6FBF8',
    borderColor: 'rgba(140, 199, 178, 0.48)',
  },
  dayChipClosed: {
    backgroundColor: '#F9FAF9',
  },
  dayChipSelected: {
    borderColor: colors.brandDark,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  dayChipHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChipLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  dayChipLabelActive: {
    color: colors.brandInk,
  },
  dayChipMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  inlineEditor: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  inlineEditorTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inlineIconActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconActionDisabled: {
    opacity: 0.4,
  },
  samePreviousButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  samePreviousText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '700',
  },
  slotRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  slotFields: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  compactInput: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
  slotDash: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  removeSlotButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  editorControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  softButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  softButtonText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  breakToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  breakToggleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  breakRow: {
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.xs,
  },
  closedState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  closedStateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexGrow: 1,
    minHeight: 96,
    padding: spacing.md,
    width: '31%',
  },
  compactLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compactValue: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  compactMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xxs,
  },
  serviceSummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  serviceSummaryItem: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  serviceSummaryValue: {
    color: colors.brandInk,
    fontSize: 22,
    fontWeight: '700',
  },
  serviceSummaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  onlineToggle: {
    alignItems: 'center',
    backgroundColor: '#F7EEF3',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  onlineCopy: {
    flex: 1,
  },
  onlineTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  onlineMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xxs,
  },
  serviceList: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  serviceListHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: '#FBFDFD',
    borderColor: 'rgba(33, 77, 99, 0.07)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  serviceCardHidden: {
    backgroundColor: '#F9FAF9',
  },
  serviceCardDraft: {
    backgroundColor: '#FFF8EC',
  },
  serviceCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  serviceCardMain: {
    flex: 1,
  },
  serviceTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  serviceName: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  popularityPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSand,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  popularityText: {
    color: colors.brandInk,
    fontSize: 10,
    fontWeight: '700',
  },
  serviceBadges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceLavender,
    borderRadius: radius.round,
    maxWidth: 140,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  categoryBadgeText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '700',
  },
  serviceMetricRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  serviceMetric: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  serviceMetricText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  serviceActionRail: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  serviceAction: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  serviceActionDanger: {
    backgroundColor: colors.roseSoft,
  },
  serviceActionText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '700',
  },
  serviceActionDangerText: {
    color: colors.danger,
  },
  serviceReorder: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
  },
  serviceReorderButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  serviceReorderDisabled: {
    opacity: 0.35,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  packagesPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  packageList: {
    gap: spacing.md,
  },
  packageCard: {
    backgroundColor: '#FFFDF8',
    borderColor: 'rgba(33, 77, 99, 0.07)',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  packageTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  packageTitleBlock: {
    flex: 1,
  },
  packageNameInput: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '800',
    minHeight: 32,
    padding: 0,
  },
  packageTreatmentsInput: {
    color: colors.textMuted,
    fontSize: 13,
    minHeight: 28,
    padding: 0,
  },
  packagePriceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  packageCurrency: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  packagePriceInput: {
    color: colors.brandInk,
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    minHeight: 42,
    padding: 0,
  },
  packageBadge: {
    backgroundColor: colors.surfaceSand,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  packageBadgeText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '800',
  },
  packageFields: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  packageField: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  packageNotes: {
    marginTop: spacing.xs,
    minHeight: 70,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  packageFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  packageToggle: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  packageToggleActive: {
    backgroundColor: colors.surfaceSky,
  },
  packageToggleText: {
    color: colors.brandInk,
    fontSize: 11,
    fontWeight: '700',
  },
  managementPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  managementHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  addMiniButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSky,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  addMiniButtonText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  managementList: {
    gap: spacing.sm,
  },
  operatorCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  cabinGrid: {
    gap: spacing.sm,
  },
  cabinCard: {
    backgroundColor: '#FBFDFD',
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  cabinColorBar: {
    borderRadius: radius.round,
    height: 44,
    width: 5,
  },
  managementCardDisabled: {
    opacity: 0.58,
  },
  managementCardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  managementCardMain: {
    flex: 1,
  },
  operatorAvatar: {
    alignItems: 'center',
    borderRadius: radius.round,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  operatorAvatarImage: {
    height: '100%',
    width: '100%',
  },
  operatorAvatarText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  inlineNameInput: {
    color: colors.brandInk,
    fontSize: 16,
    fontWeight: '800',
    minHeight: 28,
    padding: 0,
  },
  inlineMetaInput: {
    color: colors.textMuted,
    fontSize: 13,
    minHeight: 26,
    padding: 0,
  },
  managementFields: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  managementInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  colorRail: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  colorDot: {
    borderColor: colors.surface,
    borderRadius: radius.round,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  colorDotSelected: {
    borderColor: colors.brandInk,
  },
  subtleWarningDot: {
    backgroundColor: colors.warning,
    borderRadius: radius.round,
    height: 8,
    width: 8,
  },
  deleteMiniButton: {
    alignItems: 'center',
    backgroundColor: colors.roseSoft,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    marginLeft: 'auto',
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  deleteMiniText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  reviewsPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  reviewHero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  reviewScore: {
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: radius.lg,
    minHeight: 104,
    justifyContent: 'center',
    padding: spacing.sm,
    width: 96,
  },
  reviewScoreValue: {
    color: colors.brandInk,
    fontSize: 28,
    fontWeight: '700',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
    marginTop: spacing.xxs,
  },
  reviewScoreLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  reviewCopy: {
    flex: 1,
  },
  reviewTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  reviewInsightText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  sentimentGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sentimentCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    flex: 1,
    padding: spacing.sm,
  },
  sentimentValue: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '700',
  },
  sentimentLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  insightBlock: {
    backgroundColor: '#F7EEF3',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  insightTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '700',
  },
  highlightRows: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  highlightGroup: {
    gap: spacing.xs,
  },
  highlightLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  highlightChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  highlightChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  highlightChipWarning: {
    backgroundColor: '#FFF8EC',
  },
  highlightChipText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewList: {
    gap: spacing.sm,
  },
  reviewItem: {
    backgroundColor: '#FBFDFD',
    borderColor: 'rgba(33, 77, 99, 0.06)',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  reviewItemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLavender,
    borderRadius: radius.round,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  customerAvatarText: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  reviewItemCopy: {
    flex: 1,
  },
  reviewCustomer: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewService: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSand,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
  },
  ratingPillText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  reviewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reviewActionPrimary: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  reviewActionPrimaryText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  reviewActionText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewActionDangerText: {
    color: colors.danger,
  },
  logoutCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  logoutTitle: {
    color: colors.brandInk,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xxs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  stickySaveBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(33, 77, 99, 0.08)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
  },
  stickyCopy: {
    flex: 1,
  },
  stickyTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '700',
  },
  stickyMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(33, 77, 99, 0.26)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 560,
    padding: spacing.md,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: colors.brandInk,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  closeIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.round,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...textStyles.fieldLabel,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  textArea: {
    minHeight: 112,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  charCounter: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  socialFieldsBlock: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  serviceEditFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  serviceEditField: {
    flex: 1,
  },
  modalActions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
