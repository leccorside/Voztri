import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { AddressLocation } from '@voztri/shared-types';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button } from '../ui/kit.js';

interface Props {
  onBack: () => void;
}

const SAMPLE_DESTINATIONS: AddressLocation[] = [
  {
    address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
    shortAddress: 'Av. Faria Lima, 3477',
    latitude: -23.585721,
    longitude: -46.679199,
    city: 'São Paulo',
    state: 'SP',
  },
  {
    address: 'Aeroporto de Congonhas - Vila Congonhas, São Paulo - SP',
    shortAddress: 'Aeroporto de Congonhas',
    latitude: -23.62611,
    longitude: -46.656387,
    city: 'São Paulo',
    state: 'SP',
  },
  {
    address: 'Shopping Morumbi - Av. Roque Petroni Júnior, 1089',
    shortAddress: 'Morumbi Shopping',
    latitude: -23.622591,
    longitude: -46.698971,
    city: 'São Paulo',
    state: 'SP',
  },
  {
    address: 'Parque Ibirapuera - Av. Pedro Álvares Cabral - Moema',
    shortAddress: 'Parque Ibirapuera (Portão 3)',
    latitude: -23.587416,
    longitude: -46.657634,
    city: 'São Paulo',
    state: 'SP',
  },
];

export const ChooseDestinationScreen: React.FC<Props> = ({ onBack }) => {
  const { origin, setDestination } = usePassengerStore();
  const [query, setQuery] = useState('');

  return (
    <View style={styles.screen}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Button label="←" onPress={onBack} accessibilityLabel="Voltar" textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Para onde você vai?
        </Text>
      </View>

      {/* Campos de origem e destino */}
      <View style={styles.routeFields}>
        <View style={[styles.fieldRow, { marginBottom: 12 }]}>
          <View style={[styles.marker, { borderRadius: 999, backgroundColor: '#00C853' }]} />
          <Text style={styles.origin}>{origin.shortAddress} (Sua Localização)</Text>
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.marker, { borderRadius: 2, backgroundColor: VoztriColors.brand.primary }]} />
          <TextInput
            placeholder="Digite o destino ou selecione abaixo..."
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

      {/* Sugestões */}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Destinos Recomendados</Text>

        {SAMPLE_DESTINATIONS.map((dest) => (
          <Pressable
            key={dest.shortAddress}
            onPress={() => setDestination(dest)}
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
