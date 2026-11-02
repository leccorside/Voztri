import React from 'react';
import { OtpLoginScreen } from '@voztri/mobile-core';
import { usePassengerStore } from '../store/passengerStore.js';

/** Login do passageiro por código SMS (OTP): a tela comum do @voztri/mobile-core ligada ao store. */
export const LoginScreen: React.FC = () => {
  const { requestCode, login, busy, error } = usePassengerStore();
  return <OtpLoginScreen role="passenger" requestCode={requestCode} login={login} busy={busy} error={error} />;
};
