import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { usePassengerStore } from './store/passengerStore.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { ChooseDestinationScreen } from './screens/ChooseDestinationScreen.js';
import { CategorySelectionSheet } from './screens/CategorySelectionSheet.js';
import { SearchingDriverScreen } from './screens/SearchingDriverScreen.js';
import { DriverEnRouteScreen } from './screens/DriverEnRouteScreen.js';
import { ChatModal } from './screens/ChatModal.js';
import { SosModal } from './screens/SosModal.js';
import { TripCompletedModal } from './screens/TripCompletedModal.js';

export const App: React.FC = () => {
  const { currentStep, setStep, confirmRideRequest, cancelActiveRide, finishRideEvaluation } = usePassengerStore();
  const [showChat, setShowChat] = useState(false);
  const [showSos, setShowSos] = useState(false);

  // A tela de busca de motorista usa o tema escuro; as demais, o claro
  const darkScreen = currentStep === 'SEARCHING';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: darkScreen ? '#0B1026' : '#FFFFFF' }]}>
      <StatusBar
        barStyle={darkScreen ? 'light-content' : 'dark-content'}
        backgroundColor={darkScreen ? '#0B1026' : '#FFFFFF'}
      />
      <View style={styles.content}>
        {/* Etapa atual do fluxo */}
        {currentStep === 'HOME' && <HomeScreen onOpenSearch={() => setStep('DESTINATION')} />}

        {currentStep === 'DESTINATION' && <ChooseDestinationScreen onBack={() => setStep('HOME')} />}

        {currentStep === 'SELECT_CATEGORY' && (
          <CategorySelectionSheet onBack={() => setStep('DESTINATION')} onConfirm={confirmRideRequest} />
        )}

        {currentStep === 'SEARCHING' && (
          <SearchingDriverScreen onCancel={() => cancelActiveRide('Cancelado pelo usuário')} />
        )}

        {(currentStep === 'DRIVER_EN_ROUTE' || currentStep === 'IN_TRIP') && (
          <DriverEnRouteScreen
            onOpenChat={() => setShowChat(true)}
            onOpenSos={() => setShowSos(true)}
            onSimulateBoarding={() => setStep('COMPLETED')}
          />
        )}

        {currentStep === 'COMPLETED' && <TripCompletedModal onFinish={finishRideEvaluation} />}
      </View>

      {/* Sobreposições */}
      {showChat && <ChatModal onClose={() => setShowChat(false)} />}
      {showSos && <SosModal onClose={() => setShowSos(false)} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
