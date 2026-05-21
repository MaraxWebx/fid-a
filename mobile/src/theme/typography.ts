import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const typeScale = {
  eyebrow: 11,
  label: 12,
  caption: 13,
  bodySm: 14,
  body: 16,
  bodyLg: 17,
  titleXs: 17,
  titleBase: 19,
  titleSm: 21,
  titleMd: 24,
  titleLg: 28,
  titleXl: 30,
  displaySm: 30,
};

export const textStyles = StyleSheet.create({
  eyebrow: {
    color: colors.brandDark,
    fontSize: typeScale.eyebrow,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typeScale.caption,
    fontWeight: '600',
    lineHeight: 18,
  },
  microLabel: {
    color: colors.textMuted,
    fontSize: typeScale.label,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleXs: {
    color: colors.brandInk,
    fontSize: typeScale.titleXs,
    fontWeight: '600',
    lineHeight: 24,
  },
  titleBase: {
    color: colors.brandInk,
    fontSize: typeScale.titleBase,
    fontWeight: '600',
    lineHeight: 26,
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleSm,
    fontWeight: '600',
    lineHeight: 28,
  },
  cardTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleMd,
    fontWeight: '600',
    lineHeight: 30,
  },
  screenTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleXl,
    fontWeight: '700',
    lineHeight: 36,
  },
  displayTitle: {
    color: colors.brandInk,
    fontSize: typeScale.displaySm,
    fontWeight: '700',
    lineHeight: 36,
  },
  metricValue: {
    color: colors.brandInk,
    fontSize: typeScale.titleLg,
    fontWeight: '700',
    lineHeight: 34,
  },
  body: {
    color: colors.text,
    fontSize: typeScale.body,
    lineHeight: 24,
  },
  bodyMuted: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    lineHeight: 24,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 19,
  },
});
