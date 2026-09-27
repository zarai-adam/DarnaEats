import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme';

const CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  breakfast: 'coffee',
  lunch: 'food',
  dinner: 'food-variant',
  pastries: 'bread-slice',
  desserts: 'cupcake',
  drinks: 'cup',
  specialties: 'pot-steam',
  catering: 'silverware-variant',
};

const TINTS = ['#F3D9C9', '#E3E8CF', '#D3E3F1', '#EDE0CF'];

/**
 * Dish photo with caching (expo-image). Dishes without photos show a local,
 * clearly generic illustration so no third-party imagery is ever needed.
 */
export function DishImage({
  uri,
  categoryId,
  style,
  label,
}: {
  uri?: string | null;
  categoryId?: string;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  if (uri) {
    return (
      <View style={[styles.fill, style]}>
        <Image
          source={{ uri }}
          style={styles.fill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessibilityLabel={label}
          recyclingKey={uri}
        />
      </View>
    );
  }
  const tint = TINTS[(categoryId?.length ?? 0) % TINTS.length];
  return (
    <View
      style={[styles.fill, styles.placeholder, { backgroundColor: tint }, style]}
      accessibilityLabel={label}
      accessibilityRole="image"
    >
      <MaterialCommunityIcons
        name={CATEGORY_ICONS[categoryId ?? ''] ?? 'pot-mix'}
        size={40}
        color={palette.terracotta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
