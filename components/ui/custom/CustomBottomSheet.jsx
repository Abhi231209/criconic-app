// components/ui/custom/CustomBottomSheet.jsx

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
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


const DEFAULT_SNAP_POINTS = ["70%"];


export const BottomSheetProvider = ({
  children,
}) => {
  const { isDark } = useAppTheme();

  const bottomSheetModalRef =
    useRef(null);

  /**
   * Current sheet content
   */
  const [content, setContent] =
    useState(null);

  /**
   * Current snap points
   */
  const [snapPoints, setSnapPoints] =
    useState(DEFAULT_SNAP_POINTS);


  /**
   * ---------------------------------------------------------
   * IMPORTANT REFS
   * ---------------------------------------------------------
   */

  /**
   * Whether BottomSheetModal is currently presented.
   */
  const isPresentedRef =
    useRef(false);

  /**
   * Whether BottomSheetModal is currently dismissing.
   */
  const isDismissingRef =
    useRef(false);

  /**
   * Latest sheet waiting to open after dismissal.
   *
   * We only keep ONE pending sheet.
   * If user taps A -> B -> C while dismissing,
   * C is the one that should open.
   */
  const pendingOpenRef =
    useRef(null);

  /**
   * requestAnimationFrame ID.
   *
   * IMPORTANT:
   * This must be cancelled with cancelAnimationFrame,
   * NOT clearTimeout.
   */
  const openAnimationFrameRef =
    useRef(null);


  /**
   * ---------------------------------------------------------
   * ANIMATION
   * ---------------------------------------------------------
   */

  const animationConfigs =
    useBottomSheetTimingConfigs({
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });


  /**
   * ---------------------------------------------------------
   * CANCEL SCHEDULED OPEN
   * ---------------------------------------------------------
   */

  const cancelScheduledOpen =
    useCallback(() => {
      if (
        openAnimationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          openAnimationFrameRef.current
        );

        openAnimationFrameRef.current =
          null;
      }
    }, []);


  /**
   * ---------------------------------------------------------
   * PRESENT MODAL
   * ---------------------------------------------------------
   */

  const presentSheet = useCallback(() => {
    /**
     * Don't present if another presentation already
     * happened.
     */
    if (isPresentedRef.current) {
      return;
    }

    /**
     * Don't try to present while dismissing.
     */
    if (isDismissingRef.current) {
      return;
    }

    try {
      bottomSheetModalRef.current?.present();

      isPresentedRef.current =
        true;
    } catch (error) {
      console.warn(
        "[CustomBottomSheet] present error:",
        error
      );
    }
  }, []);


  /**
   * ---------------------------------------------------------
   * OPEN SHEET
   * ---------------------------------------------------------
   */

  const openSheet = useCallback(
    (node, customSnapPoints) => {
      if (!node) {
        return;
      }

      /**
       * Cancel any previous scheduled presentation.
       */
      cancelScheduledOpen();


      /**
       * Resolve snap points.
       */

      const targetSnapPoints =
        customSnapPoints &&
        Array.isArray(customSnapPoints)
          ? customSnapPoints
          : DEFAULT_SNAP_POINTS;


      /**
       * -----------------------------------------------------
       * CASE 1
       * -----------------------------------------------------
       *
       * Sheet is currently dismissing.
       *
       * Example:
       *
       * Match A
       *   ↓
       * close
       *   ↓
       * animation still running
       *   ↓
       * tap Match B
       *
       * We remember B and open it after A finishes.
       */

      if (isDismissingRef.current) {
        pendingOpenRef.current = {
          node,
          snapPoints:
            targetSnapPoints,
        };

        return;
      }


      /**
       * -----------------------------------------------------
       * Update snap points
       * -----------------------------------------------------
       */

      setSnapPoints((previous) => {
        const isSame =
          previous.length ===
            targetSnapPoints.length &&
          previous.every(
            (point, index) =>
              point ===
              targetSnapPoints[index]
          );

        return isSame
          ? previous
          : targetSnapPoints;
      });


      /**
       * -----------------------------------------------------
       * CASE 2
       * -----------------------------------------------------
       *
       * Sheet is ALREADY OPEN.
       *
       * DO NOT dismiss.
       * DO NOT present again.
       *
       * Just replace the content.
       */

      if (isPresentedRef.current) {
        setContent(node);
        return;
      }


      /**
       * -----------------------------------------------------
       * CASE 3
       * -----------------------------------------------------
       *
       * Sheet is closed.
       */

      setContent(node);


      /**
       * Wait for React to commit the new content.
       *
       * requestAnimationFrame is used instead of setTimeout.
       */

      openAnimationFrameRef.current =
        requestAnimationFrame(() => {
          openAnimationFrameRef.current =
            null;

          /**
           * Something may have changed while we
           * were waiting.
           */

          if (
            isPresentedRef.current ||
            isDismissingRef.current
          ) {
            return;
          }

          presentSheet();
        });
    },
    [
      cancelScheduledOpen,
      presentSheet,
    ]
  );


  /**
   * ---------------------------------------------------------
   * CLOSE SHEET
   * ---------------------------------------------------------
   */

  const closeSheet = useCallback(() => {
    /**
     * Cancel a presentation that hasn't happened yet.
     */
    cancelScheduledOpen();

    /**
     * Do NOT carry an old pending match forward.
     */
    pendingOpenRef.current = null;


    /**
     * If already closed, clean everything.
     */

    if (
      !isPresentedRef.current &&
      !isDismissingRef.current
    ) {
      setContent(null);
      return;
    }


    /**
     * Mark dismissal BEFORE calling dismiss().
     */

    isDismissingRef.current = true;


    try {
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      console.warn(
        "[CustomBottomSheet] dismiss error:",
        error
      );

      /**
       * If dismiss itself fails, reset state.
       */

      isPresentedRef.current =
        false;

      isDismissingRef.current =
        false;

      pendingOpenRef.current =
        null;

      setContent(null);
    }
  }, [cancelScheduledOpen]);


  /**
   * ---------------------------------------------------------
   * ON DISMISS
   * ---------------------------------------------------------
   *
   * This is the most important part for:
   *
   * Match A → close → Match B
   */

  const handleDismiss =
    useCallback(() => {
      /**
       * Modal is now completely dismissed.
       */

      isPresentedRef.current =
        false;

      isDismissingRef.current =
        false;


      /**
       * Check whether another sheet was requested
       * during the dismissal animation.
       */

      const pending =
        pendingOpenRef.current;

      pendingOpenRef.current =
        null;


      /**
       * -----------------------------------------------------
       * Pending sheet exists
       * -----------------------------------------------------
       */

      if (pending) {
        /**
         * Set new snap points.
         */

        setSnapPoints(
          pending.snapPoints
        );

        /**
         * Set new content.
         */

        setContent(
          pending.node
        );


        /**
         * Wait one frame and present the new sheet.
         */

        openAnimationFrameRef.current =
          requestAnimationFrame(() => {
            openAnimationFrameRef.current =
              null;

            /**
             * Safety checks.
             */

            if (
              isPresentedRef.current ||
              isDismissingRef.current
            ) {
              return;
            }

            presentSheet();
          });

        return;
      }


      /**
       * -----------------------------------------------------
       * No pending sheet
       * -----------------------------------------------------
       */

      setContent(null);
    }, [presentSheet]);


  /**
   * ---------------------------------------------------------
   * ON SHEET CHANGE
   * ---------------------------------------------------------
   */

  const handleSheetChange =
    useCallback((index) => {
      /**
       * index === -1 means the modal is closed.
       *
       * Don't mark dismissing false here because
       * onDismiss is the reliable signal that the
       * dismissal animation has actually completed.
       */

      if (index === -1) {
        isPresentedRef.current =
          false;

        return;
      }


      /**
       * Any visible index means sheet is presented.
       */

      isPresentedRef.current =
        true;

      /**
       * If it was opening normally, it is no longer
       * considered dismissing.
       */

      isDismissingRef.current =
        false;
    }, []);


  /**
   * ---------------------------------------------------------
   * BACKDROP
   * ---------------------------------------------------------
   */

  const renderBackdrop =
    useCallback(
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


  /**
   * ---------------------------------------------------------
   * CONTEXT VALUE
   * ---------------------------------------------------------
   */

  const contextValue =
    useMemo(
      () => ({
        openSheet,
        closeSheet,
      }),
      [
        openSheet,
        closeSheet,
      ]
    );


  /**
   * ---------------------------------------------------------
   * BACKGROUND
   * ---------------------------------------------------------
   */

  const sheetBg =
    isDark
      ? "#1E293B"
      : "#FFFFFF";


  /**
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <BottomSheetContext.Provider
      value={contextValue}
    >
      {children}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
        animationConfigs={
          animationConfigs
        }
        backdropComponent={
          renderBackdrop
        }
        onDismiss={
          handleDismiss
        }
        onChange={
          handleSheetChange
        }
        backgroundStyle={{
          backgroundColor:
            sheetBg,
        }}
        handleIndicatorStyle={{
          backgroundColor:
            isDark
              ? "#64748B"
              : "#CBD5E1",
        }}
      >
        <BottomSheetView
          style={[
            styles.contentContainer,
            {
              backgroundColor:
                sheetBg,
            },
          ]}
        >
          {content}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetContext.Provider>
  );
};


export const useBottomSheet =
  () =>
    useContext(
      BottomSheetContext
    );


const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});