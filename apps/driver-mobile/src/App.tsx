import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { POLL_INTERVAL_MS } from './config.js';
import { currentToken, mediaUrl } from './api.js';
import { Banner, ProfileScreen, usePolling } from '@voztri/mobile-core';
import { useLocationTracking } from './hooks/useLocationTracking.js';
import { useDriverStore } from './store/driverStore.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { DriverDashboardScreen } from './screens/DriverDashboardScreen.js';
import { RideOfferModal } from './screens/RideOfferModal.js';
import { EnRouteNavigationScreen } from './screens/EnRouteNavigationScreen.js';
import { ValidatePinModal } from './screens/ValidatePinModal.js';
import { WeeklyEarningsScreen } from './screens/WeeklyEarningsScreen.js';
import { PixPayoutScreen } from './screens/PixPayoutScreen.js';

/** O que sai com a conta do motorista (texto da tela de exclusão). */
const DRIVER_DELETION_DETAILS =
  'Você sai do ar na hora. Apagamos seu nome, telefone, e-mail, foto, CNH, documentos enviados, chave Pix e as mensagens que você enviou no chat. Peça o repasse do saldo antes: depois da exclusão não dá mais para sacar pelo app.';

export const App: React.FC = () => {
  const {
    sessionStatus,
    isOnline,
    currentRide,
    offer,
    error,
    connectionError,
    locationWarning,
    bootstrap,
    refresh,
    acceptOffer,
    rejectOffer,
    validatePin,
    completeRide,
    dismissError,
    user,
    busy,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteAccount,
  } = useDriverStore();
  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'payout' | 'profile'>('home');
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Ofertas e corrida em andamento chegam pelo polling enquanto há o que acompanhar
  usePolling(refresh, POLL_INTERVAL_MS, sessionStatus === 'authenticated' && (isOnline || !!currentRide));

  // Posição enviada à API durante todo o turno online (inclusive em corrida)
  useLocationTracking(sessionStatus === 'authenticated' && isOnline);

  if (sessionStatus === 'checking') {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: '#0B1026' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1026" />
        <ActivityIndicator color="#C9B2FF" size="large" accessibilityLabel="Carregando" />
      </View>
    );
  }

  if (sessionStatus === 'anonymous') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#0B1026' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1026" />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  // A navegação em rota usa o tema escuro; as demais telas, o claro
  const darkScreen = !!currentRide;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: darkScreen ? '#0B1026' : '#FFFFFF' }]}>
      <StatusBar barStyle={darkScreen ? 'light-content' : 'dark-content'} backgroundColor={darkScreen ? '#0B1026' : '#FFFFFF'} />

      {connectionError && <Banner tone="warning" message={connectionError} />}
      {locationWarning && <Banner tone="warning" message={locationWarning} />}
      {error && <Banner message={error} onDismiss={dismissError} />}

      <View style={styles.content}>
        {currentRide ? (
          <EnRouteNavigationScreen onOpenPinModal={() => setShowPinModal(true)} onFinishRide={completeRide} />
        ) : activeTab === 'earnings' ? (
          <WeeklyEarningsScreen onBack={() => setActiveTab('home')} onOpenPayout={() => setActiveTab('payout')} />
        ) : activeTab === 'payout' ? (
          <PixPayoutScreen onBack={() => setActiveTab('earnings')} />
        ) : activeTab === 'profile' && user ? (
          // Ofertas continuam chegando com o perfil aberto (o modal fica por cima)
          <ProfileScreen
            user={{ name: user.name, email: user.email, phone: user.phone }}
            save={updateProfile}
            onBack={() => setActiveTab('home')}
            busy={busy}
            photo={{ uri: mediaUrl(user.avatarUrl), token: currentToken() }}
            uploadPhoto={uploadAvatar}
            removePhoto={removeAvatar}
            deleteAccount={async (confirmation) => {
              const failure = await deleteAccount(confirmation);
              if (!failure) {
                // No próximo login o app abre no painel, não no perfil
                setActiveTab('home');
                Alert.alert('Conta excluída', 'Seus dados pessoais foram apagados. Obrigado por dirigir com o VOZTRI.');
              }
              return failure;
            }}
            deletionDetails={DRIVER_DELETION_DETAILS}
          />
        ) : (
          <DriverDashboardScreen onOpenEarnings={() => setActiveTab('earnings')} onOpenProfile={() => setActiveTab('profile')} />
        )}
      </View>

      {/* Oferta de corrida recebida pelo polling */}
      {offer && !currentRide && (
        <RideOfferModal key={offer.rideId} offer={offer} onAccept={acceptOffer} onReject={rejectOffer} />
      )}

      {/* Validação do PIN de embarque na API */}
      {showPinModal && currentRide && (
        <ValidatePinModal
          onSubmit={async (pin) => {
            const ok = await validatePin(pin);
            if (ok) setShowPinModal(false);
            return ok;
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
