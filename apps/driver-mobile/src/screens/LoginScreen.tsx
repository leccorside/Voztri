import React from 'react';
import { OtpLoginScreen } from '@voztri/mobile-core';
import { useDriverStore } from '../store/driverStore.js';

/** Login do motorista por código SMS (OTP): a tela comum do @voztri/mobile-core ligada ao store. */
export const LoginScreen: React.FC = () => {
  const { requestCode, login, busy, error } = useDriverStore();
  return <OtpLoginScreen role="driver" requestCode={requestCode} login={login} busy={busy} error={error} />;
};
