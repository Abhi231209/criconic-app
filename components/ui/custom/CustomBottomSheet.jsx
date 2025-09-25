// components/ui/custom/CustomBottomSheet.jsx
import React, {
  createContext,
  useContext,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { View, StyleSheet } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

const BottomSheetContext = createContext({
  openSheet: () => {},
  closeSheet: () => {},
});

export const BottomSheetProvider = ({ children }) => {
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

  return (
    <BottomSheetContext.Provider value={{ openSheet, closeSheet }}>
      {children}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={["60%", "80%"]}
        backgroundStyle={{ backgroundColor: "white" }}
      >
                    <BottomSheetView style={styles.contentContainer}>
{content}
        {/* <View style={styles.container}></View> */}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheet = () => useContext(BottomSheetContext);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    // you can replace with className if you prefer nativewind
    backgroundColor: "#fff",
  },
    contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
});
