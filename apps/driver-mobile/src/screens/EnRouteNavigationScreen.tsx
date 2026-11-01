import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, formatBRL, shadow } from '../ui/kit.js';

interface Props {
  onOpenPinModal: () => void;
  onFinishRide: () => Promise<boolean>;
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pagamento via Pix',
  credit_card: 'Pagamento no cartão',
  cash: 'Pagamento em dinheiro',
  wallet: 'Pagamento com saldo',
};

function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase();
}

export const EnRouteNavigationScreen: React.FC<Props> = ({ onOpenPinModal, onFinishRide }) => {
  const { currentRide, busy } = useDriverStore();
  const [finishing, setFinishing] = useState(false);

  if (!currentRide) return null;

  // Até o PIN ser validado, o motorista está indo buscar o passageiro
  const goingToPickup = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'].includes(currentRide.status);
  const target = goingToPickup ? currentRide.origin : currentRide.destination;
  const passengerName = currentRide.passenger?.user?.name ?? 'Passageiro';
  const passengerRating = currentRide.passenger?.user?.rating;
  const earnings = currentRide.driverEarningsCents ?? currentRide.priceCents;
  const km = (currentRide.route.distanceMeters / 1000).toFixed(1).replace('.', ',');
  const minutes = Math.round(currentRide.route.durationSeconds / 60);

  const finish = async () => {
    setFinishing(true);
    await onFinishRide();
    setFinishing(false);
  };

  return (
    <View style={styles.screen}>
      {/* Para onde ir agora */}
      <View style={styles.instruction}>
        <View style={[styles.turnIcon, { backgroundColor: VoztriColors.brand.primary }]}>
          <Text style={styles.turnArrow}>{goingToPickup ? '📍' : '🏁'}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.distance}>{goingToPickup ? 'Buscar passageiro em' : 'Levar passageiro até'}</Text>
          <Text style={styles.instructionText}>{target.address}</Text>
        </View>
      </View>

      {/* Área do mapa (navegação curva a curva ainda não integrada) */}
      <View style={styles.map}>
        <View style={styles.routePill}>
          <Text style={styles.eta}>~{minutes} min</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.km}>{km} km de viagem</Text>
        </View>
      </View>

      {/* Painel inferior */}
      <View style={styles.sheet}>
        <View style={styles.passengerRow}>
          <View style={styles.passenger}>
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { color: VoztriColors.brand.primary }]}>{initials(passengerName)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.passengerName}>{passengerName}</Text>
              <Text style={styles.passengerMeta}>
                {passengerRating != null ? `★ ${passengerRating.toFixed(2).replace('.', ',')} • ` : ''}
                {PAYMENT_LABEL[currentRide.paymentMethod] ?? currentRide.paymentMethod}
              </Text>
            </View>
          </View>
          <View style={styles.fareBox}>
            <Text style={[styles.fare, { color: VoztriColors.brand.primary }]}>{formatBRL(earnings)}</Text>
            <Text style={styles.fareHint}>seu ganho</Text>
          </View>
        </View>

        {goingToPickup ? (
          <Button
            label="VALIDAR PIN DE EMBARQUE"
            onPress={onOpenPinModal}
            style={[styles.action, { backgroundColor: VoztriColors.brand.primary }, shadow(0.35, 20, 6, 8, '#6A00FF')]}
            textStyle={styles.actionText}
          />
        ) : (
          <Button
            label={finishing ? 'FINALIZANDO…' : 'FINALIZAR CORRIDA'}
            accessibilityLabel="FINALIZAR CORRIDA"
            onPress={() => void finish()}
            disabled={finishing || busy}
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
    fontSize: 22,
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
    gap: 12,
    marginBottom: 16,
  },
  passenger: {
    flex: 1,
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
  fareBox: {
    alignItems: 'flex-end',
  },
  fare: {
    fontSize: 18,
    fontWeight: '800',
  },
  fareHint: {
    fontSize: 11,
    color: '#7B7489',
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
