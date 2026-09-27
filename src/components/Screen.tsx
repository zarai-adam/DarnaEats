import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme';
import { OfflineBanner } from './OfflineBanner';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  footer?: ReactNode;
}

/** Standard screen container: safe area, keyboard handling, offline banner. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshing,
  onRefresh,
  edges = ['bottom'],
  contentStyle,
  footer,
}: ScreenProps) {
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.terracotta} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {inner}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  flex: { flex: 1 },
  padded: { padding: spacing.lg, gap: spacing.md },
});
