import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert } from "react-native";
import AppAlertModal from "@/components/ui/custom/AppAlertModal";

const AlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

let globalAlertHandler = null;
const originalAlert = Alert.alert;

export const showGlobalAlert = (options) => {
  if (!options) return;

  let normalized = { ...options };
  if (Array.isArray(options.buttons) && options.buttons.length > 0) {
    let confirmBtn = null;
    let cancelBtn = null;

    if (options.buttons.length === 1) {
      confirmBtn = options.buttons[0];
    } else {
      cancelBtn = options.buttons.find((b) => b.style === "cancel");
      confirmBtn = options.buttons.find((b) => b.style !== "cancel");

      // If neither has style: "cancel", treat first as cancel/secondary and second as confirm
      if (!cancelBtn && options.buttons.length >= 2) {
        cancelBtn = options.buttons[0];
        confirmBtn = options.buttons[1];
      }
    }

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
    originalAlert.call(Alert, normalized.title || "Notice", normalized.message || "", buttons);
  }
};

// Intercept Alert.alert across the entire app so all popups match app design
Alert.alert = (title, message, buttons, options) => {
  if (globalAlertHandler) {
    const lowerTitle = String(title || "").toLowerCase();
    const type =
      lowerTitle.includes("error") || lowerTitle.includes("fail") || lowerTitle.includes("delete") || lowerTitle.includes("danger")
        ? "danger"
        : lowerTitle.includes("warn") || lowerTitle.includes("required") || lowerTitle.includes("mismatch") || lowerTitle.includes("weak")
        ? "warning"
        : lowerTitle.includes("success") || lowerTitle.includes("done") || lowerTitle.includes("thank")
        ? "success"
        : "info";

    showGlobalAlert({
      title: title || "Notice",
      message: message || "",
      buttons,
      type,
    });
  } else {
    originalAlert.call(Alert, title, message, buttons, options);
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
