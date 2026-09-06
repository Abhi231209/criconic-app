import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from "react-native";

/**
 * Hook to get the current keyboard height and visibility.
 * Useful for adjusting bottom padding or insets on any screen.
 */
export function useKeyboardBottomInset(extraPadding = 30) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 260);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight > 0 ? keyboardHeight + extraPadding : extraPadding;
}

/**
 * Universal Keyboard-Aware ScrollView for forms across Criconic app.
 * - Handles iOS padding + Android soft input adjustment seamlessly.
 * - Dynamically increases bottom padding when keyboard opens so inputs near
 *   the bottom are never blocked or obscured.
 * - Supports keyboardShouldPersistTaps="handled" by default.
 */
const AppKeyboardAwareScrollView = forwardRef(function AppKeyboardAwareScrollView(
  {
    children,
    extraHeight = 50,
    contentContainerStyle,
    style,
    keyboardVerticalOffset = Platform.OS === "ios" ? 88 : 0,
    showsVerticalScrollIndicator = false,
    keyboardShouldPersistTaps = "handled",
    ...restProps
  },
  ref
) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const internalScrollRef = useRef(null);

  useImperativeHandle(ref, () => internalScrollRef.current);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height || 260;
      setKeyboardHeight(height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle) || {};
  const baseBottomPadding = flattenedContentStyle.paddingBottom || 24;

  const dynamicPaddingBottom =
    keyboardHeight > 0
      ? keyboardHeight + extraHeight
      : baseBottomPadding;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.keyboardAvoiding}
    >
      <ScrollView
        ref={internalScrollRef}
        style={style}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={[
          flattenedContentStyle,
          { paddingBottom: dynamicPaddingBottom },
        ]}
        {...restProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
});

export default AppKeyboardAwareScrollView;
