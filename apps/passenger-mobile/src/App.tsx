import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { POLL_INTERVAL_MS } from './config.js';
import { currentToken, mediaUrl } from './api.js';
import { Banner, ProfileScreen, usePolling } from '@voztri/mobile-core';
import { usePassengerStore } from './store/passengerStore.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ChooseDestinationScreen } from './screens/ChooseDestinationScreen.js';
import { CategorySelectionSheet } from './screens/CategorySelectionSheet.js';
import { SearchingDriverScreen } from './screens/SearchingDriverScreen.js';
import { DriverEnRouteScreen } from './screens/DriverEnRouteScreen.js';
import { ChatModal } from './screens/ChatModal.js';
import { SosModal } from './screens/SosModal.js';
import { TripCompletedModal } from './screens/TripCompletedModal.js';
import { EmergencyPinScreen } from './screens/EmergencyPinScreen.js';

/** O que sai com a conta do passageiro (texto da tela de exclusão). */
const PASSENGER_DELETION_DETAILS =
  'Apagamos seu nome, telefone, e-mail, foto, Casa e Trabalho, destinos recentes, PIN de emergência, contatos de confiança e as mensagens que você enviou no chat.';

/** Exclusão de conta com o aviso de que deu certo (a tela de login já aparece por trás). */
const confirmAccountDeletion =
  (deleteAccount: (confirmation: string) => Promise<string | null>) =>
  async (confirmation: string): Promise<string | null> => {
    const failure = await deleteAccount(confirmation);
    if (!failure) Alert.alert('Conta excluída', 'Seus dados pessoais foram apagados. Obrigado por usar o VOZTRI.');
    return failure;
  };

export const App: React.FC = () => {
  const {
    sessionStatus,
    user,
    changingPin,
    profileOpen,
    setProfileOpen,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteAccount,
    busy,
    currentStep,
    activeRide,
    error,
    connectionError,
    bootstrap,
    setStep,
    confirmRideRequest,
    cancelActiveRide,
    refreshRide,
    finishRideEvaluation,
    dismissError,
  } = usePassengerStore();
  const [showChat, setShowChat] = useState(false);
  const [showSos, setShowSos] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Acompanha a corrida (despacho, aceite, embarque e conclusão) pelo polling
  const tracking = ['SEARCHING', 'DRIVER_EN_ROUTE', 'IN_TRIP'].includes(currentStep);
  usePolling(refreshRide, POLL_INTERVAL_MS, sessionStatus === 'authenticated' && !!activeRide && tracking);

  if (sessionStatus === 'checking') {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: '#F4F6FA' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <ActivityIndicator color="#6A00FF" size="large" accessibilityLabel="Carregando" />
      </View>
    );
  }

  if (sessionStatus === 'anonymous') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#F4F6FA' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F6FA" />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  // Sem PIN de emergência, o passageiro define o dele antes de seguir (é ele que desativa
  // o SOS). Uma corrida já em andamento (conta de antes da mudança) não é interrompida.
  const pinMode = changingPin ? 'change' : user?.hasEmergencyPin === false && !activeRide ? 'create' : null;
  if (profileOpen && user && !pinMode) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {connectionError && <Banner tone="warning" message={connectionError} />}
        <ProfileScreen
          user={{ name: user.name, email: user.email, phone: user.phone }}
          save={updateProfile}
          onBack={() => setProfileOpen(false)}
          busy={busy}
          photo={{ uri: mediaUrl(user.avatarUrl), token: currentToken() }}
          uploadPhoto={uploadAvatar}
          removePhoto={removeAvatar}
          deleteAccount={confirmAccountDeletion(deleteAccount)}
          deletionDetails={PASSENGER_DELETION_DETAILS}
        />
      </SafeAreaView>
    );
  }

  if (pinMode) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {connectionError && <Banner tone="warning" message={connectionError} />}
        <EmergencyPinScreen key={pinMode} mode={pinMode} />
      </SafeAreaView>
    );
  }

  // A tela de busca de motorista usa o tema escuro; as demais, o claro
  const darkScreen = currentStep === 'SEARCHING';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: darkScreen ? '#0B1026' : '#FFFFFF' }]}>
      <StatusBar barStyle={darkScreen ? 'light-content' : 'dark-content'} backgroundColor={darkScreen ? '#0B1026' : '#FFFFFF'} />

      {connectionError && <Banner tone="warning" message={connectionError} />}
      {error && <Banner message={error} onDismiss={dismissError} />}

      <View style={styles.content}>
        {currentStep === 'HOME' && <HomeScreen onOpenSearch={() => setStep('DESTINATION')} />}

        {currentStep === 'DESTINATION' && <ChooseDestinationScreen onBack={() => setStep('HOME')} />}

        {currentStep === 'SELECT_CATEGORY' && (
          <CategorySelectionSheet onBack={() => setStep('DESTINATION')} onConfirm={confirmRideRequest} />
        )}

        {currentStep === 'SEARCHING' && (
          <SearchingDriverScreen onCancel={() => cancelActiveRide('Cancelado pelo passageiro durante a busca')} />
        )}

        {(currentStep === 'DRIVER_EN_ROUTE' || currentStep === 'IN_TRIP') && (
          <DriverEnRouteScreen
            onOpenChat={() => setShowChat(true)}
            onOpenSos={() => setShowSos(true)}
            onCancel={() => cancelActiveRide('Cancelado pelo passageiro antes do embarque')}
          />
        )}

        {currentStep === 'COMPLETED' && <TripCompletedModal onFinish={finishRideEvaluation} />}
      </View>

      {showChat && activeRide && <ChatModal onClose={() => setShowChat(false)} />}
      {showSos && activeRide && <SosModal onClose={() => setShowSos(false)} />}
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
