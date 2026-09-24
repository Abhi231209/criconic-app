// components/ui/custom/Dropdown.jsx
import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ThemedText from './ThemedText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Dropdown = ({
  options = [],
  selectedValue,
  onValueChange,
  placeholder = "Select an option",
  title,
  style,
  dropdownStyle,
  itemStyle,
  placeholderStyle,
  iconColor,
  disabled = false,
  isDarkMode: propDarkMode,
  useModal = true,
  searchable = true,
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = propDarkMode !== undefined ? propDarkMode : colorScheme === 'dark';
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openDropdown = () => {
    if (disabled) return;
    setSearchQuery('');
    setIsVisible(true);
  };

  const closeDropdown = () => {
    setIsVisible(false);
  };

  const handleSelect = (value) => {
    onValueChange?.(value);
    setIsVisible(false);
  };

  // Normalize options to support objects { label, value } or primitive values
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt, index) => {
      if (opt !== null && typeof opt === 'object') {
        const val = opt.value !== undefined ? opt.value : opt.label;
        const lbl = opt.label !== undefined ? String(opt.label) : String(val ?? '');
        return {
          ...opt,
          label: lbl,
          value: val,
          key: opt.key || (val !== undefined && val !== null ? String(val) : `opt_${index}`),
        };
      }
      return {
        label: String(opt),
        value: opt,
        key: `opt_${index}_${opt}`,
      };
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === selectedValue);
  }, [normalizedOptions, selectedValue]);

  const selectedLabel = selectedOption?.label || (selectedValue ? String(selectedValue) : placeholder);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (typeof opt.value === 'string' && opt.value.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  const renderItem = ({ item }) => {
    const isSelected = item.value === selectedValue;
    return (
      <TouchableOpacity
        onPress={() => handleSelect(item.value)}
        activeOpacity={0.7}
        style={[
          styles.itemRow,
          {
            borderBottomColor: isDarkMode ? '#374151' : '#F3F4F6',
            backgroundColor: isSelected
              ? isDarkMode
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(59, 130, 246, 0.08)'
              : 'transparent',
          },
          itemStyle,
        ]}
      >
        <ThemedText
          style={[
            styles.itemText,
            {
              color: isSelected ? '#3B82F6' : isDarkMode ? '#F9FAFB' : '#111827',
              fontWeight: isSelected ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </ThemedText>

        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#3B82F6"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[style, { zIndex: 1000 }]}>
      <TouchableOpacity
        onPress={openDropdown}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.triggerButton,
          {
            borderColor: isDarkMode ? '#374151' : '#D1D5DB',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          },
          disabled && {
            opacity: 0.6,
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
          },
        ]}
      >
        <ThemedText
          style={[
            styles.triggerText,
            {
              color: selectedValue
                ? isDarkMode
                  ? '#F9FAFB'
                  : '#111827'
                : isDarkMode
                ? '#9CA3AF'
                : '#6B7280',
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

      {/* Modal Bottom Sheet Picker (default) */}
      {useModal ? (
        <Modal
          visible={isVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeDropdown}
          statusBarTranslucent
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            {/* Backdrop Touchable */}
            <TouchableWithoutFeedback onPress={closeDropdown}>
              <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* Bottom Sheet Card */}
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  maxHeight: SCREEN_HEIGHT * 0.75,
                },
                dropdownStyle,
              ]}
            >
              {/* Handlebar */}
              <View
                style={[
                  styles.handlebar,
                  { backgroundColor: isDarkMode ? '#4B5563' : '#D1D5DB' },
                ]}
              />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <ThemedText
                  style={[
                    styles.sheetTitle,
                    { color: isDarkMode ? '#F9FAFB' : '#111827' },
                  ]}
                  numberOfLines={1}
                >
                  {title || placeholder || 'Select Option'}
                </ThemedText>
                <TouchableOpacity
                  onPress={closeDropdown}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>

              {/* Search Bar for more than 5 options */}
              {searchable && normalizedOptions.length > 5 && (
                <View
                  style={[
                    styles.searchBox,
                    {
                      backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
                      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                    },
                  ]}
                >
                  <Ionicons
                    name="search"
                    size={16}
                    color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={`Search ${title || 'options'}...`}
                    placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                    style={[
                      styles.searchInput,
                      { color: isDarkMode ? '#FFFFFF' : '#111827' },
                    ]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={isDarkMode ? '#9CA3AF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Options List */}
              <FlatList
                data={filteredOptions}
                renderItem={renderItem}
                keyExtractor={(item) => item.key}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="search-outline"
                      size={32}
                      color={isDarkMode ? '#4B5563' : '#9CA3AF'}
                    />
                    <ThemedText
                      style={[
                        styles.emptyText,
                        { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                      ]}
                    >
                      {searchQuery
                        ? `No options found matching "${searchQuery}"`
                        : 'No options available'}
                    </ThemedText>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      ) : (
        /* Fallback for inline non-modal if useModal === false */
        isVisible && (
          <View
            style={[
              styles.inlineContainer,
              {
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
              },
              dropdownStyle,
            ]}
          >
            <FlatList
              data={normalizedOptions}
              renderItem={renderItem}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  handlebar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    marginVertical: 1,
  },
  itemText: {
    fontSize: 15,
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  inlineContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 300,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 4,
  },
});

export default Dropdown;