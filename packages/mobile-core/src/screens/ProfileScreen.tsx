import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { Button, formatPhone } from '../ui/kit.js';

/** Campos editáveis do perfil (os mesmos do PUT /auth/profile usados pelos apps). */
export interface ProfileFields {
  name: string;
  email: string | null;
}

/** Resultado do salvar: ok, ou a mensagem geral e as mensagens por campo (422). */
export type ProfileSaveResult = { ok: true } | { ok: false; message: string; fields: Partial<Record<keyof ProfileFields, string>> };

export interface ProfileScreenProps {
  user: ProfileFields & { phone: string };
  /** Recebe só os campos alterados (o e-mail apagado vai como null). */
  save: (changes: Partial<ProfileFields>) => Promise<ProfileSaveResult>;
  onBack: () => void;
  busy: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Meu perfil": nome e e-mail editáveis e o telefone da conta (só leitura), comum aos dois apps. */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, save, onBack, busy }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFields, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const cleanEmail = email.trim().toLowerCase();

  const changes: Partial<ProfileFields> = {};
  if (cleanName !== user.name) changes.name = cleanName;
  if (cleanEmail !== (user.email ?? '')) changes.email = cleanEmail === '' ? null : cleanEmail;
  const changed = Object.keys(changes).length > 0;

  // Mesmas regras da API, para avisar antes de enviar
  const localErrors: Partial<Record<keyof ProfileFields, string>> = {};
  if (cleanName.length < 2) localErrors.name = cleanName ? 'O nome precisa ter pelo menos 2 letras.' : 'Informe seu nome.';
  if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) localErrors.email = 'Informe um e-mail válido.';

  const onSave = async () => {
    setMessage(null);
    setSaved(false);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }
    const result = await save(changes);
    if (result.ok) {
      setErrors({});
      setSaved(true);
    } else {
      setErrors(result.fields);
      // Com mensagem por campo, ela já aparece embaixo do campo
      setMessage(Object.keys(result.fields).length > 0 ? null : result.message);
    }
  };

  const edit = (field: keyof ProfileFields, setter: (text: string) => void) => (text: string) => {
    setter(text);
    setSaved(false);
    setMessage(null);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Button label="←" onPress={onBack} accessibilityLabel="Voltar" textStyle={styles.back} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          Meu perfil
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={edit('name', setName)}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={100}
            accessibilityLabel="Nome"
            style={[styles.input, errors.name ? styles.inputError : null]}
          />
          {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail (opcional)</Text>
          <TextInput
            value={email}
            onChangeText={edit('email', setEmail)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            maxLength={255}
            placeholder="seu@email.com"
            placeholderTextColor="#7B7489"
            accessibilityLabel="E-mail"
            style={[styles.input, errors.email ? styles.inputError : null]}
          />
          {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefone</Text>
          <Text style={styles.readOnly} accessibilityLabel={`Telefone ${formatPhone(user.phone)}`}>
            {formatPhone(user.phone)}
          </Text>
          <Text style={styles.hint}>É o número que você usa para entrar. Ele não pode ser trocado por aqui.</Text>
        </View>

        {message && (
          <Text style={styles.message} accessibilityLiveRegion="assertive">
            {message}
          </Text>
        )}
        {saved && (
          <Text style={styles.saved} accessibilityLiveRegion="polite">
            Perfil atualizado.
          </Text>
        )}

        <Button
          label={busy ? 'Salvando…' : 'Salvar'}
          accessibilityLabel="Salvar perfil"
          onPress={() => void onSave()}
          disabled={busy || !changed}
          style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
          textStyle={styles.primaryText}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#494457',
    marginBottom: 6,
  },
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
  inputError: {
    borderColor: '#BA1A1A',
    borderWidth: 2,
  },
  fieldError: {
    color: '#BA1A1A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  readOnly: {
    fontSize: 15,
    fontWeight: '600',
    color: '#151A31',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F4F6FA',
  },
  hint: {
    fontSize: 12,
    color: '#7B7489',
    marginTop: 6,
  },
  message: {
    color: '#BA1A1A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  saved: {
    color: '#00873C',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  primary: {
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
