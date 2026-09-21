import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImagePlus,
  Upload,
  Code,
  Sparkles,
  Eye,
  Trash2,
  RefreshCw,
  Check,
  Type,
} from "lucide-react-native";
import RenderHtml from "react-native-render-html";
import ThemedText from "../custom/ThemedText";
import { upload } from "@/utils/api";
import { getImageFullUrl } from "@/utils";
import { COLORS } from "@/theme/colors";

// Preset Color Swatches for WYSIWYG Text Styling
const COLOR_OPTIONS = [
  { label: "White", value: "#FFFFFF", bg: "#FFFFFF", textLight: false },
  { label: "Gold", value: "#F59E0B", bg: "#F59E0B", textLight: false },
  { label: "Red", value: "#EF4444", bg: "#EF4444", textLight: true },
  { label: "Sky Blue", value: "#38BDF8", bg: "#38BDF8", textLight: false },
  { label: "Green", value: "#10B981", bg: "#10B981", textLight: true },
  { label: "Dark", value: "#0F172A", bg: "#0F172A", textLight: true },
];

// Container Theme Styles for Live Overlay
const CARD_THEMES = [
  {
    key: "glassDark",
    label: "Glass Dark",
    desc: "Frosted dark broadcast box",
    css: "background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 10px 14px;",
  },
  {
    key: "goldAccent",
    label: "Gold Accent",
    desc: "Premium golden border",
    css: "background: #111827; border: 1.5px solid #F59E0B; border-radius: 10px; padding: 10px 14px;",
  },
  {
    key: "cleanWhite",
    label: "Clean White",
    desc: "Solid bright card",
    css: "background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 10px 14px;",
  },
  {
    key: "transparent",
    label: "Transparent",
    desc: "Floating without box",
    css: "background: transparent; padding: 4px 6px;",
  },
];

// Broadcast Presets
const PRESETS = [
  {
    key: "poweredBy",
    label: "⚡ Powered By",
    badge: "POWERED BY",
    title: "Brand Name",
    subtitle: "Official Broadcast Sponsor",
    theme: "glassDark",
    color: "#FFFFFF",
  },
  {
    key: "officialPartner",
    label: "🏆 Official Partner",
    badge: "OFFICIAL PARTNER",
    title: "Partner Brand",
    subtitle: "Tournament Season 2025",
    theme: "goldAccent",
    color: "#F59E0B",
  },
  {
    key: "promoBanner",
    label: "🏷️ Promo Offer",
    badge: "SPECIAL OFFER",
    title: "Get 20% OFF",
    subtitle: "Use Code CRIC20 at Checkout",
    theme: "cleanWhite",
    color: "#0F172A",
  },
  {
    key: "logoOnly",
    label: "🖼️ Logo Focus",
    badge: "",
    title: "",
    subtitle: "",
    theme: "transparent",
    color: "#FFFFFF",
  },
];

