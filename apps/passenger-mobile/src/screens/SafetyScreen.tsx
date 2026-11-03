import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { Button, formatPhone } from '@voztri/mobile-core';
import { usePassengerStore } from '../store/passengerStore.js';

/** Mesmo limite da API (TrustedContactController::MAX_CONTACTS). */
export const MAX_TRUSTED_CONTACTS = 5;

/** Máscara do celular enquanto digita: (11) 98765-4321. */
function maskPhone(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Segurança do passageiro: contatos de confiança (recebem um SMS quando o SOS é
 * acionado, com o local, o carro e a placa) e a troca do PIN de emergência.
 */
export const SafetyScreen: React.FC = () => {
  const { trustedContacts, addTrustedContact, removeTrustedContact, setSafetyOpen, setChangingPin } = usePassengerStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone', string>>>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const full = (trustedContacts?.length ?? 0) >= MAX_TRUSTED_CONTACTS;
  const digits = phone.replace(/\D/g, '');

  const onAdd = async () => {
    setMessage(null);
    const local: typeof errors = {};
    if (name.trim().length < 2) local.name = name.trim() ? 'O nome precisa ter pelo menos 2 letras.' : 'Informe o nome do contato.';
    if (digits.length !== 11 || digits[2] !== '9') local.phone = 'Informe um celular com DDD, ex.: (11) 98765-4321.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    setSaving(true);
    const result = await addTrustedContact(name.trim(), digits);
    setSaving(false);
    if (result.ok) {
      setName('');
      setPhone('');
      setErrors({});
      setMessage({ text: 'Contato adicionado.', ok: true });
    } else {
      setErrors(result.fields);
      if (Object.keys(result.fields).length === 0) setMessage({ text: result.message, ok: false });
    }
  };

  const onRemove = async (id: string) => {
    setMessage(null);
    const failure = await removeTrustedContact(id);
    setMessage(failure ? { text: failure, ok: false } : { text: 'Contato removido.', ok: true });
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Button label="←" onPress={() => setSafetyOpen(false)} accessibilityLabel="Voltar" textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Segurança
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Contatos de confiança
        </Text>
        <Text style={styles.hint}>
          Se você acionar o SOS numa corrida, eles recebem um SMS com o local, o carro e a placa. Quando você desativa o
          alerta com o PIN, recebem outro avisando que acabou. Até {MAX_TRUSTED_CONTACTS} pessoas.
        </Text>

        {trustedContacts === null ? (
          <ActivityIndicator color={VoztriColors.brand.primary} style={styles.loading} accessibilityLabel="Carregando contatos" />
        ) : trustedContacts.length === 0 ? (
          <Text style={styles.empty}>Nenhum contato ainda. Adicione alguém da família ou um amigo.</Text>
        ) : (
          trustedContacts.map((contact) => (
            <View key={contact.id} style={styles.contact}>
              <View style={styles.contactText}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{formatPhone(contact.phone)}</Text>
              </View>
              <Button
                label="Remover"
                onPress={() => void onRemove(contact.id)}
                accessibilityLabel={`Remover ${contact.name}`}
                textStyle={styles.remove}
              />
            </View>
          ))
        )}

        {message && (
          <Text style={message.ok ? styles.saved : styles.error} accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        )}

        {full ? (
          <Text style={styles.hint}>Você chegou ao limite de {MAX_TRUSTED_CONTACTS} contatos. Remova um para adicionar outro.</Text>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((e) => ({ ...e, name: undefined }));
              }}
              autoCapitalize="words"
              maxLength={100}
              placeholder="Ex.: Maria (mãe)"
              placeholderTextColor="#7B7489"
              accessibilityLabel="Nome do contato"
              style={[styles.input, errors.name ? styles.inputError : null]}
            />
            {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

            <Text style={[styles.label, styles.labelSpaced]}>Celular</Text>
            <TextInput
              value={phone}
              onChangeText={(text) => {
                setPhone(maskPhone(text));
                setErrors((e) => ({ ...e, phone: undefined }));
              }}
              keyboardType="phone-pad"
              placeholder="(11) 98765-4321"
              placeholderTextColor="#7B7489"
              accessibilityLabel="Celular do contato"
              style={[styles.input, errors.phone ? styles.inputError : null]}
            />
            {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}

            <Button
              label={saving ? 'Adicionando…' : 'Adicionar contato'}
              accessibilityLabel="Adicionar contato"
              onPress={() => void onAdd()}
              disabled={saving}
              style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
              textStyle={styles.primaryText}
            />
          </View>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          PIN de emergência
        </Text>
        <Text style={styles.hint}>É com ele que você desativa o alerta SOS. Só você deve saber.</Text>
        <Button
          label="Trocar PIN de emergência"
          onPress={() => setChangingPin(true)}
          style={styles.secondary}
          textStyle={[styles.secondaryText, { color: VoztriColors.brand.primary }]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
  },
  back: { fontSize: 20, fontWeight: '700', color: '#151A31', paddingHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#151A31' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#151A31', marginBottom: 6 },
  hint: { fontSize: 13, color: '#494457', lineHeight: 19, marginBottom: 14 },
  loading: { marginVertical: 16 },
  empty: { fontSize: 13, color: '#7B7489', marginBottom: 14 },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F0F7',
  },
  contactText: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '700', color: '#151A31' },
  contactPhone: { fontSize: 13, color: '#494457', marginTop: 2 },
  remove: { color: '#BA1A1A', fontSize: 13, fontWeight: '700', paddingHorizontal: 4 },
  form: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#494457', marginBottom: 6 },
  labelSpaced: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ECECFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#151A31',
    backgroundColor: '#FBF8FF',
  },
  inputError: { borderColor: '#BA1A1A', borderWidth: 2 },
  fieldError: { color: '#BA1A1A', fontSize: 12, fontWeight: '700', marginTop: 6 },
  saved: { color: '#00873C', fontSize: 13, fontWeight: '700', marginTop: 12 },
  error: { color: '#BA1A1A', fontSize: 13, fontWeight: '700', marginTop: 12 },
  primary: { paddingVertical: 15, borderRadius: 14, marginTop: 18 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#ECECFF', marginVertical: 24 },
  secondary: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ECECFF' },
  secondaryText: { fontWeight: '800', fontSize: 15 },
});
