import { StyleSheet } from 'react-native';

import { colors } from './colors';

export const typeScale = {
  eyebrow: 11,
  label: 12,
  caption: 13,
  body: 15,
  bodyLg: 16,
  titleXs: 18,
  titleBase: 20,
  titleSm: 22,
  titleMd: 24,
  titleLg: 28,
  titleXl: 34,
  displaySm: 30,
};

export const textStyles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontSize: typeScale.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    fontWeight: '700',
    lineHeight: 18,
  },
  microLabel: {
    color: colors.textMuted,
    fontSize: typeScale.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  titleXs: {
    color: colors.brandInk,
    fontSize: typeScale.titleXs,
    fontWeight: '700',
    lineHeight: 24,
  },
  titleBase: {
    color: colors.brandInk,
    fontSize: typeScale.titleBase,
    fontWeight: '700',
    lineHeight: 26,
  },
  sectionTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleSm,
    fontWeight: '700',
    lineHeight: 28,
  },
  cardTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleMd,
    fontWeight: '700',
    lineHeight: 30,
  },
  screenTitle: {
    color: colors.brandInk,
    fontSize: typeScale.titleXl,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  displayTitle: {
    color: colors.brandInk,
    fontSize: typeScale.displaySm,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  metricValue: {
    color: colors.brandInk,
    fontSize: typeScale.titleLg,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  body: {
    color: colors.text,
    fontSize: typeScale.body,
    lineHeight: 23,
  },
  bodyMuted: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    lineHeight: 23,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typeScale.caption,
    lineHeight: 18,
  },
});
