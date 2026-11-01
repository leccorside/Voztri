import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onOpenPinModal: () => void;
  onFinishRide: () => void;
}

export const EnRouteNavigationScreen: React.FC<Props> = ({ onOpenPinModal, onFinishRide }) => {
  const { currentRide } = useDriverStore();

  if (!currentRide) return null;

  const isEnRoute = currentRide.status === 'DRIVER_EN_ROUTE';

  return (
    <View style={styles.screen}>
      {/* Faixa de instrução de navegação */}
      <View style={styles.instruction}>
        <View style={[styles.turnIcon, { backgroundColor: VoztriColors.brand.primary }]}>
          <Text style={styles.turnArrow}>➔</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.distance}>Em 250 metros</Text>
          <Text style={styles.instructionText}>
            {isEnRoute ? 'Chegando ao ponto de embarque' : 'Vire à direita na Av. Brigadeiro Faria Lima'}
          </Text>
        </View>
      </View>

      {/* Simulação de mapa com HUD */}
      <View style={styles.map}>
        {/* Velocímetro */}
        <View style={styles.speedometer}>
          <Text style={styles.speed}>48</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>

        {/* Resumo da rota */}
        <View style={styles.routePill}>
          <Text style={styles.eta}>6 min</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.km}>2.1 km</Text>
        </View>
      </View>

      {/* Painel inferior */}
      <View style={styles.sheet}>
        {/* Resumo do passageiro */}
        <View style={styles.passengerRow}>
          <View style={styles.passenger}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: VoztriColors.brand.primary }]}>BL</Text>
            </View>
            <View>
              <Text style={styles.passengerName}>Beatriz Lima</Text>
              <Text style={styles.passengerMeta}>★ 4.95 • Pagamento via Pix</Text>
            </View>
          </View>
          <Text style={[styles.fare, { color: VoztriColors.brand.primary }]}>R$ 24,50</Text>
        </View>

        {/* Ação conforme o estado da corrida */}
        {isEnRoute ? (
          <Button
            label="VALIDAR PIN DE EMBARQUE (1234)"
            onPress={onOpenPinModal}
            style={[styles.action, { backgroundColor: VoztriColors.brand.primary }, shadow(0.35, 20, 6, 8, '#6A00FF')]}
            textStyle={styles.actionText}
          />
        ) : (
          <Button
            label="FINALIZAR CORRIDA"
            onPress={onFinishRide}
            style={[styles.action, { backgroundColor: '#00C853' }, shadow(0.35, 20, 6, 8, '#00C853')]}
            textStyle={styles.actionText}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1026',
  },
  flex: {
    flex: 1,
  },
  instruction: {
    backgroundColor: '#0B1026',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 20,
    ...shadow(0.4, 20, 4, 8, '#000000'),
  },
  turnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  distance: {
    fontSize: 13,
    color: '#C9B2FF',
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  map: {
    flex: 1,
    backgroundColor: '#131A3B',
  },
  speedometer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#0B1026',
    borderWidth: 2,
    borderColor: '#6A00FF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    ...shadow(0.5, 12, 4, 6, '#000000'),
  },
  speed: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  speedUnit: {
    fontSize: 10,
    color: '#C9B2FF',
    fontWeight: '600',
  },
  routePill: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#0B1026',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#202A5B',
  },
  eta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00C853',
  },
  dot: {
    fontSize: 12,
    color: '#7B7489',
  },
  km: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...shadow(0.2, 30, -8, 12, '#000000'),
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  passenger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#ECECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#151A31',
  },
  passengerMeta: {
    fontSize: 12,
    color: '#7B7489',
  },
  fare: {
    fontSize: 18,
    fontWeight: '800',
  },
  action: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
