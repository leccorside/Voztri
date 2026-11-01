import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, formatBRL, shadow } from '../ui/kit.js';

interface Props {
  onSimulateRide: () => void;
  onOpenEarnings: () => void;
}

export const DriverDashboardScreen: React.FC<Props> = ({ onSimulateRide, onOpenEarnings }) => {
  const { isOnline, toggleOnline, todayEarningsCents, todayRidesCount, onlineTime, rating } = useDriverStore();

  return (
    <View style={[styles.screen, { backgroundColor: VoztriColors.light.surface }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <View>
            <View style={[styles.row, { gap: 6 }]}>
              <Text style={[styles.brand, { color: VoztriColors.brand.primary }]}>VOZTRI</Text>
              <Text style={styles.driverBadge}>Driver</Text>
            </View>
            <Text style={[styles.subtitle, { color: VoztriColors.light.onSurfaceVariant }]}>Painel Operacional</Text>
          </View>
        </View>

        {/* Alternar online/offline */}
        <Pressable
          onPress={toggleOnline}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOnline }}
          accessibilityLabel="Disponibilidade para corridas"
          style={({ pressed }) => [
            styles.onlineToggle,
            { backgroundColor: isOnline ? '#00C853' : '#7B7489' },
            isOnline && shadow(0.3, 12, 4, 4, '#00C853'),
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </Pressable>
      </View>

      {/* Área principal: simulação de mapa e HUD flutuante */}
      <View style={styles.mapArea}>
        {/* Marcador da posição do motorista */}
        <View style={styles.markerLayer} pointerEvents="none">
          <View style={styles.markerHalo}>
            <View style={[styles.markerDot, { backgroundColor: VoztriColors.brand.primary }]}>
              <Text style={styles.markerArrow}>▲</Text>
            </View>
          </View>
          <Text style={styles.markerLabel}>Sua Posição</Text>
        </View>

        {/* Card de ganhos e métricas */}
        <View style={styles.earningsCard}>
          <View style={[styles.rowBetween, { marginBottom: 12 }]}>
            <View>
              <Text style={styles.overline}>Ganhos de Hoje</Text>
              <View style={[styles.row, { alignItems: 'baseline', gap: 6, marginTop: 2 }]}>
                <Text style={styles.earnings}>{formatBRL(todayEarningsCents)}</Text>
                <Text style={styles.growth}>+18%</Text>
              </View>
            </View>
            <Button
              label="Ver Extrato ›"
              onPress={onOpenEarnings}
              style={styles.statementButton}
              textStyle={[styles.statementText, { color: VoztriColors.brand.primary }]}
            />
          </View>

          {/* Grade de 3 métricas */}
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Viagens</Text>
              <Text style={styles.metricValue}>{todayRidesCount}</Text>
            </View>
            <View style={[styles.metric, styles.metricDivided]}>
              <Text style={styles.metricLabel}>Online</Text>
              <Text style={styles.metricValue}>{onlineTime}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Avaliação</Text>
              <Text style={[styles.metricValue, { color: '#FFAB00' }]}>★ {rating}</Text>
            </View>
          </View>
        </View>

        {/* Botão do simulador */}
        {isOnline && (
          <View style={styles.bottomActions}>
            <Button
              label="Simular Solicitação de Corrida (Demo)"
              onPress={onSimulateRide}
              style={[styles.simulateButton, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.simulateText}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    ...shadow(0.05, 8, 2, 3),
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6A00FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  brand: {
    fontWeight: '800',
    fontSize: 16,
  },
  driverBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#E9DDFF',
    color: '#22005D',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
  },
  onlineToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  onlineText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E8ECF5',
  },
  markerLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '10%', // a versão web posicionava o marcador a 45% da altura
  },
  markerHalo: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(106, 0, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.4, 14, 4, 6, '#6A00FF'),
  },
  markerArrow: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  markerLabel: {
    marginTop: 4,
    backgroundColor: '#0B1026',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  earningsCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...shadow(0.08, 32, 12, 6, '#6A00FF'),
  },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B7489',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earnings: {
    fontSize: 26,
    fontWeight: '800',
    color: '#151A31',
  },
  growth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9546F9',
  },
  statementButton: {
    backgroundColor: '#F3F2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  statementText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivided: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7FF',
  },
  metricLabel: {
    fontSize: 11,
    color: '#7B7489',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#151A31',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    gap: 10,
  },
  simulateButton: {
    padding: 14,
    borderRadius: 14,
    ...shadow(0.35, 24, 8, 8, '#6A00FF'),
  },
  simulateText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
