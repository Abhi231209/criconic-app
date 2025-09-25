import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
  Animated,
} from 'react-native';
import Svg, {
  Rect,
  Line,
  Circle,
  Ellipse,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
} from 'react-native-svg';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PitchMap = () => {
  const [pitchPoint, setPitchPoint] = useState(null);
  const [shotPoint, setShotPoint] = useState(null);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [ballData, setBallData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(screenWidth));
  const [settings, setSettings] = useState({
    showGrid: true,
    showMeasurements: true,
    showTrajectory: true,
    ballSize: 8,
    trajectoryThickness: 3,
    showShadows: true,
    show3DEffect: true,
    measurementUnit: 'metric',
    pitchType: 'hard',
    showBoundary: true,
  });

  const calculateBallData = (pitchPos, shotPos) => {
    // Convert screen coordinates to cricket pitch measurements
    const pitchLength = 22; // yards
    const pitchWidth = 10; // feet
    
    // Calculate pitch impact position (relative to pitch dimensions)
    const pitchTopY = vanishingPointY;
    const pitchBottomY = screenHeight * 0.9;
    const pitchLeftX = screenWidth * 0.3;
    const pitchRightX = screenWidth * 0.7;
    
    // Normalize pitch position (0-1 scale)
    const normalizedX = (pitchPos.x - pitchLeftX) / (pitchRightX - pitchLeftX);
    const normalizedY = (pitchPos.y - pitchTopY) / (pitchBottomY - pitchTopY);
    
    // Convert to cricket measurements
    const impactFromStumps = normalizedY * pitchLength; // yards from bowler's end
    const impactFromCenter = (normalizedX - 0.5) * pitchWidth; // feet from center line
    
    // Calculate ball height after bounce
    const bounceHeight = Math.abs(pitchPos.y - shotPos.y);
    const maxScreenHeight = screenHeight * 0.6; // Maximum possible height on screen
    const normalizedHeight = bounceHeight / maxScreenHeight;
    const ballHeightFeet = normalizedHeight * 8; // Max realistic ball height ~8 feet
    
    // Calculate bounce angle and distance
    const horizontalDistance = Math.abs(shotPos.x - pitchPos.x);
    const bounceDistance = Math.sqrt(horizontalDistance * horizontalDistance + bounceHeight * bounceHeight);
    const bounceAngle = Math.atan2(bounceHeight, horizontalDistance) * (180 / Math.PI);
    
    return {
      impactPoint: {
        fromStumps: impactFromStumps.toFixed(1),
        fromCenter: impactFromCenter.toFixed(1),
        coordinates: { x: normalizedX.toFixed(2), y: normalizedY.toFixed(2) }
      },
      ballHeight: {
        feet: ballHeightFeet.toFixed(1),
        meters: (ballHeightFeet * 0.3048).toFixed(2)
      },
      bounceData: {
        angle: bounceAngle.toFixed(1),
        distance: (bounceDistance / 50).toFixed(1) // Normalized distance
      }
    };
  };

  const handleTouch = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    
    if (!pitchPoint) {
      setPitchPoint({ x: locationX, y: locationY });
      setShowTrajectory(true);
    } else if (!shotPoint) {
      const newShotPoint = { x: locationX, y: locationY };
      setShotPoint(newShotPoint);
      
      // Calculate ball data
      const data = calculateBallData(pitchPoint, newShotPoint);
      setBallData(data);
      
      // Log the data for external use
      console.log('Ball Impact Data:', {
        timestamp: new Date().toISOString(),
        pitchImpact: {
          screenCoordinates: { x: pitchPoint.x, y: pitchPoint.y },
          cricketMeasurements: {
            yardsFromStumps: data.impactPoint.fromStumps,
            feetFromCenter: data.impactPoint.fromCenter,
            normalizedPosition: data.impactPoint.coordinates
          }
        },
        ballHeight: {
          afterBounce: {
            feet: data.ballHeight.feet,
            meters: data.ballHeight.meters
          },
          bounceAngle: data.bounceData.angle,
          bounceDistance: data.bounceData.distance
        },
        shotPoint: {
          screenCoordinates: { x: newShotPoint.x, y: newShotPoint.y }
        }
      });
    } else {
      setPitchPoint({ x: locationX, y: locationY });
      setShotPoint(null);
      setBallData(null);
      setShowTrajectory(true);
    }
  };

  const clearAll = () => {
    setPitchPoint(null);
    setShotPoint(null);
    setShowTrajectory(false);
    setBallData(null);
  };

  // 3D Perspective calculations
  const perspective = 0.6;
  const vanishingPointY = screenHeight * 0.2;
  
  // 3D Pitch coordinates (perspective view)
  const pitchTop = {
    left: { x: screenWidth * 0.3, y: vanishingPointY },
    right: { x: screenWidth * 0.7, y: vanishingPointY }
  };
  
  const pitchBottom = {
    left: { x: screenWidth * 0.1, y: screenHeight * 0.9 },
    right: { x: screenWidth * 0.9, y: screenHeight * 0.9 }
  };

  // Bowler position (far end, smaller due to perspective)
  const bowlerPos = { x: screenWidth / 2, y: vanishingPointY + 20 };
  
  // Batsman position (near end, larger)
  const batsmanPos = { x: screenWidth / 2, y: screenHeight * 0.8 };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <TouchableOpacity 
        style={styles.fullScreenTouch}
        onPress={handleTouch}
        activeOpacity={1}
      >
        <Svg width={screenWidth} height={screenHeight} style={styles.svg}>
          <Defs>
            {/* Sky gradient */}
            <LinearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#87CEEB" />
              <Stop offset="100%" stopColor="#E0F6FF" />
            </LinearGradient>
            
            {/* Field gradient with 3D effect */}
            <LinearGradient id="fieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#228B22" />
              <Stop offset="50%" stopColor="#32CD32" />
              <Stop offset="100%" stopColor="#006400" />
            </LinearGradient>
            
            {/* Pitch gradient */}
            <LinearGradient id="pitchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#DEB887" />
              <Stop offset="50%" stopColor="#D2B48C" />
              <Stop offset="100%" stopColor="#A0522D" />
            </LinearGradient>
          </Defs>
          
          {/* Sky Background */}
          <Rect
            x="0"
            y="0"
            width={screenWidth}
            height={screenHeight * 0.3}
            fill="url(#skyGradient)"
          />
          
          {/* 3D Cricket Field */}
          <Path
            d={`M 0 ${screenHeight * 0.3}
                L 0 ${screenHeight}
                L ${screenWidth} ${screenHeight}
                L ${screenWidth} ${screenHeight * 0.3}
                L ${screenWidth * 0.8} ${vanishingPointY}
                L ${screenWidth * 0.2} ${vanishingPointY}
                Z`}
            fill="url(#fieldGradient)"
          />
          
          {/* 3D Cricket Pitch (perspective trapezoid) */}
          <Path
            d={`M ${pitchTop.left.x} ${pitchTop.left.y}
                L ${pitchTop.right.x} ${pitchTop.right.y}
                L ${pitchBottom.right.x} ${pitchBottom.right.y}
                L ${pitchBottom.left.x} ${pitchBottom.left.y}
                Z`}
            fill="url(#pitchGradient)"
            stroke="#8B4513"
            strokeWidth="2"
          />
          
          {/* 3D Pitch Lines */}
          {/* Bowling crease (far end) */}
          <Line
            x1={pitchTop.left.x + 20}
            y1={pitchTop.left.y + 5}
            x2={pitchTop.right.x - 20}
            y2={pitchTop.right.y + 5}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          
          {/* Batting crease (near end) */}
          <Line
            x1={pitchBottom.left.x + 50}
            y1={pitchBottom.left.y - 20}
            x2={pitchBottom.right.x - 50}
            y2={pitchBottom.right.y - 20}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          
          {/* Popping creases */}
          <Line
            x1={pitchTop.left.x + 15}
            y1={pitchTop.left.y + 15}
            x2={pitchTop.right.x - 15}
            y2={pitchTop.right.y + 15}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
          <Line
            x1={pitchBottom.left.x + 40}
            y1={pitchBottom.left.y - 40}
            x2={pitchBottom.right.x - 40}
            y2={pitchBottom.right.y - 40}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          
          {/* 3D Stumps - Bowler's End (smaller, perspective) */}
          <G>
            <Rect x={bowlerPos.x - 6} y={bowlerPos.y + 10} width="2" height="8" fill="#FFFFFF" />
            <Rect x={bowlerPos.x - 2} y={bowlerPos.y + 10} width="2" height="8" fill="#FFFFFF" />
            <Rect x={bowlerPos.x + 2} y={bowlerPos.y + 10} width="2" height="8" fill="#FFFFFF" />
            <Line x1={bowlerPos.x - 6} y1={bowlerPos.y + 10} x2={bowlerPos.x + 4} y2={bowlerPos.y + 10} stroke="#8B4513" strokeWidth="1" />
          </G>
          
          {/* 3D Stumps - Batsman's End (larger, closer) */}
          <G>
            <Rect x={batsmanPos.x - 12} y={batsmanPos.y - 10} width="4" height="15" fill="#FFFFFF" />
            <Rect x={batsmanPos.x - 4} y={batsmanPos.y - 10} width="4" height="15" fill="#FFFFFF" />
            <Rect x={batsmanPos.x + 4} y={batsmanPos.y - 10} width="4" height="15" fill="#FFFFFF" />
            <Line x1={batsmanPos.x - 12} y1={batsmanPos.y - 10} x2={batsmanPos.x + 8} y2={batsmanPos.y - 10} stroke="#8B4513" strokeWidth="2" />
          </G>
          
          {/* 3D Bowler Figure (smaller, distant) */}
          <G>
            {/* Shadow */}
            <Ellipse cx={bowlerPos.x + 2} cy={bowlerPos.y + 35} rx="8" ry="4" fill="rgba(0,0,0,0.3)" />
            {/* Body */}
            <Ellipse cx={bowlerPos.x} cy={bowlerPos.y + 25} rx="5" ry="12" fill="#FF6B35" />
            {/* Head */}
            <Circle cx={bowlerPos.x} cy={bowlerPos.y + 8} r="5" fill="#FFDBAC" />
            {/* Arms in bowling action */}
            <Path d={`M ${bowlerPos.x - 8} ${bowlerPos.y + 20} Q ${bowlerPos.x + 5} ${bowlerPos.y + 15} ${bowlerPos.x + 12} ${bowlerPos.y + 25}`} 
                  fill="none" stroke="#FFDBAC" strokeWidth="3" />
            {/* Legs */}
            <Line x1={bowlerPos.x - 3} y1={bowlerPos.y + 37} x2={bowlerPos.x - 5} y2={bowlerPos.y + 45} stroke="#FFDBAC" strokeWidth="3" />
            <Line x1={bowlerPos.x + 3} y1={bowlerPos.y + 37} x2={bowlerPos.x + 8} y2={bowlerPos.y + 42} stroke="#FFDBAC" strokeWidth="3" />
          </G>
          
          {/* 3D Batsman Figure (larger, closer) */}
          <G>
            {/* Shadow */}
            <Ellipse cx={batsmanPos.x + 3} cy={batsmanPos.y + 25} rx="15" ry="8" fill="rgba(0,0,0,0.4)" />
            {/* Body */}
            <Ellipse cx={batsmanPos.x} cy={batsmanPos.y - 5} rx="10" ry="25" fill="#4A90E2" />
            {/* Head */}
            <Circle cx={batsmanPos.x} cy={batsmanPos.y - 35} r="12" fill="#FFDBAC" />
            {/* Helmet with 3D effect */}
            <Path d={`M ${batsmanPos.x - 12} ${batsmanPos.y - 35} 
                      A 12 12 0 0 1 ${batsmanPos.x + 12} ${batsmanPos.y - 35}
                      L ${batsmanPos.x + 8} ${batsmanPos.y - 30}
                      L ${batsmanPos.x - 8} ${batsmanPos.y - 30} Z`} 
                  fill="#333" stroke="#555" strokeWidth="1" />
            {/* Face guard */}
            <Rect x={batsmanPos.x - 8} y={batsmanPos.y - 32} width="16" height="8" fill="none" stroke="#666" strokeWidth="1" />
            
            {/* Arms holding bat */}
            <Line x1={batsmanPos.x - 15} y1={batsmanPos.y - 15} x2={batsmanPos.x + 20} y2={batsmanPos.y - 5} stroke="#FFDBAC" strokeWidth="6" />
            
            {/* Cricket Bat (3D effect) */}
            <G>
              <Rect x={batsmanPos.x + 20} y={batsmanPos.y - 10} width="6" height="35" fill="#D2691E" stroke="#8B4513" strokeWidth="1" />
              <Rect x={batsmanPos.x + 20} y={batsmanPos.y + 25} width="6" height="12" fill="#654321" />
              {/* Bat handle grip */}
              <Rect x={batsmanPos.x + 21} y={batsmanPos.y + 25} width="4" height="8" fill="#000" />
            </G>
            
            {/* Legs with 3D pads */}
            <Line x1={batsmanPos.x - 8} y1={batsmanPos.y + 20} x2={batsmanPos.x - 12} y2={batsmanPos.y + 35} stroke="#FFDBAC" strokeWidth="6" />
            <Line x1={batsmanPos.x + 8} y1={batsmanPos.y + 20} x2={batsmanPos.x + 12} y2={batsmanPos.y + 35} stroke="#FFDBAC" strokeWidth="6" />
            
            {/* 3D Pads */}
            <Path d={`M ${batsmanPos.x - 18} ${batsmanPos.y + 5}
                      L ${batsmanPos.x - 8} ${batsmanPos.y + 5}
                      L ${batsmanPos.x - 8} ${batsmanPos.y + 25}
                      L ${batsmanPos.x - 20} ${batsmanPos.y + 25}
                      Z`} 
                  fill="#FFFFFF" stroke="#DDD" strokeWidth="1" />
            <Path d={`M ${batsmanPos.x + 8} ${batsmanPos.y + 5}
                      L ${batsmanPos.x + 18} ${batsmanPos.y + 5}
                      L ${batsmanPos.x + 20} ${batsmanPos.y + 25}
                      L ${batsmanPos.x + 8} ${batsmanPos.y + 25}
                      Z`} 
                  fill="#FFFFFF" stroke="#DDD" strokeWidth="1" />
          </G>
          
          {/* 3D Ball Trajectory */}
          {showTrajectory && pitchPoint && (
            <G>
              {/* Ball path from bowler to pitch point (3D arc) */}
              <Path
                d={`M ${bowlerPos.x} ${bowlerPos.y + 40} 
                    Q ${(bowlerPos.x + pitchPoint.x) / 2} ${(bowlerPos.y + pitchPoint.y) / 2 - 40} 
                    ${pitchPoint.x} ${pitchPoint.y}`}
                fill="none"
                stroke="#FF4444"
                strokeWidth="4"
                strokeDasharray="10,5"
              />
              
              {/* 3D Ball at pitch point */}
              <G>
                <Circle cx={pitchPoint.x + 2} cy={pitchPoint.y + 2} r="8" fill="rgba(255,0,0,0.3)" />
                <Circle cx={pitchPoint.x} cy={pitchPoint.y} r="8" fill="#FF0000" stroke="#FFFFFF" strokeWidth="2" />
                <Circle cx={pitchPoint.x - 2} cy={pitchPoint.y - 2} r="3" fill="#FF6666" />
                
                {/* Impact point crosshair */}
                <Line x1={pitchPoint.x - 15} y1={pitchPoint.y} x2={pitchPoint.x + 15} y2={pitchPoint.y} 
                      stroke="#FFFF00" strokeWidth="2" />
                <Line x1={pitchPoint.x} y1={pitchPoint.y - 15} x2={pitchPoint.x} y2={pitchPoint.y + 15} 
                      stroke="#FFFF00" strokeWidth="2" />
              </G>
              
              {/* Ball path from pitch to shot point */}
              {shotPoint && (
                <>
                  <Path
                    d={`M ${pitchPoint.x} ${pitchPoint.y} 
                        Q ${(pitchPoint.x + shotPoint.x) / 2} ${(pitchPoint.y + shotPoint.y) / 2 - 30} 
                        ${shotPoint.x} ${shotPoint.y}`}
                    fill="none"
                    stroke="#00FF00"
                    strokeWidth="4"
                    strokeDasharray="10,5"
                  />
                  
                  {/* 3D Ball at shot point */}
                  <G>
                    <Circle cx={shotPoint.x + 2} cy={shotPoint.y + 2} r="8" fill="rgba(0,255,0,0.3)" />
                    <Circle cx={shotPoint.x} cy={shotPoint.y} r="8" fill="#00FF00" stroke="#FFFFFF" strokeWidth="2" />
                    <Circle cx={shotPoint.x - 2} cy={shotPoint.y - 2} r="3" fill="#66FF66" />
                    
                    {/* Height indicator line */}
                    <Line x1={pitchPoint.x} y1={pitchPoint.y} x2={shotPoint.x} y2={shotPoint.y} 
                          stroke="#00FFFF" strokeWidth="2" strokeDasharray="3,3" />
                    
                    {/* Height measurement arc */}
                    <Path d={`M ${pitchPoint.x} ${pitchPoint.y} Q ${(pitchPoint.x + shotPoint.x) / 2} ${Math.min(pitchPoint.y, shotPoint.y) - 20} ${shotPoint.x} ${shotPoint.y}`}
                          fill="none" stroke="#FFFF00" strokeWidth="1" strokeDasharray="2,2" />
                  </G>
                </>
              )}
            </G>
          )}
          
          {/* 3D Instructions Panel */}
          <G>
            <Path d="M 15 15 L 220 15 L 215 75 L 10 75 Z" fill="rgba(0,0,0,0.8)" />
            <Text x="25" y="35" fill="#FFFFFF" fontSize="16" fontWeight="bold">
              {!pitchPoint ? "Tap where ball pitches" : 
               !shotPoint ? "Tap where batsman hits" : 
               "Tap for new ball"}
            </Text>
            <Text x="25" y="55" fill="#FFFF00" fontSize="12">
              🔴 Ball pitch | 🟢 Shot direction
            </Text>
          </G>
          
          {/* Ball Data Panel */}
          {ballData && (
            <G>
              <Path d={`M ${screenWidth - 250} 15 L ${screenWidth - 15} 15 L ${screenWidth - 20} 140 L ${screenWidth - 255} 140 Z`} 
                    fill="rgba(0,50,100,0.9)" stroke="#00AAFF" strokeWidth="2" />
              
              <Text x={screenWidth - 240} y="35" fill="#FFFFFF" fontSize="14" fontWeight="bold">
                📊 BALL DATA
              </Text>
              
              <Text x={screenWidth - 240} y="55" fill="#FFFF00" fontSize="12" fontWeight="bold">
                IMPACT POINT:
              </Text>
              <Text x={screenWidth - 240} y="70" fill="#FFFFFF" fontSize="11">
                {ballData.impactPoint.fromStumps}y from stumps
              </Text>
              <Text x={screenWidth - 240} y="85" fill="#FFFFFF" fontSize="11">
                {ballData.impactPoint.fromCenter}ft from center
              </Text>
              
              <Text x={screenWidth - 240} y="105" fill="#00FF00" fontSize="12" fontWeight="bold">
                BALL HEIGHT:
              </Text>
              <Text x={screenWidth - 240} y="120" fill="#FFFFFF" fontSize="11">
                {ballData.ballHeight.feet}ft ({ballData.ballHeight.meters}m)
              </Text>
              
              <Text x={screenWidth - 240} y="135" fill="#FF6666" fontSize="10">
                Angle: {ballData.bounceData.angle}°
              </Text>
            </G>
          )}
        </Svg>
      </TouchableOpacity>
      
      {/* 3D Clear Button */}
      <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
        <Text style={styles.clearButtonText}>CLEAR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenTouch: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
  clearButton: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PitchMap;