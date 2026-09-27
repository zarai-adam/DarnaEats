import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Factory for bottom-tab icons (non-directional, so never mirrored in RTL). */
export function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={name} color={color as string} size={size} />;
  };
}
