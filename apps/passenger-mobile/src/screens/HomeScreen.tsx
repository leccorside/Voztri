import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import type { AddressLocation } from '@voztri/shared-types';
import type { SavedPlaceKind } from '@voztri/api-client';
import { usePassengerStore } from '../store/passengerStore.js';
import { Avatar, shadow } from '@voztri/mobile-core';
import { currentToken, mediaUrl } from '../api.js';

interface Props {
  onOpenSearch: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onOpenSearch }) => {
  const {
    user,
    logout,
    origin,
    originSource,
    originAccuracy,
    originWarning,
    locateOrigin,
    savedPlaces,
    setDestination,
    openPlacePicker,
    setChangingPin,
    setProfileOpen,
  } = usePassengerStore();

  const pickupText =
    originSource === 'locating'
      ? 'Obtendo sua localização…'
      : originSource === 'gps'
        ? `${origin.shortAddress}${originAccuracy != null ? ` (±${Math.round(originAccuracy)} m)` : ''}`
        : `${origin.shortAddress} (endereço padrão)`;

  const confirmLogout = () =>
    Alert.alert('Sair da conta', 'Deseja sair da VOZTRI neste aparelho?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void logout() },
    ]);

  // Menu da conta: perfil, trocar o PIN de emergência ou sair (com confirmação). O
  // Alert do Android mostra no máximo 3 botões e descartava o 4º ("Cancelar"): lá o
  // menu fecha com o "voltar" ou tocando fora (cancelable); no iOS o Cancelar fica.
  const openAccountMenu = () => {
    const options: AlertButton[] = [
      { text: 'Meu perfil', onPress: () => setProfileOpen(true) },
      { text: 'Trocar PIN de emergência', onPress: () => setChangingPin(true) },
      { text: 'Sair da conta', style: 'destructive', onPress: confirmLogout },
    ];
    Alert.alert(
      user?.name ?? 'Sua conta',
      undefined,
      Platform.OS === 'android' ? options : [...options, { text: 'Cancelar', style: 'cancel' }],
      { cancelable: true },
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: VoztriColors.light.surface }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <View>
            <Text style={[styles.brand, { color: VoztriColors.brand.primary }]}>VOZTRI</Text>
            <Text style={styles.title} accessibilityRole="header">
              Início
            </Text>
          </View>
        </View>

        <Pressable
          onPress={openAccountMenu}
          accessibilityRole="button"
          accessibilityLabel={`Conta de ${user?.name ?? 'passageiro'}. Toque para ver o perfil, trocar o PIN de emergência ou sair`}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Avatar name={user?.name ?? '?'} uri={mediaUrl(user?.avatarUrl)} token={currentToken()} size={38} />
        </Pressable>
      </View>

      {/* Simulação de mapa */}
      <View style={styles.map}>
        {/* Posição do passageiro */}
        <View style={styles.youLayer} pointerEvents="none">
          <View style={styles.youHalo}>
            <View style={[styles.youDot, { backgroundColor: VoztriColors.brand.primary }]} />
          </View>
          <Text style={styles.youLabel}>Você está aqui</Text>
        </View>

        {/* Veículo próximo 1 (carro, 2 min) */}
        <View style={[styles.vehicle, { top: '30%', left: '28%' }]} pointerEvents="none">
          <View style={styles.vehicleIcon}>
            <Text style={styles.vehicleEmoji}>🚗</Text>
          </View>
          <Text style={styles.vehicleEta}>2 min</Text>
        </View>

        {/* Veículo próximo 2 (moto, 1 min) */}
        <View style={[styles.vehicle, { top: '34%', right: '24%' }]} pointerEvents="none">
          <View style={styles.vehicleIcon}>
            <Text style={styles.vehicleEmoji}>🛵</Text>
          </View>
          <Text style={styles.vehicleEta}>1 min</Text>
        </View>

        {/* Card de busca */}
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Para onde vamos hoje?</Text>

          {/* Ponto de embarque: GPS ou origem padrão sinalizada */}
          <View style={styles.pickupRow} accessibilityLiveRegion="polite">
            <View style={[styles.pickupDot, { backgroundColor: originSource === 'gps' ? '#00C853' : '#FFAB00' }]} />
            <View style={styles.flex}>
              <Text style={styles.pickupLabel}>Embarque</Text>
              <Text style={styles.pickupText}>{pickupText}</Text>
              {originSource === 'fallback' && originWarning && <Text style={styles.pickupWarning}>{originWarning}</Text>}
            </View>
            {originSource === 'fallback' && (
              <Pressable
                onPress={() => void locateOrigin()}
                accessibilityRole="button"
                accessibilityLabel="Usar minha localização"
                style={({ pressed }) => [styles.locateButton, pressed && styles.pressed]}
              >
                <Text style={[styles.locateText, { color: VoztriColors.brand.primary }]}>Usar minha localização</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={onOpenSearch}
            accessibilityRole="search"
            accessibilityLabel="Buscar endereço de destino"
            style={({ pressed }) => [styles.searchField, pressed && styles.pressed]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Buscar endereço de destino...</Text>
          </Pressable>

          {/* Endereços salvos da conta: com endereço, vai direto às estimativas; sem, adiciona */}
          <View style={styles.shortcuts}>
            {(['home', 'work'] as const).map((kind) => (
              <PlaceShortcut
                key={kind}
                kind={kind}
                place={savedPlaces?.[kind] ?? null}
                onUse={(place) => void setDestination(place)}
                onEdit={openPlacePicker}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export const PLACE_LABELS: Record<SavedPlaceKind, { icon: string; title: string }> = {
  home: { icon: '🏠', title: 'Casa' },
  work: { icon: '💼', title: 'Trabalho' },
};

const PlaceShortcut: React.FC<{
  kind: SavedPlaceKind;
  place: AddressLocation | null;
  onUse: (place: AddressLocation) => void;
  onEdit: (kind: SavedPlaceKind) => void;
}> = ({ kind, place, onUse, onEdit }) => {
  const { icon, title } = PLACE_LABELS[kind];
  return (
    <View style={styles.shortcut}>
      <Pressable
        onPress={() => (place ? onUse(place) : onEdit(kind))}
        accessibilityRole="button"
        accessibilityLabel={place ? `${title}, ${place.shortAddress}` : `${title}, adicionar endereço`}
        style={({ pressed }) => [styles.shortcutMain, pressed && styles.pressed]}
      >
        <Text style={styles.shortcutIcon}>{icon}</Text>
        <View style={styles.flex}>
          <Text style={styles.shortcutTitle}>{title}</Text>
          <Text style={styles.shortcutSubtitle} numberOfLines={1}>
            {place ? place.shortAddress : 'Adicionar'}
          </Text>
        </View>
      </Pressable>
      {place && (
        <Pressable
          onPress={() => onEdit(kind)}
          accessibilityRole="button"
          accessibilityLabel={`Alterar ${title}`}
          hitSlop={8}
          style={({ pressed }) => [styles.shortcutEdit, pressed && styles.pressed]}
        >
          <Text style={styles.shortcutEditText}>✎</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    ...shadow(0.04, 8, 2, 3),
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6A00FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.55,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#151A31',
  },
  map: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#EAEFF8',
  },
  youLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '16%', // a versão web posicionava o marcador a 42% da altura
  },
  youHalo: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(106, 0, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadow(0.4, 10, 4, 4, '#6A00FF'),
  },
  youLabel: {
    marginTop: 4,
    backgroundColor: '#0B1026',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  vehicle: {
    position: 'absolute',
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(0.1, 10, 4, 3),
  },
  vehicleEmoji: {
    fontSize: 16,
  },
  vehicleEta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22005D',
    backgroundColor: '#E9DDFF',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  searchCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    ...shadow(0.12, 40, 16, 10),
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#151A31',
    marginBottom: 14,
  },
  flex: {
    flex: 1,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  pickupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B7489',
    textTransform: 'uppercase',
  },
  pickupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#151A31',
  },
  pickupWarning: {
    fontSize: 12,
    color: '#7A4A00',
  },
  locateButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F3F2FF',
  },
  locateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F4F6FA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECECFF',
  },
  searchIcon: {
    fontSize: 18,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#7B7489',
    fontWeight: '500',
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  shortcut: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortcutMain: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutEdit: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  shortcutEditText: {
    fontSize: 14,
    color: '#7B7489',
  },
  shortcutIcon: {
    fontSize: 16,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#151A31',
  },
  shortcutSubtitle: {
    fontSize: 10,
    color: '#7B7489',
  },
});
