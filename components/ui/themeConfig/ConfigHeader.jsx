// Header.js
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ThemedText from './ThemedText';

export default function ConfigHeader({ title, description, onBack }) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <ChevronLeft size={24} color={isDark ? '#fff' : '#000'} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {description && (
          <ThemedText type="secondary" style={styles.description}>
            {description}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const getStyles = (isDark) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDark ? '#1a1a1a' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333' : '#e5e5e5',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
});