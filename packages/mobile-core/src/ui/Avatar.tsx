import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export interface AvatarProps {
  /** Nome da pessoa: iniciais quando não há foto (ou ela não carrega). */
  name: string;
  /** Endereço completo da foto (resolveMediaUrl), ou null. */
  uri: string | null;
  /** Token da API: a foto enviada é servida só com login. */
  token?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** "Beatriz Lima" → "BL"; "Carlos" → "C". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Foto do perfil redonda, com as iniciais no lugar quando não há foto ou ela falha. */
export const Avatar: React.FC<AvatarProps> = ({ name, uri, token, size = 44, style }) => {
  const [failed, setFailed] = useState(false);
  // Foto nova (outro endereço): tenta carregar de novo
  useEffect(() => setFailed(false), [uri]);

  const box = { width: size, height: size, borderRadius: size / 2 };
  const showPhoto = !!uri && !failed;

  return (
    <View style={[styles.box, box, style]} accessibilityRole="image" accessibilityLabel={`Foto de ${name}`}>
      {showPhoto ? (
        <Image
          source={{ uri, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) }}
          style={box}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{initials(name)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#ECECFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '800',
    color: '#6A00FF',
  },
});
