import React, { useEffect, useRef, useState, createContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Mock imports for custom components
const MatchHeader = ({ handleInningsComplete, matchID, bowlingTeam, battingTeam, currentOver, batsmen, bowler }) => (
  <View style={styles.matchHeader}>
    <Text style={styles.matchHeaderText}>Match: {matchID}</Text>
  </View>
);
const CustomRunModel = ({ handelShowCustomRunsModal, customModalDiscription, action }) => (
  <Modal visible={true} animationType="slide">
    <View style={styles.modal}>
      <Text style={styles.modalTitle}>{customModalDiscription.title}</Text>
      <TouchableOpacity onPress={() => action({ runs: 5 })} style={styles.modalButton}><Text style={styles.modalButtonText}>Confirm</Text></TouchableOpacity>
      <TouchableOpacity onPress={handelShowCustomRunsModal} style={styles.modalButton}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
    </View>
  </Modal>
);
const OutOption = ({ onWicket }) => (
  <TouchableOpacity onPress={onWicket} style={styles.outButton}>
    <Text style={styles.outButtonText}>OUT</Text>
  </TouchableOpacity>
);
const BottomSheetList = ({ open, setOpen, players, onChange, contentHeading }) => {
  if (!open) return null;
  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.bottomSheet}>
        <Text style={styles.bottomSheetTitle}>{contentHeading}</Text>
        {players.map(player => (
          <TouchableOpacity key={player.id} onPress={() => onChange(player)} style={styles.bottomSheetItem}>
            <Text style={styles.bottomSheetItemText}>{player.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => setOpen(false)} style={styles.bottomSheetButton}><Text style={styles.bottomSheetButtonText}>Close</Text></TouchableOpacity>
      </View>
    </Modal>
  );
};
const QuickActions = () => <View style={styles.quickActions}><Text style={styles.quickActionsText}>Quick Actions</Text></View>;
const BallPreview = ({ run }) => (
  <View style={styles.ballPreview}>
    <Text style={styles.ballPreviewText}>{run.runs}</Text>
  </View>
);

// Mock constants
const TOSS_DECISION = { BAT: "bat" };
const MATCH_ACTION = { MATCH_BALL: "ball", CHANGE_STRIKE: "change_strike", UNDO_LAST_BALL: "undo" };
const MATCH_STATUS = { INNINGS_I_ENDED: "innings_i_ended", MATCH_COMPLETED: "match_completed" };
const User = { id: "mock_user" };
const mockSocket = { on: (event, cb) => {}, emit: (event, data) => {}, disconnect: () => {} };
const mockRequest = async (url, options) => ({ data: mockMatchDetails });

const mockMatchDetails = {
  _id: "mock_id",
  currentInnings: 1,
  score: { toss: { decision: "bat", winningTeam: 1 } },
  teams: [
    { teamId: 1, name: "Team A", players: [{ id: 1, name: "Player 1" }, { id: 2, name: "Player 2" }] },
    { teamId: 2, name: "Team B", players: [{ id: 3, name: "Player 3" }, { id: 4, name: "Player 4" }] },
  ],
  status: "started",
  config: { singleBatsmanAllowed: false },
};

const mockScore = {
  batting: { score: { runs: 3, wicket: 1, over: 1.2 }, battingTeam: "Team A" },
  bowling: { teamName: "Team B" },
  totalOvers: 6,
  description: "Epic blasters need 86 runs in 28 balls.",
  batsman: [
    { name: "Arindam", runs: 0, ballsFaced: 1, isStrikeEnd: true, playerId: 1, notOut: true },
    { name: "Mohit Poonia", runs: 0, ballsFaced: 2, isStrikeEnd: false, playerId: 2, notOut: true },
  ],
  bowler: { name: "Shubham Jangra", playerId: 3, over: 0.2, maiden: 0, runsGiven: 0, wicketsTaken: 0, isBowlingCurrentOver: true },
  currentOver: [{ runs: "nb" }, { runs: "nb" }, { runs: 0 }, { runs: 0 }],
  lastInningScore: 89,
  lastInningWickets: 10,
  matchCurrentStatus: "INNINGS_I",
  batsmanUpcoming: [{ id: 5, name: "Upcoming 1" }],
  currentInningWicket: 1,
  isMatchTied: false,
};

export const ScorerScreenContext = createContext(null);

const { width, height } = Dimensions.get("window");

export default function ScorerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const matchID = route.params?.matchId || "mock_match_id";

  const [showCustomRunsModal, setShowCustomRunsModal] = useState(false);
  const [isFirstTimeScoreLoaded, setIsFirstTimeScoreLoaded] = useState(true);
  const [score, setScore] = useState(mockScore);
  const [socket, setSocket] = useState(mockSocket);
  const [matchStatus, setMatchStatus] = useState({
    isInningCompleted: false,
    isMatchCompleted: false,
    isMatchEnded: false,
    isMatchTied: false,
  });
  const [matchDetails, setMatchDetails] = useState(mockMatchDetails);
  const [matchTeams, setMatchTeams] = useState(mockMatchDetails.teams);
  const scoreRef = useRef(score);
  const [sheetMeta, setSheetMeta] = useState({ open: false, players: [] });
  const [bowlerSheetMeta, setBowlerSheetMeta] = useState({ open: false, players: [] });
  const [batsman, setBatsman] = useState(score.batsman[0]?.playerId);
  const [bowler, setBowler] = useState(score.bowler?.playerId);
  const [currentSheet, setCurrentSheet] = useState();
  const [bowlingTeam, setBowlingTeam] = useState(mockMatchDetails.teams[1]);
  const [battingTeam, setBattingTeam] = useState(mockMatchDetails.teams[0]);
  const [customModalDescription, setCustomModalDescription] = useState({
    title: "Enter Custom Runs",
    action: (data) => handleBall(data),
  });

  const [showWagonWheel, setShowWagonWheel] = useState(false);
  const [shotPlacements, setShotPlacements] = useState([]);
  const animatedScale = useSharedValue(1);

  const getBattingBowlingTeams = () => ({ battingTeam, bowlingTeam });
  const changeBowler = ({ closable = false } = {}) => setBowlerSheetMeta({ ...bowlerSheetMeta, open: true, closable, players: bowlingTeam.players });
  const handleInningsComplete = () => updateScore("END_OF_INNINGS");
  const handleMatchComplete = () => updateScore("END_OF_MATCH");
  const handleSuperOver = () => {};
  const handleDeclareTied = () => {};
  const handleChangeBowlerSheet = (player) => { setBowler(player.id); };
  const handleChange = (player, callSelectStrike, options) => {};
  const handleBall = (data) => {
    const { runs = 0, runType = "bat" } = data;
    if (runType === "bat" && runs > 0) {
      setShowWagonWheel(true); // Auto-trigger wagon wheel for runs
      return;
    }
    processBall(data);
  };
  const processBall = (data) => {
    setScore(prev => ({ ...prev, batting: { ...prev.batting, score: { ...prev.batting.score, runs: prev.batting.score.runs + data.runs } } }));
    updateScore(MATCH_ACTION.MATCH_BALL, data);
  };
  const updateScore = (action, data = {}) => socket.emit("update-score", { userId: User.id, matchId: matchID, action, data });
  const handleChangeStrike = () => updateScore(MATCH_ACTION.CHANGE_STRIKE);
  const selectStriker = (newPlayer, options = {}) => {};
  const selectBatsman = (type, player) => {};
  const handleWicket = (type = 1, callSelectStrike = false, options = {}) => { setCurrentSheet(type); setSheetMeta({ ...sheetMeta, open: true, players: score.batsmanUpcoming }); };
  const handelShowCustomRunsModal = (isShow) => setShowCustomRunsModal(isShow);

  const handleWagonWheelShot = (direction) => {
    if (score.batsman.find(b => b.isStrikeEnd)) {
      setShotPlacements([...shotPlacements, { batsman: score.batsman.find(b => b.isStrikeEnd).name, direction, timestamp: new Date().toISOString() }]);
      processBall({ runs: 1, runType: "bat" }); // Example run, adjust as needed
    }
    setShowWagonWheel(false);
  };

  useEffect(() => {
    setMatchDetails(mockMatchDetails);
    setMatchTeams(mockMatchDetails.teams);
    setSocket(mockSocket);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(animatedScale.value) }],
  }));

  const handleRefresh = () => {};

  const WagonWheel = ({ onShotSelected, onCancel }) => {
    return (
      <View style={styles.wagonWheelContainer}>
        <View style={styles.wagonWheelHeader}>
          <Text style={styles.wagonWheelTitle}>Select Shot Direction</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Animated.View style={[styles.cricketField, animatedStyle]}>
          <View style={styles.grassBackground} />
          <View style={styles.outerBoundary} />
          <View style={styles.innerCircle} />
          <View style={styles.pitch} />
          <View style={styles.stumpsLeft} />
          <View style={styles.stumpsRight} />
          <View style={styles.poppingCrease} />
          <View style={styles.zoneOff} />
          <View style={styles.zoneLeg} />
        </Animated.View>
        <View style={styles.wagonWheelFooter}>
          <TouchableOpacity style={styles.wagonWheelButton} onPress={() => onShotSelected("Off Side")}>
            <Text style={styles.wagonWheelButtonText}>Off Side</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wagonWheelButton} onPress={() => onShotSelected("Leg Side")}>
            <Text style={styles.wagonWheelButtonText}>Leg Side</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.wagonWheelButton, { backgroundColor: "#34495E" }]} onPress={onCancel}>
            <Text style={styles.wagonWheelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScorerScreenContext.Provider value={{ score }}>
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <MatchHeader handleInningsComplete={handleInningsComplete} matchID={matchID} bowlingTeam={bowlingTeam} battingTeam={battingTeam} currentOver={score.batting.score.over} batsmen={score.batsman} bowler={score.bowler} />
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>{`${score.batting.score.runs}/${score.batting.score.wicket} (${score.batting.score.over}/${score.totalOvers})`}</Text>
            <Text style={styles.scoreDescription}>{score.description}</Text>
          </View>
          <View style={styles.batsmenCard}>
            <TouchableOpacity onPress={handleChangeStrike} style={styles.switchIcon}>
              <MaterialCommunityIcons name="swap-horizontal" size={20} color="#fff" />
            </TouchableOpacity>
            {score.batsman.map((bat, index) => (
              <View key={index} style={styles.batsmanCard}>
                <Text style={styles.batsmanText}>{`${bat.isStrikeEnd ? "🏏" : ""} ${bat.name}`}</Text>
                {bat.ballsFaced === 0 ? (
                  <TouchableOpacity onPress={() => navigation.navigate("ChangeSquad", { teamId: battingTeam.teamId, matchID, playerId: bat.playerId })}>
                    <Text style={styles.replaceText}>Replace</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.batsmanText}>{`${bat.runs}(${bat.ballsFaced})`}</Text>
                )}
              </View>
            ))}
          </View>
          <View style={styles.bowlerCard}>
            <Text style={styles.bowlerText}>{`⚾ ${score.bowler.name}`}</Text>
            {score.currentOver.length === 0 && (
              <TouchableOpacity onPress={() => navigation.navigate("ChangeSquad", { teamId: bowlingTeam.teamId, matchID, playerId: bowler })}>
                <Text style={styles.replaceText}>Change</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.bowlerStats}>{`${score.bowler.over}-${score.bowler.maiden}-${score.bowler.runsGiven}-${score.bowler.wicketsTaken}`}</Text>
          </View>
          <ScrollView horizontal style={styles.overScroll}>
            {score.currentOver.map((run, ind) => (
              <BallPreview run={run} key={ind} />
            ))}
          </ScrollView>
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleBall({ runs: 0, runType: "bat" })}>
              <Text style={styles.controlText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleBall({ runs: 1, runType: "bat" })}>
              <Text style={styles.controlText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleBall({ runs: 2, runType: "bat" })}>
              <Text style={styles.controlText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => handleBall({ runs: 3, runType: "bat" })}>
              <Text style={styles.controlText}>3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.boundaryButton]} onPress={() => handleBall({ runs: 4, runType: "bat", isBoundary: true })}>
              <Text style={styles.controlText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.sixButton]} onPress={() => handleBall({ runs: 6, runType: "bat", isBoundary: true })}>
              <Text style={styles.controlText}>6</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => { setCustomModalDescription({ ...customModalDescription, title: "Wide Ball", type: "wd" }); setShowCustomRunsModal(true); }}>
              <Text style={styles.controlText}>WD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => { setCustomModalDescription({ ...customModalDescription, title: "No Ball", type: "nb" }); setShowCustomRunsModal(true); }}>
              <Text style={styles.controlText}>NB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => { setCustomModalDescription({ ...customModalDescription, title: "Bye Run", type: "bye" }); setShowCustomRunsModal(true); }}>
              <Text style={styles.controlText}>BYE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => updateScore(MATCH_ACTION.UNDO_LAST_BALL)}>
              <Text style={styles.controlText}>UNDO</Text>
            </TouchableOpacity>
            <OutOption onWicket={handleWicket} />
          </View>
          {matchStatus.isInningCompleted && <TouchableOpacity style={styles.endButton} onPress={handleInningsComplete}><Text style={styles.endButtonText}>End Inning</Text></TouchableOpacity>}
          {matchStatus.isMatchCompleted && <Text style={styles.endText}>Match Completed</Text>}
          {matchStatus.isMatchTied && (
            <View style={styles.tiedContainer}>
              <Text style={styles.endText}>Match Tied</Text>
              <TouchableOpacity style={styles.tiedButton} onPress={handleSuperOver}><Text style={styles.tiedButtonText}>Super Over</Text></TouchableOpacity>
              <TouchableOpacity style={styles.tiedButton} onPress={handleDeclareTied}><Text style={styles.tiedButtonText}>Declare Tied</Text></TouchableOpacity>
            </View>
          )}
          <QuickActions />
        </ScrollView>
        {showCustomRunsModal && <CustomRunModel handelShowCustomRunsModal={() => setShowCustomRunsModal(false)} customModalDiscription={customModalDescription} action={(data) => customModalDescription.action(data)} />}
        <BottomSheetList {...bowlerSheetMeta} onChange={handleChangeBowlerSheet} contentHeading="Select Bowler" setOpen={(open) => setBowlerSheetMeta({ ...bowlerSheetMeta, open })} />
        <BottomSheetList {...sheetMeta} onChange={handleChange} contentHeading={sheetMeta.contentHeading || "Select Batter"} setOpen={(open) => setSheetMeta({ ...sheetMeta, open })} />
        <Modal visible={showWagonWheel} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <WagonWheel onShotSelected={handleWagonWheelShot} onCancel={() => setShowWagonWheel(false)} />
          </View>
        </Modal>
      </SafeAreaView>
    </ScorerScreenContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1A2A44" }, // Dark blue background
  matchHeader: { padding: 16, backgroundColor: "#0D1B2A" },
  matchHeaderText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  scoreCard: { padding: 16, backgroundColor: "#142F4E", borderRadius: 12, margin: 8, alignItems: "center" },
  scoreText: { fontSize: 28, color: "#E0E7FF", fontWeight: "bold" },
  scoreDescription: { color: "#A3BFFA", fontSize: 14 },
  batsmenCard: { flexDirection: "row", justifyContent: "space-around", padding: 8, backgroundColor: "#142F4E", borderRadius: 12, margin: 8 },
  batsmanCard: { alignItems: "center", padding: 8, backgroundColor: "#1A2A44", borderRadius: 8 },
  batsmanText: { color: "#E0E7FF", fontSize: 16 },
  replaceText: { color: "#A3BFFA", fontSize: 12, textDecorationLine: "underline" },
  switchIcon: { position: "absolute", top: -10, left: "50%", transform: [{ translateX: -10 }], backgroundColor: "#142F4E", borderRadius: 20, padding: 4 },
  bowlerCard: { padding: 16, backgroundColor: "#142F4E", borderRadius: 12, margin: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bowlerText: { color: "#E0E7FF", fontSize: 16 },
  bowlerStats: { color: "#A3BFFA", fontSize: 14 },
  overScroll: { padding: 8, backgroundColor: "#142F4E", borderRadius: 12, margin: 8 },
  ballPreview: { backgroundColor: "#1A2A44", borderRadius: 50, width: 40, height: 40, justifyContent: "center", alignItems: "center", marginRight: 8 },
  ballPreviewText: { color: "#E0E7FF", fontSize: 14 },
  controlsContainer: { flexDirection: "row", flexWrap: "wrap", padding: 8, backgroundColor: "#142F4E", borderRadius: 12, margin: 8, justifyContent: "space-around" },
  controlButton: { padding: 12, backgroundColor: "#1A2A44", borderRadius: 50, margin: 4, width: 60, alignItems: "center" },
  controlText: { color: "#E0E7FF", fontSize: 16 },
  boundaryButton: { backgroundColor: "#2ECC71" },
  sixButton: { backgroundColor: "#E74C3C" },
  outButton: { padding: 12, backgroundColor: "#E74C3C", borderRadius: 50, margin: 4, width: 60, alignItems: "center" },
  outButtonText: { color: "#fff", fontSize: 16 },
  endButton: { padding: 12, backgroundColor: "#3498DB", borderRadius: 12, margin: 8, alignItems: "center" },
  endButtonText: { color: "#fff", fontSize: 18 },
  endText: { color: "#E0E7FF", fontSize: 18, textAlign: "center", margin: 8 },
  tiedContainer: { padding: 8, backgroundColor: "#142F4E", borderRadius: 12, margin: 8, alignItems: "center" },
  tiedButton: { padding: 8, backgroundColor: "#3498DB", borderRadius: 12, margin: 4, width: "60%" },
  tiedButtonText: { color: "#fff", fontSize: 16, textAlign: "center" },
  quickActions: { padding: 16, backgroundColor: "#142F4E", borderRadius: 12, margin: 8, alignItems: "center" },
  quickActionsText: { color: "#E0E7FF", fontSize: 16 },
  modal: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A2A44" },
  modalTitle: { color: "#E0E7FF", fontSize: 20, marginBottom: 16 },
  modalButton: { padding: 12, backgroundColor: "#3498DB", borderRadius: 12, margin: 8, width: 120, alignItems: "center" },
  modalButtonText: { color: "#fff", fontSize: 16 },
  bottomSheet: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "#1A2A44", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16 },
  bottomSheetTitle: { color: "#E0E7FF", fontSize: 18, marginBottom: 8 },
  bottomSheetItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#34495E" },
  bottomSheetItemText: { color: "#E0E7FF", fontSize: 16 },
  bottomSheetButton: { padding: 12, backgroundColor: "#3498DB", borderRadius: 12, marginTop: 8, alignItems: "center" },
  bottomSheetButtonText: { color: "#fff", fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.7)" },
  wagonWheelContainer: { width: "90%", backgroundColor: "#1A2A44", borderRadius: 20, padding: 16, alignItems: "center" },
  wagonWheelHeader: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 12 },
  wagonWheelTitle: { color: "#E0E7FF", fontSize: 20, fontWeight: "bold" },
  closeButton: { padding: 4 },
  cricketField: { width: 300, height: 300, borderRadius: 150, justifyContent: "center", alignItems: "center", backgroundColor: "#228B22", marginBottom: 16, position: "relative", overflow: "hidden" },
  grassBackground: { position: "absolute", width: "100%", height: "100%", backgroundColor: "#228B22", opacity: 0.8 },
  outerBoundary: { position: "absolute", width: 290, height: 290, borderRadius: 145, borderWidth: 4, borderColor: "#fff" },
  innerCircle: { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: "#A3BFFA" },
  pitch: { position: "absolute", width: 20, height: 100, backgroundColor: "#D2B48C", top: "50%", left: "50%", transform: [{ translateX: -10 }, { translateY: -50 }] },
  stumpsLeft: { position: "absolute", width: 4, height: 30, backgroundColor: "#fff", top: "50%", left: "45%", transform: [{ translateY: -65 }] },
  stumpsRight: { position: "absolute", width: 4, height: 30, backgroundColor: "#fff", top: "50%", left: "55%", transform: [{ translateY: 35 }] },
  poppingCrease: { position: "absolute", width: 40, height: 2, backgroundColor: "#fff", top: "50%", left: "50%", transform: [{ translateX: -20 }, { translateY: -50 }] },
  zoneOff: { position: "absolute", width: "50%", height: "100%", right: 0, backgroundColor: "rgba(65, 105, 225, 0.3)" },
  zoneLeg: { position: "absolute", width: "50%", height: "100%", left: 0, backgroundColor: "rgba(34, 139, 34, 0.3)" },
  wagonWheelFooter: { width: "100%", flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
  wagonWheelButton: { padding: 12, backgroundColor: "#3498DB", borderRadius: 12, width: "30%", alignItems: "center" },
  wagonWheelButtonText: { color: "#fff", fontSize: 16 },
});