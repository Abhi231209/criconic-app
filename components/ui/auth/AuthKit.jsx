import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, ArrowRight, Check, Compass, Eye, EyeOff, X } from "lucide-react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import AppKeyboardAwareScrollView from "@/components/ui/custom/AppKeyboardAwareScrollView";

// Brand palette (brand/README.md). The sign-in, sign-up and password-reset
// screens always use the dark brand ground, whatever the app theme.
export const BRAND = {
  ink: "#0A0F1C",
  ink2: "#16203A",
  teal: "#4DD6C7",
  tealLight: "#8CE9DD",
  tealDark: "#22A99B",
  cream: "#F2F6FB",
  slate: "#A9B4C6",
  placeholder: "#6B7891",
  field: "rgba(255,255,255,0.05)",
  fieldFocus: "rgba(77,214,199,0.08)",
  line: "rgba(255,255,255,0.10)",
  success: "#34D399",
  danger: "#FB7185",
};

/**
 * Screen shell: ink background with a faded stadium and a teal ring echoing
 * the logo's swing, light status bar, and a keyboard-aware scroll that only
 * scrolls when the content can't fit. The top bar shows a back button when
 * `onBack` is given, otherwise `topLeft`.
 */
export function AuthScreen({ onBack, topLeft, topRight, scrollRef, children }) {
  const isFocused = useIsFocused();

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND.ink }}>
      {isFocused && <StatusBar style="light" />}

      <ImageBackground
        source={require("../../../assets/stadium-background-image.jpg")}
        resizeMode="cover"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360, opacity: 0.22 }}
      />
      <LinearGradient
        colors={["rgba(10,15,28,0.35)", BRAND.ink, BRAND.ink2]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.ring} />

      <SafeAreaView className="flex-1">
        <AppKeyboardAwareScrollView
          ref={scrollRef}
          extraHeight={80}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {(onBack || topLeft || topRight) && (
            <View className="flex-row items-center justify-between pt-4">
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  activeOpacity={0.75}
                  accessibilityLabel="Back"
                  className="w-10 h-10 rounded-full items-center justify-center border"
                  style={{ borderColor: BRAND.line, backgroundColor: BRAND.field }}
                >
                  <ArrowLeft size={20} color={BRAND.cream} strokeWidth={2.4} />
                </TouchableOpacity>
              ) : (
                topLeft || <View />
              )}
              {topRight}
            </View>
          )}
          {children}
        </AppKeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Top-right pill that skips sign-in. */
export function GuestPill({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center px-3.5 py-2 rounded-full border"
      style={{ borderColor: BRAND.line, backgroundColor: BRAND.field }}
    >
      <Compass size={14} color={BRAND.slate} style={{ marginRight: 6 }} />
      <ThemedText className="text-[13px] font-bold" style={{ color: BRAND.cream }}>
        Explore as Guest
      </ThemedText>
    </TouchableOpacity>
  );
}

/** Screen title with an optional teal second line and a short explainer. */
export function AuthHeading({ title, accent, subtitle, className = "mt-8 mb-6" }) {
  return (
    <View className={className}>
      <ThemedText className="text-[34px] leading-[36px] font-black" style={{ color: BRAND.cream }}>
        {title}
      </ThemedText>
      {accent ? (
        <ThemedText className="text-[34px] leading-[38px] font-black" style={{ color: BRAND.teal }}>
          {accent}
        </ThemedText>
      ) : null}
      {subtitle ? (
        typeof subtitle === "string" ? (
          <ThemedText className="text-base font-medium mt-2 leading-5" style={{ color: BRAND.slate }}>
            {subtitle}
          </ThemedText>
        ) : (
          <View className="mt-2">{subtitle}</View>
        )
      ) : null}
    </View>
  );
}

/**
 * Labelled input. `prefix` shows "+91" before a phone number, `secure` adds a
 * show/hide toggle, and `right` puts a control (e.g. "Get OTP") at the end.
 */
