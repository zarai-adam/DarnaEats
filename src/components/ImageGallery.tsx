import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DishImage } from './DishImage';
import { palette } from '@/theme';

export function ImageGallery({
  images,
  categoryId,
  height = 260,
  label,
}: {
  images: string[];
  categoryId?: string;
  height?: number;
  label: string;
}) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  if (images.length <= 1) {
    return (
      <View style={{ height }}>
        <DishImage uri={images[0]} categoryId={categoryId} label={label} />
      </View>
    );
  }
  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        keyExtractor={(uri) => uri}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <View style={{ width, height }}>
            <DishImage
              uri={item}
              categoryId={categoryId}
              label={t('common.photoOf', { name: label, n: i + 1, total: images.length })}
            />
          </View>
        )}
      />
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {images.map((uri, i) => (
          <View key={uri} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.border },
  dotOn: { backgroundColor: palette.terracotta },
});
