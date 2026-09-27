import { approximateCoordinate, haversineKm, roundedDistanceKm, type LatLng } from '@shared/geo';
import { LeafletMap } from './LeafletMap';
import type { MapProvider } from './types';

/** Visual radius used to communicate "somewhere in this area", never a point. */
const APPROXIMATE_RADIUS_METERS = 900;

export const leafletMapProvider: MapProvider = {
  id: 'leaflet-osm',
  renderMap: (props) => <LeafletMap {...props} />,
  showApproximateSellerLocation: (seller) => {
    // Defence in depth: snap again even though stored values are already approximate.
    const point = approximateCoordinate({ latitude: seller.latitude, longitude: seller.longitude });
    return {
      marker: { id: seller.id, ...point, title: seller.name, kind: 'seller' },
      circle: { id: `area-${seller.id}`, ...point, radiusMeters: APPROXIMATE_RADIUS_METERS },
    };
  },
  showBuyerLocation: (point: LatLng, label: string) => ({
    id: 'me',
    ...approximateCoordinate(point),
    title: label,
    kind: 'buyer',
  }),
  calculateApproximateDistance: (a, b) => roundedDistanceKm(haversineKm(a, b)),
};

/** Swap this export to change the map provider app-wide. */
export const mapProvider: MapProvider = leafletMapProvider;
export type { MapMarker, MapCircle, MapProvider, RenderMapProps } from './types';
