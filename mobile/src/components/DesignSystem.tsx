import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors, statusColors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { textStyles } from '../theme/typography';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'blush';

type BeautyCardProps = PropsWithChildren<{
  eyebrow?: string;
  footer?: ReactNode;
  title?: string;
  variant?: 'elevated' | 'soft' | 'flat';
}>;

type CompactBadgeProps = {
  icon?: string;
  label: string;
  tone?: Tone;
};

type SegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
};

type StickyActionBarProps = {
  meta?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  title: string;
  onPrimary: () => void;
  onSecondary?: () => void;
};

type FloatingActionButtonProps = {
  icon?: string;
  label: string;
  onPress: () => void;
};

type InputShellProps = PropsWithChildren<{
  helper?: string;
  label: string;
}>;

export function BeautyCard({
  children,
  eyebrow,
  footer,
  title,
  variant = 'elevated',
}: BeautyCardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'soft' ? styles.cardSoft : null,
        variant === 'flat' ? styles.cardFlat : null,
      ]}
    >
      {eyebrow || title ? (
        <View style={styles.cardHeader}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ) : null}
      {children}
      {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
    </View>
  );
}

export function CompactBadge({ icon, label, tone = 'neutral' }: CompactBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' ? styles.badgeSuccess : null,
        tone === 'warning' ? styles.badgeWarning : null,
        tone === 'danger' ? styles.badgeDanger : null,
        tone === 'info' ? styles.badgeInfo : null,
        tone === 'blush' ? styles.badgeBlush : null,
      ]}
    >
      {icon ? <Ionicons color={colors.brandInk} name={icon} size={13} /> : null}
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StickyActionBar({
  meta,
  primaryLabel,
  secondaryLabel,
  title,
  onPrimary,
  onSecondary,
}: StickyActionBarProps) {
  return (
    <View style={styles.stickyBar}>
      <View style={styles.stickyCopy}>
        <Text style={styles.stickyTitle}>{title}</Text>
        {meta ? <Text style={styles.stickyMeta}>{meta}</Text> : null}
      </View>
      {secondaryLabel && onSecondary ? (
        <Pressable onPress={onSecondary} style={styles.stickySecondary}>
          <Text style={styles.stickySecondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onPrimary} style={styles.stickyPrimary}>
        <Text style={styles.stickyPrimaryText}>{primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

export function FloatingActionButton({
  icon = 'add',
  label,
  onPress,
}: FloatingActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.fab}>
      <Ionicons color={colors.surface} name={icon} size={18} />
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

export function InputShell({ children, helper, label }: InputShellProps) {
  return (
    <View style={styles.inputShell}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
      {helper ? <Text style={styles.inputHelper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(23,63,74,0.06)',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.soft,
  },
  cardSoft: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    ...shadows.none,
  },
  cardFlat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    ...shadows.none,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardFooter: {
    marginTop: spacing.md,
  },
  eyebrow: {
    ...textStyles.eyebrow,
    color: colors.rose,
    marginBottom: spacing.xs,
  },
  title: {
    ...textStyles.cardTitle,
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeSuccess: {
    backgroundColor: `${statusColors.active}24`,
  },
  badgeWarning: {
    backgroundColor: `${statusColors.incomplete}28`,
  },
  badgeDanger: {
    backgroundColor: colors.roseSoft,
  },
  badgeInfo: {
    backgroundColor: colors.surfaceSky,
  },
  badgeBlush: {
    backgroundColor: colors.roseSoft,
  },
  badgeText: {
    color: colors.brandInk,
    fontSize: 12,
    fontWeight: '600',
  },
  segmented: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.round,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.brandInk,
  },
  stickyBar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(23,63,74,0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.floating,
  },
  stickyCopy: {
    flex: 1,
  },
  stickyTitle: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '600',
  },
  stickyMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  stickyPrimary: {
    backgroundColor: colors.brandDark,
    borderRadius: radius.lg,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  stickyPrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  stickySecondary: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  stickySecondaryText: {
    color: colors.brandInk,
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.brandDark,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    ...shadows.floating,
  },
  fabText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  inputShell: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...textStyles.fieldLabel,
    marginBottom: spacing.xs,
  },
  inputHelper: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
});
