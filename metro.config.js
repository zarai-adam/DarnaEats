const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK ships .cjs entry points.
config.resolver.sourceExts.push('cjs');

module.exports = config;
