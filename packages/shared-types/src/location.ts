export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressLocation {
  address: string;
  shortAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}

export interface DriverLiveLocation extends Coordinates {
  driverId: string;
  heading: number;
  speed: number;
  updatedAt: string;
}

export interface RouteGeometry {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  bounds?: {
    northEast: Coordinates;
    southWest: Coordinates;
  };
}
