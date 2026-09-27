import type { ReactElement } from 'react';
import type { LatLng } from '@shared/geo';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  kind: 'seller' | 'buyer';
}

export interface MapCircle {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface RenderMapProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  circles?: MapCircle[];
  onMarkerPress?: (id: string) => void;
  height?: number;
  accessibilityLabel?: string;
}

/**
 * Map provider abstraction. The default implementation uses Leaflet with
 * configurable raster tiles (OpenStreetMap by default) so no paid API key is
 * required. A Google Maps provider can implement the same interface later.
 */
export interface MapProvider {
  readonly id: string;
  renderMap(props: RenderMapProps): ReactElement;
  /** Seller locations are only ever shown as an approximate area. */
  showApproximateSellerLocation(seller: { id: string; name: string; latitude: number; longitude: number }): {
    marker: MapMarker;
    circle: MapCircle;
  };
  showBuyerLocation(point: LatLng, label: string): MapMarker;
  calculateApproximateDistance(a: LatLng, b: LatLng): number;
}
