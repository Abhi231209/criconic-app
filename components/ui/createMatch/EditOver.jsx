import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { X } from "lucide-react-native";

const COLORS = {
  primary: "#DC2626",
  secondary: "#16A34A",
  accent: "#EA580C",
  light: {
    background: "#FFFFFF",
    card: "#F8FAFC",
    text: "#1E293B",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    inputBackground: "#FFFFFF",
  },
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#334155",
    inputBackground: "#1E293B",
  },
};

// Button Component
const ButtonNormal = ({ 
  children, 
  onPress, 
  loading = false,
  disabled = false,
  variant = "primary",
  isDarkMode,
  style 
}) => {
  const isOutline = variant === "outline";
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline 
          ? [
              styles.outlineButton,
              isDarkMode ? styles.darkOutlineButton : styles.lightOutlineButton
            ]
          : styles.primaryButton,
        disabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? (isDarkMode ? COLORS.dark.text : COLORS.light.text) : "#FFFFFF"} size="small" />
      ) : (
        <Text style={[
          styles.buttonText,
          isOutline 
            ? (isDarkMode ? styles.darkOutlineText : styles.lightOutlineText)
            : styles.primaryButtonText
        ]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function EditOver({ 
  matchID, 
  visible = false, 
  onClose = () => {}, 
  currentOver 
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [overToChange, setOverToChange] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDone = async () => {
    // Validate input
    if (!overToChange.trim()) {
      setError("Please enter over value");
      return;
    }

    const newOver = parseFloat(overToChange);
    const currentOverValue = parseFloat(currentOver);

    if (isNaN(newOver)) {
      setError("Please enter a valid number");
      return;
    }

    if (newOver <= currentOverValue) {
      setError("Over should be greater than current");
      return;
    }

    if (newOver < 0) {
      setError("Over cannot be negative");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Replace with your actual API call
      // const body = {
      //   overToUpdate: newOver,
      //   matchId: matchID,
      // };
      // const res = await request(`api/matches/changeOver`, {
      //   method: "PUT",
      //   data: body,
      // });

      // Mock API call - replace with actual
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success response
      const mockSuccess = true; // Replace with: res.status == 200

      if (mockSuccess) {
        Alert.alert("Success", "Over updated successfully");
        handleClose();
      } else {
        Alert.alert("Error", "Failed to update over");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
      console.error("Error updating over:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOverToChange("");
    setError("");
    onClose();
  };

  const handleInputChange = (text) => {
    setOverToChange(text);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const validateInput = (text) => {
    // Allow numbers and decimal point
    const regex = /^\d*\.?\d*$/;
    return regex.test(text);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          isDarkMode ? styles.darkModalContainer : styles.lightModalContainer
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[
                styles.title,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Edit Over
              </Text>
              <Text style={[
                styles.description,
                isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
              ]}>
                * You can only edit over in first inning
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
            >
              <X size={24} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[
              styles.currentOverText,
              isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
            ]}>
              Current Over: {currentOver}
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  isDarkMode ? styles.darkTextInput : styles.lightTextInput,
                  isDarkMode ? styles.darkText : styles.lightText,
                  error && styles.errorInput
                ]}
                placeholder="Enter over"
                placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
                value={overToChange}
                onChangeText={handleInputChange}
                keyboardType="decimal-pad"
                autoFocus={true}
              />
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <ButtonNormal
              variant="outline"
              onPress={handleClose}
              isDarkMode={isDarkMode}
              style={styles.cancelButton}
            >
              Cancel
            </ButtonNormal>
            <ButtonNormal
              onPress={handleDone}
              loading={isLoading}
              disabled={!overToChange.trim()}
              isDarkMode={isDarkMode}
              style={styles.doneButton}
            >
              Done
            </ButtonNormal>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lightModalContainer: {
    backgroundColor: COLORS.light.background,
  },
  darkModalContainer: {
    backgroundColor: COLORS.dark.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
  },
  content: {
    padding: 20,
  },
  currentOverText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  lightTextInput: {
    borderColor: COLORS.light.border,
    backgroundColor: COLORS.light.inputBackground,
  },
  darkTextInput: {
    borderColor: COLORS.dark.border,
    backgroundColor: COLORS.dark.inputBackground,
  },
  errorInput: {
    borderColor: COLORS.primary,
  },
  errorText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
  },
  doneButton: {
    flex: 1,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  lightOutlineButton: {
    borderColor: COLORS.light.border,
  },
  darkOutlineButton: {
    borderColor: COLORS.dark.border,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  lightOutlineText: {
    color: COLORS.light.text,
  },
  darkOutlineText: {
    color: COLORS.dark.text,
  },
  // Text Styles
  lightText: {
    color: COLORS.light.text,
  },
  darkText: {
    color: COLORS.dark.text,
  },
  lightTextSecondary: {
    color: COLORS.light.textSecondary,
  },
  darkTextSecondary: {
    color: COLORS.dark.textSecondary,
  },
};