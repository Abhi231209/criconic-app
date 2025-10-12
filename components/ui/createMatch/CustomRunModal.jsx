import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";

export default function CustomRunModal({
  visible,
  onClose,
  customModalDiscription,
  action,
}) {
  const { title, restrictDiscription = false, type } = customModalDiscription || {};
  const [runsEnter, setRunsEnter] = useState("");
  const [runsType, setRunsType] = useState("bat");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  let description = "";
  let prams = {};
  const runsValue = parseInt(runsEnter) || 0;

  switch (type) {
    case "nb":
      description = `No Ball 1 + ${runsValue} = ${1 + runsValue} Run(s)`;
      prams = { runs: runsValue, ballType: "no-ball", runType: runsType };
      break;
    case "bye":
      description = `${runsValue} Run(s)`;
      prams = { runs: runsValue, runType: "bye" };
      break;
    case "wd":
      description = `Wide 1 + ${runsValue} = ${1 + runsValue} Run(s)`;
      prams = { runs: runsValue, ballType: "wide" };
      break;
    case "lb":
      description = `${runsValue} Run(s)`;
      prams = { runs: runsValue, runType: "leg-bye" };
      break;
    case "bowler":
      description = `${runsValue}`;
      prams = { bowler: runsValue };
      break;
    case "cr":
      prams = { runs: runsValue, runType: runsType, ballType: "ball" };
      break;
    default:
      description = "";
  }

  const handleConfirm = () => {
    action(prams);
    setRunsEnter("");
    setRunsType("bat");
    onClose();
  };

  const handleCancel = () => {
    setRunsEnter("");
    setRunsType("bat");
    onClose();
  };

  const showRadioGroup = (runsValue >= 1 && type === "nb") || type === "cr";

  const RadioButton = ({ value, label, selected }) => (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={() => setRunsType(value)}
    >
      <View style={[
        styles.radioOuter,
        { borderColor: isDark ? "#666" : "#ccc" }
      ]}>
        {selected && (
          <View style={[
            styles.radioInner,
            { backgroundColor: isDark ? "#60a5fa" : "#3b82f6" }
          ]} />
        )}
      </View>
      <Text style={[
        styles.radioLabel,
        { color: isDark ? "#e5e5e5" : "#1f2937" }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDark ? "#1f2937" : "#ffffff" }
        ]}>
          {/* Header */}
          <View style={[
            styles.header,
            { borderBottomColor: isDark ? "#374151" : "#e5e7eb" }
          ]}>
            <Text style={[
              styles.title,
              { color: isDark ? "#f9fafb" : "#111827" }
            ]}>
              {title}
            </Text>
          </View>

          {/* Body */}
          <ScrollView style={styles.body}>
            <View style={styles.bodyContent}>
              {!restrictDiscription && description && (
                <Text style={[
                  styles.description,
                  { color: isDark ? "#9ca3af" : "#6b7280" }
                ]}>
                  {description}
                </Text>
              )}

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#374151" : "#f9fafb",
                    borderColor: isDark ? "#4b5563" : "#d1d5db",
                    color: isDark ? "#f9fafb" : "#111827",
                  }
                ]}
                placeholder="Enter runs"
                placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
                keyboardType="numeric"
                value={runsEnter}
                onChangeText={(text) => {
                  const num = Math.abs(Math.ceil(parseFloat(text) || 0));
                  setRunsEnter(num > 0 ? num.toString() : "");
                }}
              />

              {showRadioGroup && (
                <View style={styles.radioGroup}>
                  <RadioButton
                    value="bat"
                    label="From the Bat"
                    selected={runsType === "bat"}
                  />
                  <RadioButton
                    value="bye"
                    label="Bye"
                    selected={runsType === "bye"}
                  />
                  <RadioButton
                    value="lb"
                    label="Leg Bye"
                    selected={runsType === "lb"}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[
            styles.footer,
            { borderTopColor: isDark ? "#374151" : "#e5e7eb" }
          ]}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  borderColor: isDark ? "#4b5563" : "#d1d5db",
                  backgroundColor: "transparent",
                }
              ]}
              onPress={handleCancel}
            >
              <Text style={[
                styles.buttonText,
                { color: isDark ? "#f9fafb" : "#374151" }
              ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: isDark ? "#60a5fa" : "#3b82f6" }
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    padding: 20,
    gap: 16,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  radioGroup: {
    gap: 12,
    marginTop: 8,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});