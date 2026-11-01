export const VoztriTypography = {
  fontFamily: {
    primary: 'Montserrat, sans-serif',
  },
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
  scales: {
    displayLg: {
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '800',
      letterSpacing: -0.03,
    },
    headlineXl: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700',
      letterSpacing: -0.02,
    },
    headlineLg: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      letterSpacing: -0.015,
    },
    headlineMd: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '600',
      letterSpacing: -0.01,
    },
    titleSm: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      letterSpacing: 0,
    },
    bodyLg: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0,
    },
    bodyMd: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      letterSpacing: 0.01,
    },
    bodySm: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.01,
    },
  },
} as const;
