import AsyncStorage from "@react-native-async-storage/async-storage";

// After login, users without a batting style are sent to Complete Profile.
// "Skip" there holds that off for a week, so it isn't shown on every login.
const SKIP_DAYS = 7;
const skipKey = (userId) => `@criconic_profile_setup_skipped_${userId}`;

export const isProfileIncomplete = (user) =>
  !user?.role ||
  user.role === "Player" ||
  user.role === "player" ||
  (!user?.batStyle && !user?.battingStyle);

export const rememberProfileSetupSkipped = (userId) =>
  userId ? AsyncStorage.setItem(skipKey(userId), String(Date.now())).catch(() => {}) : Promise.resolve();

export const shouldAskToCompleteProfile = async (user) => {
  if (!isProfileIncomplete(user)) return false;
  const userId = user?._id || user?.id;
  if (!userId) return true;
  try {
    const skippedAt = Number(await AsyncStorage.getItem(skipKey(userId)));
    return !skippedAt || Date.now() - skippedAt > SKIP_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
};

