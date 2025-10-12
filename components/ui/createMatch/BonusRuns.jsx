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

// Custom Radio Button Component
const RadioButtonItem = ({ 
  label, 
  value, 
  selectedValue, 
  onSelect, 
  isDarkMode 
}) => {
  const isSelected = selectedValue.type === value.type && selectedValue.team === value.team;
  
  return (
    <TouchableOpacity
      style={[
        styles.radioContainer,
        isDarkMode ? styles.darkRadioContainer : styles.lightRadioContainer,
        isSelected && styles.radioContainerSelected
      ]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.radioOuter,
        isDarkMode ? styles.darkRadioOuter : styles.lightRadioOuter,
        isSelected && styles.radioSelected
      ]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
      <Text style={[
        styles.radioLabel,
        isDarkMode ? styles.darkText : styles.lightText,
        isSelected && styles.radioLabelSelected
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function BonusRuns({
  matchID,
  battingTeam,
  bowlingTeam,
  visible = false,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  
  const [data, setData] = useState({
    info: {},
    runs: "",
  });
  const [isLoading, setLoading] = useState(false);

  const handleData = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBonusRuns = async () => {
    // Validation
    if (!data.info.type || !data.info.team) {
      Alert.alert("Error", "Please select a team");
      return;
    }

    if (!data.runs || isNaN(data.runs) || parseInt(data.runs) <= 0) {
      Alert.alert("Error", "Please enter valid runs");
      return;
    }

    setLoading(true);

    try {
      // Replace with your actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success
      Alert.alert("Success", "Bonus runs added successfully");
      onSuccess();
      handleClose();
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setData({ info: {}, runs: "" });
    onClose();
  };

  const handleTeamSelect = (value) => {
    handleData("info", value);
  };

  const isFormValid = data.info.type && data.info.team && data.runs && parseInt(data.runs) > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          isDarkMode ? styles.darkModalContainer : styles.lightModalContainer
        ]}>
          {/* Header with Close Button */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[
                styles.title,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Bonus Runs
              </Text>
              <Text style={[
                styles.subtitle,
                isDarkMode ? styles.darkTextSecondary : styles.lightTextSecondary
              ]}>
                Add bonus runs to team
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={[
                styles.closeButton,
                isDarkMode ? styles.darkCloseButton : styles.lightCloseButton
              ]}
            >
              <X size={20} color={isDarkMode ? COLORS.dark.text : COLORS.light.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Team Selection */}
            <View style={styles.section}>
              <Text style={[
                styles.sectionTitle,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Select Team
              </Text>
              
              <View style={styles.radioGroup}>
                <RadioButtonItem
                  label={`${battingTeam?.title || "Batting Team"}`}
                  subLabel="(Batting)"
                  value={{ type: "bat", team: battingTeam?.teamId }}
                  selectedValue={data.info}
                  onSelect={handleTeamSelect}
                  isDarkMode={isDarkMode}
                />
                
                <RadioButtonItem
                  label={`${bowlingTeam?.title || "Bowling Team"}`}
                  subLabel="(Bowling)" 
                  value={{ type: "ball", team: bowlingTeam?.teamId }}
                  selectedValue={data.info}
                  onSelect={handleTeamSelect}
                  isDarkMode={isDarkMode}
                />
              </View>
            </View>

            {/* Runs Input */}
            <View style={styles.section}>
              <Text style={[
                styles.sectionTitle,
                isDarkMode ? styles.darkText : styles.lightText
              ]}>
                Enter Runs
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  isDarkMode ? styles.darkTextInput : styles.lightTextInput,
                  isDarkMode ? styles.darkText : styles.lightText
                ]}
                placeholder="0"
                placeholderTextColor={isDarkMode ? COLORS.dark.textSecondary : COLORS.light.textSecondary}
                value={data.runs}
                onChangeText={(value) => handleData("runs", value.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                isDarkMode ? styles.darkCancelButton : styles.lightCancelButton
              ]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.buttonText,
                isDarkMode ? styles.darkCancelButtonText : styles.lightCancelButtonText
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                !isFormValid && styles.disabledButton
              ]}
              onPress={handleBonusRuns}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    padding: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  lightCloseButton: {
    backgroundColor: COLORS.light.card,
  },
  darkCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 24,
    paddingTop: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  radioGroup: {
    gap: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lightRadioContainer: {
    backgroundColor: COLORS.light.card,
  },
  darkRadioContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  radioContainerSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRadioOuter: {
    borderColor: COLORS.light.border,
  },
  darkRadioOuter: {
    borderColor: COLORS.dark.border,
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  radioLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  lightCancelButton: {
    borderColor: COLORS.light.border,
  },
  darkCancelButton: {
    borderColor: COLORS.dark.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lightCancelButtonText: {
    color: COLORS.light.text,
  },
  darkCancelButtonText: {
    color: COLORS.dark.text,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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