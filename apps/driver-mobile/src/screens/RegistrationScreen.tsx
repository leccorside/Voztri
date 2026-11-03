import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VoztriColors } from '@voztri/design-tokens';
import type { CnhCategory, DriverRegistration, SelfServiceVehicleCategory } from '@voztri/shared-types';
import { Button } from '@voztri/mobile-core';
import { useDriverStore } from '../store/driverStore.js';

/** Etapas do cadastro, na ordem (veículo e documentos chegam nas próximas partes da Fase 13). */
const STEPS = ['Dados pessoais', 'CNH', 'Veículo', 'Documentos'] as const;

const CNH_CATEGORIES: CnhCategory[] = ['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'];

/** Máscara enquanto digita: 529.982.247-25. */
export function maskCpf(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** Máscara enquanto digita: 20/05/1990. */
export function maskDate(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** DD/MM/AAAA → AAAA-MM-DD (null se a data não existe, ex.: 31/02). */
export function toIsoDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (date.getUTCFullYear() !== Number(yyyy) || date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/** AAAA-MM-DD → DD/MM/AAAA (para mostrar o que já foi salvo). */
export function fromIsoDate(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

type Errors = Record<string, string | undefined>;

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  hint?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'characters';
}> = ({ label, value, onChange, error, hint, keyboardType = 'default', placeholder, autoCapitalize = 'none' }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      placeholder={placeholder}
      placeholderTextColor="#7B7489"
      accessibilityLabel={label}
      style={[styles.input, error ? styles.inputError : null]}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const PersonalStep: React.FC<{ registration: DriverRegistration; onDone: () => void }> = ({ registration, onDone }) => {
  const { savePersonalData, busy } = useDriverStore();
  const saved = registration.steps.personal.data;
  // "Usuário VOZTRI" é o nome do login, não o do motorista
  const [name, setName] = useState(saved.name === 'Usuário VOZTRI' ? '' : saved.name);
  const [cpf, setCpf] = useState(maskCpf(saved.cpf ?? ''));
  const [birth, setBirth] = useState(fromIsoDate(saved.birthDate));
  const [email, setEmail] = useState(saved.email ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);

  const edit = (field: string, setter: (v: string) => void, mask?: (v: string) => string) => (text: string) => {
    setter(mask ? mask(text) : text);
    setErrors((e) => ({ ...e, [field]: undefined }));
    setMessage(null);
  };

  const onContinue = async () => {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const birthDate = toIsoDate(birth);
    const local: Errors = {};
    if (!/^\S+(\s+\S+)+$/.test(cleanName)) local.name = 'Informe nome e sobrenome, como estão na CNH.';
    if (cpf.replace(/\D/g, '').length !== 11) local.cpf = 'O CPF tem 11 números.';
    if (!birthDate) local.birthDate = 'Informe a data de nascimento no formato DD/MM/AAAA.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    const result = await savePersonalData({
      name: cleanName,
      cpf: cpf.replace(/\D/g, ''),
      birthDate: birthDate!,
      email: email.trim() === '' ? null : email.trim().toLowerCase(),
    });
    if (result.ok) {
      onDone();
    } else {
      setErrors(result.fields);
      if (Object.keys(result.fields).length === 0) setMessage(result.message);
    }
  };

  return (
    <View>
      <Text style={styles.intro}>Use os mesmos dados da sua CNH. A VOZTRI confere tudo antes de liberar as corridas.</Text>
      <Field label="Nome completo" value={name} onChange={edit('name', setName)} error={errors.name} autoCapitalize="words" />
      <Field
        label="CPF"
        value={cpf}
        onChange={edit('cpf', setCpf, maskCpf)}
        error={errors.cpf}
        keyboardType="number-pad"
        placeholder="000.000.000-00"
      />
      <Field
        label="Data de nascimento"
        value={birth}
        onChange={edit('birthDate', setBirth, maskDate)}
        error={errors.birthDate}
        keyboardType="number-pad"
        placeholder="DD/MM/AAAA"
      />
      <Field
        label="E-mail (opcional)"
        value={email}
        onChange={edit('email', setEmail)}
        error={errors.email}
        keyboardType="email-address"
        placeholder="seu@email.com"
      />
      {message && <Text style={styles.message}>{message}</Text>}
      <Button
        label={busy ? 'Salvando…' : 'Continuar'}
        accessibilityLabel="Continuar para a CNH"
        onPress={() => void onContinue()}
        disabled={busy}
        style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
        textStyle={styles.primaryText}
      />
    </View>
  );
};

const CnhStep: React.FC<{ registration: DriverRegistration; onBack: () => void; onDone: () => void }> = ({
  registration,
  onBack,
  onDone,
}) => {
  const { saveCnh, busy } = useDriverStore();
  const saved = registration.steps.cnh.data;
  const [number, setNumber] = useState(saved.number ?? '');
  const [category, setCategory] = useState<CnhCategory | null>(saved.category);
  const [expires, setExpires] = useState(fromIsoDate(saved.expiresAt));
  const [hasEar, setHasEar] = useState(saved.hasEar);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);

  const clear = (field: string) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    setMessage(null);
  };

  const onContinue = async () => {
    const expiresAt = toIsoDate(expires);
    const local: Errors = {};
    if (!/^\d{11}$/.test(number)) local.number = 'O número da CNH (registro) tem 11 números.';
    if (!category) local.category = 'Escolha a categoria da CNH.';
    if (!expiresAt) local.expiresAt = 'Informe a validade no formato DD/MM/AAAA.';
    if (!hasEar) local.hasEar = 'Para dirigir por aplicativo, a CNH precisa ter a observação EAR (Exerce Atividade Remunerada), exigida por lei.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    const result = await saveCnh({ number, category: category!, expiresAt: expiresAt!, hasEar });
    if (result.ok) {
      onDone();
    } else {
      setErrors(result.fields);
      if (Object.keys(result.fields).length === 0) setMessage(result.message);
    }
  };

  return (
    <View>
      <Field
        label="Número da CNH (registro)"
        value={number}
        onChange={(text) => {
          setNumber(text.replace(/\D/g, '').slice(0, 11));
          clear('number');
        }}
        error={errors.number}
        keyboardType="number-pad"
        hint="São os 11 números do campo nº registro, na frente da CNH."
      />

      <View style={styles.field}>
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chips}>
          {CNH_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                setCategory(c);
                clear('category');
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === c }}
              accessibilityLabel={`Categoria ${c}`}
              style={[styles.chip, category === c ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, category === c ? styles.chipTextOn : null]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : <Text style={styles.hint}>Carro: B ou acima. Moto: A.</Text>}
      </View>

      <Field
        label="Validade da CNH"
        value={expires}
        onChange={(text) => {
          setExpires(maskDate(text));
          clear('expiresAt');
        }}
        error={errors.expiresAt}
        keyboardType="number-pad"
        placeholder="DD/MM/AAAA"
      />

      <Pressable
        onPress={() => {
          setHasEar(!hasEar);
          clear('hasEar');
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hasEar }}
        accessibilityLabel="Minha CNH tem a observação EAR"
        style={styles.check}
      >
        <View style={[styles.box, hasEar ? styles.boxOn : null]}>{hasEar && <Text style={styles.tick}>✓</Text>}</View>
        <View style={styles.checkText}>
          <Text style={styles.checkLabel}>Minha CNH tem a observação EAR</Text>
          <Text style={styles.hint}>
            "Exerce Atividade Remunerada", no campo de observações. A lei exige para dirigir por aplicativo.
          </Text>
        </View>
      </Pressable>
      {errors.hasEar && <Text style={styles.fieldError}>{errors.hasEar}</Text>}

      {message && <Text style={styles.message}>{message}</Text>}
      <Button
        label={busy ? 'Salvando…' : 'Continuar'}
        accessibilityLabel="Salvar CNH"
        onPress={() => void onContinue()}
        disabled={busy}
        style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
        textStyle={styles.primaryText}
      />
      <Button label="Voltar aos dados pessoais" onPress={onBack} style={styles.secondary} textStyle={styles.secondaryText} />
    </View>
  );
};

