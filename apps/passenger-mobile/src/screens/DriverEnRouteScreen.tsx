import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onOpenChat: () => void;
  onOpenSos: () => void;
  onSimulateBoarding: () => void;
}

export const DriverEnRouteScreen: React.FC<Props> = ({ onOpenChat, onOpenSos, onSimulateBoarding }) => {
  const { activeRide } = usePassengerStore();

  const driver = activeRide?.driver;
  const vehicle = driver?.activeVehicle;

  return (
    <View style={styles.screen}>
      {/* Simulação de mapa */}
      <View style={styles.map}>
        {/* Previsão de chegada */}
        <View style={styles.etaCard}>
          <View style={styles.flex}>
            <Text style={styles.etaLabel}>Motorista a caminho</Text>
            <Text style={styles.etaText}>Chegando em ~3 minutos</Text>
          </View>
          <Button
            label="SOS 24h"
            onPress={onOpenSos}
            accessibilityLabel="Acionar central de emergência SOS 24 horas"
            style={styles.sos}
            textStyle={styles.sosText}
          />
        </View>

        {/* Veículo no mapa */}
        <View style={styles.vehicleLayer} pointerEvents="none">
          <View style={[styles.vehiclePin, { backgroundColor: VoztriColors.brand.primary }]}>
            <Text style={styles.vehicleEmoji}>🚗</Text>
          </View>
          <Text style={styles.vehiclePlate}>VOZ2026</Text>
        </View>
      </View>

      {/* Painel inferior com o motorista */}
      <View style={styles.sheet}>
        {/* PIN de embarque em destaque */}
        <View style={styles.pinBox}>
          <View style={styles.flex}>
            <Text style={styles.pinLabel}>Código de Embarque (Informe ao motorista)</Text>
            <Text style={styles.pinHint}>Diga o PIN ao entrar no carro</Text>
          </View>
          <Text style={[styles.pin, { color: VoztriColors.brand.primary }]} accessibilityLabel="PIN 1 2 3 4">
            1234
          </Text>
        </View>

        {/* Motorista e veículo */}
        <View style={styles.driverRow}>
          <View style={styles.driver}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: VoztriColors.brand.primary }]}>CS</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driver?.user?.name || 'Carlos Eduardo Silva'}</Text>
              <Text style={styles.driverMeta}>★ 4.98 • 1.420 viagens</Text>
            </View>
          </View>

          <View style={styles.vehicleInfo}>
            <Text style={styles.plate}>{vehicle?.plate || 'VOZ2026'}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle?.brand} {vehicle?.model}
            </Text>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.actions}>
          <Button
            label="💬 Mensagem (Chat)"
            onPress={onOpenChat}
            style={styles.chat}
            textStyle={[styles.actionText, { color: VoztriColors.brand.primary }]}
          />
          <Button
            label="Concluir Viagem (Demo)"
            onPress={onSimulateBoarding}
            style={[styles.finish, { backgroundColor: VoztriColors.brand.primary }]}
            textStyle={[styles.actionText, { color: '#FFFFFF' }]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF8FF',
  },
  flex: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: '#EAEFF8',
  },
  etaCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...shadow(0.08, 24, 8, 4),
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C853',
    textTransform: 'uppercase',
  },
  etaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#151A31',
  },
  sos: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#BA1A1A',
    ...shadow(0.3, 10, 4, 4, '#BA1A1A'),
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  vehicleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePin: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.4, 14, 4, 6, '#6A00FF'),
  },
  vehicleEmoji: {
    fontSize: 22,
  },
  vehiclePlate: {
    backgroundColor: '#0B1026',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...shadow(0.08, 30, -8, 10),
  },
  pinBox: {
    backgroundColor: '#F3F2FF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6A00FF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F00C3',
    textTransform: 'uppercase',
  },
  pinHint: {
    fontSize: 13,
    color: '#494457',
  },
  pin: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2.8,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: '#ECECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 18,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#151A31',
  },
  driverMeta: {
    fontSize: 12,
    color: '#7B7489',
  },
  vehicleInfo: {
    alignItems: 'flex-end',
  },
  plate: {
    backgroundColor: '#F4F6FA',
    borderWidth: 1,
    borderColor: '#CBC3DA',
    borderRadius: 6,
    overflow: 'hidden',
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontWeight: '800',
    fontSize: 13,
    color: '#151A31',
  },
  vehicleModel: {
    fontSize: 11,
    color: '#7B7489',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  chat: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECFF',
    backgroundColor: '#FBF8FF',
  },
  finish: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    ...shadow(0.3, 14, 4, 6, '#6A00FF'),
  },
  actionText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
