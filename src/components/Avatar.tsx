import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { initials } from '@/utils/format';
import { palette } from '@/theme';

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri)
    return (
      <Image source={{ uri }} style={style} contentFit="cover" accessibilityLabel={name} cachePolicy="memory-disk" />
    );
  return (
    <View style={[styles.fallback, style]} accessibilityLabel={name} accessibilityRole="image">
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name) || '•'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: palette.terracotta, alignItems: 'center', justifyContent: 'center' },
  text: { color: palette.white, fontWeight: '700' },
});
