import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { Button } from '@voztri/mobile-core';
import { usePassengerStore } from '../store/passengerStore.js';

interface Props {
  /** create: primeiro acesso (sem PIN); change: troca pelo menu da conta (pede o atual). */
  mode: 'create' | 'change';
}

const PIN_LENGTH = 4;
const onlyDigits = (text: string) => text.replace(/\D/g, '').slice(0, PIN_LENGTH);

/**
 * PIN de emergência: é com ele que o passageiro desativa o alerta SOS. Definido pelo
 * próprio passageiro (antes era 1234 para todos); a API recusa PINs fáceis (0000, 1234).
 */
export const EmergencyPinScreen: React.FC<Props> = ({ mode }) => {
  const { saveEmergencyPin, setChangingPin, logout, busy } = usePassengerStore();
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changing = mode === 'change';
  const complete =
    pin.length === PIN_LENGTH && confirmation.length === PIN_LENGTH && (!changing || currentPin.length === PIN_LENGTH);

  const save = async () => {
    if (pin !== confirmation) {
      setError('Os dois PINs não são iguais. Digite de novo.');
      setConfirmation('');
      return;
    }
    const failure = await saveEmergencyPin(pin, changing ? currentPin : undefined);
    if (failure) {
      setError(failure);
      setPin('');
      setConfirmation('');
      if (changing) setCurrentPin('');
    }
  };

  const field = (label: string, value: string, onChange: (text: string) => void) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChange(onlyDigits(text));
          setError(null);
        }}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        accessibilityLabel={label}
        style={styles.input}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}>
          <Text style={styles.iconText}>🛡️</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {changing ? 'Trocar PIN de emergência' : 'Crie seu PIN de emergência'}
        </Text>
        <Text style={styles.description}>
          É com ele que você desativa o alerta SOS durante uma corrida. Escolha 4 números que só você saiba: nada de
          0000, 1234 ou sequências parecidas.
        </Text>

        {changing && field('PIN atual', currentPin, setCurrentPin)}
        {field(changing ? 'Novo PIN' : 'PIN de emergência', pin, setPin)}
        {field('Confirme o PIN', confirmation, setConfirmation)}

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}

        <Button
          label={busy ? 'Salvando…' : 'Salvar PIN'}
          accessibilityLabel="Salvar PIN"
          onPress={() => void save()}
          disabled={busy || !complete}
          style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
          textStyle={styles.primaryText}
        />

        {changing ? (
          <Button label="Cancelar" onPress={() => setChangingPin(false)} style={styles.secondary} textStyle={styles.secondaryText} />
        ) : (
          <Button label="Sair da conta" onPress={() => void logout()} style={styles.secondary} textStyle={styles.secondaryText} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#151A31',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#494457',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#494457',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ECECFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#151A31',
    backgroundColor: '#FBF8FF',
  },
  error: {
    color: '#BA1A1A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  primary: {
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondary: {
    paddingVertical: 14,
    marginTop: 4,
  },
  secondaryText: {
    color: '#7B7489',
    fontWeight: '700',
    fontSize: 14,
  },
});
