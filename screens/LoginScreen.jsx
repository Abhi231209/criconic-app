import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { Button } from "@gluestack-ui/themed";
import { LinearGradient } from "expo-linear-gradient";
import ThemedText from "@/components/ui/custom/ThemedText";
import GradientButton from "@/components/ui/custom/GradientButton";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from 'expo-blur';
import SCREENS from ".";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === "dark");

  const toggleTheme = () => setIsDark(!isDark);
  const keyboardOffset = Platform.select({ ios: 60, android: 0 });

  return (
    <SafeAreaView className="flex-1">
      {/* Background Gradient */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View
        // colors={isDark ? ['#111827', '#1F2937'] : ['#c084fc', '#60a5fa']}
        // className="flex-1 justify-center"
        >
          {/* <ScrollView showsVerticalScrollIndicator={false}> */}
          <View className=" w-full rounded-3xl  shadow-2xl bg-white dark:bg-gray-900">
            {/* Status Bar */}

            {/* Header */}
             <LinearGradient
            colors={isDark ? ["#7e22ce", "#2563eb"] : ["#a855f7", "#3b82f6"]}
            className="px-6 pt-4 pb-8 flex items-center relative"
            style={{
              height: "35%",
              // flex: 1, // Ensures the container takes up full available space
              // justifyContent: "center", // Centers content vertically
              // alignItems: "center",
            }}
          > 
           {/* <BlurView
              blurType="light"
              blurAmount={20}
              reducedTransparencyFallbackColor="white"
              className="px-6 pt-4 pb-8 w-11/12 rounded-2xl overflow-hidden"
            >*/}
              <View className="items-center space-y-4">
                <View className="flex-row items-center justify-center gap-3">
                  <ThemedText className="text-xl text-white">
                    Don't have an account?
                  </ThemedText>
                  <TouchableOpacity>
                    <ThemedText className="text-xl text-white underline">
                      Get Started
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <ThemedText className="text-white text-4xl font-bold text-center mt-2">
                  Criconic
                </ThemedText>
              </View>
            </LinearGradient>

            {/* Form */}
            <View
              style={{
                height: "70%",
                paddingHorizontal: 24,
                paddingVertical: 32,
                marginTop: -16,
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
              }}
              className="bg-background"
            >
              <View
                className="items-center mb-8"
                style={{ borderTopLeftRadius: 14 }}
              >
                <ThemedText className="text-3xl text-center pb-2 font-bold text-gray-900 dark:text-white mb-2">
                  Welcome Back
                </ThemedText>
                <ThemedText className="text-xl text-center w-full text-gray-600 pb-2 dark:text-gray-400">
                  Enter your details below
                </ThemedText>
              </View>

              {/* Email */}
              <View
                className="rounded-xl"
                style={{
                  marginBottom: 24,
                  borderWidth: 0.5,
                  borderColor: "black",
                  padding: 4,
                  marginTop: 20,
                }}
              >
                <ThemedText className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mobile
                </ThemedText>
                <TextInput
                  className="w-full  bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white"
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Enter your Mobile"
                  keyboardType="tel-country-code"
                  style={{
                    fontSize: 14,
                    fontFamily: "DarkerGrotesque_400Regular",
                    // color: "rgba(37, 37, 37, 1)",
                  }}
                />
              </View>

              {/* Password */}
              <View
                className="rounded-xl"
                style={{
                  marginBottom: 24,
                  borderWidth: 0.5,
                  borderColor: "black",
                  padding: 4,
                }}
              >
                <ThemedText className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </ThemedText>
                <View
                  className="flex-row items-center"
                  style={{ paddingRight: 30 }}
                >
                  <TextInput
                    className="w-full pr-12 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    style={{
                      fontSize: 14,
                      fontFamily: "DarkerGrotesque_400Regular",
                      // color: "rgba(37, 37, 37, 1)",
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In */}
              {/* <TouchableOpacity className="rounded-xl overflow-hidden mt-2 mb-4">
                <LinearGradient
                  colors={["#a855f7", "#3b82f6"]}
                  className="py-3 items-center justify-center"
                >
                  <ThemedText className="text-white font-medium text-center">
                    Sign In
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity> */}
              {/* <GradientButton textClass="text-xl">Sign In</GradientButton> */}
              <Button
                onPress={() => {
                  // navigation.replace("MainDrawer");
                  navigation.navigate(SCREENS.Home);
                }}
              >
                <ThemedText className="text-xl font-semibold text-white">
                  Sign In
                </ThemedText>
              </Button>

              {/* Forgot password */}

              <View style={{ marginTop: 15 }}>
                <TouchableOpacity>
                  <ThemedText className="text-xl text-center w-full text-gray-600 dark:text-gray-400">
                    Skip login
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 15 }}>
                <TouchableOpacity>
                  <ThemedText className="text-xl text-center w-full text-gray-600 dark:text-gray-400">
                    Forgot your password?
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              {/* <View className="my-8 relative items-center">
                <View className="absolute w-full h-px bg-gray-200 dark:bg-gray-700" />
                <View className="bg-white dark:bg-gray-900 px-4 z-10">
                  <ThemedText className="text-sm text-gray-500 dark:text-gray-400">
                    Or sign in with
                  </ThemedText>
                </View>
              </View> */}

              {/* Social Buttons */}
              {/* <View className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full py-3 rounded-xl flex-row items-center justify-center space-x-2"
                >
                  <ThemedText className="font-medium text-gray-700 dark:text-gray-300">
                    Google
                  </ThemedText>
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-3 rounded-xl flex-row items-center justify-center space-x-2"
                >
                  <ThemedText className="font-medium text-gray-700 dark:text-gray-300">
                    Facebook
                  </ThemedText>
                </Button>
              </View> */}
            </View>
          </View>

          {/* Theme Toggle */}
          {/* <View className="mt-6 items-center">
            <Button
              variant="outline"
              onPress={toggleTheme}
              className="rounded-xl px-6 bg-white/20 border-white/30"
            >
              <ThemedText className="text-white">
                {isDark ? "Light Mode" : "Dark Mode"}
              </ThemedText>
            </Button>
          </View> */}
          {/* </ScrollView> */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
