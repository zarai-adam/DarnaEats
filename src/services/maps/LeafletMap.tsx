import { createElement, useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { env } from '@/config/env';
import { buildLeafletHtml } from './leafletHtml';
import type { RenderMapProps } from './types';

export function LeafletMap({
  center,
  zoom = 12,
  markers = [],
  circles = [],
  onMarkerPress,
  height = 360,
  accessibilityLabel,
}: RenderMapProps) {
  const html = useMemo(
    () =>
      buildLeafletHtml({ center, zoom, markers, circles, tileUrl: env.mapTileUrl, attribution: env.mapAttribution }),
    [center, zoom, markers, circles],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !onMarkerPress) return undefined;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(String(event.data)) as { type?: string; id?: string };
        if (msg.type === 'marker' && msg.id) onMarkerPress(msg.id);
      } catch {
        // Ignore unrelated messages.
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMarkerPress]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ height, borderRadius: 12, overflow: 'hidden' }} accessibilityLabel={accessibilityLabel}>
        {createElement('iframe', {
          srcDoc: html,
          style: { border: 0, width: '100%', height: '100%' },
          title: accessibilityLabel ?? 'map',
        })}
      </View>
    );
  }

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden' }} accessibilityLabel={accessibilityLabel}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
            if (msg.type === 'marker' && msg.id) onMarkerPress?.(msg.id);
          } catch {
            // Ignore malformed messages.
          }
        }}
      />
    </View>
  );
}
