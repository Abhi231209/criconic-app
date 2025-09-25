import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, G, Text as SvgText, Line, Rect } from 'react-native-svg';

const WagonWheel = () => {
  const [currentShot, setCurrentShot] = useState(null);
  const [lastTouch, setLastTouch] = useState(null);

  // Define the 8 zones with correct cricket field positions
  const zones = [
    { id: 1, name: 'Straight', color: '#FF6B6B', startAngle: 350, endAngle: 10 },
    { id: 2, name: 'Cover', color: '#4ECDC4', startAngle: 10, endAngle: 45 },
    { id: 3, name: 'Extra Cover', color: '#FFE66D', startAngle: 45, endAngle: 80 },
    { id: 4, name: 'Point', color: '#1A535C', startAngle: 80, endAngle: 100 },
    { id: 5, name: 'Third Man', color: '#FF9F1C', startAngle: 100, endAngle: 135 },
    { id: 6, name: 'Fine Leg', color: '#6A0572', startAngle: 135, endAngle: 170 },
    { id: 7, name: 'Square Leg', color: '#AB83A1', startAngle: 170, endAngle: 190 },
    { id: 8, name: 'Mid Wicket', color: '#5FAD41', startAngle: 190, endAngle: 225 },
    { id: 9, name: 'Mid On', color: '#2A9D8F', startAngle: 225, endAngle: 260 },
    { id: 10, name: 'Mid Off', color: '#E76F51', startAngle: 260, endAngle: 280 },
    { id: 11, name: 'Covers', color: '#F4A261', startAngle: 280, endAngle: 310 },
    { id: 12, name: 'Gully', color: '#9B5DE5', startAngle: 310, endAngle: 350 },
  ];

  // Create pan responder to handle touch events
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouch(locationX, locationY);
    },
    onPanResponderMove: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleTouch(locationX, locationY);
    },
  });

  const handleTouch = (x, y) => {
    const centerX = 150;
    const centerY = 150;
    
    // Calculate angle from center to touch point
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    
    // Calculate distance from center
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Find which zone was touched
    const zone = zones.find(z => {
      // Handle the wrap-around case for zones that cross 360°
      if (z.startAngle > z.endAngle) {
        return angle >= z.startAngle || angle < z.endAngle;
      }
      return angle >= z.startAngle && angle < z.endAngle;
    });
    
    if (zone && distance <= 140) { // Only register touches within the wheel
      setLastTouch({ x, y, zone: zone.name });
      
      // Set the current shot
      setCurrentShot({
        id: Date.now(),
        zone: zone.id,
        angle: angle,
        distance: distance,
        timestamp: Date.now(),
      });
    }
  };

  const clearShot = () => {
    setCurrentShot(null);
    setLastTouch(null);
  };

  const renderZone = (zone) => {
    const centerX = 150;
    const centerY = 150;
    const radius = 140;
    
    // Calculate path for each zone
    const startAngleRad = (zone.startAngle * Math.PI) / 180;
    const endAngleRad = (zone.endAngle * Math.PI) / 180;
    
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = zone.endAngle - zone.startAngle <= 180 ? "0" : "1";
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'Z'
    ].join(' ');

    return (
      <G key={zone.id}>
        <Path
          d={pathData}
          fill={`${zone.color}80`} // 80 = 50% opacity
          stroke="#FFF"
          strokeWidth="1"
        />
        {/* Zone label */}
        <SvgText
          x={centerX + (radius * 0.7) * Math.cos(((zone.startAngle + zone.endAngle) / 2) * Math.PI / 180)}
          y={centerY + (radius * 0.7) * Math.sin(((zone.startAngle + zone.endAngle) / 2) * Math.PI / 180)}
          fill="#000"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          {zone.name}
        </SvgText>
      </G>
    );
  };

  const renderShotMarker = () => {
    if (!currentShot) return null;
    
    const centerX = 150;
    const centerY = 150;
    const shotDistance = Math.min(currentShot.distance, 130); // Limit to wheel radius
    
    const shotX = centerX + shotDistance * Math.cos(currentShot.angle * Math.PI / 180);
    const shotY = centerY + shotDistance * Math.sin(currentShot.angle * Math.PI / 180);
    
    const zone = zones.find(z => z.id === currentShot.zone);
    
    return (
      <G>
        {/* Line from center to shot point */}
        <Line
          x1={centerX}
          y1={centerY}
          x2={shotX}
          y2={shotY}
          stroke={zone.color}
          strokeWidth="2"
        />
        {/* Circle at shot point */}
        <Circle
          cx={shotX}
          cy={shotY}
          r="8"
          fill={zone.color}
          stroke="#000"
          strokeWidth="1"
        />
      </G>
    );
  };

  const renderLastTouchIndicator = () => {
    if (!lastTouch) return null;
    
    return (
      <G>
        {/* Zone label at touch point */}
        <SvgText
          x={lastTouch.x}
          y={lastTouch.y - 15}
          fill="#000"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {lastTouch.zone}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cricket Wagon Wheel - Shot Direction</Text>
      
      <View style={styles.wheelContainer} {...panResponder.panHandlers}>
        <Svg height="300" width="300">
          {/* Draw pitch in the center (shorter) */}
          <Rect x="145" y="110" width="10" height="80" fill="#8B4513" />
          
          {/* Draw zones */}
          {zones.map(zone => renderZone(zone))}
          
          {/* Draw batsman position */}
          <Circle cx="150" cy="150" r="8" fill="#000" />
          
          {/* Draw shot marker */}
          {renderShotMarker()}
          
          {/* Draw last touch indicator */}
          {renderLastTouchIndicator()}
        </Svg>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {lastTouch ? `Shot direction: ${lastTouch.zone}` : 'Touch the wheel to set shot direction'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.clearButton} onPress={clearShot}>
          <Text style={styles.clearButtonText}>Clear Shot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 150,
    width: 300,
    height: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 18,
    marginBottom: 5,
    color: '#333',
    fontWeight: '500',
  },
  controls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default WagonWheel;