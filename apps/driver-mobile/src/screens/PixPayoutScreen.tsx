import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, formatBRL, shadow } from '../ui/kit.js';

interface Props {
  onBack: () => void;
}

/** Valor mínimo de repasse aceito pela API (R$ 10,00). */
const MIN_PAYOUT_CENTS = 1000;

export const PixPayoutScreen: React.FC<Props> = ({ onBack }) => {
  const { earnings, refreshEarnings, requestPayout, busy } = useDriverStore();
  const [transferredCents, setTransferredCents] = useState<number | null>(null);

  useEffect(() => {
    void refreshEarnings();
  }, [refreshEarnings]);

  const balance = earnings?.availableBalanceCents ?? 0;
  const canTransfer = !!earnings?.pixKey && balance >= MIN_PAYOUT_CENTS;

  const transfer = async () => {
    const amount = await requestPayout();
    if (amount !== null) setTransferredCents(amount);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Button label="← Voltar" onPress={onBack} textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Repasse Instantâneo Pix
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {!earnings ? (
        <View style={styles.loading}>
          <ActivityIndicator color={VoztriColors.brand.primary} accessibilityLabel="Carregando saldo" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Saldo disponível */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo Disponível para Saque</Text>
            <Text style={styles.balance}>{formatBRL(balance)}</Text>
            <View style={styles.pixKey}>
              <Text style={[styles.pixKeyText, { color: VoztriColors.brand.primary }]}>
                Chave Pix: {earnings.pixKey ?? 'não cadastrada'}
              </Text>
            </View>
          </View>

          {transferredCents !== null ? (
            <View style={styles.success} accessibilityLiveRegion="polite">
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Transferência Pix Enviada!</Text>
              <Text style={styles.successText}>
                O valor de {formatBRL(transferredCents)} foi transferido para sua conta bancária sem taxas.
              </Text>
            </View>
          ) : (
            <>
              <Button
                label={busy ? 'TRANSFERINDO…' : 'TRANSFERIR AGORA VIA PIX'}
                accessibilityLabel="TRANSFERIR AGORA VIA PIX"
                onPress={() => void transfer()}
                disabled={busy || !canTransfer}
                style={styles.transferButton}
                textStyle={styles.transferText}
              />
              {!canTransfer && (
                <Text style={styles.minimum}>
                  {earnings.pixKey
                    ? `O saque mínimo é ${formatBRL(MIN_PAYOUT_CENTS)}.`
                    : 'Cadastre uma chave Pix para receber os repasses.'}
                </Text>
              )}
            </>
          )}
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
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    ...shadow(0.06, 24, 8, 3, '#6A00FF'),
  },
  balanceLabel: {
    fontSize: 13,
    color: '#7B7489',
    fontWeight: '600',
  },
  balance: {
    fontSize: 36,
    fontWeight: '800',
    color: '#151A31',
    marginVertical: 8,
  },
  pixKey: {
    backgroundColor: '#F3F2FF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  pixKeyText: {
    fontWeight: '700',
    fontSize: 12,
  },
  success: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  successIcon: {
    fontSize: 32,
    marginBottom: 8,
    color: '#1B5E20',
  },
  successTitle: {
    marginBottom: 6,
    color: '#1B5E20',
    fontSize: 16,
    fontWeight: '800',
  },
  successText: {
    fontSize: 13,
    color: '#2E7D32',
    textAlign: 'center',
  },
  transferButton: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#00C853',
    ...shadow(0.35, 20, 6, 8, '#00C853'),
  },
  transferText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  minimum: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    color: '#7B7489',
  },
});
