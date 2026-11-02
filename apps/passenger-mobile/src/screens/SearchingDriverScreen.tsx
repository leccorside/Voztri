import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { SEARCH_TIMEOUT_MS } from '../config.js';
import { formatCountdown, useSearchCountdown } from '../hooks/useSearchCountdown.js';
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

const TIMEOUT_MINUTES = Math.round(SEARCH_TIMEOUT_MS / 60_000);

/**
 * Busca por motorista: contador regressivo do prazo (createdAt + 3 min) e, quando a
 * API encerra a busca sem motorista (NO_DRIVER_AVAILABLE), o aviso com "Tentar de
 * novo" (mesma origem, destino, categoria e pagamento) e "Voltar ao início".
 */
export const SearchingDriverScreen: React.FC<Props> = ({ onCancel }) => {
  const { activeRide, noDriverRide, busy, retrySearch, dismissNoDriver } = usePassengerStore();
  const failed = !activeRide && !!noDriverRide;
  const ride = activeRide ?? noDriverRide;
  const remaining = useSearchCountdown(failed ? null : activeRide?.createdAt);
  const progress = remaining !== null ? remaining / (SEARCH_TIMEOUT_MS / 1000) : 0;

  return (
    <View style={styles.screen}>
      {/* Cabeçalho (anunciado pelo leitor de tela quando muda) */}
      <View style={styles.top} accessibilityLiveRegion="polite">
        <Text style={styles.overline}>{failed ? 'BUSCA ENCERRADA' : 'RADAR VOZTRI ATIVO'}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {failed ? 'Nenhum motorista disponível' : 'Buscando o melhor motorista...'}
        </Text>
        <Text style={styles.subtitle}>
          {failed
            ? `Não encontramos um motorista ${ride?.categoryName ?? 'VOZTRI'} perto de ${ride?.origin.shortAddress ?? 'você'} em ${TIMEOUT_MINUTES} minutos.`
            : 'Conectando com parceiros num raio de 2 a 5 km'}
        </Text>
      </View>

      {/* Prazo da busca: fora da região anunciada, para não ser lido a cada segundo */}
      {!failed && remaining !== null && (
        <View
          style={styles.countdown}
          accessible
          accessibilityLabel={
            remaining > 0 ? `Prazo da busca: ${formatCountdown(remaining)} restantes` : 'Encerrando a busca'
          }
        >
          <Text style={styles.countdownText}>
            {remaining > 0 ? `Prazo da busca: ${formatCountdown(remaining)}` : 'Encerrando a busca…'}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: VoztriColors.brand.primary }]} />
          </View>
        </View>
      )}

      {/* Radar */}
      <View
        style={[styles.radar, failed && styles.radarOff]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.ring, { width: 250, height: 250, borderColor: 'rgba(106, 0, 255, 0.25)' }]} />
        <View style={[styles.ring, { width: 170, height: 170, borderColor: 'rgba(106, 0, 255, 0.45)' }]} />
        <View style={styles.innerRing}>
          <View style={[styles.core, { backgroundColor: VoztriColors.brand.primary }]}>
            <Text style={styles.coreText}>V</Text>
          </View>
        </View>
      </View>

      {/* Resumo da corrida e ações */}
      <View style={styles.bottom}>
        <View style={styles.summary}>
          <View style={styles.flex}>
            <Text style={styles.route}>
              {ride?.origin.shortAddress} → {ride?.destination.shortAddress}
            </Text>
            <Text style={styles.meta}>
              {ride?.categoryName ?? 'VOZTRI'} • {ride ? PAYMENT_LABEL[ride.paymentMethod] ?? ride.paymentMethod : ''}
            </Text>
          </View>
          <Text style={styles.price}>{ride?.formattedPrice ?? ''}</Text>
        </View>

        {failed ? (
          <>
            <Button
              label={busy ? 'Solicitando…' : 'Tentar de novo'}
              accessibilityLabel="Tentar de novo"
              onPress={() => void retrySearch()}
              disabled={busy}
              style={[styles.retry, { backgroundColor: VoztriColors.brand.primary }, shadow(0.35, 20, 6, 8, '#6A00FF')]}
              textStyle={styles.retryText}
            />
            <Button
              label="Voltar ao início"
              onPress={dismissNoDriver}
              disabled={busy}
              style={styles.back}
              textStyle={styles.backText}
            />
          </>
        ) : (
          <Button
            label={busy ? 'Cancelando…' : 'Cancelar Busca'}
            accessibilityLabel="Cancelar Busca"
            onPress={onCancel}
            disabled={busy}
            style={styles.cancel}
            textStyle={styles.cancelText}
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
  countdown: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '70%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  radar: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarOff: {
    opacity: 0.35,
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
  retry: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  back: {
    width: '100%',
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
  },
  backText: {
    color: '#C9B2FF',
    fontWeight: '700',
    fontSize: 14,
  },
});
