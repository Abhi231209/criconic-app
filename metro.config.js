const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: "./global.css",
});

// 👇 On native, some deps erroneously pull in "react-dom" which isn't part of
// the native runtime, so alias it to react-native there. On web, react-native-web's
// own render/hydrate entry point needs the real react-dom, so leave it untouched.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-dom" && platform !== "web") {
    return { type: "sourceFile", filePath: require.resolve("react-native") };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
