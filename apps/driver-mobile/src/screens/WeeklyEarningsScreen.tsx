import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onBack: () => void;
  onOpenPayout: () => void;
}

const DAYS = [
  { day: 'Seg', amount: 180, height: 60 },
  { day: 'Ter', amount: 220, height: 75 },
  { day: 'Qua', amount: 195, height: 65 },
  { day: 'Qui', amount: 310, height: 100 },
  { day: 'Sex', amount: 280, height: 90 },
  { day: 'Sáb', amount: 340, height: 110 },
  { day: 'Dom', amount: 248, height: 80, isToday: true },
];

export const WeeklyEarningsScreen: React.FC<Props> = ({ onBack, onOpenPayout }) => {
  return (
    <View style={styles.screen}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Button label="← Voltar" onPress={onBack} textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Ganhos da Semana
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Total da semana */}
        <View style={[styles.card, styles.center]}>
          <Text style={styles.overline}>Semana Atual (27 Out - 02 Nov)</Text>
          <Text style={[styles.total, { color: VoztriColors.brand.primary }]}>R$ 1.773,00</Text>
          <Text style={styles.growth}>▲ 14% a mais que a semana anterior</Text>

          <Button
            label="Transferir Saldo via Pix"
            onPress={onOpenPayout}
            style={[styles.payoutButton, { backgroundColor: VoztriColors.brand.primary }]}
            textStyle={styles.payoutText}
          />
        </View>

        {/* Gráfico de barras semanal */}
        <View style={styles.card}>
          <Text style={styles.chartTitle}>Ganhos Diários</Text>
          <View style={styles.chart}>
            {DAYS.map((d) => (
              <View key={d.day} style={styles.bar}>
                <Text style={[styles.barValue, { color: d.isToday ? VoztriColors.brand.primary : '#7B7489' }]}>
                  {d.amount}
                </Text>
                <View
                  style={[
                    styles.barFill,
                    { height: d.height, backgroundColor: d.isToday ? VoztriColors.brand.primary : '#E5E7FF' },
                  ]}
                />
                <Text
                  style={[
                    styles.barDay,
                    { fontWeight: d.isToday ? '800' : '600', color: d.isToday ? '#151A31' : '#7B7489' },
                  ]}
                >
                  {d.day}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  growth: {
    fontSize: 13,
    color: '#00C853',
    fontWeight: '700',
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
