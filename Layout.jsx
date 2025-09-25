// components/Layout.js
import React from "react";
import { View, StyleSheet } from "react-native";
import NavBar from "./components/ui/NavBar";
import AnimatedFooter from "./components/ui/AnimatedFooter";


const Layout = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Navbar at top */}
      <NavBar />

      {/* Main content with marginBottom so footer is visible */}
      <View style={styles.content}>{children}</View>

      {/* Footer fixed at bottom */}
      <AnimatedFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 60, // adjust height = footer height
  },
});

export default Layout;
