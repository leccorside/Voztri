import React, { useState } from 'react';
import type { User } from '@voztri/shared-types';
import { authApi, errorMessage, tokenStorage } from '../lib/api.js';

interface Props {
  onLogin: (user: User) => void;
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #D4D8F7',
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: 'none',
  backgroundColor: '#6A00FF',
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: disabled ? 'wait' : 'pointer',
  opacity: disabled ? 0.7 : 1,
});

export const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Endpoint exclusivo do painel: não cria usuário para telefone desconhecido
      const res = (await authApi.requestAdminOtp(phone)) as unknown as { debug_otp?: string | null };
      setDebugOtp(res.debug_otp ?? null);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await authApi.verifyAdminOtp(phone, code);
      // Defesa extra: o endpoint já recusa não administradores
      if (user.role !== 'admin') {
        setError('Este telefone não pertence a um administrador. O painel é restrito à equipe VOZTRI.');
        return;
      }
      tokenStorage.set(token);
      onLogin(user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0B1026 0%, #19224A 100%)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6A00FF 0%, #9B4DFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 24,
            }}
          >
            V
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#151A31', letterSpacing: '0.05em' }}>VOZTRI</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6A00FF', textTransform: 'uppercase' }}>Admin Master</div>
          </div>
        </div>

        {step === 'phone' ? (
          <form onSubmit={requestCode}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#151A31', marginBottom: 6 }}>Entrar no painel</h1>
            <p style={{ fontSize: 13, color: '#7B7489', marginBottom: 20 }}>
              Informe o telefone do administrador para receber o código de acesso.
            </p>
            <label htmlFor="phone" style={{ fontSize: 13, fontWeight: 700, color: '#494457', display: 'block', marginBottom: 6 }}>
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              minLength={10}
              style={{ ...input, marginBottom: 20 }}
            />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? 'Enviando…' : 'Receber código'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#151A31', marginBottom: 6 }}>Digite o código</h1>
            <p style={{ fontSize: 13, color: '#7B7489', marginBottom: 20 }}>
              Se {phone} for o telefone de um administrador, enviamos um código de 6 dígitos.
              {debugOtp && (
                <>
                  {' '}
                  Em desenvolvimento, o código é <strong style={{ color: '#151A31' }}>{debugOtp}</strong>.
                </>
              )}
            </p>
            <label htmlFor="code" style={{ fontSize: 13, fontWeight: 700, color: '#494457', display: 'block', marginBottom: 6 }}>
              Código de verificação
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              style={{ ...input, marginBottom: 20, letterSpacing: '0.4em', textAlign: 'center' }}
            />
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              style={{
                width: '100%',
                marginTop: 10,
                padding: 10,
                border: 'none',
                background: 'none',
                color: '#6A00FF',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Trocar telefone
            </button>
          </form>
        )}

        {error && (
          <div role="alert" style={{ marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: '#FFEBEE', color: '#B71C1C', fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
