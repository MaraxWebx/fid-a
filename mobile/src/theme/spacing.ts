export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  round: 999,
};

export const shadows = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  soft: {
    elevation: 1,
    shadowColor: '#173F4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
  },
  card: {
    elevation: 2,
    shadowColor: '#173F4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.055,
    shadowRadius: 22,
  },
  floating: {
    elevation: 4,
    shadowColor: '#173F4A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
  },
};
