// metro.config.js
const {getDefaultConfig} = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
// (If you have custom resolver settings, merge them here.)

// Allow .cjs files in resolution
config.resolver.sourceExts.push('cjs');
// Disable strict exports resolution
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, {input: './src/global.css'});
