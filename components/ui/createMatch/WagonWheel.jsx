// components/WagonWheel.jsx
import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  PanResponder, 
  Dimensions,
  StyleSheet 
} from "react-native";
import { useColorScheme } from "react-native";
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WagonWheel = ({ onShotSelected, onCancel, batsman }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [shotPosition, setShotPosition] = useState(null);
  const [shotPower, setShotPower] = useState(1);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        setShotPosition({ x: locationX, y: locationY });
      },
      onPanResponderMove: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        setShotPosition({ x: locationX, y: locationY });
        
        // Calculate power based on distance from center
        const centerX = width * 0.4;
        const centerY = height * 0.3;
        const distance = Math.sqrt(
          Math.pow(locationX - centerX, 2) + 
          Math.pow(locationY - centerY, 2)
        );
        
        let power = 1;
        if (distance < 40) power = 1;
        else if (distance < 80) power = 2;
        else if (distance < 120) power = 3;
        else if (distance < 160) power = 4;
        else power = 6;
        
        setShotPower(power);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        const finalPosition = { x: locationX, y: locationY };
        
        // Determine shot direction
        const centerX = width * 0.4;
        const isOffSide = finalPosition.x > centerX;
        const direction = isOffSide ? "Off Side" : "Leg Side";
        
        // Record the shot
        onShotSelected({
          position: finalPosition,
          batsman,
          runs: shotPower,
          direction,
          timestamp: new Date().toISOString()
        });
      }
    })
  ).current;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#374151' : 'white' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? 'white' : 'black' }]}>
          Wagon Wheel - {batsman}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={isDarkMode ? "white" : "gray"} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.instruction, { color: isDarkMode ? '#D1D5DB' : '#4B5563' }]}>
        Tap where the ball was hit
      </Text>
      <Text style={[styles.powerText, { color: isDarkMode ? '#FBBF24' : '#D97706' }]}>
        Power: {shotPower} runs
      </Text>
      
      <View 
        style={[styles.field, { backgroundColor: isDarkMode ? '#065F46' : '#10B981' }]}
        {...panResponder.panHandlers}
      >
        {/* Pitch */}
        <View style={styles.pitch} />
        
        {/* Field markings */}
        <View style={styles.circle} />
        <View style={[styles.line, styles.verticalLine]} />
        <View style={[styles.line, styles.horizontalLine]} />
        
        {/* Zones */}
        <View style={[styles.zone, styles.offSide]} />
        <View style={[styles.zone, styles.legSide]} />
        
        {/* Shot target indicator */}
        {shotPosition && (
          <View 
            style={[
              styles.shotIndicator,
              { 
                left: shotPosition.x - 15, 
                top: shotPosition.y - 15,
                backgroundColor: shotPower === 6 ? '#F59E0B' : 
                               shotPower === 4 ? '#10B981' : 
                               shotPower === 3 ? '#3B82F6' : 
                               shotPower === 2 ? '#6366F1' : '#8B5CF6'
              }
            ]} 
          >
            <Text style={styles.shotText}>{shotPower}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB' }]}
          onPress={() => onShotSelected({
            batsman,
            runs: shotPower,
            direction: "Custom",
            timestamp: new Date().toISOString()
          })}
        >
          <Text style={styles.buttonText}>Confirm {shotPower} Runs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isDarkMode ? '#4B5563' : '#9CA3AF' }]}
          onPress={onCancel}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 4
  },
  instruction: {
    textAlign: 'center',
    marginBottom: 4,
    fontSize: 14
  },
  powerText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '600'
  },
  field: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden'
  },
  pitch: {
    width: 60,
    height: 8,
    backgroundColor: '#78350F',
    position: 'absolute'
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute'
  },
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  verticalLine: {
    width: 2,
    height: '100%'
  },
  horizontalLine: {
    width: '100%',
    height: 2
  },
  zone: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    opacity: 0.1
  },
  offSide: {
    right: 0,
    backgroundColor: '#3B82F6'
  },
  legSide: {
    left: 0,
    backgroundColor: '#10B981'
  },
  shotIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },
  shotText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12
  },
  footer: {
    width: '100%',
    gap: 8
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: 'white',
    fontWeight: '600'
  }
});

export default WagonWheel;