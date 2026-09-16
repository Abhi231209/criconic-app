import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert } from "react-native";
import AppAlertModal from "@/components/ui/custom/AppAlertModal";

const AlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

let globalAlertHandler = null;

export const showGlobalAlert = (options) => {
  if (globalAlertHandler) {
    globalAlertHandler(options);
  } else {
    // Fallback to native alert if called before provider mounts
    const buttons = [];
    if (options.cancelText) {
      buttons.push({
        text: options.cancelText,
        style: "cancel",
        onPress: options.onCancel,
      });
    }
    buttons.push({
      text: options.confirmText || "OK",
      style: options.type === "danger" ? "destructive" : "default",
      onPress: options.onConfirm,
    });
    Alert.alert(options.title || "Notice", options.message || "", buttons);
  }
};

export const AlertProvider = ({ children }) => {
  const [modalProps, setModalProps] = useState({
    visible: false,
    title: "Notice",
    message: "",
    type: "info",
    confirmText: "OK",
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const hideAlert = useCallback(() => {
    setModalProps((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    ({
      title = "Notice",
      message = "",
      type = "info",
      confirmText = "OK",
      cancelText = null,
      onConfirm = null,
      onCancel = null,
    }) => {
      setModalProps({
        visible: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          hideAlert();
          onConfirm?.();
        },
        onCancel: () => {
          hideAlert();
          onCancel?.();
        },
      });
    },
    [hideAlert]
  );

  globalAlertHandler = showAlert;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <AppAlertModal {...modalProps} onClose={hideAlert} />
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);
