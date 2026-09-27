import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

type Props = ComponentProps<typeof MaterialCommunityIcons>;

/**
 * Icons that express direction (chevrons, arrows) are mirrored in RTL.
 * Non-directional icons (food, cart, star...) must NOT use this component.
 */
export function DirectionalIcon({ style, ...props }: Props) {
  return (
    <MaterialCommunityIcons {...props} style={[style, I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null]} />
  );
}
