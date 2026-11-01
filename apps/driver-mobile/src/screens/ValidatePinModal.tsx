import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { BottomSheetModal, Button, shadow } from '../ui/kit.js';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export const ValidatePinModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Evita chamar onSuccess depois que o modal foi fechado
  useEffect(() => () => {
    if (successTimer.current) clearTimeout(successTimer.current);
  }, []);

  const handlePress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          successTimer.current = setTimeout(onSuccess, 300);
        } else {
          setError(true);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <BottomSheetModal onClose={onCancel} overlayColor="rgba(11, 16, 38, 0.8)">
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <Text style={styles.title} accessibilityRole="header">
          Validar PIN de Embarque
        </Text>
        <Button label="✕" onPress={onCancel} accessibilityLabel="Fechar" textStyle={styles.close} />
      </View>

      <Text style={styles.hint}>
        Solicite ao passageiro o código de 4 dígitos informado no aplicativo dele.
      </Text>

      {/* Caixas do PIN */}
      <View style={styles.pinRow}>
        {[0, 1, 2, 3].map((index) => {
          const digit = pin[index] || '';
          return (
            <View
              key={index}
              style={[
                styles.pinBox,
                { borderColor: error ? '#BA1A1A' : digit ? VoztriColors.brand.primary : '#E5E7FF' },
              ]}
            >
              <Text style={[styles.pinDigit, { color: error ? '#BA1A1A' : '#151A31' }]}>{digit}</Text>
            </View>
          );
        })}
      </View>

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="assertive">
          PIN inválido! Tente novamente (Dica de teste: 1234)
        </Text>
      )}

      {/* Teclado numérico 3x4 */}
      <View style={styles.keypad}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.keySlot} />
          ) : (
            <Pressable
              key={i}
              onPress={() => (key === '⌫' ? handleDelete() : handlePress(key))}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Apagar' : key}
              style={({ pressed }) => [styles.keySlot, styles.key, pressed && { backgroundColor: '#F3F2FF' }]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ),
        )}
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#151A31',
  },
  close: {
    color: '#7B7489',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  hint: {
    fontSize: 13,
    color: '#7B7489',
    marginBottom: 20,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pinBox: {
    width: 56,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigit: {
    fontSize: 28,
    fontWeight: '800',
  },
  error: {
    textAlign: 'center',
    color: '#BA1A1A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -10,
    marginBottom: 16,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  keySlot: {
    width: '31%',
    height: 56,
  },
  key: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECECFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.04, 6, 2, 1),
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#151A31',
  },
});
