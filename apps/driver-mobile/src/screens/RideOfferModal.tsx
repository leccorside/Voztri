import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import type { DriverRideOffer } from '@voztri/shared-types';
import { useDriverStore } from '../store/driverStore.js';
import { BottomSheetModal, Button, formatBRL, shadow } from '@voztri/mobile-core';

interface Props {
  offer: DriverRideOffer;
  onAccept: () => void;
  onReject: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão',
  cash: 'Dinheiro',
  wallet: 'Carteira',
};

export const RideOfferModal: React.FC<Props> = ({ offer, onAccept, onReject }) => {
  const busy = useDriverStore((s) => s.busy);
  // A contagem parte do tempo que ainda resta no servidor
  const [secondsLeft, setSecondsLeft] = useState(offer.secondsLeft);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReject();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onReject]);

  const progressPercent = Math.max(0, (secondsLeft / offer.timeoutSeconds) * 100);

  return (
    <BottomSheetModal onClose={onReject}>
      {/* Barra de tempo restante */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: VoztriColors.brand.primary }]}
        />
      </View>

      {/* Categoria e contagem regressiva */}
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={styles.category}>{offer.categoryName}</Text>
        <Text style={styles.expires} accessibilityLiveRegion="polite">
          Expira em {secondsLeft}s
        </Text>
      </View>

      {/* Ganho em destaque */}
      <View style={styles.earningsBlock}>
        <Text style={styles.earningsLabel}>Seu Ganho Líquido</Text>
        <Text style={styles.earnings}>{formatBRL(offer.earningsCents)}</Text>
        <Text style={styles.tripInfo}>
          {String(offer.distanceKm).replace('.', ',')} km • ~{offer.durationMinutes} min de viagem
        </Text>
        <Text style={styles.passengerInfo}>
          {offer.passengerName ?? 'Passageiro'} • {PAYMENT_LABEL[offer.paymentMethod] ?? offer.paymentMethod}
        </Text>
      </View>

      {/* Trajeto */}
      <View style={styles.routeBox}>
        <View style={[styles.stop, { marginBottom: 10 }]}>
          <View style={[styles.stopMarker, { borderRadius: 999, backgroundColor: '#00C853' }]} />
          <View style={styles.flex}>
            <Text style={styles.stopLabel}>Embarque</Text>
            <Text style={styles.stopAddress}>{offer.pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.stop}>
          <View style={[styles.stopMarker, { borderRadius: 2, backgroundColor: VoztriColors.brand.primary }]} />
          <View style={styles.flex}>
            <Text style={styles.stopLabel}>Desembarque</Text>
            <Text style={styles.stopAddress}>{offer.dropoffAddress}</Text>
          </View>
        </View>
      </View>

      {/* Recusar (1/3) e aceitar (2/3) */}
      <View style={styles.actions}>
        <Button label="Recusar" onPress={onReject} disabled={busy} style={styles.reject} textStyle={styles.rejectText} />
        <Button
          label={busy ? 'ACEITANDO…' : 'ACEITAR CORRIDA'}
          accessibilityLabel="ACEITAR CORRIDA"
          onPress={onAccept}
          disabled={busy}
          style={[styles.accept, { backgroundColor: VoztriColors.brand.primary }]}
          textStyle={styles.acceptText}
        />
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#ECECFF',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
  },
  category: {
    backgroundColor: '#E9DDFF',
    color: '#22005D',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  expires: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF3B30',
  },
  earningsBlock: {
    alignItems: 'center',
    marginVertical: 14,
  },
  earningsLabel: {
    fontSize: 13,
    color: '#7B7489',
    fontWeight: '600',
  },
  earnings: {
    fontSize: 38,
    fontWeight: '800',
    color: '#151A31',
    letterSpacing: -0.76,
  },
  tripInfo: {
    fontSize: 12,
    color: '#00C853',
    fontWeight: '700',
  },
  passengerInfo: {
    marginTop: 4,
    fontSize: 12,
    color: '#7B7489',
    fontWeight: '600',
  },
  routeBox: {
    backgroundColor: '#F8F9FE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7FF',
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stopMarker: {
    width: 10,
    height: 10,
    marginTop: 4,
  },
  stopLabel: {
    fontSize: 11,
    color: '#7B7489',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stopAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#151A31',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  reject: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7FF',
    backgroundColor: '#FFFFFF',
  },
  rejectText: {
    color: '#7B7489',
    fontWeight: '700',
    fontSize: 15,
  },
  accept: {
    flex: 2,
    padding: 16,
    borderRadius: 14,
    ...shadow(0.4, 24, 8, 8, '#6A00FF'),
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
