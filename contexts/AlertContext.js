import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert } from "react-native";
import AppAlertModal from "@/components/ui/custom/AppAlertModal";

const AlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

let globalAlertHandler = null;

export const showGlobalAlert = (options) => {
  if (!options) return;

  let normalized = { ...options };
  if (Array.isArray(options.buttons) && options.buttons.length > 0) {
    const confirmBtn =
      options.buttons.find((b) => b.style !== "cancel") || options.buttons[0];
    const cancelBtn = options.buttons.find((b) => b.style === "cancel");

    if (!normalized.onConfirm && confirmBtn?.onPress) {
      normalized.onConfirm = confirmBtn.onPress;
    }
    if (!normalized.confirmText && confirmBtn?.text) {
      normalized.confirmText = confirmBtn.text;
    }
    if (!normalized.onCancel && cancelBtn?.onPress) {
      normalized.onCancel = cancelBtn.onPress;
    }
    if (!normalized.cancelText && cancelBtn?.text) {
      normalized.cancelText = cancelBtn.text;
    }
  }

  if (globalAlertHandler) {
    globalAlertHandler(normalized);
  } else {
    // Fallback to native alert if called before provider mounts
    const buttons = [];
    if (normalized.cancelText) {
      buttons.push({
        text: normalized.cancelText,
        style: "cancel",
        onPress: normalized.onCancel,
      });
    }
    buttons.push({
      text: normalized.confirmText || "OK",
      style: normalized.type === "danger" ? "destructive" : "default",
      onPress: normalized.onConfirm,
    });
    Alert.alert(normalized.title || "Notice", normalized.message || "", buttons);
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
