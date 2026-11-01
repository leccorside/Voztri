import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { PassengerState, usePassengerStore } from '../store/passengerStore.js';
import { BottomSheetModal, Button, shadow } from '../ui/kit.js';

interface Props {
  onBack: () => void;
  onConfirm: () => void;
}

type PaymentMethod = PassengerState['selectedPaymentMethod'];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix Dinâmico (Instantâneo)' },
  { value: 'credit_card', label: 'Cartão Mastercard (•••• 8492)' },
  { value: 'cash', label: 'Dinheiro em espécie' },
  { value: 'wallet', label: 'Saldo Carteira (R$ 50,00)' },
];

const CATEGORY_ICON: Record<string, string> = { pop: '🚗', black: '🚘', mulher: '🌸', moto: '🛵' };

export const CategorySelectionSheet: React.FC<Props> = ({ onBack, onConfirm }) => {
  const {
    destination,
    estimates,
    estimatesLoading,
    loadEstimates,
    selectedCategory,
    selectCategory,
    selectedPaymentMethod,
    selectPaymentMethod,
    busy,
  } = usePassengerStore();
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false);

  const currentEstimate = estimates.find((e) => e.category === selectedCategory) || estimates[0];
  const km = currentEstimate ? `${String(currentEstimate.distanceKm).replace('.', ',')} km` : '—';
  const minutes = currentEstimate ? `~${currentEstimate.estimatedMinutes} minutos` : '—';
  const paymentLabel = PAYMENT_OPTIONS.find((o) => o.value === selectedPaymentMethod)?.label ?? '';

  return (
    <View style={styles.screen}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Button label="← Alterar Destino" onPress={onBack} textStyle={styles.back} />
        <Text style={styles.destination} numberOfLines={1}>
          {destination?.shortAddress}
        </Text>
      </View>

      {/* Resumo do trajeto */}
      <View style={styles.routeSummary}>
        <Text style={styles.summaryText}>
          Distância: <Text style={{ color: '#151A31', fontWeight: '800' }}>{km}</Text>
        </Text>
        <Text style={styles.summaryText}>
          Previsão: <Text style={{ color: '#00C853', fontWeight: '800' }}>{minutes}</Text>
        </Text>
      </View>

      {/* Categorias (estimativas calculadas pela API) */}
      <ScrollView contentContainerStyle={styles.list}>
        {estimatesLoading && (
          <View style={styles.loading}>
            <ActivityIndicator color={VoztriColors.brand.primary} accessibilityLabel="Calculando preços" />
            <Text style={styles.loadingText}>Calculando preços…</Text>
          </View>
        )}
        {!estimatesLoading && estimates.length === 0 && (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Não foi possível calcular os preços.</Text>
            <Button
              label="Tentar de novo"
              onPress={() => void loadEstimates()}
              style={styles.retry}
              textStyle={[styles.retryText, { color: VoztriColors.brand.primary }]}
            />
          </View>
        )}
        {estimates.map((item) => {
          const isSelected = item.category === selectedCategory;
          return (
            <Pressable
              key={item.category}
              onPress={() => selectCategory(item.category)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.categoryName}, ${item.estimatedMinutes} minutos, ${item.formattedPrice}`}
              style={[
                styles.category,
                isSelected
                  ? { borderWidth: 2, borderColor: VoztriColors.brand.primary, backgroundColor: '#F8F4FF' }
                  : { borderWidth: 1, borderColor: '#ECECFF', backgroundColor: '#FFFFFF' },
              ]}
            >
              <View style={styles.categoryInfo}>
                <View
                  style={[styles.categoryIcon, { backgroundColor: isSelected ? VoztriColors.brand.primary : '#F3F2FF' }]}
                >
                  <Text style={styles.categoryEmoji}>{CATEGORY_ICON[item.category] ?? '🚗'}</Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryName}>{item.categoryName}</Text>
                    <Text style={styles.categoryEta}>• {item.estimatedMinutes} min</Text>
                  </View>
                  <Text style={styles.categoryDescription}>{item.description}</Text>
                </View>
              </View>
              <Text style={[styles.price, { color: isSelected ? VoztriColors.brand.primary : '#151A31' }]}>
                {item.formattedPrice}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pagamento e confirmação */}
      <View style={styles.footer}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Forma de Pagamento</Text>
          <Pressable
            onPress={() => setPaymentPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Forma de pagamento: ${paymentLabel}. Toque para alterar`}
            style={({ pressed }) => [styles.paymentSelect, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.paymentValue} numberOfLines={1}>
              {paymentLabel} ▾
            </Text>
          </Pressable>
        </View>

        <Button
          label={
            busy
              ? 'SOLICITANDO…'
              : currentEstimate
                ? `SOLICITAR ${currentEstimate.categoryName.toUpperCase()} • ${currentEstimate.formattedPrice}`
                : 'SOLICITAR'
          }
          onPress={onConfirm}
          disabled={busy || !currentEstimate}
          style={[styles.confirm, { backgroundColor: VoztriColors.brand.primary }]}
          textStyle={styles.confirmText}
        />
      </View>

      {/* Seletor de pagamento (substitui o <select> da versão web) */}
      {paymentPickerOpen && (
        <BottomSheetModal onClose={() => setPaymentPickerOpen(false)}>
          <Text style={styles.pickerTitle} accessibilityRole="header">
            Forma de Pagamento
          </Text>
          <View accessibilityRole="radiogroup">
            {PAYMENT_OPTIONS.map((option) => {
              const isSelected = option.value === selectedPaymentMethod;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    selectPaymentMethod(option.value);
                    setPaymentPickerOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                  style={({ pressed }) => [
                    styles.pickerOption,
                    isSelected && { borderColor: VoztriColors.brand.primary, backgroundColor: '#F8F4FF' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.pickerOptionText, isSelected && { color: VoztriColors.brand.primary }]}>
                    {option.label}
                  </Text>
                  {isSelected && <Text style={[styles.check, { color: VoztriColors.brand.primary }]}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetModal>
      )}
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
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
  },
  back: {
    fontSize: 16,
    fontWeight: '700',
    color: '#151A31',
  },
  destination: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#151A31',
  },
  routeSummary: {
    backgroundColor: '#F8F9FE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryText: {
    fontSize: 12,
    color: '#7B7489',
    fontWeight: '600',
  },
  list: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loading: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#7B7489',
  },
  retry: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ECECFF',
  },
  retryText: {
    fontWeight: '700',
    fontSize: 13,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#151A31',
  },
  categoryEta: {
    fontSize: 11,
    color: '#7B7489',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#7B7489',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#ECECFF',
    backgroundColor: '#FFFFFF',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7B7489',
    textTransform: 'uppercase',
  },
  paymentSelect: {
    flexShrink: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECECFF',
    backgroundColor: '#F8F9FE',
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#151A31',
  },
  confirm: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    ...shadow(0.4, 24, 8, 8, '#6A00FF'),
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#151A31',
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECFF',
    marginBottom: 10,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#151A31',
  },
  check: {
    fontSize: 16,
    fontWeight: '800',
  },
});
