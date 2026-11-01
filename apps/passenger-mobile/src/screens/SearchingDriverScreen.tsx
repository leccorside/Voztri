import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onCancel: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pagamento via Pix',
  credit_card: 'Pagamento no cartão',
  cash: 'Pagamento em dinheiro',
  wallet: 'Pagamento com saldo',
};

export const SearchingDriverScreen: React.FC<Props> = ({ onCancel }) => {
  const { activeRide, busy } = usePassengerStore();

  return (
    <View style={styles.screen}>
      {/* Cabeçalho */}
      <View style={styles.top} accessibilityLiveRegion="polite">
        <Text style={styles.overline}>RADAR VOZTRI ATIVO</Text>
        <Text style={styles.title} accessibilityRole="header">
          Buscando o melhor motorista...
        </Text>
        <Text style={styles.subtitle}>Conectando com parceiros num raio de 2 a 5 km</Text>
      </View>

      {/* Radar */}
      <View style={styles.radar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.ring, { width: 250, height: 250, borderColor: 'rgba(106, 0, 255, 0.25)' }]} />
        <View style={[styles.ring, { width: 170, height: 170, borderColor: 'rgba(106, 0, 255, 0.45)' }]} />
        <View style={styles.innerRing}>
          <View style={[styles.core, { backgroundColor: VoztriColors.brand.primary }]}>
            <Text style={styles.coreText}>V</Text>
          </View>
        </View>
      </View>

      {/* Resumo da corrida e cancelamento */}
      <View style={styles.bottom}>
        <View style={styles.summary}>
          <View style={styles.flex}>
            <Text style={styles.route}>
              {activeRide?.origin.shortAddress} → {activeRide?.destination.shortAddress}
            </Text>
            <Text style={styles.meta}>
              {activeRide?.categoryName ?? 'VOZTRI'} •{' '}
              {activeRide ? PAYMENT_LABEL[activeRide.paymentMethod] ?? activeRide.paymentMethod : ''}
            </Text>
          </View>
          <Text style={styles.price}>{activeRide?.formattedPrice ?? ''}</Text>
        </View>

        <Button
          label={busy ? 'Cancelando…' : 'Cancelar Busca'}
          accessibilityLabel="Cancelar Busca"
          onPress={onCancel}
          disabled={busy}
          style={styles.cancel}
          textStyle={styles.cancelText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1026',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  top: {
    alignItems: 'center',
    zIndex: 10,
  },
  overline: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C9B2FF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0A5BD',
    textAlign: 'center',
  },
  radar: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  innerRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(106, 0, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.8, 30, 0, 12, '#6A00FF'),
  },
  coreText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  bottom: {
    width: '100%',
    zIndex: 10,
  },
  summary: {
    backgroundColor: '#131A3B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#202A5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  route: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  meta: {
    fontSize: 12,
    color: '#A0A5BD',
    marginTop: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C9B2FF',
  },
  cancel: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
