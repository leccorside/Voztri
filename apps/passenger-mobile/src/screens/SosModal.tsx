import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '@voztri/mobile-core';

interface Props {
  onClose: () => void;
}

export const SosModal: React.FC<Props> = ({ onClose }) => {
  const { isSosActive, triggerSos, cancelSos, busy } = usePassengerStore();
  const [pin, setPin] = useState('');
  // PIN errado, tentativas esgotadas (o alerta segue ativo) ou falha de rede
  const [error, setError] = useState<string | null>(null);

  const handleCancelSos = async () => {
    const failure = await cancelSos(pin);
    if (!failure) {
      onClose();
    } else {
      setPin('');
      setError(failure);
    }
  };

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.alertIcon}>
                <Text style={styles.alertEmoji}>🚨</Text>
              </View>
              <Text style={styles.title} accessibilityRole="header">
                Central de Emergência SOS 24h
              </Text>
            </View>
            <Button label="✕" onPress={onClose} accessibilityLabel="Fechar" textStyle={styles.close} />
          </View>

          {!isSosActive ? (
            <View>
              <Text style={styles.description}>
                Ao acionar o SOS, nossa central operacional 24h receberá imediatamente seus dados, o áudio ambiente da
                corrida e a localização GPS em tempo real, alertando também seus contatos de confiança cadastrados.
              </Text>

              <Button
                label={busy ? 'ACIONANDO…' : 'ACIONAR SOS IMEDIATAMENTE'}
                accessibilityLabel="ACIONAR SOS IMEDIATAMENTE"
                onPress={() => void triggerSos()}
                disabled={busy}
                style={styles.trigger}
                textStyle={styles.triggerText}
              />
            </View>
          ) : (
            <View>
              <Text style={styles.activeBanner} accessibilityLiveRegion="assertive">
                ⚠️ O ALERTA SOS ESTÁ ATIVO! Nossa equipe está monitorando esta corrida.
              </Text>

              <Text style={styles.pinPrompt}>Para desativar o alerta, digite seu PIN de emergência:</Text>

              <TextInput
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                placeholder="PIN de emergência"
                placeholderTextColor="#7B7489"
                value={pin}
                onChangeText={(text) => {
                  setPin(text.replace(/\D/g, ''));
                  setError(null);
                }}
                onSubmitEditing={() => void handleCancelSos()}
                accessibilityLabel="PIN de emergência"
                style={[styles.pinInput, error ? styles.pinInputError : styles.pinInputNormal]}
              />

              {error && (
                <Text style={styles.error} accessibilityLiveRegion="assertive">
                  {error}
                </Text>
              )}

              <Button
                label={busy ? 'Verificando…' : 'Desativar Alerta com PIN'}
                accessibilityLabel="Desativar Alerta com PIN"
                onPress={() => void handleCancelSos()}
                disabled={busy || pin.length < 4}
                style={styles.deactivate}
                textStyle={styles.deactivateText}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 16, 38, 0.85)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    ...shadow(0.3, 40, -10, 16, '#000000'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFDAD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertEmoji: {
    fontSize: 18,
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#BA1A1A',
  },
  close: {
    color: '#7B7489',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  description: {
    fontSize: 13,
    color: '#494457',
    lineHeight: 19.5,
    marginBottom: 20,
  },
  trigger: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#BA1A1A',
    marginBottom: 10,
    ...shadow(0.4, 20, 6, 8, '#BA1A1A'),
  },
  triggerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  activeBanner: {
    backgroundColor: '#FFDAD6',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#93000A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  pinPrompt: {
    fontSize: 13,
    color: '#494457',
    marginBottom: 12,
  },
  pinInput: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 3.6,
    color: '#151A31',
    marginBottom: 14,
  },
  pinInputNormal: {
    borderWidth: 1,
    borderColor: '#ECECFF',
  },
  pinInputError: {
    borderWidth: 2,
    borderColor: '#BA1A1A',
  },
  error: {
    color: '#BA1A1A',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  deactivate: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#151A31',
  },
  deactivateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
