import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, formatBRL, shadow } from '../ui/kit.js';

interface Props {
  onBack: () => void;
  onOpenPayout: () => void;
}

/** Altura máxima de uma barra do gráfico (a maior barra da semana). */
const MAX_BAR = 110;

function formatDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export const WeeklyEarningsScreen: React.FC<Props> = ({ onBack, onOpenPayout }) => {
  const { earnings, refreshEarnings } = useDriverStore();

  useEffect(() => {
    void refreshEarnings();
  }, [refreshEarnings]);

  const days = earnings?.daily ?? [];
  const maxCents = Math.max(1, ...days.map((d) => d.cents));
  const range = days.length ? `${formatDay(days[0]!.date)} - ${formatDay(days[days.length - 1]!.date)}` : '';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Button label="← Voltar" onPress={onBack} textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Ganhos da Semana
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {!earnings ? (
        <View style={styles.loading}>
          <ActivityIndicator color={VoztriColors.brand.primary} accessibilityLabel="Carregando ganhos" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Total da semana */}
          <View style={[styles.card, styles.center]}>
            <Text style={styles.overline}>Semana Atual ({range})</Text>
            <Text style={[styles.total, { color: VoztriColors.brand.primary }]}>{formatBRL(earnings.weekCents)}</Text>
            <Text style={styles.hint}>Valores líquidos, após a taxa da plataforma</Text>

            <Button
              label="Transferir Saldo via Pix"
              onPress={onOpenPayout}
              style={[styles.payoutButton, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.payoutText}
            />
          </View>

          {/* Gráfico de barras: altura proporcional ao melhor dia */}
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Ganhos Diários</Text>
            <View style={styles.chart}>
              {days.map((d) => (
                <View key={d.date} style={styles.bar} accessibilityLabel={`${d.label}: ${formatBRL(d.cents)}`}>
                  <Text style={[styles.barValue, { color: d.isToday ? VoztriColors.brand.primary : '#7B7489' }]}>
                    {Math.round(d.cents / 100)}
                  </Text>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: Math.max(4, Math.round((d.cents / maxCents) * MAX_BAR)),
                        backgroundColor: d.isToday ? VoztriColors.brand.primary : '#E5E7FF',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.barDay,
                      { fontWeight: d.isToday ? '800' : '600', color: d.isToday ? '#151A31' : '#7B7489' },
                    ]}
                  >
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF8FF',
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
  },
  back: {
    fontSize: 18,
    fontWeight: '700',
    color: '#151A31',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#151A31',
  },
  headerSpacer: {
    width: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...shadow(0.06, 24, 8, 3, '#6A00FF'),
  },
  center: {
    alignItems: 'center',
  },
  overline: {
    fontSize: 12,
    color: '#7B7489',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  total: {
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 6,
  },
  hint: {
    fontSize: 12,
    color: '#7B7489',
  },
  payoutButton: {
    marginTop: 16,
    width: '100%',
    padding: 14,
    borderRadius: 14,
    ...shadow(0.3, 18, 6, 6, '#6A00FF'),
  },
  payoutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 20,
    color: '#151A31',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 170,
    paddingBottom: 10,
  },
  bar: {
    alignItems: 'center',
    gap: 6,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
  },
  barFill: {
    width: 28,
    borderRadius: 6,
  },
  barDay: {
    fontSize: 11,
  },
});
