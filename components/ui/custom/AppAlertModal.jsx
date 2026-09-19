import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedText from "@/components/ui/custom/ThemedText";
import useAppTheme from "@/hooks/useAppTheme";
import { showGlobalAlert } from "@/contexts/AlertContext";

export { showGlobalAlert };

export default function AppAlertModal({
  visible,
  onClose,
  title = "Notice",
  message = "",
  type = "info", // "danger" | "error" | "success" | "info" | "warning"
  confirmText = "OK",
  cancelText = null, // if provided, renders a Cancel/Stay button
  onConfirm,
  onCancel,
}) {
  const { isDark } = useAppTheme();

  if (!visible) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const getIconConfig = () => {
    switch (type) {
      case "danger":
        return {
          name: "alert-circle",
          color: "#EF4444",
          bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
          gradient: ["#EF4444", "#DC2626"],
        };
      case "warning":
        return {
          name: "warning",
          color: "#F59E0B",
          bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
          gradient: ["#F59E0B", "#D97706"],
        };
      case "error":
        return {
          name: "close-circle",
          color: "#EF4444",
          bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2",
          gradient: ["#EF4444", "#DC2626"],
        };
      case "success":
        return {
          name: "checkmark-circle",
          color: "#10B981",
          bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#D1FAE5",
          gradient: ["#10B981", "#059669"],
        };
      default:
        return {
          name: "information-circle",
          color: "#3B82F6",
          bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#DBEAFE",
          gradient: ["#3B82F6", "#2563EB"],
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              {/* Header Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: iconConfig.bg },
                ]}
              >
                <Ionicons
                  name={iconConfig.name}
                  size={32}
                  color={iconConfig.color}
                />
              </View>

              {/* Title & Message */}
              <ThemedText
                style={[
                  styles.title,
                  { color: isDark ? "#FFFFFF" : "#0F172A" },
                ]}
              >
                {title}
              </ThemedText>

              {message ? (
                <ThemedText
                  style={[
                    styles.message,
                    { color: isDark ? "#94A3B8" : "#64748B" },
                  ]}
                >
                  {message}
                </ThemedText>
              ) : null}

              {/* Buttons Row */}
              <View style={styles.buttonRow}>
                {cancelText ? (
                  <TouchableOpacity
                    onPress={handleCancel}
                    activeOpacity={0.8}
                    style={[
                      styles.button,
                      styles.cancelButton,
                      {
                        backgroundColor: isDark ? "#334155" : "#F1F5F9",
                        borderColor: isDark ? "#475569" : "#CBD5E1",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.cancelText,
                        { color: isDark ? "#CBD5E1" : "#475569" },
                      ]}
                    >
                      {cancelText}
                    </ThemedText>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                  style={[styles.button, styles.confirmButtonWrapper]}
                >
                  <LinearGradient
                    colors={iconConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButton}
                  >
                    <ThemedText style={styles.confirmText}>
                      {confirmText}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 4,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  confirmButtonWrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmButton: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
