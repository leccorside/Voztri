import React from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Formata centavos como moeda brasileira (ex.: 24850 -> "R$ 248,50").
 * Não depende de Intl, cujo suporte no Hermes varia entre Android e iOS.
 */
export function formatBRL(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}R$ ${reais},${centavos}`;
}

/**
 * Equivalente RN de `box-shadow`: shadow* no iOS e elevation no Android
 * (no Android 9+ o shadowColor também colore a sombra da elevation).
 */
export function shadow(
  opacity = 0.08,
  radius = 12,
  offsetY = 4,
  elevation = 4,
  color = '#0B1026',
): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
    elevation,
  };
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Botão com feedback de toque (opacidade) e semântica de acessibilidade. */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  style,
  textStyle,
  disabled,
  accessibilityLabel,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: !!disabled }}
    hitSlop={6}
    style={({ pressed }) => [
      kit.button,
      style,
      pressed && kit.pressed,
      disabled && kit.disabled,
    ]}
  >
    <Text style={[kit.buttonText, textStyle]}>{label}</Text>
  </Pressable>
);

interface BottomSheetModalProps {
  onClose: () => void;
  children: React.ReactNode;
  overlayColor?: string;
}

/**
 * Folha inferior sobre um fundo escurecido (substitui o `position: fixed` da
 * versão web). O botão "voltar" do Android chama onClose.
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  onClose,
  children,
  overlayColor = 'rgba(11, 16, 38, 0.75)',
}) => (
  <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={[kit.overlay, { backgroundColor: overlayColor }]}>
      <View style={kit.sheet}>{children}</View>
    </View>
  </Modal>
);

const kit = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    ...shadow(0.25, 40, -10, 16, '#000000'),
  },
});