/** O que a categoria da CNH permite (a API confere de novo). */
export const cnhAllowsMotorcycle = (category: CnhCategory | null) => !!category && category.includes('A');
export const cnhAllowsCar = (category: CnhCategory | null) => !!category && /[BCDE]/.test(category);

/** Placa enquanto digita: só letras e números, maiúsculas, até 7 (ABC1D23). */
export const maskPlate = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

const VEHICLE_OPTIONS: { key: SelfServiceVehicleCategory; label: string; detail: string }[] = [
  { key: 'pop', label: 'Pop', detail: 'Carro com até 15 anos' },
  { key: 'black', label: 'Black', detail: 'Carro com até 8 anos' },
  { key: 'moto', label: 'Moto', detail: 'CNH categoria A' },
];

const VehicleStep: React.FC<{ registration: DriverRegistration; onBack: () => void; onDone: () => void }> = ({
  registration,
  onBack,
  onDone,
}) => {
  const { saveVehicle, busy } = useDriverStore();
  const saved = registration.steps.vehicle.data;
  const cnh = registration.steps.cnh.data.category;
  const [category, setCategory] = useState<SelfServiceVehicleCategory | null>(
    saved.category && saved.category !== 'mulher' ? saved.category : null,
  );
  const [brand, setBrand] = useState(saved.brand ?? '');
  const [model, setModel] = useState(saved.model ?? '');
  const [year, setYear] = useState(saved.year ? String(saved.year) : '');
  const [color, setColor] = useState(saved.color ?? '');
  const [plate, setPlate] = useState(saved.plate ?? '');
  const [renavam, setRenavam] = useState(saved.renavam ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);

  const allowed = (key: SelfServiceVehicleCategory) => (key === 'moto' ? cnhAllowsMotorcycle(cnh) : cnhAllowsCar(cnh));
  const edit = (field: string, setter: (v: string) => void, mask?: (v: string) => string) => (text: string) => {
    setter(mask ? mask(text) : text);
    setErrors((e) => ({ ...e, [field]: undefined }));
    setMessage(null);
  };

  const onContinue = async () => {
    const local: Errors = {};
    if (!category) local.category = 'Escolha a categoria.';
    if (brand.trim().length < 2) local.brand = 'Informe a marca.';
    if (!model.trim()) local.model = 'Informe o modelo.';
    if (!/^\d{4}$/.test(year)) local.year = 'Informe o ano com 4 números.';
    if (color.trim().length < 3) local.color = 'Informe a cor por extenso (ex.: Prata).';
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(plate)) local.plate = 'Placa inválida. Use o formato ABC1D23 (Mercosul) ou ABC1234.';
    if (!/^(\d{9}|\d{11})$/.test(renavam)) local.renavam = 'O RENAVAM tem 11 números (ou 9, nos documentos antigos).';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    const result = await saveVehicle({
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      color: color.trim(),
      plate,
      renavam,
      category: category!,
    });
    if (result.ok) {
      onDone();
    } else {
      setErrors(result.fields);
      if (Object.keys(result.fields).length === 0) setMessage(result.message);
    }
  };

  return (
    <View>
      <View style={styles.field}>
        <Text style={styles.label}>Categoria</Text>
        {VEHICLE_OPTIONS.map((option) => {
          const ok = allowed(option.key);
          const selected = category === option.key;
          return (
            <Pressable
              key={option.key}
              disabled={!ok}
              onPress={() => {
                setCategory(option.key);
                setErrors((e) => ({ ...e, category: undefined }));
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !ok }}
              accessibilityLabel={`Categoria ${option.label}`}
              style={[styles.option, selected ? styles.optionOn : null, !ok ? styles.optionOff : null]}
            >
              <Text style={[styles.optionLabel, selected ? styles.chipTextOn : null]}>{option.label}</Text>
              <Text style={[styles.optionDetail, selected ? styles.chipTextOn : null]}>
                {ok ? option.detail : `Sua CNH (${cnh ?? '—'}) não permite`}
              </Text>
            </Pressable>
          );
        })}
        {errors.category ? (
          <Text style={styles.fieldError}>{errors.category}</Text>
        ) : (
          <Text style={styles.hint}>A categoria Mulher é definida pela equipe VOZTRI na análise do cadastro.</Text>
        )}
      </View>

      <Field label="Marca" value={brand} onChange={edit('brand', setBrand)} error={errors.brand} autoCapitalize="words" placeholder="Ex.: Fiat" />
      <Field label="Modelo" value={model} onChange={edit('model', setModel)} error={errors.model} autoCapitalize="words" placeholder="Ex.: Argo" />
      <Field
        label="Ano"
        value={year}
        onChange={edit('year', setYear, (t) => t.replace(/\D/g, '').slice(0, 4))}
        error={errors.year}
        keyboardType="number-pad"
        placeholder="Ex.: 2022"
      />
      <Field label="Cor" value={color} onChange={edit('color', setColor)} error={errors.color} autoCapitalize="words" placeholder="Ex.: Prata" />
      <Field
        label="Placa"
        value={plate}
        onChange={edit('plate', setPlate, maskPlate)}
        error={errors.plate}
        autoCapitalize="characters"
        placeholder="ABC1D23"
      />
      <Field
        label="RENAVAM"
        value={renavam}
        onChange={edit('renavam', setRenavam, (t) => t.replace(/\D/g, '').slice(0, 11))}
        error={errors.renavam}
        keyboardType="number-pad"
        hint="Está no documento do veículo (CRLV)."
      />

      {message && <Text style={styles.message}>{message}</Text>}
      <Button
        label={busy ? 'Salvando…' : 'Continuar'}
        accessibilityLabel="Salvar veículo"
        onPress={() => void onContinue()}
        disabled={busy}
        style={[styles.primary, { backgroundColor: VoztriColors.brand.primary }]}
        textStyle={styles.primaryText}
      />
      <Button label="Voltar à CNH" onPress={onBack} style={styles.secondary} textStyle={styles.secondaryText} />
    </View>
  );
};

