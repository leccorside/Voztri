import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onOpenChat: () => void;
  onOpenSos: () => void;
  onCancel: () => void;
}

function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase();
}

const STATUS_TEXT: Record<string, { label: string; title: string }> = {
  ACCEPTED: { label: 'Motorista confirmado', title: 'Seu motorista está a caminho' },
  DRIVER_EN_ROUTE: { label: 'Motorista a caminho', title: 'Seu motorista está a caminho' },
  DRIVER_ARRIVED: { label: 'Motorista chegou', title: 'Seu motorista chegou ao embarque' },
  IN_PROGRESS: { label: 'Em viagem', title: 'A caminho do destino' },
};

export const DriverEnRouteScreen: React.FC<Props> = ({ onOpenChat, onOpenSos, onCancel }) => {
  const { activeRide, busy } = usePassengerStore();

  if (!activeRide) return null;

  const driver = activeRide.driver;
  const vehicle = driver?.vehicle;
  const driverName = driver?.user?.name ?? 'Motorista VOZTRI';
  const rating = driver?.user?.rating;
  const inTrip = activeRide.status === 'IN_PROGRESS';
  const status = STATUS_TEXT[activeRide.status] ?? STATUS_TEXT.DRIVER_EN_ROUTE!;

  return (
    <View style={styles.screen}>
      {/* Área do mapa */}
      <View style={styles.map}>
        <View style={styles.etaCard}>
          <View style={styles.flex}>
            <Text style={styles.etaLabel}>{status.label}</Text>
            <Text style={styles.etaText} accessibilityLiveRegion="polite">
              {inTrip ? `Destino: ${activeRide.destination.shortAddress}` : status.title}
            </Text>
          </View>
          <Button
            label="SOS 24h"
            onPress={onOpenSos}
            accessibilityLabel="Acionar central de emergência SOS 24 horas"
            style={styles.sos}
            textStyle={styles.sosText}
          />
        </View>

        <View style={styles.vehicleLayer} pointerEvents="none">
          <View style={[styles.vehiclePin, { backgroundColor: VoztriColors.brand.primary }]}>
            <Text style={styles.vehicleEmoji}>🚗</Text>
          </View>
          {vehicle && <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>}
        </View>
      </View>

      {/* Painel inferior com o motorista */}
      <View style={styles.sheet}>
        {/* PIN de embarque: só o passageiro recebe da API */}
        {!inTrip && activeRide.boardingPin && (
          <View style={styles.pinBox}>
            <View style={styles.flex}>
              <Text style={styles.pinLabel}>Código de Embarque (Informe ao motorista)</Text>
              <Text style={styles.pinHint}>Diga o PIN ao entrar no carro</Text>
            </View>
            <Text
              style={[styles.pin, { color: VoztriColors.brand.primary }]}
              accessibilityLabel={`PIN ${activeRide.boardingPin.split('').join(' ')}`}
            >
              {activeRide.boardingPin}
            </Text>
          </View>
        )}

        <View style={styles.driverRow}>
          <View style={styles.driver}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: VoztriColors.brand.primary }]}>{initials(driverName)}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driverName}</Text>
              {rating != null && <Text style={styles.driverMeta}>★ {rating.toFixed(2).replace('.', ',')}</Text>}
            </View>
          </View>

          {vehicle && (
            <View style={styles.vehicleInfo}>
              <Text style={styles.plate}>{vehicle.plate}</Text>
              <Text style={styles.vehicleModel}>
                {vehicle.brand} {vehicle.model} • {vehicle.color}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            label="💬 Mensagem (Chat)"
            onPress={onOpenChat}
            style={styles.chat}
            textStyle={[styles.actionText, { color: VoztriColors.brand.primary }]}
          />
          {!inTrip && (
            <Button
              label={busy ? 'Cancelando…' : 'Cancelar corrida'}
              accessibilityLabel="Cancelar corrida"
              onPress={onCancel}
              disabled={busy}
              style={styles.cancel}
              textStyle={[styles.actionText, { color: '#BA1A1A' }]}
            />
          )}
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
  cancel: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFFFF',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
