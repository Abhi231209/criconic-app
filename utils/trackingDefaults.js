import AsyncStorage from "@react-native-async-storage/async-storage";

// The wagon wheel and pitch map each add a step to every ball, so a new match
// starts with them off. Once a scorer turns one on or off, their next new
// match starts the same way. (Each match also keeps its own choice under
// @criconic_ww_<id> / @criconic_pm_<id>.)
const KEYS = {
  wagonWheel: "@criconic_ww_last",
  pitchMap: "@criconic_pm_last",
};

export const getTrackingDefaults = async () => {
  try {
    const [ww, pm] = await Promise.all([
      AsyncStorage.getItem(KEYS.wagonWheel),
      AsyncStorage.getItem(KEYS.pitchMap),
    ]);
    return { wagonWheel: ww === "true", pitchMap: pm === "true" };
  } catch {
    return { wagonWheel: false, pitchMap: false };
  }
};

export const saveTrackingDefault = (kind, value) =>
  AsyncStorage.setItem(KEYS[kind], String(Boolean(value))).catch(() => {});
