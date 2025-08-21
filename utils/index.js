import * as SecureStore from "expo-secure-store";
// import * as Device from "expo-device";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";
import * as Crypto from 'expo-crypto';

export const formatNumber = (number) =>
  new Intl.NumberFormat("en-US").format(number);

export const formatTime = (time) => {
  if (!time) return "";
  const seconds = parseInt(time, 10);
  if (isNaN(seconds)) return "";
  const date = new Date(seconds * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function generateUUID() {
  const bytes = Crypto.getRandomBytes(16); // Synchronous
  return uuidv4({ random: bytes });
}

function simpleUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const getDeviceId = async () => {
  if (Platform.OS === "web") {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = simpleUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  }

  try {
    let deviceId = await SecureStore.getItemAsync("deviceId");
    if (!deviceId) {
      deviceId = generateUUID();
      await SecureStore.setItemAsync("deviceId", deviceId);
    }
    return deviceId;
  } catch (error) {
    return null;
  }
};

export const MATCH_STATUS = {
  TOSS: "TOSS",
  MATCH_CREATED: "MATCH_CREATED", // Match is created but not started
  MATCH_DETAILS_ENTERED: "MATCH_DETAILS_ENTERED", // Match is details are entered
  MATCH_OPENER_SELECTED: "MATCH_OPENER_SELECTED", // Match opener player is selected
  MATCH_STARTED: "MATCH_STARTED", // Match is started
  MATCH_SCHEDULED: "MATCH_SCHEDULED", // Match has been scheduled for a specific date and time
  MATCH_IN_PROGRESS: "MATCH_IN_PROGRESS", // The match is currently being played
  INNINGS_I: "INNINGS_I",
  INNINGS_II: "INNINGS_II",
  MATCH_ENDED: "MATCH_ENDED", // The match is temporarily paused
  MATCH_PAUSED: "MATCH_PAUSED", // The match is temporarily paused
  MATCH_RESUMED: "MATCH_RESUMED", // The match resumes after a pause
  MATCH_COMPLETED: "MATCH_COMPLETED", // The match has been successfully completed
  MATCH_CANCELLED: "MATCH_CANCELLED", // The match has been cancelled for some reason
  MATCH_SUSPENDED: "MATCH_SUSPENDED", // The match is suspended, and gameplay is temporarily halted
  MATCH_INTERRUPTED: "MATCH_INTERRUPTED", // The match is interrupted, and there's a delay in gameplay
  MATCH_DELAYED: "MATCH_DELAYED", // The match is delayed, but not yet started
  INNINGS_I_ENDED: "INNINGS_I_ENDED", // Break between innings
  INNINGS_BREAK: "INNINGS_BREAK", // Break between innings
  RAIN_DELAY: "RAIN_DELAY", // Delay due to rain or adverse weather conditions
  TEA_BREAK: "TEA_BREAK", // Break for tea during the match
  DRINKS_BREAK: "DRINKS_BREAK", // Break for drinks during the match
  TECHNICAL_ISSUE: "TECHNICAL_ISSUE", // Match is paused due to technical issues
  REVIEW_IN_PROGRESS: "REVIEW_IN_PROGRESS", // Decision under review by the third umpire
  UMPIRE_CONSULTATION: "UMPIRE_CONSULTATION", // Umpires are discussing a decision
  OVERTIME: "OVERTIME", // Match extends beyond scheduled time
  EXTRA_INNINGS: "EXTRA_INNINGS", // Additional innings beyond the regular ones
  MATCH_TIE: "MATCH_TIE", // Super Over is being played to break a tie
  SUPER_OVER: "SUPER_OVER", // Super Over is being played to break a tie
  MATCH_ENDED: "MATCH_ENDED", // The match has been successfully ended
};

export const getMatchStatusDisplay = (status) => {
  switch (status) {
    case MATCH_STATUS.MATCH_SCHEDULED:
    case MATCH_STATUS.MATCH_CREATED:
      return "Upcoming";
    case MATCH_STATUS.MATCH_IN_PROGRESS:
    case MATCH_STATUS.INNINGS_I:
    case MATCH_STATUS.INNINGS_II:
    case MATCH_STATUS.MATCH_RESUMED:
    case MATCH_STATUS.MATCH_STARTED:
      return "Live";
    case MATCH_STATUS.MATCH_COMPLETED:
    case MATCH_STATUS.MATCH_TIE:
    case MATCH_STATUS.MATCH_CANCELLED:
    case MATCH_STATUS.MATCH_INTERRUPTED:
    case MATCH_STATUS.MATCH_SUSPENDED:
    case MATCH_STATUS.RAIN_DELAY:
    case MATCH_STATUS.MATCH_PAUSED:
    case MATCH_STATUS.MATCH_ENDED:
      return "End";
    default:
      return "";
  }
};

export function getStatusClass(status) {
  switch (status) {
    case "Live":
      return "text-green-500";
    case "End":
      return "text-red-500";
    case "Upcoming":
      return "text-blue-500";
    default:
      return "text-gray-500";
  }
}


// export const matchRedirectBasedOnStatus = (matchId, status) => {
//   let url = "";
//   switch (status) {
//     case MATCH_STATUS.TOSS:
//       url = `${PATHS.MATCH_SELECT_PLAYING}?matchId=${matchId}`;
//       break;
//     case MATCH_STATUS.MATCH_CREATED || MATCH_STATUS.MATCH_STARTED:
//       url = `${PATHS.MATCH_DETAILS}/${matchId}`;
//       break;
//     case MATCH_STATUS.MATCH_DETAILS_ENTERED:
//       url = `${PATHS.MATCH_TOSS}/?matchId=${matchId}`;
//       break;
//     default:
//       url = `/components/match/scorerScreen?matchId=${matchId}`;
//   }

//   return url;
// };