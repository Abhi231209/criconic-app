import { COLORS } from "./colors.js";

export const APP_THEME = {
  background: COLORS.light.background,
  surface: COLORS.light.surface,
  card: COLORS.light.card,
  text: COLORS.light.text,
  textSecondary: COLORS.light.textSecondary,
  primary: COLORS.primary,
  primaryLight: "#EFF6FF",
  border: COLORS.light.border,
  danger: COLORS.danger,
  dangerLight: "#FEF2F2",
  neutral: "#6B7280",
  neutralLight: "#F3F4F6",
  overlay: "rgba(0,0,0,0.5)",
  menuBg: "#FFFFFF",
  menuBackdrop: "rgba(255, 255, 255, 0.95)",
  shadow: "rgba(0,0,0,0.1)",
  closeButtonOverlay: "rgba(0,0,0,0.05)",
  white: "#FFFFFF",
  gradient: ["#6366f1", "#4f46e5"],
  gradients: {
    actionPrimary: ["#3B82F6", "#2563EB"],
    actionSecondary: ["#8B5CF6", "#6D28D9"],
  },
};

export { COLORS };
export default APP_THEME;
