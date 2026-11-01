import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { useDriverStore } from '../store/driverStore.js';
import { Button, shadow } from '../ui/kit.js';

/** Login do motorista por código SMS (OTP). */
export const LoginScreen: React.FC = () => {
  const { requestCode, login, busy, error } = useDriverStore();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');

  const handleRequest = async () => {
    const otp = await requestCode(phone);
    if (otp !== null) {
      setDebugOtp(otp || null);
      setStep('code');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={[styles.logo, { backgroundColor: VoztriColors.brand.primary }]}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <View>
            <Text style={[styles.brand, { color: VoztriColors.brand.primary }]}>VOZTRI</Text>
            <Text style={styles.badge}>Driver</Text>
          </View>
        </View>

        {step === 'phone' ? (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Entrar como motorista
            </Text>
            <Text style={styles.hint}>Informe seu telefone para receber o código de acesso.</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-0000"
              placeholderTextColor="#7B7489"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              accessibilityLabel="Telefone"
              style={styles.input}
            />
            <Button
              label={busy ? 'Enviando…' : 'Receber código'}
              onPress={handleRequest}
              disabled={busy || digits.length < 10}
              style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.primaryText}
            />
          </>
        ) : (
          <>
            <Text style={styles.title} accessibilityRole="header">
              Digite o código
            </Text>
            <Text style={styles.hint}>
              Enviamos um código de 6 dígitos para {phone}.
              {debugOtp ? ` Em desenvolvimento, o código é ${debugOtp}.` : ''}
            </Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#7B7489"
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
              accessibilityLabel="Código de verificação"
              style={[styles.input, styles.codeInput]}
            />
            <Button
              label={busy ? 'Verificando…' : 'Entrar'}
              onPress={() => void login(phone, code)}
              disabled={busy || code.length !== 6}
              style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.primaryText}
            />
            <Button
              label="Trocar telefone"
              onPress={() => {
                setStep('phone');
                setCode('');
              }}
              style={styles.secondary}
              textStyle={[styles.secondaryText, { color: VoztriColors.brand.primary }]}
            />
          </>
        )}

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1026',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    ...shadow(0.3, 30, 10, 10, '#000000'),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 24,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22005D',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#151A31',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: '#7B7489',
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D4D8F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#151A31',
    marginBottom: 16,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 6,
  },
  primary: {
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    marginTop: 10,
    paddingVertical: 10,
  },
  secondaryText: {
    fontWeight: '700',
    fontSize: 13,
  },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFDAD6',
    color: '#93000A',
    fontSize: 13,
  },
});
