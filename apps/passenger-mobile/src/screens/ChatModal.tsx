import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { POLL_INTERVAL_MS } from '../config.js';
import { usePolling } from '../hooks/usePolling.js';
import { usePassengerStore } from '../store/passengerStore.js';
import { Button, shadow } from '../ui/kit.js';

interface Props {
  onClose: () => void;
}

const QUICK_REPLIES = ['Estou no portão', 'Estou descendo', 'OK, obrigado!'];

export const ChatModal: React.FC<Props> = ({ onClose }) => {
  const { chatMessages, sendChat, loadChat, activeRide, busy } = usePassengerStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Histórico ao abrir e novas mensagens do motorista enquanto o chat está aberto
  usePolling(loadChat, POLL_INTERVAL_MS, true);

  const driverName = activeRide?.driver?.user?.name ?? 'Motorista';
  const driverInitials = driverName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendChat(text);
  };

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* No iOS o teclado empurra o painel; no Android o adjustResize da Activity já faz isso */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={[styles.avatarText, { color: VoztriColors.brand.primary }]}>{driverInitials}</Text>
              </View>
              <View>
                <Text style={styles.name}>{driverName}</Text>
                <Text style={styles.status}>Seu motorista nesta corrida</Text>
              </View>
            </View>
            <Button label="✕" onPress={onClose} accessibilityLabel="Fechar chat" textStyle={styles.close} />
          </View>

          {/* Mensagens */}
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {chatMessages.length === 0 && (
              <Text style={styles.empty}>Nenhuma mensagem ainda. Avise o motorista se precisar.</Text>
            )}
            {chatMessages.map((msg) => {
              const isMe = msg.senderRole === 'passenger';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.bubble,
                    isMe
                      ? { alignSelf: 'flex-end', backgroundColor: VoztriColors.brand.primary, borderBottomRightRadius: 4 }
                      : { alignSelf: 'flex-start', backgroundColor: '#F3F2FF', borderBottomLeftRadius: 4 },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isMe ? '#FFFFFF' : '#151A31' }]}>{msg.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Respostas rápidas */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickBar}
            contentContainerStyle={styles.quickReplies}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_REPLIES.map((reply) => (
              <Button
                key={reply}
                label={reply}
                onPress={() => void sendChat(reply)}
                disabled={busy}
                style={styles.chip}
                textStyle={styles.chipText}
              />
            ))}
          </ScrollView>

          {/* Campo de mensagem */}
          <View style={styles.inputBar}>
            <TextInput
              placeholder="Digite sua mensagem para o motorista..."
              placeholderTextColor="#7B7489"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => void handleSend()}
              returnKeyType="send"
              blurOnSubmit={false}
              accessibilityLabel="Mensagem para o motorista"
              style={styles.input}
            />
            <Button
              label="Enviar"
              onPress={() => void handleSend()}
              disabled={busy || !input.trim()}
              style={[styles.send, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.sendText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 16, 38, 0.75)',
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '75%',
    overflow: 'hidden',
    ...shadow(0.25, 40, -10, 16, '#000000'),
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#ECECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#151A31',
  },
  status: {
    fontSize: 11,
    color: '#00C853',
    fontWeight: '700',
  },
  close: {
    fontSize: 18,
    color: '#7B7489',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  messages: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  empty: {
    fontSize: 13,
    color: '#7B7489',
    textAlign: 'center',
    paddingVertical: 24,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    ...shadow(0.04, 6, 2, 1),
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickBar: {
    flexGrow: 0,
    backgroundColor: '#FBF8FF',
  },
  quickReplies: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ECECFF',
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    color: '#151A31',
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECFF',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECFF',
    fontSize: 14,
    color: '#151A31',
    backgroundColor: '#F8F9FE',
  },
  send: {
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