export default function SponsorAdEditor({
  slot,
  config,
  onToggle,
  onChangeHtml,
  isDarkMode,
  colors: C,
}) {
  const { width } = useWindowDimensions();
  const previewWidth = Math.max(width - 64, 260);

  // Editor mode: "visual" (WYSIWYG) or "code" (HTML)
  const [editorMode, setEditorMode] = useState("visual");
  // Stream preview backdrop: "dark" or "light"
  const [previewBackdrop, setPreviewBackdrop] = useState("dark");
  // Upload status
  const [isUploading, setIsUploading] = useState(false);

  // Extract initial image URL from raw html if present
  const extractedImgUrl = useMemo(() => {
    const match = /<img[^>]+src=["']([^"']+)["']/i.exec(config?.html || "");
    return match ? match[1] : "";
  }, [config?.html]);

  // Visual WYSIWYG Form State
  const [visualState, setVisualState] = useState({
    title: "",
    subtitle: "",
    badge: "",
    imageUrl: "",
    imgSize: "banner", // "banner" | "logo" | "icon"
    isBold: true,
    isItalic: false,
    isUnderline: false,
    textAlign: "center", // "left" | "center" | "right"
    textSize: "medium", // "large" | "medium" | "small"
    textColor: "#FFFFFF",
    cardTheme: "glassDark",
  });

  // Synchronize initial raw HTML into visualState if applicable
  useEffect(() => {
    if (extractedImgUrl && !visualState.imageUrl) {
      setVisualState((prev) => ({ ...prev, imageUrl: extractedImgUrl }));
    }
  }, [extractedImgUrl]);

  // Helper to build HTML from visualState
  const constructHtml = useCallback((state) => {
    const {
      title,
      subtitle,
      badge,
      imageUrl,
      imgSize,
      isBold,
      isItalic,
      isUnderline,
      textAlign,
      textSize,
      textColor,
      cardTheme,
    } = state;

    // Theme CSS
    const themeObj = CARD_THEMES.find((t) => t.key === cardTheme) || CARD_THEMES[0];
    const containerCss = themeObj.css;

    // Image sizing CSS
    let imgCss = "max-height: 48px; object-fit: contain;";
    if (imgSize === "banner") {
      imgCss = "max-height: 56px; width: 100%; object-fit: contain; margin-bottom: 6px;";
    } else if (imgSize === "logo") {
      imgCss = "max-height: 42px; object-fit: contain; margin-bottom: 4px;";
    } else if (imgSize === "icon") {
      imgCss = "width: 32px; height: 32px; object-fit: contain; margin-bottom: 4px;";
    }

    // Font size & styles
    const fontSizes = {
      large: { title: "16px", sub: "12px", badge: "10px" },
      medium: { title: "14px", sub: "11px", badge: "9px" },
      small: { title: "12px", sub: "10px", badge: "8px" },
    };
    const curSizes = fontSizes[textSize] || fontSizes.medium;

    let textDecoration = isUnderline ? "underline" : "none";
    let fontStyle = isItalic ? "italic" : "normal";
    let fontWeight = isBold ? "bold" : "normal";

    const parts = [];

    // Badge
    if (badge && badge.trim()) {
      parts.push(
        `<div style="display:inline-block; font-size:${curSizes.badge}; font-weight:bold; letter-spacing:1px; background:${
          cardTheme === "cleanWhite" ? "#E2E8F0" : "rgba(255,255,255,0.18)"
        }; color:${textColor}; padding:2px 8px; border-radius:12px; margin-bottom:4px;">${badge.trim().toUpperCase()}</div>`
      );
    }

    // Image
    if (imageUrl && imageUrl.trim()) {
      parts.push(`<img src="${imageUrl.trim()}" style="${imgCss}" />`);
    }

    // Title
    if (title && title.trim()) {
      parts.push(
        `<div style="font-size:${curSizes.title}; font-weight:${fontWeight}; font-style:${fontStyle}; text-decoration:${textDecoration}; color:${textColor};">${title.trim()}</div>`
      );
    }

    // Subtitle
    if (subtitle && subtitle.trim()) {
      const subColor = cardTheme === "cleanWhite" ? "#64748B" : "rgba(255,255,255,0.7)";
      parts.push(
        `<div style="font-size:${curSizes.sub}; color:${subColor}; margin-top:2px;">${subtitle.trim()}</div>`
      );
    }

    if (parts.length === 0) {
      return "";
    }

    return `<div style="${containerCss} text-align:${textAlign};">${parts.join("")}</div>`;
  }, []);

  // Update a visual field and sync to parent HTML
  const updateVisualField = (field, value) => {
    const updated = { ...visualState, [field]: value };
    setVisualState(updated);
    const newHtml = constructHtml(updated);
    onChangeHtml(newHtml);
  };

  // Apply a quick broadcast preset
  const handleApplyPreset = (preset) => {
    const updated = {
      ...visualState,
      badge: preset.badge,
      title: preset.title,
      subtitle: preset.subtitle,
      cardTheme: preset.theme,
      textColor: preset.color,
    };
    setVisualState(updated);
    const newHtml = constructHtml(updated);
    onChangeHtml(newHtml);
  };

  // Image Upload Logic via expo-image-picker and server upload API
  const handlePickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to select a sponsor logo or banner."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || !result.assets[0]?.uri) {
        return;
      }

      const localUri = result.assets[0].uri;
      setIsUploading(true);

      // Upload to server
      const uploadRes = await upload(localUri, "ads");
      const remoteUrl =
        uploadRes?.url ||
        uploadRes?.secure_url ||
        uploadRes?.data?.url ||
        uploadRes?.data;

      // Resolve full hosted URL
      const finalUrl = remoteUrl ? getImageFullUrl(remoteUrl) : localUri;

      if (!finalUrl) {
        throw new Error("Could not obtain image URL after upload");
      }

      updateVisualField("imageUrl", finalUrl);
    } catch (err) {
      console.error("[SponsorAdEditor] Image upload error:", err);
      Alert.alert(
        "Upload Failed",
        "Could not upload image. Please check your internet connection and try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    updateVisualField("imageUrl", "");
  };

  // Raw HTML quick tag inserter
  const handleInsertHtmlTag = (tagType) => {
    const current = config?.html || "";
    let snippet = "";
    switch (tagType) {
      case "bold":
        snippet = "<b>Bold Text</b>";
        break;
      case "italic":
        snippet = "<i>Italic Text</i>";
        break;
      case "underline":
        snippet = "<u>Underlined Text</u>";
        break;
      case "break":
        snippet = "<br />";
        break;
      case "div":
        snippet = "<div>Content</div>";
        break;
      case "img":
        snippet = `<img src="${visualState.imageUrl || "https://..."}" style="max-height:48px;" />`;
        break;
      case "link":
        snippet = `<a href="https://..." style="color:#38BDF8;">Visit Sponsor</a>`;
        break;
      case "color":
        snippet = `<span style="color:#F59E0B;">Highlighted</span>`;
        break;
      default:
        break;
    }
    onChangeHtml(current ? `${current} ${snippet}` : snippet);
  };

  // Render raw HTML with safe fallback
  const currentHtml = config?.html?.trim() || "";

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: C.card,
          borderColor: config?.isEnabled ? COLORS.primary : C.border,
          borderWidth: config?.isEnabled ? 1.5 : 1,
        },
      ]}
    >
      {/* ── HEADER & TOGGLE ── */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <ThemedText className="font-bold text-sm" style={{ color: C.text }}>
            {slot.title}
          </ThemedText>
          <ThemedText
            className="font-normal text-xs"
            style={{ color: C.textSecondary, marginTop: 2 }}
          >
            {slot.desc}
          </ThemedText>
        </View>

        <Switch
          value={!!config?.isEnabled}
          onValueChange={onToggle}
          thumbColor={config?.isEnabled ? COLORS.primary : "#CBD5E1"}
          trackColor={{
            false: isDarkMode ? "#334155" : "#E2E8F0",
            true: "#93C5FD",
          }}
        />
      </View>

      {/* ── EXPANDED CONTROLS (WHEN ENABLED) ── */}
      {config?.isEnabled && (
        <View style={styles.expandedSection}>
          <View style={[styles.separator, { backgroundColor: C.border }]} />

          {/* ════ SECTION 1: SPONSOR IMAGE UPLOAD ════ */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText className="font-bold text-xs" style={{ color: C.text }}>
                Sponsor Image / Logo
              </ThemedText>
              <ThemedText
                className="font-normal text-xs"
                style={{ color: C.textSecondary, fontSize: 11 }}
              >
                Auto-scaled for broadcast
              </ThemedText>
            </View>

            {visualState.imageUrl ? (
              // Uploaded Image Preview & Actions
              <View
                style={[
                  styles.imagePreviewBox,
                  {
                    backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC",
                    borderColor: C.border,
                  },
                ]}
              >
                <View style={styles.imageThumbnailWrap}>
                  <Image
                    source={{ uri: visualState.imageUrl }}
                    style={styles.imageThumbnail}
                    resizeMode="contain"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText
                    className="font-bold text-xs"
                    style={{ color: C.text }}
                    numberOfLines={1}
                  >
                    Image Attached
                  </ThemedText>
                  <ThemedText
                    className="font-normal text-xs"
                    style={{ color: C.textSecondary, fontSize: 11, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {visualState.imageUrl.split("/").pop()}
                  </ThemedText>

                  {/* Sizing options */}
                  <View style={styles.sizePillsRow}>
                    {[
                      { key: "banner", label: "Banner" },
                      { key: "logo", label: "Logo" },
                      { key: "icon", label: "Icon" },
                    ].map((sz) => (
                      <TouchableOpacity
                        key={sz.key}
                        onPress={() => updateVisualField("imgSize", sz.key)}
                        style={[
                          styles.sizePill,
                          {
                            backgroundColor:
                              visualState.imgSize === sz.key
                                ? COLORS.primary
                                : isDarkMode
                                ? "#1E293B"
                                : "#E2E8F0",
                          },
                        ]}
                      >
                        <ThemedText
                          className="font-semibold"
                          style={{
                            fontSize: 10,
                            color:
                              visualState.imgSize === sz.key
                                ? "#FFFFFF"
                                : C.textSecondary,
                          }}
                        >
                          {sz.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Action buttons: Change / Remove */}
                  <View style={styles.imageActionsRow}>
                    <TouchableOpacity
                      onPress={handlePickAndUploadImage}
                      disabled={isUploading}
                      style={[
                        styles.inlineActionBtn,
                        { backgroundColor: isDarkMode ? "#1E293B" : "#E2E8F0" },
                      ]}
                    >
                      <RefreshCw size={12} color={C.text} />
                      <ThemedText
                        className="font-semibold"
                        style={{ fontSize: 11, color: C.text, marginLeft: 4 }}
                      >
                        Change
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleRemoveImage}
                      style={[
                        styles.inlineActionBtn,
                        { backgroundColor: "#FEE2E2" },
                      ]}
                    >
                      <Trash2 size={12} color="#DC2626" />
                      <ThemedText
                        className="font-semibold"
                        style={{ fontSize: 11, color: "#DC2626", marginLeft: 4 }}
                      >
                        Remove
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // Empty state: Upload Drop Button
              <TouchableOpacity
                onPress={handlePickAndUploadImage}
                disabled={isUploading}
                activeOpacity={0.7}
                style={[
                  styles.uploadDottedBox,
                  {
                    backgroundColor: isDarkMode ? "#0F172A44" : "#F8FAFC",
                    borderColor: isDarkMode ? "#334155" : "#CBD5E1",
                  },
                ]}
              >
                {isUploading ? (
                  <View style={{ alignItems: "center", paddingVertical: 8 }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <ThemedText
                      className="font-medium"
                      style={{ fontSize: 12, color: C.textSecondary, marginTop: 6 }}
                    >
                      Uploading image...
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 4 }}>
                    <View
                      style={[
                        styles.uploadIconCircle,
                        { backgroundColor: isDarkMode ? "#1E293B" : "#EFF6FF" },
                      ]}
                    >
                      <Upload size={18} color={COLORS.primary} />
                    </View>
                    <ThemedText
                      className="font-bold text-xs"
                      style={{ color: COLORS.primary, marginTop: 6 }}
                    >
                      Upload Sponsor Image / Logo
                    </ThemedText>
                    <ThemedText
                      className="font-normal"
                      style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}
                    >
                      PNG, JPG, WebP • Transparent logos recommended
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ════ SECTION 2: WYSIWYG MODE SELECTOR ════ */}
          <View style={styles.sectionBlock}>
            <View style={styles.modeTabsRow}>
              <TouchableOpacity
                onPress={() => setEditorMode("visual")}
                style={[
                  styles.modeTabBtn,
                  editorMode === "visual" && {
                    backgroundColor: COLORS.primary,
                  },
                ]}
              >
                <Sparkles
                  size={13}
                  color={editorMode === "visual" ? "#FFFFFF" : C.textSecondary}
                />
                <ThemedText
                  className="font-bold"
                  style={{
                    fontSize: 12,
                    color: editorMode === "visual" ? "#FFFFFF" : C.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  Visual WYSIWYG
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEditorMode("code")}
                style={[
                  styles.modeTabBtn,
                  editorMode === "code" && {
                    backgroundColor: COLORS.primary,
                  },
                ]}
              >
                <Code
                  size={13}
                  color={editorMode === "code" ? "#FFFFFF" : C.textSecondary}
                />
                <ThemedText
                  className="font-bold"
                  style={{
                    fontSize: 12,
                    color: editorMode === "code" ? "#FFFFFF" : C.textSecondary,
                    marginLeft: 6,
                  }}
                >
                  HTML Code
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* ───── VISUAL WYSIWYG EDITOR ───── */}
            {editorMode === "visual" ? (
              <View style={styles.visualEditorContainer}>
                {/* Broadcast Presets */}
                <View style={{ marginBottom: 12 }}>
                  <ThemedText
                    className="font-semibold text-xs"
                    style={{ color: C.textSecondary, marginBottom: 6, fontSize: 11 }}
                  >
                    Quick Broadcast Templates
                  </ThemedText>
                  <View style={styles.presetsRow}>
                    {PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => handleApplyPreset(p)}
                        style={[
                          styles.presetPill,
                          {
                            backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                            borderColor: C.border,
                          },
                        ]}
                      >
                        <ThemedText
                          className="font-semibold"
                          style={{ fontSize: 11, color: C.text }}
                        >
                          {p.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Visual Fields */}
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {/* Badge Text */}
                  <View>
                    <ThemedText
                      className="font-medium text-xs"
                      style={{ color: C.textSecondary, marginBottom: 3, fontSize: 11 }}
                    >
                      Badge / Tag (Optional)
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: C.inputBg,
                          borderColor: C.border,
                          color: C.text,
                        },
                      ]}
                      placeholder="e.g. OFFICIAL PARTNER, POWERED BY"
                      placeholderTextColor={C.textSecondary}
                      value={visualState.badge}
                      onChangeText={(t) => updateVisualField("badge", t)}
                    />
                  </View>

                  {/* Headline / Brand Name */}
                  <View>
                    <ThemedText
                      className="font-medium text-xs"
                      style={{ color: C.textSecondary, marginBottom: 3, fontSize: 11 }}
                    >
                      Headline / Brand Name
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: C.inputBg,
                          borderColor: C.border,
                          color: C.text,
                        },
                      ]}
                      placeholder="e.g. Dream11, MRF Tyres, Puma"
                      placeholderTextColor={C.textSecondary}
                      value={visualState.title}
                      onChangeText={(t) => updateVisualField("title", t)}
                    />
                  </View>

                  {/* Subtitle / Tagline */}
                  <View>
                    <ThemedText
                      className="font-medium text-xs"
                      style={{ color: C.textSecondary, marginBottom: 3, fontSize: 11 }}
                    >
                      Tagline / Offer Text (Optional)
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.inputField,
                        {
                          backgroundColor: C.inputBg,
                          borderColor: C.border,
                          color: C.text,
                        },
                      ]}
                      placeholder="e.g. Play Fantasy Cricket • Win Rewards"
                      placeholderTextColor={C.textSecondary}
                      value={visualState.subtitle}
                      onChangeText={(t) => updateVisualField("subtitle", t)}
                    />
                  </View>
                </View>

                {/* WYSIWYG FORMATTING TOOLBAR */}
                <View
                  style={[
                    styles.toolbarBox,
                    {
                      backgroundColor: isDarkMode ? "#0F172A" : "#F8FAFC",
                      borderColor: C.border,
                    },
                  ]}
                >
                  {/* Row 1: Style & Alignment */}
                  <View style={styles.toolbarRow}>
                    {/* Bold */}
                    <TouchableOpacity
                      onPress={() => updateVisualField("isBold", !visualState.isBold)}
                      style={[
                        styles.toolBtn,
                        visualState.isBold && styles.toolBtnActive,
                      ]}
                    >
                      <Bold
                        size={14}
                        color={visualState.isBold ? "#FFFFFF" : C.text}
                      />
                    </TouchableOpacity>

                    {/* Italic */}
                    <TouchableOpacity
                      onPress={() => updateVisualField("isItalic", !visualState.isItalic)}
                      style={[
                        styles.toolBtn,
                        visualState.isItalic && styles.toolBtnActive,
                      ]}
                    >
                      <Italic
                        size={14}
                        color={visualState.isItalic ? "#FFFFFF" : C.text}
                      />
                    </TouchableOpacity>

                    {/* Underline */}
                    <TouchableOpacity
                      onPress={() =>
                        updateVisualField("isUnderline", !visualState.isUnderline)
                      }
                      style={[
                        styles.toolBtn,
                        visualState.isUnderline && styles.toolBtnActive,
                      ]}
                    >
                      <Underline
                        size={14}
                        color={visualState.isUnderline ? "#FFFFFF" : C.text}
                      />
                    </TouchableOpacity>

                    <View style={styles.toolDivider} />

                    {/* Alignments */}
                    {[
                      { key: "left", Icon: AlignLeft },
                      { key: "center", Icon: AlignCenter },
                      { key: "right", Icon: AlignRight },
                    ].map(({ key, Icon }) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => updateVisualField("textAlign", key)}
                        style={[
                          styles.toolBtn,
                          visualState.textAlign === key && styles.toolBtnActive,
                        ]}
                      >
                        <Icon
                          size={14}
                          color={visualState.textAlign === key ? "#FFFFFF" : C.text}
                        />
                      </TouchableOpacity>
                    ))}

                    <View style={styles.toolDivider} />

                    {/* Font sizes */}
                    {[
                      { key: "large", label: "L" },
                      { key: "medium", label: "M" },
                      { key: "small", label: "S" },
                    ].map(({ key, label }) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => updateVisualField("textSize", key)}
                        style={[
                          styles.toolBtn,
                          visualState.textSize === key && styles.toolBtnActive,
                        ]}
                      >
                        <ThemedText
                          className="font-bold"
                          style={{
                            fontSize: 11,
                            color:
                              visualState.textSize === key ? "#FFFFFF" : C.text,
                          }}
                        >
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Row 2: Text Color Swatches */}
                  <View style={[styles.toolbarRow, { marginTop: 8 }]}>
                    <ThemedText
                      className="font-medium text-xs"
                      style={{ color: C.textSecondary, marginRight: 8, fontSize: 11 }}
                    >
                      Text Color:
                    </ThemedText>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {COLOR_OPTIONS.map((c) => {
                        const isSelected = visualState.textColor === c.value;
                        return (
                          <TouchableOpacity
                            key={c.value}
                            onPress={() => updateVisualField("textColor", c.value)}
                            style={[
                              styles.colorDot,
                              { backgroundColor: c.bg },
                              isSelected && styles.colorDotSelected,
                            ]}
                          >
                            {isSelected && (
                              <Check
                                size={10}
                                color={c.textLight ? "#FFFFFF" : "#000000"}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Row 3: Container Theme Styles */}
                  <View style={[styles.toolbarRow, { marginTop: 8 }]}>
                    <ThemedText
                      className="font-medium text-xs"
                      style={{ color: C.textSecondary, marginRight: 8, fontSize: 11 }}
                    >
                      Card Style:
                    </ThemedText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {CARD_THEMES.map((theme) => {
                        const isSelected = visualState.cardTheme === theme.key;
                        return (
                          <TouchableOpacity
                            key={theme.key}
                            onPress={() => updateVisualField("cardTheme", theme.key)}
                            style={[
                              styles.themePill,
                              {
                                backgroundColor: isSelected
                                  ? COLORS.primary
                                  : isDarkMode
                                  ? "#1E293B"
                                  : "#E2E8F0",
                              },
                            ]}
                          >
                            <ThemedText
                              className="font-semibold"
                              style={{
                                fontSize: 10,
                                color: isSelected ? "#FFFFFF" : C.textSecondary,
                              }}
                            >
                              {theme.label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // ───── RAW HTML CODE EDITOR ─────
              <View style={styles.codeEditorContainer}>
                {/* Quick Insert Tag Bar */}
                <View style={styles.codeToolbar}>
                  {[
                    { label: "<b>", action: () => handleInsertHtmlTag("bold") },
                    { label: "<i>", action: () => handleInsertHtmlTag("italic") },
                    { label: "<u>", action: () => handleInsertHtmlTag("underline") },
                    { label: "<br>", action: () => handleInsertHtmlTag("break") },
                    { label: "<div>", action: () => handleInsertHtmlTag("div") },
                    { label: "<a>", action: () => handleInsertHtmlTag("link") },
                    { label: "<color>", action: () => handleInsertHtmlTag("color") },
                  ].map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={item.action}
                      style={[
                        styles.codeTagBtn,
                        {
                          backgroundColor: isDarkMode ? "#1E293B" : "#F1F5F9",
                          borderColor: C.border,
                        },
                      ]}
                    >
                      <ThemedText
                        className="font-mono font-bold"
                        style={{ fontSize: 10, color: COLORS.primary }}
                      >
                        {item.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* HTML Textarea */}
                <TextInput
                  style={[
                    styles.codeTextarea,
                    {
                      backgroundColor: C.inputBg,
                      borderColor: C.border,
                      color: C.text,
                    },
                  ]}
                  multiline
                  numberOfLines={4}
                  placeholder={slot.placeholder || "<div>Sponsor Content HTML</div>"}
                  placeholderTextColor={C.textSecondary}
                  value={config?.html || ""}
                  onChangeText={(txt) => {
                    onChangeHtml(txt);
                  }}
                />
              </View>
            )}
          </View>

          {/* ════ SECTION 3: LIVE STREAM OVERLAY PREVIEW ════ */}
          <View style={styles.sectionBlock}>
            <View style={styles.previewHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Eye size={14} color={COLORS.primary} />
                <ThemedText className="font-bold text-xs" style={{ color: C.text }}>
                  WYSIWYG Live Overlay Preview
                </ThemedText>
              </View>

              {/* Backdrop toggle */}
              <View style={styles.backdropToggleRow}>
                <TouchableOpacity
                  onPress={() => setPreviewBackdrop("dark")}
                  style={[
                    styles.backdropBtn,
                    previewBackdrop === "dark" && styles.backdropBtnActive,
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 10,
                      color: previewBackdrop === "dark" ? "#FFFFFF" : C.textSecondary,
                    }}
                  >
                    🌙 Dark Feed
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPreviewBackdrop("light")}
                  style={[
                    styles.backdropBtn,
                    previewBackdrop === "light" && styles.backdropBtnActive,
                  ]}
                >
                  <ThemedText
                    style={{
                      fontSize: 10,
                      color: previewBackdrop === "light" ? "#FFFFFF" : C.textSecondary,
                    }}
                  >
                    ☀️ Light Feed
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.livePreviewCanvas,
                {
                  backgroundColor: previewBackdrop === "dark" ? "#070A0F" : "#E2E8F0",
                  borderColor: isDarkMode ? "#334155" : "#CBD5E1",
                },
              ]}
            >
              {currentHtml ? (
                <RenderHtml
                  contentWidth={previewWidth}
                  source={{ html: currentHtml }}
                  baseStyle={{
                    color: previewBackdrop === "dark" ? "#FFFFFF" : "#1E293B",
                    fontSize: 13,
                  }}
                  tagsStyles={{
                    a: { color: "#38BDF8" },
                    img: { borderRadius: 6 },
                  }}
                />
              ) : (
                <View style={styles.emptyPreviewBox}>
                  <ThemedText
                    className="font-medium"
                    style={{ fontSize: 12, color: C.textSecondary, textAlign: "center" }}
                  >
                    No sponsor ad content yet.
                  </ThemedText>
                  <ThemedText
                    className="font-normal"
                    style={{
                      fontSize: 10,
                      color: C.textSecondary,
                      textAlign: "center",
                      marginTop: 2,
                    }}
                  >
                    Upload an image or type brand details above to preview live
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandedSection: {
    marginTop: 10,
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadDottedBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  imageThumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
  },
  sizePillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  sizePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  imageActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  inlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeTabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  visualEditorContainer: {
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  toolbarBox: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  toolBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  toolBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toolDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 3,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.15 }],
  },
  themePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeEditorContainer: {
    marginTop: 4,
  },
  codeToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  codeTagBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 12,
    minHeight: 75,
    textAlignVertical: "top",
  },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  backdropToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  backdropBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  backdropBtnActive: {
    backgroundColor: COLORS.primary,
  },
  livePreviewCanvas: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 65,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPreviewBox: {
    alignItems: "center",
    paddingVertical: 8,
  },
});
