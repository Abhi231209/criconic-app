import React, { forwardRef } from "react";
import { View } from "react-native";

/**
 * Web stub — TabSwitch.jsx never actually renders this on web (it shows the
 * active tab's content directly instead), but Metro still needs a web-safe
 * module to resolve for `import TabSwitchPager from "./TabSwitchPager"`.
 * `react-native-pager-view` has no web support, so it must never be imported
 * here — see TabSwitchPager.native.jsx for the real implementation.
 */
const TabSwitchPager = forwardRef(function TabSwitchPager({ tabs, style }, ref) {
  const activeTab = tabs?.[0];
  return (
    <View ref={ref} style={style}>
      {activeTab?.content || null}
    </View>
  );
});

export default TabSwitchPager;
