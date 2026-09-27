import * as Location from 'expo-location';
import { approximateCoordinate, isWithinTunisia, type LatLng } from '@shared/geo';

/**
 * Returns the buyer's approximate position (~1 km grid) for distance sorting.
 * The value stays on the device; it is never written to Firestore.
 */
export async function getApproximateBuyerLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  const point = approximateCoordinate({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  return isWithinTunisia(point) ? point : null;
}
