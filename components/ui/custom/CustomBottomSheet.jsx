// components/ui/custom/CustomBottomSheet.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetKeyboardAvoidingView,
} from "@gorhom/bottom-sheet";
import useAppTheme from "@/hooks/useAppTheme";

const BottomSheetContext = createContext({
  openSheet: () => {},
  closeSheet: () => {},
});

export const BottomSheetProvider = ({ children }) => {
  const { isDark, colors } = useAppTheme();
  const bottomSheetModalRef = useRef(null);
  const [content, setContent] = useState(null);

  // tweak snap points as needed
  const snapPoints = useMemo(() => ["45%", "80%"], []);

  const openSheet = useCallback((node) => {
    setContent(node);
    requestAnimationFrame(() => {
      bottomSheetModalRef.current?.present();
    });
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
    // clear content after a short delay (avoid flicker)
    setTimeout(() => setContent(null), 300);
  }, []);

  const sheetBg = isDark ? "#1E293B" : "#FFFFFF";

  return (
    <BottomSheetContext.Provider value={{ openSheet, closeSheet }}>
      {children}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={["60%", "80%"]}
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
