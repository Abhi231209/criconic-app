import React, { forwardRef } from "react";
import { View } from "react-native";
import PagerView from "react-native-pager-view";

/**
 * Native-only wrapper so `react-native-pager-view` (which has no web
 * implementation) only ever gets bundled for iOS/Android — Metro picks this
 * file over TabSwitchPager.web.jsx by platform, so web never resolves it.
 */
const TabSwitchPager = forwardRef(function TabSwitchPager(
  { tabs, style, initialPage, onPageSelected, onPageScroll, scrollEnabled, pageStyle },
  ref
) {
  return (
    <PagerView
      ref={ref}
      style={style}
      initialPage={initialPage}
      onPageSelected={onPageSelected}
      onPageScroll={onPageScroll}
      scrollEnabled={scrollEnabled}
    >
      {tabs.map((tab, index) => (
        <View
          key={tab.id || `tab_page_${index}`}
          collapsable={false}
          style={pageStyle}
        >
          {tab.content || <View />}
        </View>
      ))}
    </PagerView>
  );
});

export default TabSwitchPager;
