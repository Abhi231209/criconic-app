import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Dimensions } from "react-native";
import ThemedText from "./custom/ThemedText";

export default function Marquee({ description, children, className, textClassName, textStyle }) {
  const windowWidth = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(0)).current;
  const textRef = useRef(null);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (textWidth > containerWidth) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
      translateX.setValue(0);
    }
  }, [textWidth, containerWidth, translateX]);

  useEffect(() => {
    if (shouldAnimate) {
      const distance = textWidth + containerWidth;

      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: -distance,
            duration: distance * 20, // adjust speed here (higher = slower)
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: containerWidth,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [shouldAnimate, translateX, textWidth, containerWidth]);

  return (
    <View
      className="overflow-hidden"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.Text
        ref={textRef}
        className="whitespace-nowrap"
        onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        style={[{ transform: [{ translateX }] }, textStyle]}
      >
        {children ? (
          children
        ) : (
          <ThemedText
            className={textClassName || className}
            style={textStyle}
          >
            {description}
          </ThemedText>
        )}
      </Animated.Text>
    </View>
  );
}
