const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: "./global.css",
});

// 👇 Inject the "react-dom" resolver fix to avoid crash
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-dom': require.resolve('react-native'),
};

module.exports = config;
