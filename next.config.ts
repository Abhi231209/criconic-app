
import { withGluestackUI } from "@gluestack/ui-next-adapter";

const nextConfig = {
  transpilePackages: ["nativewind", "react-native-css-interop"],
};

export default withGluestackUI(nextConfig);
