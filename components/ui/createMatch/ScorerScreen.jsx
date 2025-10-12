import React, { useEffect, useRef, useState, createContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useColorScheme,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
// import { Button } from "@gluestack-ui/themed"; // or use your custom button
// import { RefreshCw } from "lucide-react-native"; // replacement for HiSwitchHorizontal

// import MatchHeader from "../MatchHeader";
import CustomRunModal from "./CustomRunModal";
// import OutOption from "../OutOption";
// import BallPreview from "./BallPreview";
// import QuickActions from "./QuickActions";
// import EndMatchConfirmation from "./EndMatchConfirmation";
// import BottomSheetList from "../BottomSheetList";

// import { apiUrl } from "@/utils/api"; // update path as needed
import { MATCH_ACTION, MATCH_STATUS, MATCH_STATUS_STAGE } from "@/utils/Common";
import MatchHeader from "./MatchHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocket } from "@/contexts/SocketContext";
import BallPreview from "./BallPreview";
import ThemedText from "../custom/ThemedText";
import CustomPopup from "../custom/CustomPopup";
import QuickActions from "./QuickActions";
import { useBottomSheet } from "../custom/CustomBottomSheet";
import WagonWheel from "./WagonWheel";
import PitchMap from "./PitchMap";
import OutOptions from "./OutOptions";

export const ScorerScreenContext = createContext(null);

export default function ScorerScreen() {
  const { openSheet, closeSheet } = useBottomSheet();
  const { isConnected, emit, on, off } = useSocket();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const navigation = useNavigation();
  const route = useRoute();
  const { matchID = "68c3b016c7c614d83c173f0a" } = route.params || {};

  const [score, setScore] = useState({});
  const [socket, setSocket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState(null);

  const openPopup = (content) => {
    setPopupContent(content);
    setIsPopupOpen(true);
  };
  const closePopup = () => {
    setIsPopupOpen(false);
    setPopupContent(null);
  };
  // replace PullToRefresh → RefreshControl
  const onRefresh = () => {
    setRefreshing(true);
    socket?.emit("score", { matchID });
    setTimeout(() => setRefreshing(false), 1500);
  };
  const scoreHandler = (data) => {
    console.log("score:- ", data);
    setScore(data);
  };

  useEffect(() => {
    console.log("Socket connection status in ScorerScreen:", isConnected, emit);
    emit("score", { matchID });
    on("score", scoreHandler);
  }, [isConnected, matchID]);

  const handleBall = ({ runs = 0, runType = "bat", isWicket = false }) => {
    console.log("Ball data:", { runs, runType, isWicket });
    const data = {
      userId: "USER_ID", // replace with auth user
      matchID,
      // action: MATCH_ACTION.MATCH_BALL,
      data: { runs, runType, isWicket },
    };
    socket && socket?.emit("update-score", data);
    if (isWicket) {
      openSheet(<OutOptions />);
    } else {
      openSheet(<WagonWheel />);
    }
  };

  const leftButtons = [
    ["0", "1", "2"],
    ["3", "4\nFour", "6\nSIX"],
    ["WD", "NB", "BYE"],
  ];

  const rightButtons = ["UNDO", "5,7", "OUT", "LB"];

  return (
    <ScorerScreenContext.Provider value={{ score }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        {/* <View> */}
        <SafeAreaView className={`flex-1 ${"bg-primary"}`}>
          <MatchHeader
            matchID={matchID}
            bowlingTeam={score?.bowling}
            battingTeam={score?.batting}
            currentOver={score?.batting?.score?.over}
            batsmen={score?.batsman}
            bowler={score?.bowler}
            showHomeIcon={true}
            showSetting={true}
            navigation={navigation}
            discription={"Scorer Screen"}
            cb={() => socket?.emit("score", { matchId: matchID })}
          />
        </SafeAreaView>

        {/* Score display */}
        <View
          style={[
            styles.scoreContainer,
            isDarkMode ? styles.scoreContainerDark : styles.scoreContainerLight,
          ]}
          className="items-center justify-center bg-primary"
        >
          <ThemedText className="text-4xl font-bold text-white">
            {`${score?.batting?.score?.runs || 0}/${
              score?.batting?.score?.wicket || 0
            }`}
          </ThemedText>
          <ThemedText className="text-2xl text-gray-200">
            {`(${score?.batting?.score?.over || 0}/${score?.totalOvers || 0})`}
          </ThemedText>
          <ThemedText className="text-xl text-gray-400">
            {score?.description || ""}
          </ThemedText>
        </View>
        {/* </View> */}

        {/* Batsmen */}
        <View
          className={`flex-row border-t border-b ${
            isDarkMode
              ? "border-gray-700 bg-gray-900"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          {score?.batsman?.map((b, idx) => (
            <View key={idx} className="flex-1 p-3 items-center">
              <ThemedText
                className={`text-xl ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {b?.isStrikeEnd ? "🏏 " : ""}
                {b?.name}
              </ThemedText>
              <ThemedText
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {b?.runs || 0} ({b?.ballsFaced || 0})
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Bowler */}
        <ScrollView
          horizontal
          className={`p-2 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          style={{ maxHeight: 40 }} // 👈 keeps row tight
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row gap-2 items-center">
            {["2", "4"]?.map((run, idx) => (
              <BallPreview key={idx} ball={run} />
            ))}
          </View>
        </ScrollView>

        <View
          className={`p-3 flex-row justify-between border-b ${
            isDarkMode
              ? "border-gray-700 bg-gray-900"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <ThemedText
            className={`${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            ⚾ {score?.bowler?.name || ""}
          </ThemedText>
          <ThemedText
            className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            {score?.bowler?.over}-{score?.bowler?.maiden}-
            {score?.bowler?.runsGiven}-{score?.bowler?.wicketsTaken}
          </ThemedText>
        </View>

        <View
          style={[
            styles.container,
            isDarkMode ? styles.containerDark : styles.containerLight,
          ]}
        >
          {/* Left Section */}
          <View style={styles.leftSection}>
            {leftButtons.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((label, colIndex) => {
                  // Decide action based on label
                  const onPress = () => {
                    switch (label) {
                      case "0":
                      case "1":
                      case "2":
                      case "3":
                        handleBall({ runs: parseInt(label, 10) });
                        break;
                      case "4\nFour":
                        handleBall({ runs: 4 });
                        break;
                      case "6\nSIX":
                        handleBall({ runs: 6 });
                        break;
                      case "WD":
                        handleBall({ runs: 1, runType: "wide" });
                        break;
                      case "NB":
                        handleBall({ runs: 1, runType: "noBall" });
                        break;
                      case "BYE":
                        handleBall({ runs: 1, runType: "bye" });
                        break;
                      default:
                        console.log("Unhandled button:", label);
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      style={[
                        styles.button,
                        isDarkMode ? styles.buttonDark : styles.buttonLight,
                      ]}
                      onPress={onPress}
                    >
                      <ThemedText
                        style={[
                          styles.text,
                          isDarkMode ? styles.textDark : styles.textLight,
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            {rightButtons.map((label, index) => {
              const onPress = () => {
                switch (label) {
                  case "UNDO":
                    // You might implement undo differently
                    console.log("Undo last ball");
                    break;
                  case "5,7":
                    openSheet(<CustomRunModal
        // handelShowCustomRunsModal={setShowCustomModal}
        customModalDiscription={{
          title: "Wide Ball",
          type: "wd",
        }}
        action={(params) => {
          console.log('Action with params:', params);
          // Handle your logic here
        }}
        onClose={closeSheet}
      />);
                    // handleBall({ runs: )
                    // handleBall({ runs: 5 }); // or handle both cases separately
                    break;
                  case "OUT":
                    handleBall({ runs: 0, isWicket: true });
                    break;
                  case "LB":
                    handleBall({ runs: 1, runType: "legBye" });
                    break;
                  default:
                    console.log("Unhandled button:", label);
                }
              };

              if (label == "OUT") {
                return <OutOptions />;
              } else {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDarkMode ? styles.buttonDark : styles.buttonLight,
                    ]}
                    onPress={onPress}
                  >
                    <ThemedText
                      style={[
                        styles.text,
                        isDarkMode ? styles.textDark : styles.textLight,
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <QuickActions
          matchID={matchID}
          bowlingTeam={score?.bowling}
          battingTeam={score?.batting}
          currentOver={score?.batting?.score?.over}
          batsmen={score?.batsman}
          bowler={score?.bowler}
          navigation={navigation}
          cb={() => socket?.emit("score", { matchID })}
        />
      </ScrollView>
      {/* </SafeAreaView> */}
    </ScorerScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    flex: 1, // This was expanding the view too much
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    height: 300,
  },
  containerLight: {
    backgroundColor: "#E8F9FF", // gray-100
  },
  containerDark: {
    backgroundColor: "#000",
  },
  leftSection: {
    flex: 3,
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonLight: {
    backgroundColor: "#dee2e6",
    borderColor: "#e5e7eb", // gray-200
  },
  buttonDark: {
    backgroundColor: "#0a0f1c",
    borderColor: "#1a2333",
  },
  rightSection: {
    flex: 1,
    justifyContent: "space-between",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  textLight: {
    color: "#111827", // gray-900
  },
  textDark: {
    color: "#fff",
  },
});
