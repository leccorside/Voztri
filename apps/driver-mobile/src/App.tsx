import React, { useState } from 'react';
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

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.1)' }}>
      {/* Active Screen Flow */}
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

      {/* Floating Incoming Ride Offer Modal */}
      {incomingOffer && (
        <RideOfferModal
          offer={incomingOffer}
          onAccept={acceptCurrentOffer}
          onReject={rejectCurrentOffer}
        />
      )}

      {/* Boarding PIN Modal */}
      {showPinModal && (
        <ValidatePinModal
          onSuccess={() => {
            startRide('1234');
            setShowPinModal(false);
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
};