/**
 * Cadastro do motorista pelo app, no lugar do painel enquanto o status é
 * `registering`. Esta parte tem os dados pessoais, a CNH e o veículo; a etapa de
 * documentos aparece como a próxima (ainda não disponível).
 */
export const RegistrationScreen: React.FC = () => {
  const { registration, logout, loadRegistration } = useDriverStore();
  // A etapa aberta: a próxima pendente, ou a escolhida pelo motorista (voltar)
  const [step, setStep] = useState<'personal' | 'cnh' | 'vehicle' | null>(null);
  const current = step ?? registration?.nextStep ?? null;

  if (!registration) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.intro}>Carregando seu cadastro…</Text>
        <Button label="Tentar de novo" onPress={() => void loadRegistration()} textStyle={styles.secondaryText} />
      </View>
    );
  }

  const index = current === 'personal' ? 0 : current === 'cnh' ? 1 : current === 'vehicle' ? 2 : 3;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Cadastro de motorista
        </Text>
        <Button label="Sair" onPress={() => void logout()} accessibilityLabel="Sair da conta" textStyle={styles.logout} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.progress} accessibilityLabel={`Etapa ${index + 1} de ${STEPS.length}: ${STEPS[index]}`}>
          Etapa {index + 1} de {STEPS.length} · {STEPS[index]}
        </Text>
        <View style={styles.bar}>
          {STEPS.map((label, i) => (
            <View key={label} style={[styles.barPart, i <= index ? styles.barOn : null]} />
          ))}
        </View>

        {current === 'personal' && <PersonalStep registration={registration} onDone={() => setStep(null)} />}
        {current === 'cnh' && <CnhStep registration={registration} onBack={() => setStep('personal')} onDone={() => setStep(null)} />}
        {current === 'vehicle' && (
          <VehicleStep registration={registration} onBack={() => setStep('cnh')} onDone={() => setStep(null)} />
        )}
        {current === null && (
          <View>
            <Text style={styles.doneTitle}>Dados pessoais, CNH e veículo salvos ✓</Text>
            <Text style={styles.intro}>
              Falta o envio das fotos da CNH, do documento do veículo (CRLV) e de uma selfie. Essa etapa chega numa
              próxima atualização do app; seus dados ficam guardados.
            </Text>
            <Button label="Revisar dados pessoais" onPress={() => setStep('personal')} style={styles.secondary} textStyle={styles.secondaryText} />
            <Button label="Revisar CNH" onPress={() => setStep('cnh')} style={styles.secondary} textStyle={styles.secondaryText} />
            <Button label="Revisar veículo" onPress={() => setStep('vehicle')} style={styles.secondary} textStyle={styles.secondaryText} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECFF',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#151A31' },
  logout: { fontSize: 14, fontWeight: '700', color: '#494457', paddingHorizontal: 4 },
  content: { padding: 20 },
  progress: { fontSize: 13, fontWeight: '700', color: '#6A00FF', marginBottom: 8 },
  bar: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  barPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#ECECFF' },
  barOn: { backgroundColor: '#6A00FF' },
  intro: { fontSize: 14, color: '#494457', lineHeight: 20, marginBottom: 18 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#494457', marginBottom: 6 },
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
  hint: { fontSize: 12, color: '#7B7489', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 48, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ECECFF', alignItems: 'center' },
  chipOn: { backgroundColor: '#6A00FF', borderColor: '#6A00FF' },
  chipText: { fontSize: 14, fontWeight: '700', color: '#151A31' },
  chipTextOn: { color: '#FFFFFF' },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4, marginBottom: 8 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#7B7489', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: '#6A00FF', borderColor: '#6A00FF' },
  tick: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  checkText: { flex: 1 },
  checkLabel: { fontSize: 14, fontWeight: '700', color: '#151A31' },
  message: { color: '#BA1A1A', fontSize: 13, fontWeight: '700', marginTop: 8 },
  primary: { paddingVertical: 15, borderRadius: 14, marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondary: { paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: '#ECECFF', marginTop: 10 },
  secondaryText: { color: '#6A00FF', fontWeight: '800', fontSize: 15 },
  option: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ECECFF', marginBottom: 8 },
  optionOn: { backgroundColor: '#6A00FF', borderColor: '#6A00FF' },
  optionOff: { opacity: 0.45 },
  optionLabel: { fontSize: 15, fontWeight: '800', color: '#151A31' },
  optionDetail: { fontSize: 12, color: '#494457', marginTop: 2 },
  doneTitle: { fontSize: 18, fontWeight: '800', color: '#00873C', marginBottom: 10 },
});