export const AuthField = React.forwardRef(function AuthField(
  { label, labelRight, icon: Icon, prefix, secure, right, editable = true, className = "mb-4", ...inputProps },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const iconColor = focused ? BRAND.teal : BRAND.slate;

  return (
    <View className={className}>
      {(label || labelRight) && (
        <View className="flex-row items-center justify-between mb-1.5">
          <ThemedText className="text-sm font-bold" style={{ color: BRAND.slate }}>
            {label}
          </ThemedText>
          {labelRight}
        </View>
      )}
      <View
        className="flex-row items-center rounded-2xl border"
        style={{
          minHeight: 54,
          backgroundColor: focused ? BRAND.fieldFocus : BRAND.field,
          borderColor: focused ? BRAND.teal : BRAND.line,
          opacity: editable ? 1 : 0.75,
        }}
      >
        {prefix ? (
          <View
            className="flex-row items-center self-stretch px-3.5 border-r"
            style={{ borderColor: BRAND.line }}
          >
            {Icon ? <Icon size={16} color={iconColor} style={{ marginRight: 8 }} /> : null}
            <ThemedText className="text-base font-bold" style={{ color: BRAND.cream }}>
              {prefix}
            </ThemedText>
          </View>
        ) : Icon ? (
          <Icon size={16} color={iconColor} style={{ marginLeft: 14 }} />
        ) : null}
        <TextInput
          ref={ref}
          className={prefix ? "flex-1 px-3.5" : "flex-1 px-3"}
          style={[styles.input, { color: BRAND.cream }]}
          placeholderTextColor={BRAND.placeholder}
          secureTextEntry={secure && !revealed}
          editable={editable}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {secure ? (
          <TouchableOpacity
            onPress={() => setRevealed((prev) => !prev)}
            className="p-2 mr-1.5"
            activeOpacity={0.7}
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? (
              <EyeOff size={18} color={BRAND.slate} />
            ) : (
              <Eye size={18} color={BRAND.slate} />
            )}
          </TouchableOpacity>
        ) : null}
        {right ? <View className="mr-2">{right}</View> : null}
      </View>
    </View>
  );
});

/** Small teal pill button that sits inside a field (Get OTP, Verify). */
export function FieldAction({ label, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className="px-3 py-2 rounded-xl"
      style={{
        backgroundColor: disabled ? BRAND.line : BRAND.teal,
        minWidth: 76,
        alignItems: "center",
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={BRAND.ink} />
      ) : (
        <ThemedText
          className="text-sm font-black"
          style={{ color: disabled ? BRAND.slate : BRAND.ink }}
        >
          {label}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

/** Primary teal call to action. */
export function AuthButton({ label, onPress, loading, disabled, className = "mt-6" }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.88}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        shadowColor: BRAND.teal,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: disabled ? 0 : 0.25,
        shadowRadius: 14,
        elevation: disabled ? 0 : 6,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <LinearGradient
        colors={[BRAND.tealLight, BRAND.teal, BRAND.tealDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="items-center justify-center flex-row"
        style={{ height: 56 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={BRAND.ink} />
        ) : (
          <>
            <ThemedText className="text-lg font-black mr-2" style={{ color: BRAND.ink }}>
              {label}
            </ThemedText>
            <ArrowRight size={18} color={BRAND.ink} strokeWidth={2.75} />
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/** "New to Criconic? Create an account" style line. */
export function AuthFooterLink({ text, linkText, onPress, className = "mt-5" }) {
  return (
    <View className={`flex-row items-center justify-center ${className}`}>
      <ThemedText className="text-base font-medium" style={{ color: BRAND.slate }}>
        {text}
      </ThemedText>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} hitSlop={8}>
        <ThemedText className="text-base font-black ml-1.5" style={{ color: BRAND.teal }}>
          {linkText}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

/** Teal text link, e.g. "Forgot password?" beside a field label. */
export function AuthTextLink({ label, onPress, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} hitSlop={8}>
      <ThemedText
        className="text-sm font-bold"
        style={{ color: disabled ? BRAND.slate : BRAND.teal }}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const RESET_STEPS = ["Mobile", "Verify", "New password"];

/** Progress for the password-reset flow: 0 = mobile, 1 = code, 2 = new password. */
export function ResetSteps({ current }) {
  return (
    <View className="flex-row mt-6">
      {RESET_STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <View key={label} className="flex-1 mr-2">
            <View
              className="h-1 rounded-full"
              style={{
                backgroundColor: isDone ? BRAND.tealDark : isActive ? BRAND.teal : BRAND.line,
              }}
            />
            <View className="flex-row items-center mt-1.5">
              {isDone ? <Check size={12} color={BRAND.teal} strokeWidth={3} /> : null}
              <ThemedText
                numberOfLines={1}
                className={`text-xs font-bold ${isDone ? "ml-1" : ""}`}
                style={{ color: isActive ? BRAND.cream : isDone ? BRAND.teal : BRAND.placeholder }}
              >
                {label}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Pass/fail chip, e.g. "At least 6 characters". `ok` undefined = not checked yet. */
export function CheckChip({ ok, label }) {
  const color = ok === undefined ? BRAND.slate : ok ? BRAND.success : BRAND.danger;
  const Icon = ok === false ? X : Check;
  return (
    <View
      className="flex-row items-center px-2.5 py-1 rounded-full border mr-2 mb-2"
      style={{ borderColor: ok === undefined ? BRAND.line : color }}
    >
      <Icon size={12} color={color} strokeWidth={3} />
      <ThemedText className="text-[13px] font-bold ml-1" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    // Lets the input shrink beside a "Get OTP" button (web inputs keep a default width)
    minWidth: 0,
    fontFamily: "DarkerGrotesque_600SemiBold",
    fontSize: 17,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    // The field border already shows focus; drop the browser's outline on web
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : null),
  },
  ring: {
    position: "absolute",
    top: -140,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 28,
    borderColor: "rgba(77,214,199,0.08)",
  },
});
