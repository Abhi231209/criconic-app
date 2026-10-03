import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Lock, Phone } from "lucide-react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useNavigation, useIsFocused, useRoute } from "@react-navigation/native";
import { takePendingAuthAction } from "@/hooks/useRequireAuth";
import { useDispatch, useSelector } from "react-redux";
import { showGlobalAlert } from "@/contexts/AlertContext";
import CriconicLogo from "@/components/ui/custom/CriconicLogo";
import {
  BRAND,
  AuthScreen,
  GuestPill,
  AuthField,
  AuthButton,
  AuthFooterLink,
  AuthTextLink,
} from "@/components/ui/auth/AuthKit";

import SCREENS from ".";
import { login as loginAction } from "@/redux/authSlice";
import { authApi } from "@/utils/api";
import User from "@/utils/User";
import { shouldAskToCompleteProfile } from "@/utils/profileSetup";
import analytics from "@/utils/analytics";

const sanitizeMobileNumber = (val) => {
  if (!val) return "";
  let digits = String(val).replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
};

const LoginScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const route = useRoute();
  const dispatch = useDispatch();

  const authUser = useSelector((state) => state?.auth?.user);

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Short phones drop the feature chips so the form still fits without scrolling.
  const { height: windowHeight } = useWindowDimensions();
  const isCompact = windowHeight < 720;

  // Leaves this screen once logged in. Both a successful sign-in and the
  // already-logged-in check below call it, so it only acts once.
  const leftRef = useRef(false);
  const leaveLoggedIn = async (user) => {
    if (leftRef.current) return;
    leftRef.current = true;
    // Opened from a "Sign in required" prompt: back to that screen, then do
    // what the user was trying to do.
    if (route.params?.returnTo && navigation.canGoBack()) {
      const pendingAction = takePendingAuthAction();
      navigation.goBack();
      if (pendingAction) setTimeout(pendingAction, 300);
      return;
    }
    if (await shouldAskToCompleteProfile(user)) {
      navigation.replace(SCREENS.CompleteProfile, { user });
    } else {
      navigation.replace(SCREENS.Home);
    }
  };

  // Auto-redirect if already logged in AND LoginScreen is the active focused screen
  useEffect(() => {
    if (!isFocused) return;
    if (User.isLogin() || authUser?._id || authUser?.id) {
      leaveLoggedIn(authUser || User.user);
    }
  }, [authUser, navigation, isFocused]);

  const passwordInputRef = useRef(null);

  const handleLogin = async () => {
    const cleanedMobile = sanitizeMobileNumber(mobile);
    if (!cleanedMobile) {
      showGlobalAlert({
        title: "Mobile Number Required",
        message: "Please enter your 10-digit mobile number.",
        type: "warning",
      });
      return;
    }

    if (cleanedMobile.length !== 10) {
      showGlobalAlert({
        title: "Invalid Mobile Number",
        message: "Mobile number must be exactly 10 digits.",
        type: "warning",
      });
      return;
    }

    if (!password.trim()) {
      showGlobalAlert({
        title: "Password Required",
        message: "Please enter your password.",
        type: "warning",
      });
      return;
    }

    setIsLoading(true);

    analytics.logAction("login_attempt", "authentication", {
      method: "password",
    });

    try {
      const res = await authApi.login({
        mobile: cleanedMobile,
        password: password.trim(),
      });

      if (res?.data?.success || res?.status === 200) {
        const loginToken = res?.data?.access_token || res?.data?.token;
        let user = res?.data?.user;

        // If login response doesn't contain user data,
        // fetch the current user from checkStatus.
        if (!user || (!user._id && !user.id)) {
          const statusRes = await authApi.checkStatus();

          user =
            statusRes?.data?.user ||
            res?.data?.user || {
              mobile: mobile.trim(),
            };
        }

        if (loginToken && user) {
          user = {
            ...user,
            access_token: loginToken,
            token: loginToken,
          };
        }

        console.log(
          "🔐 [LoginScreen] Logged in successfully:",
          user?._id || user?.id,
          user?.username
        );

        analytics.logLogin(
          "password",
          user?._id || user?.id
        );

        dispatch(loginAction(user));
        User.login(user);
        await leaveLoggedIn(user);
      } else {
        const message =
          res?.data?.message ||
          "Invalid mobile or password. Please try again.";

        analytics.logAction("login_failed", "authentication", {
          reason: message,
        });

        showGlobalAlert({
          title: "Login Failed",
          message,
          type: "error",
        });
      }
    } catch (err) {
      const message = err?.message || "Something went wrong.";

      analytics.logAction("login_failed", "authentication", {
        reason: message,
      });

      showGlobalAlert({
        title: "Login Error",
        message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    analytics.logAction("navigate_to_signup", "navigation");
    navigation.navigate(SCREENS.SignUpScreen);
  };

  const handleForgotPassword = () => {
    navigation.navigate(SCREENS.ForgotPasswordScreen);
  };

  return (
    <AuthScreen
      topLeft={
        // The PNG has side padding; pull it back onto the 24px gutter
        <CriconicLogo variant="horizontal" theme="dark" width={128} style={{ marginLeft: -12 }} />
      }
      topRight={<GuestPill onPress={() => navigation.navigate(SCREENS.Home)} />}
    >

      {/* Pitch */}
      <View className={isCompact ? "mt-6" : "mt-10"}>
        <ThemedText className="text-[40px] leading-[40px] font-black" style={{ color: BRAND.cream }}>
          Every ball.
        </ThemedText>
        <ThemedText className="text-[40px] leading-[42px] font-black" style={{ color: BRAND.teal }}>
          Every stat.
        </ThemedText>
        <ThemedText className="text-base font-medium mt-3 leading-5" style={{ color: BRAND.slate }}>
          Where every score tells a story. Score live, run tournaments and see your stats free, always.
        </ThemedText>

        {!isCompact && (
          <View className="flex-row flex-wrap mt-4">
            {["Wagon wheel", "Pitch map", "Matchups"].map((label) => (
              <View
                key={label}
                className="flex-row items-center px-3 py-1.5 rounded-full mr-2 mb-2 border"
                style={{ borderColor: BRAND.line }}
              >
                <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: BRAND.teal }} />
                <ThemedText className="text-[13px] font-bold" style={{ color: BRAND.cream }}>
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="flex-1 min-h-[24px]" />

      {/* Sign-in form */}
      <ThemedText
        className={`text-2xl font-black ${isCompact ? "mb-2" : "mb-4"}`}
        style={{ color: BRAND.cream }}
      >
        Sign in
      </ThemedText>
      <AuthField
        label="Mobile number"
        icon={Phone}
        prefix="+91"
        value={mobile}
        onChangeText={(val) => setMobile(sanitizeMobileNumber(val))}
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        maxLength={18}
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />
      <AuthField
        ref={passwordInputRef}
        className=""
        label="Password"
        labelRight={<AuthTextLink label="Forgot password?" onPress={handleForgotPassword} />}
        icon={Lock}
        secure
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />
      <AuthButton label="Sign in" onPress={handleLogin} loading={isLoading} />
      <AuthFooterLink text="New to Criconic?" linkText="Create an account" onPress={handleSignUp} />
    </AuthScreen>
  );
};

export default LoginScreen;
