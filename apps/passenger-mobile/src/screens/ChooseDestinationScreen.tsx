import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button } from '@voztri/mobile-core';
import { MIN_SEARCH_LENGTH, useDestinationSearch } from '../hooks/useDestinationSearch.js';
import { PLACE_LABELS } from './HomeScreen.js';

interface Props {
  onBack: () => void;
}

export const ChooseDestinationScreen: React.FC<Props> = ({ onBack }) => {
  const { origin, setDestination, placePicker, savedPlaces, savePlace, removePlace, busy } = usePassengerStore();
  // Escolhendo o endereço de Casa ou do Trabalho (em vez do destino da corrida)
  const picking = placePicker ? PLACE_LABELS[placePicker] : null;
  const current = placePicker ? savedPlaces?.[placePicker] ?? null : null;
  const placeName = placePicker === 'home' ? 'de Casa' : 'do Trabalho';
  const [query, setQuery] = useState('');
  // Destinos pelo texto (API → Photon), perto do embarque
  const { status, results, retry } = useDestinationSearch(query, origin);
  const term = query.trim();

  return (
    <View style={styles.screen}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Button label="←" onPress={onBack} accessibilityLabel="Voltar" textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          {picking ? `Endereço ${placeName}` : 'Para onde você vai?'}
        </Text>
      </View>

      {/* Campos de origem e destino */}
      <View style={styles.routeFields}>
        {picking ? (
          <Text style={styles.pickHint}>
            {current ? `Atual: ${current.shortAddress}. ` : ''}Busque o novo endereço {placeName} e toque nele para salvar.
          </Text>
        ) : (
          <View style={[styles.fieldRow, { marginBottom: 12 }]}>
            <View style={[styles.marker, { borderRadius: 999, backgroundColor: '#00C853' }]} />
            <Text style={styles.origin}>{origin.shortAddress} (Sua Localização)</Text>
          </View>
        )}

        <View style={styles.fieldRow}>
          <View style={[styles.marker, { borderRadius: 2, backgroundColor: VoztriColors.brand.primary }]} />
          <TextInput
            placeholder={picking ? `Endereço ${placeName}` : 'Digite o endereço ou o nome do lugar'}
            placeholderTextColor="#7B7489"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Destino"
            style={[styles.input, { borderColor: VoztriColors.brand.primary }]}
          />
        </View>
      </View>

      {/* Resultados da busca */}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {picking && current && (
          <Button
            label={`Remover endereço ${placeName}`}
            onPress={() => placePicker && void removePlace(placePicker)}
            disabled={busy}
            style={styles.remove}
            textStyle={styles.removeText}
          />
        )}

        {status === 'idle' && (
          <Text style={styles.empty}>Digite pelo menos {MIN_SEARCH_LENGTH} letras do endereço ou do nome do lugar.</Text>
        )}

        {status === 'loading' && (
          <View style={styles.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator color={VoztriColors.brand.primary} />
            <Text style={styles.empty}>Buscando…</Text>
          </View>
        )}

        {status === 'error' && (
          <View accessibilityLiveRegion="polite">
            <Text style={styles.empty}>Não foi possível buscar endereços agora.</Text>
            <Button
              label="Tentar de novo"
              onPress={retry}
              style={styles.retry}
              textStyle={[styles.retryText, { color: VoztriColors.brand.primary }]}
            />
          </View>
        )}

        {status === 'done' && results.length === 0 && (
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            Nenhum endereço encontrado para “{term}”.
          </Text>
        )}

        {status === 'done' && results.length > 0 && <Text style={styles.sectionTitle}>Resultados</Text>}

        {status === 'done' &&
          results.map((dest, i) => (
            <Pressable
              key={`${dest.latitude},${dest.longitude},${i}`}
              onPress={() => (placePicker ? void savePlace(placePicker, dest) : void setDestination(dest))}
              accessibilityRole="button"
              accessibilityLabel={`${dest.shortAddress}, ${dest.address}`}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.pinCircle}>
                <Text style={styles.pin}>📍</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.suggestionTitle}>{dest.shortAddress}</Text>
                <Text style={styles.suggestionAddress}>{dest.address}</Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
  },
  back: {
    fontSize: 20,
    fontWeight: '700',
    color: '#151A31',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#151A31',
  },
  routeFields: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F6FA',
    backgroundColor: '#FBF8FF',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marker: {
    width: 10,
    height: 10,
  },
  origin: {
    flex: 1,
    backgroundColor: '#ECECFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    overflow: 'hidden',
    fontSize: 13,
    color: '#151A31',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#151A31',
    backgroundColor: '#FFFFFF',
  },
  list: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B7489',
    textTransform: 'uppercase',
    marginVertical: 10,
  },
  empty: {
    fontSize: 14,
    color: '#7B7489',
    paddingVertical: 16,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickHint: {
    fontSize: 13,
    color: '#7B7489',
    marginBottom: 12,
  },
  remove: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  removeText: {
    color: '#BA1A1A',
    fontWeight: '700',
    fontSize: 14,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  retryText: {
    fontWeight: '700',
    fontSize: 14,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F6FA',
  },
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#F3F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    fontSize: 18,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#151A31',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#7B7489',
  },
});
