import * as ImagePicker from 'expo-image-picker';

/** Picks a single image; returns its local URI or null if cancelled/denied. */
export async function pickImage(options?: { camera?: boolean; aspect?: [number, number] }): Promise<string | null> {
  const permission = options?.camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const settings: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options?.aspect ?? [4, 3],
    quality: 0.9,
    exif: false,
  };
  const result = options?.camera
    ? await ImagePicker.launchCameraAsync(settings)
    : await ImagePicker.launchImageLibraryAsync(settings);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
