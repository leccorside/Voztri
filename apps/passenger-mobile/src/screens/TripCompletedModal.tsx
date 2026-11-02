import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '@voztri/mobile-core';

interface Props {
  onFinish: (evaluation: { rating: number; tipCents?: number; tags?: string[] }) => Promise<void>;
}

const TIPS = [2, 5, 10];
const TAGS = ['Direção Segura', 'Carro Limpo', 'Ótima Conversa', 'Música Boa'];

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão',
  cash: 'Dinheiro',
  wallet: 'Saldo da carteira',
};

export const TripCompletedModal: React.FC<Props> = ({ onFinish }) => {
  const { activeRide, busy } = usePassengerStore();
  const [rating, setRating] = useState(5);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) =>
    setSelectedTags((tags) => (tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]));

  const submit = () =>
    onFinish({ rating, tipCents: selectedTip ? selectedTip * 100 : undefined, tags: selectedTags });

  const driverFirstName = activeRide?.driver?.user?.name?.split(' ')[0] ?? 'o motorista';

  return (
    // Fechar pelo "voltar" do Android equivale a concluir sem alterar a avaliação
    <Modal transparent visible animationType="slide" onRequestClose={() => void submit()} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Confirmação de chegada */}
            <View style={styles.success}>
              <View style={styles.successIcon}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
              <Text style={styles.title} accessibilityRole="header">
                Você chegou ao seu destino!
              </Text>
              <Text style={styles.subtitle}>Esperamos que tenha tido uma excelente viagem.</Text>
            </View>

            {/* Recibo */}
            <View style={styles.receipt}>
              <View style={[styles.rowBetween, { marginBottom: 8 }]}>
                <Text style={styles.receiptLabel}>Valor da Corrida</Text>
                <Text style={styles.receiptValue}>{activeRide?.formattedPrice ?? '—'}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.paymentLabel}>Forma de Pagamento</Text>
                <Text style={styles.paymentValue}>
                  {activeRide ? PAYMENT_LABEL[activeRide.paymentMethod] ?? activeRide.paymentMethod : '—'}
                </Text>
              </View>
            </View>

            {/* Avaliação por estrelas */}
            <View style={styles.ratingBlock}>
              <Text style={styles.question}>Como foi a viagem com {driverFirstName}?</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                    accessibilityState={{ selected: star <= rating }}
                    hitSlop={4}
                  >
                    {({ pressed }) => (
                      <Text
                        style={[
                          styles.star,
                          { color: star <= rating ? '#FFAB00' : '#DDE1FF' },
                          pressed && { transform: [{ scale: 1.15 }] },
                        ]}
                      >
                        ★
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Gorjeta */}
            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>Adicionar gorjeta para o motorista (opcional):</Text>
              <View style={styles.tips}>
                {TIPS.map((amount) => {
                  const isSelected = selectedTip === amount;
                  return (
                    <Button
                      key={amount}
                      label={`+ R$ ${amount},00`}
                      onPress={() => setSelectedTip(isSelected ? null : amount)}
                      style={[
                        styles.tip,
                        isSelected
                          ? { borderWidth: 2, borderColor: VoztriColors.brand.primary, backgroundColor: '#F3F2FF' }
                          : { borderWidth: 1, borderColor: '#ECECFF', backgroundColor: '#FFFFFF' },
                      ]}
                      textStyle={[styles.tipText, { color: isSelected ? VoztriColors.brand.primary : '#151A31' }]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Elogios */}
            <View style={styles.tags}>
              {TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={tag}
                  >
                    <Text style={[styles.tag, selected && { backgroundColor: '#F3F2FF', color: VoztriColors.brand.primary }]}>
                      {selected ? '✓ ' : ''}
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Concluir */}
            <Button
              label={busy ? 'ENVIANDO…' : 'CONCLUIR AVALIAÇÃO'}
              accessibilityLabel="CONCLUIR AVALIAÇÃO"
              onPress={() => void submit()}
              disabled={busy}
              style={[styles.submit, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.submitText}
            />
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadow(0.3, 40, -10, 16, '#000000'),
  },
  content: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  success: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successCheck: {
    color: '#00C853',
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#151A31',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#7B7489',
    textAlign: 'center',
  },
  receipt: {
    backgroundColor: '#F8F9FE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ECECFF',
  },
  receiptLabel: {
    fontSize: 14,
    color: '#7B7489',
  },
  receiptValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#151A31',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#7B7489',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00C853',
  },
  ratingBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    color: '#151A31',
    marginBottom: 8,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  star: {
    fontSize: 34,
  },
  tipBlock: {
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#151A31',
    marginBottom: 8,
  },
  tips: {
    flexDirection: 'row',
    gap: 10,
  },
  tip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tipText: {
    fontWeight: '800',
    fontSize: 14,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#F4F6FA',
    fontSize: 12,
    fontWeight: '600',
    color: '#494457',
  },
  submit: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    ...shadow(0.4, 24, 8, 8, '#6A00FF'),
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
