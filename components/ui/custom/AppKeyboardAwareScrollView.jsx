import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  TextInput,
  Dimensions,
} from "react-native";

export const KeyboardAwareContext = createContext({
  scrollToFocusedInput: () => {},
  setActiveInput: () => {},
  keyboardHeight: 0,
});

export function useKeyboardAware() {
  return useContext(KeyboardAwareContext);
}

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
 * - Auto-scrolls the currently focused input into clear view without deprecated APIs.
 * - Supports sticky `bottomComponent` so primary form buttons move up above keyboard.
 * - Supports keyboardShouldPersistTaps="handled" by default.
 */
const AppKeyboardAwareScrollView = forwardRef(function AppKeyboardAwareScrollView(
  {
    children,
    extraHeight = 80,
    contentContainerStyle,
    style,
    keyboardVerticalOffset = Platform.OS === "ios" ? 88 : 0,
    showsVerticalScrollIndicator = false,
    keyboardShouldPersistTaps = "handled",
    bottomComponent = null,
    onScroll: propOnScroll,
    ...restProps
  },
  ref
) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const internalScrollRef = useRef(null);
  const currentScrollY = useRef(0);
  const keyboardHeightRef = useRef(0);
  const activeInputRef = useRef(null);

  const measureInWindowScroll = useCallback((target, offset = 90) => {
    if (!target || typeof target.measureInWindow !== "function") return;
    try {
      target.measureInWindow((x, y, width, height) => {
        if (!internalScrollRef.current) return;
        const screenHeight = Dimensions.get("window").height;
        const currentKb = keyboardHeightRef.current || 280;
        const visibleBottom = screenHeight - currentKb;

        // If target is obscured or close to the keyboard or near the bottom
        if (y + height + offset > visibleBottom || y < 100) {
          const desiredWindowY = 130;
          const delta = y - desiredWindowY;
          const newY = Math.max(0, currentScrollY.current + delta);
          internalScrollRef.current.scrollTo({
            y: newY,
            animated: true,
          });
        }
      });
    } catch (_) {}
  }, []);

  const scrollToFocusedInput = useCallback(
    (targetRefOrY, offset = 90) => {
      if (!internalScrollRef.current) return;

      if (typeof targetRefOrY === "number") {
        internalScrollRef.current.scrollTo({
          y: Math.max(0, targetRefOrY - offset),
          animated: true,
        });
        return;
      }

      const target = targetRefOrY?.current || targetRefOrY;
      if (!target) return;

      activeInputRef.current = targetRefOrY;

      const innerRef =
        internalScrollRef.current.getInnerViewRef?.() ||
        internalScrollRef.current;

      if (typeof target.measureLayout === "function") {
        try {
          target.measureLayout(
            innerRef,
            (left, top) => {
              if (top !== undefined && internalScrollRef.current) {
                internalScrollRef.current.scrollTo({
                  y: Math.max(0, top - offset),
                  animated: true,
                });
              }
            },
            () => {
              measureInWindowScroll(target, offset);
            }
          );
          return;
        } catch (_) {
          measureInWindowScroll(target, offset);
          return;
        }
      }

      measureInWindowScroll(target, offset);
    },
    [measureInWindowScroll]
  );

  const setActiveInput = useCallback((targetRef) => {
    activeInputRef.current = targetRef;
  }, []);

  const scrollCurrentFocus = useCallback(() => {
    if (activeInputRef.current) {
      scrollToFocusedInput(activeInputRef.current, extraHeight);
      return;
    }

    // Fallback to TextInput.State without findNodeHandle
    try {
      const focusedInput = TextInput.State?.currentlyFocusedInput?.();
      if (focusedInput && internalScrollRef.current) {
        const innerRef =
          internalScrollRef.current.getInnerViewRef?.() ||
          internalScrollRef.current;
        if (typeof focusedInput.measureLayout === "function") {
          focusedInput.measureLayout(
            innerRef,
            (x, y) => {
              if (y !== undefined && internalScrollRef.current) {
                internalScrollRef.current.scrollTo({
                  y: Math.max(0, y - extraHeight),
                  animated: true,
                });
              }
            },
            () => {
              measureInWindowScroll(focusedInput, extraHeight);
            }
          );
        } else {
          measureInWindowScroll(focusedInput, extraHeight);
        }
      }
    } catch (_) {}
  }, [extraHeight, scrollToFocusedInput, measureInWindowScroll]);

  const scrollCurrentFocusRef = useRef(scrollCurrentFocus);
  scrollCurrentFocusRef.current = scrollCurrentFocus;

  useImperativeHandle(ref, () => ({
    scrollTo: (...args) => internalScrollRef.current?.scrollTo(...args),
    scrollToEnd: (...args) => internalScrollRef.current?.scrollToEnd(...args),
    scrollToFocusedInput,
    getInnerViewRef: () => internalScrollRef.current?.getInnerViewRef?.(),
    getScrollResponder: () => internalScrollRef.current?.getScrollResponder?.(),
  }));

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height || 260;
      keyboardHeightRef.current = height;
      setKeyboardHeight((prev) => (prev !== height ? height : prev));

      // Auto-scroll focused input into view on keyboard show
      setTimeout(() => {
        scrollCurrentFocusRef.current?.();
      }, 80);
      setTimeout(() => {
        scrollCurrentFocusRef.current?.();
      }, 200);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight((prev) => (prev !== 0 ? 0 : prev));
      activeInputRef.current = null;
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

  const handleScroll = (e) => {
    currentScrollY.current = e.nativeEvent.contentOffset.y;
    propOnScroll?.(e);
  };

  const keyboardAvoidingBehavior =
    Platform.OS === "ios" ? "padding" : undefined;

  const contextValue = useMemo(
    () => ({
      scrollToFocusedInput,
      setActiveInput,
      keyboardHeight,
    }),
    [scrollToFocusedInput, setActiveInput, keyboardHeight]
  );

  return (
    <KeyboardAwareContext.Provider value={contextValue}>
      <KeyboardAvoidingView
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          ref={internalScrollRef}
          style={style}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            flattenedContentStyle,
            { paddingBottom: dynamicPaddingBottom },
          ]}
          {...restProps}
        >
          {children}
        </ScrollView>
        {bottomComponent}
      </KeyboardAvoidingView>
    </KeyboardAwareContext.Provider>
  );
});

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
});

export default AppKeyboardAwareScrollView;
