// components/ui/custom/CustomBottomSheet.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";
import { StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { Easing } from "react-native-reanimated";
import useAppTheme from "@/hooks/useAppTheme";

const BottomSheetContext = createContext({
  openSheet: () => {},
  closeSheet: () => {},
});

const DEFAULT_SNAP_POINTS = ["60%", "85%"];

export const BottomSheetProvider = ({ children }) => {
  const { isDark } = useAppTheme();
  const bottomSheetModalRef = useRef(null);
  const [content, setContent] = useState(null);
  const [snapPoints, setSnapPoints] = useState(DEFAULT_SNAP_POINTS);

  // Snappy, instant animation (160ms with cubic easing)
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 160,
    easing: Easing.out(Easing.cubic),
  });

  const openSheet = useCallback((node, customSnapPoints) => {
    setContent(node);
    const targetPoints = (customSnapPoints && Array.isArray(customSnapPoints))
      ? customSnapPoints
      : DEFAULT_SNAP_POINTS;
    setSnapPoints((prev) => {
      if (prev.length === targetPoints.length && prev.every((p, i) => p === targetPoints[i])) {
        return prev;
      }
      return targetPoints;
    });
    // Request animation frame ensures React renders the content and snap points before presenting
    requestAnimationFrame(() => {
      bottomSheetModalRef.current?.present();
    });
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const handleDismiss = useCallback(() => {
    setContent(null);
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const contextValue = React.useMemo(
    () => ({ openSheet, closeSheet }),
    [openSheet, closeSheet]
  );

  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";

  return (
    <BottomSheetContext.Provider value={contextValue}>
      {children}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        animationConfigs={animationConfigs}
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        backgroundStyle={{ backgroundColor: sheetBg }}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#64748B" : "#CBD5E1" }}
      >
        <BottomSheetView
          style={[styles.contentContainer, { backgroundColor: sheetBg }]}
        >
          {content}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => useContext(BottomSheetContext);

const styles = StyleSheet.create({
  container: {},
  contentContainer: {
    flex: 1,
  },
});
