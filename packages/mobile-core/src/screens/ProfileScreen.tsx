import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import { Button, formatPhone } from '../ui/kit.js';
import { Avatar } from '../ui/Avatar.js';
import { pickPhoto, type PickedPhoto } from '../media.js';

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
  /** Foto atual (endereço completo) e o token para carregá-la (a API exige login). */
  photo: { uri: string | null; token: string | null };
  /** Envia a foto escolhida; devolve null ou a mensagem de erro. */
  uploadPhoto: (photo: PickedPhoto) => Promise<string | null>;
  /** Tira a foto; devolve null ou a mensagem de erro. */
  removePhoto: () => Promise<string | null>;
  /**
   * Exclui a conta com a palavra digitada; devolve null (a sessão já foi encerrada) ou
   * a mensagem de erro. O que é apagado e o que fica é explicado na tela.
   */
  deleteAccount: (confirmation: string) => Promise<string | null>;
  /** Texto do que é apagado, próprio de cada app (passageiro ou motorista). */
  deletionDetails: string;
}

/** Palavra que a API exige para excluir a conta. */
export const DELETE_ACCOUNT_WORD = 'EXCLUIR';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Meu perfil": nome e e-mail editáveis e o telefone da conta (só leitura), comum aos dois apps. */
export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  save,
  onBack,
  busy,
  photo,
  uploadPhoto,
  removePhoto,
  deleteAccount,
  deletionDetails,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteConfirmed = deleteWord.trim().toUpperCase() === DELETE_ACCOUNT_WORD;

  const confirmDelete = async () => {
    setDeleteError(null);
    setDeleteBusy(true);
    const failure = await deleteAccount(DELETE_ACCOUNT_WORD);
    // Com sucesso a sessão acabou e o app já trocou de tela: nada mais a atualizar
    if (failure) {
      setDeleteBusy(false);
      setDeleteError(failure);
    }
  };

  const cancelDelete = () => {
    setDeleting(false);
    setDeleteWord('');
    setDeleteError(null);
  };

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const changePhoto = async (source: 'camera' | 'library') => {
    setPhotoMessage(null);
    const picked = await pickPhoto(source);
    if (picked.status === 'cancelled') return;
    if (picked.status === 'error') {
      setPhotoMessage({ text: picked.message, ok: false });
      return;
    }
    setPhotoBusy(true);
    const failure = await uploadPhoto(picked.photo);
    setPhotoBusy(false);
    setPhotoMessage(failure ? { text: failure, ok: false } : { text: 'Foto atualizada.', ok: true });
  };

  const dropPhoto = async () => {
    setPhotoMessage(null);
    setPhotoBusy(true);
    const failure = await removePhoto();
    setPhotoBusy(false);
    setPhotoMessage(failure ? { text: failure, ok: false } : { text: 'Foto removida.', ok: true });
  };

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
        {/* Foto do perfil: o motorista e o passageiro da corrida a veem */}
        <View style={styles.photoSection}>
          <Avatar name={user.name} uri={photo.uri} token={photo.token} size={96} />
          <View style={styles.photoActions}>
            <Button
              label="Tirar foto"
              onPress={() => void changePhoto('camera')}
              disabled={photoBusy}
              style={styles.photoButton}
              textStyle={[styles.photoButtonText, { color: VoztriColors.brand.primary }]}
            />
            <Button
              label="Escolher da galeria"
              onPress={() => void changePhoto('library')}
              disabled={photoBusy}
              style={styles.photoButton}
              textStyle={[styles.photoButtonText, { color: VoztriColors.brand.primary }]}
            />
            {photo.uri && (
              <Button
                label="Remover foto"
                onPress={() => void dropPhoto()}
                disabled={photoBusy}
                style={styles.photoButton}
                textStyle={[styles.photoButtonText, styles.removeText]}
              />
            )}
          </View>
        </View>
        {photoBusy && (
          <View style={styles.photoBusy} accessibilityLiveRegion="polite">
            <ActivityIndicator color={VoztriColors.brand.primary} />
            <Text style={styles.hint}>Enviando…</Text>
          </View>
        )}
        {photoMessage && (
          <Text style={photoMessage.ok ? styles.saved : styles.message} accessibilityLiveRegion="polite">
            {photoMessage.text}
          </Text>
        )}
        <Text style={[styles.hint, styles.photoHint]}>
          Sua foto aparece para o motorista ou o passageiro da sua corrida. A localização gravada na foto é removida.
        </Text>

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

        {/* Exclusão da conta (exigida pela Google Play e pela App Store) */}
        <View style={styles.dangerZone}>
          {!deleting ? (
            <Button
              label="Excluir conta"
              onPress={() => setDeleting(true)}
              style={styles.photoButton}
              textStyle={[styles.photoButtonText, styles.removeText]}
            />
          ) : (
            <View accessibilityLabel="Confirmar exclusão da conta">
              <Text style={styles.dangerTitle} accessibilityRole="header">
                Excluir sua conta?
              </Text>
              <Text style={styles.dangerText}>{deletionDetails}</Text>
              <Text style={styles.dangerText}>
                As corridas e os valores ficam guardados sem o seu nome, porque a lei exige o registro fiscal. Isso não
                pode ser desfeito: para usar o VOZTRI de novo, você cria uma conta nova com o mesmo telefone.
              </Text>
              <Text style={styles.label}>Digite {DELETE_ACCOUNT_WORD} para confirmar</Text>
              <TextInput
                value={deleteWord}
                onChangeText={(text) => {
                  setDeleteWord(text);
                  setDeleteError(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                editable={!deleteBusy}
                accessibilityLabel={`Digite ${DELETE_ACCOUNT_WORD} para confirmar`}
                style={styles.input}
              />
              {deleteError && (
                <Text style={[styles.message, styles.dangerError]} accessibilityLiveRegion="assertive">
                  {deleteError}
                </Text>
              )}
              <Button
                label={deleteBusy ? 'Excluindo…' : 'Excluir minha conta'}
                onPress={() => void confirmDelete()}
                disabled={!deleteConfirmed || deleteBusy}
                style={[styles.primary, styles.dangerButton, !deleteConfirmed ? styles.dangerButtonOff : null]}
                textStyle={styles.primaryText}
              />
              <Button
                label="Cancelar"
                onPress={cancelDelete}
                disabled={deleteBusy}
                accessibilityLabel="Cancelar exclusão"
                style={styles.cancelDelete}
                textStyle={[styles.photoButtonText, { color: '#494457' }]}
              />
            </View>
          )}
        </View>
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
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  photoActions: {
    flex: 1,
    alignItems: 'flex-start',
  },
  photoButton: {
    paddingVertical: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeText: {
    color: '#BA1A1A',
  },
  photoBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  photoHint: {
    marginTop: 0,
    marginBottom: 20,
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
  dangerZone: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECECFF',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#BA1A1A',
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 13,
    color: '#494457',
    lineHeight: 19,
    marginBottom: 10,
  },
  dangerError: {
    marginTop: 10,
    marginBottom: 0,
  },
  dangerButton: {
    backgroundColor: '#BA1A1A',
    marginTop: 14,
  },
  dangerButtonOff: {
    opacity: 0.45,
  },
  cancelDelete: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
