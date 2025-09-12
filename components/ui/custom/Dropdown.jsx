// components/ui/custom/Dropdown.jsx (Absolute Positioning)
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  useColorScheme,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ThemedText from './ThemedText';

const Dropdown = ({
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select an option",
  style,
  dropdownStyle,
  itemStyle,
  placeholderStyle,
  iconColor,
  disabled = false,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [isVisible, setIsVisible] = useState(false);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsVisible(!isVisible);
  };

  const handleSelect = (value) => {
    onValueChange(value);
    setIsVisible(false);
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleSelect(item.value)}
      style={[
        {
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#374151' : '#E5E7EB',
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        },
        item.value === selectedValue && {
          backgroundColor: isDarkMode ? '#2D5A27' : '#E8F5E8',
        },
        itemStyle,
      ]}
    >
      <ThemedText
        style={[
          {
            fontSize: 16,
            color: isDarkMode ? '#F9FAFB' : '#111827',
          },
          item.value === selectedValue && {
            color: isDarkMode ? '#FFFFFF' : '#2D5A27',
            fontWeight: '600',
          },
        ]}
      >
        {item.label}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <View style={[style, { zIndex: 1000 }]}>
      <TouchableOpacity
        onPress={toggleDropdown}
        disabled={disabled}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#374151' : '#D1D5DB',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            minHeight: 48,
          },
          disabled && {
            opacity: 0.6,
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
          },
        ]}
      >
        <ThemedText
          style={[
            {
              fontSize: 16,
              flex: 1,
              color: selectedValue ? (isDarkMode ? '#F9FAFB' : '#111827') : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            },
            placeholderStyle,
          ]}
          numberOfLines={1}
        >
          {selectedLabel}
        </ThemedText>
        <Ionicons
          name={isVisible ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={iconColor || (isDarkMode ? '#9CA3AF' : '#6B7280')}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {isVisible && (
        <View
          style={[
            {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: 300,
              borderRadius: 8,
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDarkMode ? '#374151' : '#E5E7EB',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
              marginTop: 4,
            },
            dropdownStyle,
          ]}
        >
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item) => item.value.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

export default Dropdown;