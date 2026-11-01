import React, { useState } from 'react';
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

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.1)' }}>
      {/* Dynamic Screen State */}
      {currentStep === 'HOME' && (
        <HomeScreen onOpenSearch={() => setStep('DESTINATION')} />
      )}

      {currentStep === 'DESTINATION' && (
        <ChooseDestinationScreen onBack={() => setStep('HOME')} />
      )}

      {currentStep === 'SELECT_CATEGORY' && (
        <CategorySelectionSheet
          onBack={() => setStep('DESTINATION')}
          onConfirm={confirmRideRequest}
        />
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

      {currentStep === 'COMPLETED' && (
        <TripCompletedModal onFinish={finishRideEvaluation} />
      )}

      {/* Overlays */}
      {showChat && <ChatModal onClose={() => setShowChat(false)} />}
      {showSos && <SosModal onClose={() => setShowSos(false)} />}
    </div>
  );
};
