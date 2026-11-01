import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { useDriverStore } from './store/driverStore.js';
import { DriverDashboardScreen } from './screens/DriverDashboardScreen.js';
import { RideOfferModal } from './screens/RideOfferModal.js';
import { EnRouteNavigationScreen } from './screens/EnRouteNavigationScreen.js';
import { ValidatePinModal } from './screens/ValidatePinModal.js';
import { WeeklyEarningsScreen } from './screens/WeeklyEarningsScreen.js';
import { PixPayoutScreen } from './screens/PixPayoutScreen.js';

export const App: React.FC = () => {
  const { currentRide, incomingOffer, setIncomingOffer, acceptCurrentOffer, rejectCurrentOffer, startRide, completeCurrentRide } = useDriverStore();
  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'payout'>('home');
  const [showPinModal, setShowPinModal] = useState(false);

  const handleSimulateRide = () => {
    setIncomingOffer({
      rideId: 'ride-simulated-' + Date.now(),
      pickupAddress: 'Rua Augusta, 1200 - Consolação',
      dropoffAddress: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi',
      distanceKm: 6.8,
      durationMinutes: 18,
      earningsCents: 2150, // R$ 21,50
      timeoutSeconds: 15,
      category: 'VozTri Pop',
    });
  };

  // A navegação em rota usa o tema escuro; as demais telas, o claro
  const darkScreen = !!currentRide;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: darkScreen ? '#0B1026' : '#FFFFFF' }]}>
      <StatusBar
        barStyle={darkScreen ? 'light-content' : 'dark-content'}
        backgroundColor={darkScreen ? '#0B1026' : '#FFFFFF'}
      />
      <View style={styles.content}>
        {/* Fluxo de telas */}
        {currentRide ? (
          <EnRouteNavigationScreen
            onOpenPinModal={() => setShowPinModal(true)}
            onFinishRide={completeCurrentRide}
          />
        ) : activeTab === 'earnings' ? (
          <WeeklyEarningsScreen
            onBack={() => setActiveTab('home')}
            onOpenPayout={() => setActiveTab('payout')}
          />
        ) : activeTab === 'payout' ? (
          <PixPayoutScreen onBack={() => setActiveTab('earnings')} />
        ) : (
          <DriverDashboardScreen
            onSimulateRide={handleSimulateRide}
            onOpenEarnings={() => setActiveTab('earnings')}
          />
        )}
      </View>

      {/* Oferta de corrida recebida */}
      {incomingOffer && (
        <RideOfferModal
          offer={incomingOffer}
          onAccept={acceptCurrentOffer}
          onReject={rejectCurrentOffer}
        />
      )}

      {/* Validação do PIN de embarque */}
      {showPinModal && (
        <ValidatePinModal
          onSuccess={() => {
            startRide('1234');
            setShowPinModal(false);
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
  content: {
    flex: 1,
  },
});
