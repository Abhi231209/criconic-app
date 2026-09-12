import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  useColorScheme,
  Animated,
  Easing,
  TouchableOpacity
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Header from "./Header";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import MatchOverview from "./MatchOverview";
import TabSwitch from "../custom/TabSwitch";
import MatchInfo from "./MatchInfo";
import MatchSummary from "./MatchSummary";
import FullScoreCard from "./FullScorecard";
import { useSocket } from "@/contexts/SocketContext";
import { matchesApi } from "@/utils/api";
import MatchFullCommentary from "./MatchFullCommentry";
import CurrentSquad from "./CurrentSquad";
import MatchLive from "./MatchLive";
import ThemedText from "../custom/ThemedText";
import { getMatchStatusDisplay } from "@/utils/Common";

export default function MatchScoreCard({
    matchID: matchIDProp,
    hideHeader,
    setStreamUrl,
    seoData = {},
}) {
    const { isConnected, emit, on, off } = useSocket();
    const navigation = useNavigation();
    const route = useRoute();
    const matchID =
        matchIDProp ||
        route.params?.matchId ||
        route.params?.matchID ||
        route.params?.matchDetails?._id ||
        route.params?.matchDetails?.id ||
        route.params?.match?._id ||
        route.params?.match?.id;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    
    const [headToHeadStats, setHeadToHeadStats] = useState({});
    const [teamsRecentForm, setTeamsRecentForm] = useState({});

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(50))[0];
    const connectionPulse = useState(new Animated.Value(1))[0];
    
    // HARDCODED MOCK INITIAL SCORE - COMMENTED OUT (API ONLY)
    /*
    const mockInitialScore = {
        "success": true,
        "streamUrl": "",
        "publishedTime": "2025-07-17T13:58:14.327Z",
        "modifiedTime": "2025-07-17T14:17:06.847Z",
        "date": "2025-07-13T08:53:44.292Z",
        "ballType": "tennis",
        "matchType": "limited",
        "lastInningScore": 88,
        "lastInningWickets": 2,
        "prompt": [
            "Epic blasters need 86 runs in 28 balls.",
            "CRR: 2.25 RRR: 18.43",
            "Last Wicket: Prajjwal Khatri scored 0(5) ."
        ],
        "teams": [
            {
                "teamId": "679729dc30f9673ab3e20ee9",
                "players": [
                    {
                        "id": "676a61e738360dca73b8e210",
                        "username": "Abhishek jangra"
                    },
                    {
                        "id": "676a61e738360dca73b8e214",
                        "username": "Shubham Jangra"
                    },
                    {
                        "id": "676a617c38360dca73b8e1f3",
                        "username": "Harsh Soni"
                    },
                    {
                        "id": "6878f5ccf91f25d2ad729b30",
                        "username": "Dhiraj"
                    }
                ],
                "title": "Thunder strikers",
                "teamLogo": "https://img.criconic.com/images/1738824518312_DALLÂ·E 2025-02-06 12.18.33 - A bold and electrifying cricket team logo for 'Thunder Strikers'. The design features a powerful cricket player swinging a bat with lightning bolts st.webp"
            },
            {
                "teamId": "67972aeb30f9673ab3e210f2",
                "players": [
                    {
                        "id": "676a617c38360dca73b8e1eb",
                        "username": "Prajjwal Khatri"
                    },
                    {
                        "id": "67988a074c9b6de125405161",
                        "username": "Arindam "
                    },
                    {
                        "id": "676bc2a5e16e50c93875a0bd",
                        "username": "Mohit poonia"
                    },
                    {
                        "id": "67695698ccb2bed85375e1b7",
                        "username": "Abhishek Dhull"
                    }
                ],
                "title": "Epic blasters",
                "teamLogo": "https://img.criconic.com/images/1738824418729_DALLÂ·E 2025-02-06 12.16.53 - A dynamic and explosive cricket team logo for 'Epic Blasters'. The design features a powerful cricket ball bursting through flames with a dramatic imp.webp"
            }
        ],
        "totalOvers": 6,
        "matchTotalOver": 6,
        "matchCurrentStatus": "INNINGS_II",
        "currentOver": [
            "nb",
            "nb",
            0,
            0
        ],
        "commentary": [
            {
                "runs": 0,
                "message": "Shubham Jangra to Mohit poonia no run ",
                "over": "1.2"
            },
            {
                "runs": 0,
                "message": "Shubham Jangra to Mohit poonia no run ",
                "over": "1.1"
            },
            {
                "runs": 0,
                "message": "No Ball!  Shubham Jangra to Mohit poonia Free Hit ",
                "over": "1.0"
            },
            {
                "runs": 0,
                "message": "No Ball!  Shubham Jangra to Mohit poonia Free Hit ",
                "over": "1.0"
            }
        ],
        "fullCommentary": [
            {
                "_id": "687905e2f91f25d2ad72a92e",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "Mohit poonia defends solidly, but no runs are scored. The total score is now 3.",
                "ballNumber": "1.2",
                "runs": "",
                "timestamp": "2025-07-17T14:17:06.827Z",
                "createdAt": "2025-07-17T14:17:06.827Z",
                "updatedAt": "2025-07-17T14:17:06.846Z",
                "__v": 0
            },
            {
                "_id": "687905d5f91f25d2ad72a924",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "Shubham Jangra keeps it right on the mark, and Mohit poonia can't score. The total score is now 3.",
                "ballNumber": "1.1",
                "runs": "",
                "timestamp": "2025-07-17T14:16:53.586Z",
                "createdAt": "2025-07-17T14:16:53.586Z",
                "updatedAt": "2025-07-17T14:16:53.609Z",
                "__v": 0
            },
            {
                "_id": "687905c3f91f25d2ad72a91a",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "Shubham Jangra has overstepped! The umpire calls a no-ball, gifting an extra run. The total score is now 3.",
                "ballNumber": "0.6",
                "runs": "nb",
                "timestamp": "2025-07-17T14:16:35.904Z",
                "createdAt": "2025-07-17T14:16:35.904Z",
                "updatedAt": "2025-07-17T14:16:35.925Z",
                "__v": 0
            },
            {
                "_id": "6879059ef91f25d2ad72a910",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "Shubham Jangra has overstepped! The umpire calls a no-ball, gifting an extra run. The total score is now 2.",
                "ballNumber": "0.6",
                "runs": "nb",
                "timestamp": "2025-07-17T14:15:58.959Z",
                "createdAt": "2025-07-17T14:15:58.959Z",
                "updatedAt": "2025-07-17T14:15:58.979Z",
                "__v": 0
            },
            {
                "_id": "6879057cf91f25d2ad72a8ff",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "A well-directed delivery leaves Arindam  with no scoring options. The total score is now 1.",
                "ballNumber": "0.6",
                "runs": "",
                "timestamp": "2025-07-17T14:15:24.457Z",
                "createdAt": "2025-07-17T14:15:24.457Z",
                "updatedAt": "2025-07-17T14:15:24.473Z",
                "__v": 0
            },
            {
                "_id": "68790568f91f25d2ad72a8e4",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "WICKET! Prajjwal Khatri departs, a critical moment in the match!",
                "ballNumber": "0.5",
                "runs": "w",
                "timestamp": "2025-07-17T14:15:04.159Z",
                "createdAt": "2025-07-17T14:15:04.159Z",
                "updatedAt": "2025-07-17T14:15:04.234Z",
                "__v": 0
            },
            {
                "_id": "6879054cf91f25d2ad72a8da",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "A well-directed delivery leaves Prajjwal Khatri with no scoring options. The total score is now 1.",
                "ballNumber": "0.4",
                "runs": "",
                "timestamp": "2025-07-17T14:14:36.252Z",
                "createdAt": "2025-07-17T14:14:36.252Z",
                "updatedAt": "2025-07-17T14:14:36.272Z",
                "__v": 0
            },
            {
                "_id": "68790535f91f25d2ad72a8d0",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "No run! Excellent control by Abhishek jangra. The total score is now 1.",
                "ballNumber": "0.3",
                "runs": "",
                "timestamp": "2025-07-17T14:14:13.436Z",
                "createdAt": "2025-07-17T14:14:13.436Z",
                "updatedAt": "2025-07-17T14:14:13.457Z",
                "__v": 0
            },
            {
                "_id": "68790507f91f25d2ad72a8b6",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "No run! Excellent control by Abhishek jangra. The total score is now 1.",
                "ballNumber": "0.4",
                "runs": "",
                "timestamp": "2025-07-17T14:13:27.386Z",
                "createdAt": "2025-07-17T14:13:27.386Z",
                "updatedAt": "2025-07-17T14:13:27.406Z",
                "__v": 0
            },
            {
                "_id": "687904f1f91f25d2ad72a8a3",
                "match": "68790176f91f25d2ad72a60f",
                "type": "text",
                "comment": "Abhishek jangra knocks over Prajjwal Khatri! The ball sneaks through the defense to hit the stumps.",
                "ballNumber": "0.3",
                "runs": "w",
                "timestamp": "2025-07-17T14:13:05.806Z",
                "createdAt": "2025-07-17T14:13:05.806Z",
                "updatedAt": "2025-07-17T14:13:05.827Z",
                "__v": 0
            }
        ],
        "description": "Epic blasters need 86 runs in 28 balls.",
        "title": "Thunder strikers vs Epic blasters",
        "tournament": {
            "_id": "6853d8334c3139875e120e1b",
            "title": "new tournament 123",
            "slug": "new-tournament-123"
        },
        "tossWin": {
            "winningTeam": "679729dc30f9673ab3e20ee9",
            "decision": "BAT"
        },
        "batting": {
            "battingTeam": "Epic blasters",
            "battingId": "67972aeb30f9673ab3e210f2",
            "score": {
                "runs": 3,
                "wicket": 1,
                "over": "1.2",
                "CRR": "2.50"
            }
        },
        "batsman": [
            {
                "name": "Arindam ",
                "playerId": "67988a074c9b6de125405161",
                "runs": 0,
                "ballsFaced": 1,
                "battingPosition": 2,
                "fours": 0,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": false,
                "sr": "0.00"
            },
            {
                "name": "Mohit poonia",
                "playerId": "676bc2a5e16e50c93875a0bd",
                "runs": 0,
                "ballsFaced": 2,
                "fours": 0,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": true,
                "sr": "0.00"
            }
        ],
        "partnerships": {
            "batsman1": {
                "playerId": "676bc2a5e16e50c93875a0bd",
                "runs": 0,
                "balls": 4
            },
            "batsman2": {
                "playerId": "67988a074c9b6de125405161",
                "runs": 0,
                "balls": 1
            },
            "totalRuns": 2,
            "balls": 5,
            "createdAt": "2025-07-17T14:15:05.357Z"
        },
        "fallOfWickets": [
            {
                "batsman": {
                    "playerId": "676a617c38360dca73b8e1eb",
                    "name": "Prajjwal Khatri"
                },
                "bowler": {
                    "playerId": "676a61e738360dca73b8e210",
                    "name": "Abhishek jangra"
                },
                "teamRuns": 1,
                "teamOvers": "0.5",
                "createdAt": "2025-07-17T14:15:04.156Z"
            }
        ],
        "batsmanUpcoming": [
            {
                "id": "67695698ccb2bed85375e1b7",
                "username": "Abhishek Dhull",
                "playerId": "67695698ccb2bed85375e1b7"
            }
        ],
        "playedBatsman": [
            {
                "name": "Prajjwal Khatri",
                "playerId": "676a617c38360dca73b8e1eb",
                "runs": 0,
                "ballsFaced": 5,
                "battingPosition": 1,
                "fours": 0,
                "sixes": 0,
                "notOut": false,
                "isStrikeEnd": true,
                "dismissalInfo": {
                    "dismissalType": "run-out",
                    "runOutfielderOne": {
                        "id": "6878f5ccf91f25d2ad729b30",
                        "username": "Dhiraj"
                    }
                },
                "sr": "0.00"
            },
            {
                "name": "Arindam ",
                "playerId": "67988a074c9b6de125405161",
                "runs": 0,
                "ballsFaced": 1,
                "battingPosition": 2,
                "fours": 0,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": false,
                "sr": "0.00"
            },
            {
                "name": "Mohit poonia",
                "playerId": "676bc2a5e16e50c93875a0bd",
                "runs": 0,
                "ballsFaced": 2,
                "fours": 0,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": true,
                "sr": "0.00"
            }
        ],
        "bowler": {
            "name": "Shubham Jangra",
            "playerId": "676a61e738360dca73b8e214",
            "balls": 2,
            "runsGiven": 2,
            "wicketsTaken": 0,
            "isBowlingCurrentOver": true,
            "maiden": 0,
            "over": "0.2",
            "eco": "10.00"
        },
        "bowling": {
            "teamName": "Thunder strikers",
            "lastTwoBowlers": [
                {
                    "name": "Abhishek jangra",
                    "playerId": "676a61e738360dca73b8e210",
                    "balls": 6,
                    "runsGiven": 1,
                    "wicketsTaken": 0,
                    "maiden": 1,
                    "over": "1.0",
                    "eco": "1.00"
                },
                {
                    "name": "Shubham Jangra",
                    "playerId": "676a61e738360dca73b8e214",
                    "balls": 2,
                    "runsGiven": 2,
                    "wicketsTaken": 0,
                    "maiden": 0,
                    "over": "0.2",
                    "eco": "10.00"
                }
            ],
            "allBowlers": [
                {
                    "name": "Abhishek jangra",
                    "playerId": "676a61e738360dca73b8e210",
                    "balls": 6,
                    "runsGiven": 1,
                    "wicketsTaken": 0,
                    "maiden": 1,
                    "over": "1.0",
                    "eco": "1.00"
                },
                {
                    "name": "Shubham Jangra",
                    "playerId": "676a61e738360dca73b8e214",
                    "balls": 2,
                    "runsGiven": 2,
                    "wicketsTaken": 0,
                    "maiden": 0,
                    "over": "0.2",
                    "eco": "10.00"
                }
            ]
        },
        "currentInningWicket": 1,
        "matchConfig": {
            "countNoBallRun": true,
            "countWideRun": true,
            "singleBatsmanAllowed": false,
            "showComparisonGraph": false,
            "showMatchSummary": false,
            "showPlayingEleven": false,
            "showPartnership": false,
            "showMatchPreview": false,
            "showToss": false
        },
        "stats": {},
        "extras": 0,
        "inning": [
            {
                "streamUrl": "",
                "publishedTime": "2025-07-17T13:58:14.327Z",
                "modifiedTime": "2025-07-17T14:17:06.847Z",
                "date": "2025-07-13T08:53:44.292Z",
                "ballType": "tennis",
                "matchType": "limited",
                "lastInningScore": 88,
                "lastInningWickets": 2,
                "batting": {
                    "battingTeam": "Thunder strikers",
                    "battingId": "679729dc30f9673ab3e20ee9",
                    "score": {
                        "runs": 88,
                        "wicket": 2,
                        "over": "6.0",
                        "CRR": "14.67",
                        "projectedScore": 88
                    }
                },
                "batsman": [
                    {
                        "name": "Harsh Soni",
                        "playerId": "676a617c38360dca73b8e1f3",
                        "runs": 7,
                        "ballsFaced": 9,
                        "fours": 0,
                        "sixes": 1,
                        "notOut": true,
                        "isStrikeEnd": false,
                        "sr": "77.78"
                    },
                    {
                        "name": "Dhiraj",
                        "playerId": "6878f5ccf91f25d2ad729b30",
                        "runs": 4,
                        "ballsFaced": 3,
                        "fours": 1,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": true,
                        "sr": "133.33"
                    }
                ],
                "partnerships": {
                    "batsman1": {
                        "playerId": "6878f5ccf91f25d2ad729b30",
                        "runs": 4,
                        "balls": 3
                    },
                    "batsman2": {
                        "playerId": "676a617c38360dca73b8e1f3",
                        "runs": 1,
                        "balls": 5
                    },
                    "totalRuns": 5,
                    "balls": 8,
                    "createdAt": "2025-07-17T14:09:08.860Z"
                },
                "fallOfWickets": [
                    {
                        "batsman": {
                            "playerId": "676a61e738360dca73b8e210",
                            "name": "Abhishek jangra"
                        },
                        "bowler": {
                            "playerId": "67988a074c9b6de125405161",
                            "name": "Arindam "
                        },
                        "teamRuns": 44,
                        "teamOvers": "2.3",
                        "createdAt": "2025-07-17T14:04:47.060Z"
                    },
                    {
                        "batsman": {
                            "playerId": "676a61e738360dca73b8e214",
                            "name": "Shubham Jangra"
                        },
                        "bowler": {
                            "playerId": "676a617c38360dca73b8e1eb",
                            "name": "Prajjwal Khatri"
                        },
                        "teamRuns": 83,
                        "teamOvers": "4.4",
                        "createdAt": "2025-07-17T14:09:07.745Z"
                    }
                ],
                "batsmanUpcoming": [],
                "playedBatsman": [
                    {
                        "name": "Shubham Jangra",
                        "playerId": "676a61e738360dca73b8e214",
                        "runs": 57,
                        "ballsFaced": 18,
                        "battingPosition": 1,
                        "fours": 0,
                        "sixes": 9,
                        "notOut": false,
                        "isStrikeEnd": true,
                        "dismissalInfo": {
                            "dismissalType": "Caught",
                            "caughtBy": {
                                "id": "67695698ccb2bed85375e1b7",
                                "username": "Abhishek Dhull"
                            },
                            "bowler": {
                                "name": "Prajjwal Khatri",
                                "playerId": "676a617c38360dca73b8e1eb",
                                "balls": 9,
                                "runsGiven": 30,
                                "wicketsTaken": 0,
                                "isBowlingCurrentOver": true,
                                "maiden": 0,
                                "over": "1.3",
                                "eco": "23.08"
                            }
                        },
                        "sr": "316.67"
                    },
                    {
                        "name": "Abhishek jangra",
                        "playerId": "676a61e738360dca73b8e210",
                        "runs": 11,
                        "ballsFaced": 6,
                        "battingPosition": 2,
                        "fours": 1,
                        "sixes": 1,
                        "notOut": false,
                        "isStrikeEnd": true,
                        "dismissalInfo": {
                            "dismissalType": "Caught",
                            "caughtBy": {
                                "id": "676a617c38360dca73b8e1eb",
                                "username": "Prajjwal Khatri"
                            },
                            "bowler": {
                                "name": "Arindam ",
                                "playerId": "67988a074c9b6de125405161",
                                "balls": 2,
                                "runsGiven": 7,
                                "wicketsTaken": 0,
                                "isBowlingCurrentOver": true,
                                "maiden": 0,
                                "over": "0.2",
                                "eco": "35.00"
                            }
                        },
                        "sr": "183.33"
                    },
                    {
                        "name": "Harsh Soni",
                        "playerId": "676a617c38360dca73b8e1f3",
                        "runs": 7,
                        "ballsFaced": 9,
                        "fours": 0,
                        "sixes": 1,
                        "notOut": true,
                        "isStrikeEnd": false,
                        "sr": "77.78"
                    },
                    {
                        "name": "Dhiraj",
                        "playerId": "6878f5ccf91f25d2ad729b30",
                        "runs": 4,
                        "ballsFaced": 3,
                        "fours": 1,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": true,
                        "sr": "133.33"
                    }
                ],
                "bowler": {
                    "name": "Abhishek Dhull",
                    "playerId": "67695698ccb2bed85375e1b7",
                    "balls": 12,
                    "runsGiven": 27,
                    "wicketsTaken": 0,
                    "isBowlingCurrentOver": false,
                    "maiden": 0,
                    "over": "2.0",
                    "eco": "13.50"
                },
                "bowling": {
                    "teamName": "Epic blasters",
                    "lastTwoBowlers": [
                        {
                            "name": "Prajjwal Khatri",
                            "playerId": "676a617c38360dca73b8e1eb",
                            "balls": 12,
                            "runsGiven": 34,
                            "wicketsTaken": 1,
                            "maiden": 0,
                            "over": "2.0",
                            "eco": "17.00"
                        },
                        {
                            "name": "Abhishek Dhull",
                            "playerId": "67695698ccb2bed85375e1b7",
                            "balls": 12,
                            "runsGiven": 27,
                            "wicketsTaken": 0,
                            "maiden": 0,
                            "over": "2.0",
                            "eco": "13.50"
                        }
                    ],
                    "allBowlers": [
                        {
                            "name": "Mohit poonia",
                            "playerId": "676bc2a5e16e50c93875a0bd",
                            "balls": 6,
                            "runsGiven": 19,
                            "wicketsTaken": 0,
                            "maiden": 0,
                            "over": "1.0",
                            "eco": "19.00"
                        },
                        {
                            "name": "Prajjwal Khatri",
                            "playerId": "676a617c38360dca73b8e1eb",
                            "balls": 12,
                            "runsGiven": 34,
                            "wicketsTaken": 1,
                            "maiden": 0,
                            "over": "2.0",
                            "eco": "17.00"
                        },
                        {
                            "name": "Arindam ",
                            "playerId": "67988a074c9b6de125405161",
                            "balls": 6,
                            "runsGiven": 8,
                            "wicketsTaken": 1,
                            "maiden": 0,
                            "over": "1.0",
                            "eco": "8.00"
                        },
                        {
                            "name": "Abhishek Dhull",
                            "playerId": "67695698ccb2bed85375e1b7",
                            "balls": 12,
                            "runsGiven": 27,
                            "wicketsTaken": 0,
                            "maiden": 0,
                            "over": "2.0",
                            "eco": "13.50"
                        }
                    ]
                },
                "currentInningWicket": 1,
                "matchConfig": {
                    "countNoBallRun": true,
                    "countWideRun": true,
                    "singleBatsmanAllowed": false,
                    "showComparisonGraph": false,
                    "showMatchSummary": false,
                    "showPlayingEleven": false,
                    "showPartnership": false,
                    "showMatchPreview": false,
                    "showToss": false
                },
                "stats": {},
                "extras": 9
            },
            {
                "streamUrl": "",
                "publishedTime": "2025-07-17T13:58:14.327Z",
                "modifiedTime": "2025-07-17T14:17:06.847Z",
                "date": "2025-07-13T08:53:44.292Z",
                "ballType": "tennis",
                "matchType": "limited",
                "lastInningScore": 88,
                "lastInningWickets": 2,
                "batting": {
                    "battingTeam": "Epic blasters",
                    "battingId": "67972aeb30f9673ab3e210f2",
                    "score": {
                        "runs": 3,
                        "wicket": 1,
                        "over": "1.2",
                        "CRR": "2.50"
                    }
                },
                "batsman": [
                    {
                        "name": "Arindam ",
                        "playerId": "67988a074c9b6de125405161",
                        "runs": 0,
                        "ballsFaced": 1,
                        "battingPosition": 2,
                        "fours": 0,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": false
                        },
                    {
                        "name": "Mohit poonia",
                        "playerId": "676bc2a5e16e50c93875a0bd",
                        "runs": 0,
                        "ballsFaced": 2,
                        "fours": 0,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": true
                    }
                ],
                "partnerships": {
                    "batsman1": {
                        "playerId": "676bc2a5e16e50c93875a0bd",
                        "runs": 0,
                        "balls": 4
                    },
                    "batsman2": {
                        "playerId": "67988a074c9b6de125405161",
                        "runs": 0,
                        "balls": 1
                    },
                    "totalRuns": 2,
                    "balls": 5,
                    "createdAt": "2025-07-17T14:15:05.357Z"
                },
                "fallOfWickets": [
                    {
                        "batsman": {
                            "playerId": "676a617c38360dca73b8e1eb",
                            "name": "Prajjwal Khatri"
                        },
                        "bowler": {
                            "playerId": "676a61e738360dca73b8e210",
                            "name": "Abhishek jangra"
                        },
                        "teamRuns": 1,
                        "teamOvers": "0.5",
                        "createdAt": "2025-07-17T14:15:04.156Z"
                    }
                ],
                "batsmanUpcoming": [
                    {
                        "id": "67695698ccb2bed85375e1b7",
                        "username": "Abhishek Dhull",
                        "playerId": "67695698ccb2bed85375e1b7"
                    }
                ],
                "playedBatsman": [
                    {
                        "name": "Prajjwal Khatri",
                        "playerId": "676a617c38360dca73b8e1eb",
                        "runs": 0,
                        "ballsFaced": 5,
                        "battingPosition": 1,
                        "fours": 0,
                        "sixes": 0,
                        "notOut": false,
                        "isStrikeEnd": true,
                        "dismissalInfo": {
                            "dismissalType": "run-out",
                            "runOutfielderOne": {
                                "id": "6878f5ccf91f25d2ad729b30",
                                "username": "Dhiraj"
                            }
                        },
                        "sr": "0.00"
                    },
                    {
                        "name": "Arindam ",
                        "playerId": "67988a074c9b6de125405161",
                        "runs": 0,
                        "ballsFaced": 1,
                        "battingPosition": 2,
                        "fours": 0,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": false,
                        "sr": "0.00"
                    },
                    {
                        "name": "Mohit poonia",
                        "playerId": "676bc2a5e16e50c93875a0bd",
                        "runs": 0,
                        "ballsFaced": 2,
                        "fours": 0,
                        "sixes": 0,
                        "notOut": true,
                        "isStrikeEnd": true,
                        "sr": "0.00"
                    }
                ],
                "isSuperOver": false,
                "bowler": {
                    "name": "Shubham Jangra",
                    "playerId": "676a61e738360dca73b8e214",
                    "balls": 2,
                    "runsGiven": 2,
                    "wicketsTaken": 0,
                    "isBowlingCurrentOver": true,
                    "maiden": 0,
                    "over": "0.2",
                    "eco": "10.00"
                },
                "bowling": {
                    "teamName": "Thunder strikers",
                    "lastTwoBowlers": [
                        {
                            "name": "Abhishek jangra",
                            "playerId": "676a61e738360dca73b8e210",
                            "balls": 6,
                            "runsGiven": 1,
                            "wicketsTaken": 0,
                            "maiden": 1,
                            "over": "1.0",
                            "eco": "1.00"
                        },
                        {
                            "name": "Shubham Jangra",
                            "playerId": "676a61e738360dca73b8e214",
                            "balls": 2,
                            "runsGiven": 2,
                            "wicketsTaken": 0,
                            "maiden": 0,
                            "over": "0.2",
                            "eco": "10.00"
                        }
                    ],
                    "allBowlers": [
                        {
                            "name": "Abhishek jangra",
                            "playerId": "676a61e738360dca73b8e210",
                            "balls": 6,
                            "runsGiven": 1,
                            "wicketsTaken": 0,
                            "maiden": 1,
                            "over": "1.0",
                            "eco": "1.00"
                        },
                        {
                            "name": "Shubham Jangra",
                            "playerId": "676a61e738360dca73b8e214",
                            "balls": 2,
                            "runsGiven": 2,
                            "wicketsTaken": 0,
                            "maiden": 0,
                            "over": "0.2",
                            "eco": "10.00"
                        }
                    ]
                },
                "currentInningWicket": 1,
                "matchConfig": {
                    "countNoBallRun": true,
                    "countWideRun": true,
                    "singleBatsmanAllowed": false,
                    "showComparisonGraph": false,
                    "showMatchSummary": false,
                    "showPlayingEleven": false,
                    "showPartnership": false,
                    "showMatchPreview": false,
                    "showToss": false
                },
                "stats": {},
                "extras": 3
            }
        ],
        "summary": {
            "teams": [
                {
                    "title": "Thunder strikers",
                    "score": "88-2",
                    "overs": "6.0",
                    "batsman": [
                        {
                            "name": "Shubham Jangra",
                            "playerId": "676a61e738360dca73b8e214",
                            "runs": 57,
                            "ballsFaced": 18,
                            "battingPosition": 1,
                            "fours": 0,
                            "sixes": 9,
                            "notOut": false,
                            "isStrikeEnd": true,
                            "dismissalInfo": {
                                "dismissalType": "Caught",
                                "caughtBy": {
                                    "id": "67695698ccb2bed85375e1b7",
                                    "username": "Abhishek Dhull"
                                },
                                "bowler": {
                                    "name": "Prajjwal Khatri",
                                    "playerId": "676a617c38360dca73b8e1eb",
                                    "balls": 9,
                                    "runsGiven": 30,
                                    "wicketsTaken": 0,
                                    "isBowlingCurrentOver": true,
                                    "maiden": 0,
                                    "over": "1.3",
                                    "eco": "23.08"
                                }
                            }
                        },
                        {
                            "name": "Abhishek jangra",
                            "playerId": "676a61e738360dca73b8e210",
                            "runs": 11,
                            "ballsFaced": 6,
                            "battingPosition": 2,
                            "fours": 1,
                            "sixes": 1,
                            "notOut": false,
                            "isStrikeEnd": true,
                            "dismissalInfo": {
                                "dismissalType": "Caught",
                                "caughtBy": {
                                    "id": "676a617c38360dca73b8e1eb",
                                    "username": "Prajjwal Khatri"
                                },
                                "bowler": {
                                    "name": "Arindam ",
                                    "playerId": "67988a074c9b6de125405161",
                                    "balls": 2,
                                    "runsGiven": 7,
                                    "wicketsTaken": 0,
                                    "isBowlingCurrentOver": true,
                                    "maiden": 0,
                                    "over": "0.2",
                                    "eco": "35.00"
                                }
                            }
                        },
                        {
                            "name": "Harsh Soni",
                            "playerId": "676a617c38360dca73b8e1f3",
                            "runs": 7,
                            "ballsFaced": 9,
                            "fours": 0,
                            "sixes": 1,
                            "notOut": true,
                            "isStrikeEnd": false
                        },
                        {
                            "name": "Dhiraj",
                            "playerId": "6878f5ccf91f25d2ad729b30",
                            "runs": 4,
                            "ballsFaced": 3,
                            "fours": 1,
                            "sixes": 0,
                            "notOut": true,
                            "isStrikeEnd": true
                        }
                    ],
                    "bowlers": [
                        {
                            "name": "Arindam ",
                            "playerId": "67988a074c9b6de125405161",
                            "balls": 6,
                            "runsGiven": 8,
                            "wicketsTaken": 1
                        },
                        {
                            "name": "Prajjwal Khatri",
                            "playerId": "676a617c38360dca73b8e1eb",
                            "balls": 12,
                            "runsGiven": 34,
                            "wicketsTaken": 1
                        },
                        {
                            "name": "Mohit poonia",
                            "playerId": "676bc2a5e16e50c93875a0bd",
                            "balls": 6,
                            "runsGiven": 19,
                            "wicketsTaken": 0
                        },
                        {
                            "name": "Abhishek Dhull",
                            "playerId": "67695698ccb2bed85375e1b7",
                            "balls": 12,
                            "runsGiven": 27,
                            "wicketsTaken": 0
                        }
                    ],
                    "teamLogo": "https://img.criconic.com/images/1738824518312_DALLÂ·E 2025-02-06 12.18.33 - A bold and electrifying cricket team logo for 'Thunder Strikers'. The design features a powerful cricket player swinging a bat with lightning bolts st.webp",
                    "commentary": "",
                    "teamId": "679729dc30f9673ab3e20ee9"
                },
                {
                    "title": "Epic blasters",
                    "score": "3-1",
                    "overs": "1.2",
                    "batsman": [
                        {
                            "name": "Arindam ",
                            "playerId": "67988a074c9b6de125405161",
                            "runs": 0,
                            "ballsFaced": 1,
                            "battingPosition": 2,
                            "fours": 0,
                            "sixes": 0,
                            "notOut": true,
                            "isStrikeEnd": false
                        },
                        {
                            "name": "Mohit poonia",
                            "playerId": "676bc2a5e16e50c93875a0bd",
                            "runs": 0,
                            "ballsFaced": 2,
                            "fours": 0,
                            "sixes": 0,
                            "notOut": true,
                            "isStrikeEnd": true
                        },
                        {
                            "name": "Prajjwal Khatri",
                            "playerId": "676a617c38360dca73b8e1eb",
                            "runs": 0,
                            "ballsFaced": 5,
                            "battingPosition": 1,
                            "fours": 0,
                            "sixes": 0,
                            "notOut": false,
                            "isStrikeEnd": true,
                            "dismissalInfo": {
                                "dismissalType": "run-out",
                                "runOutfielderOne": {
                                    "id": "6878f5ccf91f25d2ad729b30",
                                    "username": "Dhiraj"
                                }
                            }
                        }
                    ],
                    "bowlers": [
                        {
                            "name": "Abhishek jangra",
                            "playerId": "676a61e738360dca73b8e210",
                            "balls": 6,
                            "runsGiven": 1,
                            "wicketsTaken": 0
                        },
                        {
                            "name": "Shubham Jangra",
                            "playerId": "676a61e738360dca73b8e214",
                            "balls": 2,
                            "runsGiven": 2,
                            "wicketsTaken": 0
                        }
                    ],
                    "teamLogo": "https://img.criconic.com/images/1738824418729_DALLÂ·E 2025-02-06 12.16.53 - A dynamic and explosive cricket team logo for 'Epic Blasters'. The design features a powerful cricket ball bursting through flames with a dramatic imp.webp",
                    "commentary": "",
                    "teamId": "67972aeb30f9673ab3e210f2"
                }
            ],
            "matchResult": "",
            "description": ""
        }
    };
    */

    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState({
        success: true,
        teams: [],
        inning: [],
        commentary: [],
        fullCommentary: [],
        matchConfig: {
            showMatchSummary: false,
            showMatchPreview: false,
            showPlayingEleven: false,
        }
    });

    useEffect(() => {
        if (!matchID) {
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all([
            matchesApi.getMatchById(matchID),
            matchesApi.getMatchScore(matchID).catch(() => null),
            matchesApi.getHeadToHead(matchID).catch(() => null),
            matchesApi.getTeamsRecentForm(matchID).catch(() => null),
        ])
            .then(([matchRes, scoreRes, h2hRes, formRes]) => {
                const matchData = matchRes?.match || matchRes?.data || matchRes;
                const scoreData = scoreRes?.data;
                if (matchData) {
                    setScore(prev => ({
                        ...prev,
                        ...matchData,
                        ...(scoreData && typeof scoreData === "object" ? scoreData : {}),
                    }));
                }
                if (h2hRes?.data?.data) {
                    setHeadToHeadStats(h2hRes.data.data);
                } else if (h2hRes?.data) {
                    setHeadToHeadStats(h2hRes.data);
                }
                if (formRes?.data?.data) {
                    setTeamsRecentForm(formRes.data.data);
                } else if (formRes?.data) {
                    setTeamsRecentForm(formRes.data);
                }
            })
            .catch(err => console.log('Error fetching match by id:', err))
            .finally(() => setLoading(false));
    }, [matchID]);

    // Start animations on component mount

    // Re-verify and refresh match score on focus (e.g. returning from PlayerProfile)
    useFocusEffect(
        useCallback(() => {
            if (!matchID) return;
            matchesApi.getMatchById(matchID)
                .then((matchRes) => {
                    const matchData = matchRes?.match || matchRes?.data || matchRes;
                    if (matchData && (matchData._id || matchData.teams)) {
                        setScore(prev => ({
                            ...prev,
                            ...matchData,
                        }));
                    }
                })
                .catch(() => {});

            matchesApi.getMatchScore(matchID)
                .then((scoreRes) => {
                    const scoreData = scoreRes?.data;
                    if (scoreData && typeof scoreData === "object" && scoreData.success !== false) {
                        setScore(prev => ({
                            ...prev,
                            ...scoreData,
                        }));
                    }
                })
                .catch(() => {});

            if (isConnected) {
                emit('score', { matchId: matchID, matchID, getCompleteScore: true });
            }
        }, [matchID, isConnected, emit])
    );

    // Socket.IO event handlers (matching website socketConn setup)
    useEffect(() => {
        console.log('🔌 Socket effect triggered:', { isConnected, matchID });
        console.log('🔌 isConnected value:', isConnected);
        
        if (!isConnected || !matchID) {
            console.log('⚠️ Socket not ready:', { isConnected, matchID });
            return;
        }

        console.log('✅ Setting up socket event handlers for match:', matchID);

        // Handle generic score updates strictly for this matchID
        const handleScore = (data) => {
            if (!data || typeof data !== 'object' || data.success === false) return;

            const incomingId = String(
                data.matchId ||
                data.matchID ||
                data._id ||
                data.id ||
                data.match ||
                data.fullCommentary?.[0]?.match ||
                ""
            );
            if (incomingId && String(matchID) && incomingId !== String(matchID)) {
                console.log('⚠️ [MatchScoreCard] Ignoring score update from different match:', incomingId, 'expected:', matchID);
                return;
            }

            console.log('📊 Score data received for match:', matchID);
            setScore(prevScore => ({
                ...prevScore,
                ...data
            }));
        };

        // Subscribe to events (pass getCompleteScore: true matching website)
        console.log('📡 Subscribing to socket events...');
        try {
            emit('score', { matchId: matchID, matchID, getCompleteScore: true });
            on("score", handleScore);
            console.log('✅ Socket event handlers set up successfully');
        } catch (error) {
            console.error('❌ Error setting up socket events:', error);
        }

        // Cleanup event listeners
        return () => {
            console.log('🧹 Cleaning up socket event handlers');
            try {
                off("score", handleScore);
            } catch (error) {
                console.error('❌ Error cleaning up socket events:', error);
            }
        };
    }, [isConnected, matchID, emit, on, off]);

    // Styles for light/dark mode
    const containerStyle = {
        // backgroundColor: isDarkMode ? '#121212' : '#f8f9fa',
        flex: 1
    };

    const cardStyle = {
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        shadowColor: isDarkMode ? '#000' : '#888',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    };

    const textStyle = {
        color: isDarkMode ? '#e0e0e0' : '#333333',
    };

    const secondaryTextStyle = {
        color: isDarkMode ? '#a0a0a0' : '#666666',
    };

    const statusIndicatorStyle = {
        backgroundColor: isConnected ? (isDarkMode ? '#2e7d32' : '#4caf50') : (isDarkMode ? '#c62828' : '#f44336'),
    };



    // HARDCODED FULL SCORECARD MOCK DATA - COMMENTED OUT (API ONLY)
    /*
    let fullScoreCardScore = {
        "streamUrl": "",
        "publishedTime": "2025-07-17T13:58:14.327Z",
        "modifiedTime": "2025-07-17T14:17:06.847Z",
        "date": "2025-07-13T08:53:44.292Z",
        "ballType": "tennis",
        "matchType": "limited",
        "lastInningScore": 88,
        "lastInningWickets": 2,
        "batting": {
            "battingTeam": "Thunder strikers",
            "battingId": "679729dc30f9673ab3e20ee9",
            "score": {
                "runs": 88,
                "wicket": 2,
                "over": "6.0",
                "CRR": "14.67",
                "projectedScore": 88
            }
        },
        "batsman": [
            {
                "name": "Harsh Soni",
                "playerId": "676a617c38360dca73b8e1f3",
                "runs": 7,
                "ballsFaced": 9,
                "fours": 0,
                "sixes": 1,
                "notOut": true,
                "isStrikeEnd": false,
                "sr": "77.78"
            },
            {
                "name": "Dhiraj",
                "playerId": "6878f5ccf91f25d2ad729b30",
                "runs": 4,
                "ballsFaced": 3,
                "fours": 1,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": true,
                "sr": "133.33"
            }
        ],
        "partnerships": {
            "batsman1": {
                "playerId": "6878f5ccf91f25d2ad729b30",
                "runs": 4,
                "balls": 3
            },
            "batsman2": {
                "playerId": "676a617c38360dca73b8e1f3",
                "runs": 1,
                "balls": 5
            },
            "totalRuns": 5,
            "balls": 8,
            "createdAt": "2025-07-17T14:09:08.860Z"
        },
        "fallOfWickets": [
            {
                "batsman": {
                    "playerId": "676a61e738360dca73b8e210",
                    "name": "Abhishek jangra"
                },
                "bowler": {
                    "playerId": "67988a074c9b6de125405161",
                    "name": "Arindam "
                },
                "teamRuns": 44,
                "teamOvers": "2.3",
                "createdAt": "2025-07-17T14:04:47.060Z"
            },
            {
                "batsman": {
                    "playerId": "676a61e738360dca73b8e214",
                    "name": "Shubham Jangra"
                },
                "bowler": {
                    "playerId": "676a617c38360dca73b8e1eb",
                    "name": "Prajjwal Khatri"
                },
                "teamRuns": 83,
                "teamOvers": "4.4",
                "createdAt": "2025-07-17T14:09:07.745Z"
            }
        ],
        "batsmanUpcoming": [],
        "playedBatsman": [
            {
                "name": "Shubham Jangra",
                "playerId": "676a61e738360dca73b8e214",
                "runs": 57,
                "ballsFaced": 18,
                "battingPosition": 1,
                "fours": 0,
                "sixes": 9,
                "notOut": false,
                "isStrikeEnd": true,
                "dismissalInfo": {
                    "dismissalType": "Caught",
                    "caughtBy": {
                        "id": "67695698ccb2bed85375e1b7",
                        "username": "Abhishek Dhull"
                    },
                    "bowler": {
                        "name": "Prajjwal Khatri",
                        "playerId": "676a617c38360dca73b8e1eb",
                        "balls": 9,
                        "runsGiven": 30,
                        "wicketsTaken": 0,
                        "isBowlingCurrentOver": true,
                        "maiden": 0,
                        "over": "1.3",
                        "eco": "23.08"
                    }
                },
                "sr": "316.67"
            },
            {
                "name": "Abhishek jangra",
                "playerId": "676a61e738360dca73b8e210",
                "runs": 11,
                "ballsFaced": 6,
                "battingPosition": 2,
                "fours": 1,
                "sixes": 1,
                "notOut": false,
                "isStrikeEnd": true,
                "dismissalInfo": {
                    "dismissalType": "Caught",
                    "caughtBy": {
                        "id": "676a617c38360dca73b8e1eb",
                        "username": "Prajjwal Khatri"
                    },
                    "bowler": {
                        "name": "Arindam ",
                        "playerId": "67988a074c9b6de125405161",
                        "balls": 2,
                        "runsGiven": 7,
                        "wicketsTaken": 0,
                        "isBowlingCurrentOver": true,
                        "maiden": 0,
                        "over": "0.2",
                        "eco": "35.00"
                    }
                },
                "sr": "183.33"
            },
            {
                "name": "Harsh Soni",
                "playerId": "676a617c38360dca73b8e1f3",
                "runs": 7,
                "ballsFaced": 9,
                "fours": 0,
                "sixes": 1,
                "notOut": true,
                "isStrikeEnd": false,
                "sr": "77.78"
            },
            {
                "name": "Dhiraj",
                "playerId": "6878f5ccf91f25d2ad729b30",
                "runs": 4,
                "ballsFaced": 3,
                "fours": 1,
                "sixes": 0,
                "notOut": true,
                "isStrikeEnd": true,
                "sr": "133.33"
            }
        ],
        "bowler": {
            "name": "Abhishek Dhull",
            "playerId": "67695698ccb2bed85375e1b7",
            "balls": 12,
            "runsGiven": 27,
            "wicketsTaken": 0,
            "isBowlingCurrentOver": false,
            "maiden": 0,
            "over": "2.0",
            "eco": "13.50"
        },
        "bowling": {
            "teamName": "Epic blasters",
            "lastTwoBowlers": [
                {
                    "name": "Prajjwal Khatri",
                    "playerId": "676a617c38360dca73b8e1eb",
                    "balls": 12,
                    "runsGiven": 34,
                    "wicketsTaken": 1,
                    "maiden": 0,
                    "over": "2.0",
                    "eco": "17.00"
                },
                {
                    "name": "Abhishek Dhull",
                    "playerId": "67695698ccb2bed85375e1b7",
                    "balls": 12,
                    "runsGiven": 27,
                    "wicketsTaken": 0,
                    "maiden": 0,
                    "over": "2.0",
                    "eco": "13.50"
                }
            ],
            "allBowlers": [
                {
                    "name": "Mohit poonia",
                    "playerId": "676bc2a5e16e50c93875a0bd",
                    "balls": 6,
                    "runsGiven": 19,
                    "wicketsTaken": 0,
                    "maiden": 0,
                    "over": "1.0",
                    "eco": "19.00"
                },
                {
                    "name": "Prajjwal Khatri",
                    "playerId": "676a617c38360dca73b8e1eb",
                    "balls": 12,
                    "runsGiven": 34,
                    "wicketsTaken": 1,
                    "maiden": 0,
                    "over": "2.0",
                    "eco": "17.00"
                },
                {
                    "name": "Arindam ",
                    "playerId": "67988a074c9b6de125405161",
                    "balls": 6,
                    "runsGiven": 8,
                    "wicketsTaken": 1,
                    "maiden": 0,
                    "over": "1.0",
                    "eco": "8.00"
                },
                {
                    "name": "Abhishek Dhull",
                    "playerId": "67695698ccb2bed85375e1b7",
                    "balls": 12,
                    "runsGiven": 27,
                    "wicketsTaken": 0,
                    "maiden": 0,
                    "over": "2.0",
                    "eco": "13.50"
                }
            ]
        },
        "currentInningWicket": 1,
        "matchConfig": {
            "countNoBallRun": true,
            "countWideRun": true,
            "singleBatsmanAllowed": false,
            "showComparisonGraph": false,
            "showMatchSummary": false,
            "showPlayingEleven": false,
            "showPartnership": false,
            "showMatchPreview": false,
            "showToss": false
        },
        "stats": {},
        "extras": 9
    };
    */

    const currentInningScore = (score?.inning && score.inning[score.inning.length - 1]) || score;
    const isChasing = score?.matchCurrentStatus === "INNINGS_II";

    // Detect Super Over and match ended status
    const matchStatusRaw = String(score?.matchCurrentStatus || score?.status || "").toUpperCase();

    const hasEndedStatus =
        matchStatusRaw === "MATCH_COMPLETED" ||
        matchStatusRaw === "MATCH_ENDED" ||
        matchStatusRaw === "COMPLETED" ||
        matchStatusRaw === "END" ||
        Boolean(score?.isMatchEnded || score?.isMatchCompleted);

    const rawPrompt = score?.matchResult?.prompt || score?.description || "";
    const lowerPrompt = rawPrompt.toLowerCase();

    const hasWinningResult = Boolean(
        score?.matchResult?.prompt ||
        score?.matchResult?.winner ||
        score?.matchResult?.winTeam ||
        score?.matchResult?.winningTeam ||
        (lowerPrompt.includes("won by") || lowerPrompt.includes("won the match") || lowerPrompt.includes("win declare") || lowerPrompt.includes("won in super over") || lowerPrompt.includes("wins in super over"))
    );

    const isMatchEnded = Boolean(
        (hasEndedStatus || hasWinningResult) &&
        matchStatusRaw !== "INNINGS_I_ENDED" &&
        matchStatusRaw !== "INNINGS_BREAK"
    );

    const isSuperOverMatch = Boolean(
        score?.isSuperOver ||
        score?.score?.isSuperOver ||
        score?.inning?.some((inn) => inn?.isSuperOver) ||
        (Array.isArray(score?.inning) && score.inning.length > 2) ||
        matchStatusRaw.includes("SUPER_OVER") ||
        lowerPrompt.includes("super over")
    );

    const isSuperOverEnded = isSuperOverMatch && isMatchEnded;

    // Separate regular innings from Super Over innings
    const allInnings = Array.isArray(score?.inning) ? score.inning : [];
    const superOverInnings = allInnings.filter(inn => inn?.isSuperOver);
    const regularInnings = allInnings.filter(inn => !inn?.isSuperOver);

    // If superOverInnings has no isSuperOver tags but total innings > 2:
    let trueRegularInnings = regularInnings;
    let trueSuperOverInnings = superOverInnings;
    if (superOverInnings.length === 0 && allInnings.length > 2) {
        trueRegularInnings = allInnings.slice(0, 2);
        trueSuperOverInnings = allInnings.slice(2);
    }

    const regInn1 = trueRegularInnings[0] || score?.innings_1 || score?.score?.innings_1;
    const regInn2 = trueRegularInnings[1] || score?.innings_2 || score?.score?.innings_2;

    const team1Name = regInn1?.batting?.battingTeam || regInn1?.battingTeam || score?.innings_1?.battingTeam || score?.teams?.[0]?.title || score?.teams?.[0]?.name || "Team 1";
    let team2Name = regInn2?.batting?.battingTeam || regInn2?.battingTeam || score?.innings_2?.battingTeam || score?.teams?.[1]?.title || score?.teams?.[1]?.name || "Team 2";
    if (team2Name === team1Name && score?.teams?.[1]?.title) {
        team2Name = score.teams[1].title;
    }

    let inn1Runs = regInn1?.batting?.score?.runs ?? regInn1?.score?.runs ?? score?.innings_1?.score?.runs ?? score?.innings_1?.totalRuns ?? regInn1?.runs ?? "-";
    let inn1Wickets = regInn1?.batting?.score?.wicket ?? regInn1?.score?.wicket ?? score?.innings_1?.score?.wicket ?? score?.innings_1?.totalWickets ?? regInn1?.wicket ?? regInn1?.wickets ?? "";
    let inn1Overs = regInn1?.batting?.score?.over ?? regInn1?.score?.over ?? score?.innings_1?.score?.over ?? score?.innings_1?.totalOvers ?? regInn1?.over ?? regInn1?.overs ?? "0.0";

    let inn2Runs = regInn2?.batting?.score?.runs ?? regInn2?.score?.runs ?? score?.innings_2?.score?.runs ?? score?.innings_2?.totalRuns ?? regInn2?.runs ?? "-";
    let inn2Wickets = regInn2?.batting?.score?.wicket ?? regInn2?.score?.wicket ?? score?.innings_2?.score?.wicket ?? score?.innings_2?.totalWickets ?? regInn2?.wicket ?? regInn2?.wickets ?? "";
    let inn2Overs = regInn2?.batting?.score?.over ?? regInn2?.score?.over ?? score?.innings_2?.score?.over ?? score?.innings_2?.totalOvers ?? regInn2?.over ?? regInn2?.overs ?? "0.0";

    // If match tied and went to Super Over, ensure regular innings reflect the tied score
    if (isSuperOverMatch) {
        if (inn1Runs === "-" && score?.lastInningScore !== undefined) {
            inn1Runs = score.lastInningScore;
            inn1Wickets = score.lastInningWickets ?? "";
        }
        if (inn2Runs === "-" && inn1Runs !== "-") {
            inn2Runs = inn1Runs;
            inn2Overs = score?.totalOvers ? `${score.totalOvers}.0` : inn1Overs;
        }
    }

    const inning1Overview = {
        teamName: team1Name,
        score: inn1Runs !== "-" ? `${inn1Runs}${inn1Wickets !== "" ? `/${inn1Wickets}` : ""}` : "-",
        overs: `${inn1Overs} Ov`,
    };

    const inning2Overview = {
        teamName: team2Name,
        score: inn2Runs !== "-" ? `${inn2Runs}${inn2Wickets !== "" ? `/${inn2Wickets}` : ""}` : "-",
        overs: `${inn2Overs} Ov`,
    };

    // Extract Super Over summaries (supporting multiple Super Overs: SO 1, SO 2, etc.) and winner prompt
    let superOverWinnerPrompt = "";
    const superOverList = [];

    for (let i = 0; i < trueSuperOverInnings.length; i += 2) {
        const soIndex = Math.floor(i / 2) + 1;
        const so1 = trueSuperOverInnings[i];
        const so2 = trueSuperOverInnings[i + 1];

        const so1Team = so1?.batting?.battingTeam || team1Name;
        const so1Runs = Number(so1?.batting?.score?.runs ?? 0);
        const so1Wick = so1?.batting?.score?.wicket ?? 0;
        const so1Ov = so1?.batting?.score?.over ?? "1.0";

        const soPrefix = trueSuperOverInnings.length > 2 ? `Super Over ${soIndex}` : `Super Over`;

        if (so2) {
            const so2Team = so2?.batting?.battingTeam || team2Name;
            const so2Runs = Number(so2?.batting?.score?.runs ?? 0);
            const so2Wick = so2?.batting?.score?.wicket ?? 0;
            const so2Ov = so2?.batting?.score?.over ?? "1.0";

            superOverList.push({
                title: soPrefix,
                summary: `${soPrefix}: ${so1Team} ${so1Runs}/${so1Wick} (${so1Ov} Ov) vs ${so2Team} ${so2Runs}/${so2Wick} (${so2Ov} Ov)`,
            });

            // If this is the last Super Over played, determine winner if not tied
            if (i + 2 >= trueSuperOverInnings.length) {
                if (so2Runs > so1Runs) {
                    superOverWinnerPrompt = `${so2Team} won in Super Over`;
                } else if (so1Runs > so2Runs) {
                    superOverWinnerPrompt = `${so1Team} won in Super Over`;
                }
            }
        } else {
            superOverList.push({
                title: soPrefix,
                summary: `${soPrefix}: ${so1Team} ${so1Runs}/${so1Wick} (${so1Ov} Ov)`,
            });
        }
    }

    let superOverSummary = superOverList.map(s => s.summary).join(" | ");
    if (!superOverSummary && trueSuperOverInnings.length === 1) {
        const so1 = trueSuperOverInnings[0];
        const so1Team = so1?.batting?.battingTeam || team1Name;
        const so1Score = `${so1?.batting?.score?.runs ?? 0}/${so1?.batting?.score?.wicket ?? 0} (${so1?.batting?.score?.over ?? "1.0"} Ov)`;
        superOverSummary = `Super Over: ${so1Team} ${so1Score}`;
    }

    if (lowerPrompt.includes("super over") && (lowerPrompt.includes("won") || lowerPrompt.includes("win"))) {
        superOverWinnerPrompt = rawPrompt;
    } else if (!superOverWinnerPrompt && isSuperOverEnded) {
        const winId = score?.matchResult?.winnerTeamId || score?.matchResult?.winner || score?.winner || score?.winnerTeamId;
        const winTeamObj = (score?.teams || []).find(t => String(t?.teamId || t?._id || t?.id) === String(winId));
        const winName = winTeamObj?.title || winTeamObj?.name || score?.matchResult?.winnerTeamName;
        if (winName) {
            superOverWinnerPrompt = `${winName} won in Super Over`;
        } else if (rawPrompt && (lowerPrompt.includes("won by") || lowerPrompt.includes("won the match") || lowerPrompt.includes("win declare"))) {
            superOverWinnerPrompt = `${rawPrompt} in Super Over`;
        } else {
            superOverWinnerPrompt = "Match won in Super Over";
        }
    }

    const tabs = useMemo(() => {
        const list = [];

        // When match is not ended, Live tab is at the beginning for immediate live match viewing
        if (!isMatchEnded) {
            list.push({
                id: "stats",
                label: "Live",
                content: <MatchLive score={score} />,
            });
        }

        // Info tab
        list.push({
            id: "info",
            label: "Info",
            content: <MatchInfo score={score} headToHeadStats={headToHeadStats} teamsRecentForm={teamsRecentForm} />,
        });

        // Summary tab is placed between Info and Score Card
        list.push({
            id: "summary",
            label: "Summary",
            content: <MatchSummary matchData={score} score={score} />,
        });

        // Score Card tab
        list.push({
            id: "scorecard",
            label: "Score Card",
            content: (
                <FullScoreCard 
                    score={score} 
                    inning_I={score?.inning?.[0]} 
                    isChasing={isChasing} 
                    description={score?.description || (score?.prompt && score.prompt[0]) || ""} 
                    isFirstInning={!isChasing}
                />
            ),
        });

        // Commentary tab
        list.push({
            id: "commentry",
            label: "Commentry",
            content: <MatchFullCommentary matchId={matchID} score={score} />,
        });

        // Squad tab
        list.push({
            id: "squad",
            label: "Squad",
            content: <CurrentSquad matchId={matchID} score={score} />,
        });

        return list;
    }, [score, headToHeadStats, teamsRecentForm, isChasing, matchID, isDarkMode, isMatchEnded]);

    const initialTabIndex = useMemo(() => {
        if (isMatchEnded) {
            const summaryIdx = tabs.findIndex(t => t.id === "summary");
            return summaryIdx !== -1 ? summaryIdx : 0;
        }
        const liveIdx = tabs.findIndex(t => t.id === "stats");
        return liveIdx !== -1 ? liveIdx : 0;
    }, [isMatchEnded, tabs]);

    // Defensive render if loading or score data not yet received (placed after all hooks to respect Rules of Hooks)
    const isScoreEmpty = !score?.title && !score?.teams?.length && !score?.batting?.score && !score?.inning?.length;
    if (loading || score.isLoading || isScoreEmpty) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <ThemedText style={{ marginTop: 16, fontSize: 15, fontWeight: "600", color: isDarkMode ? '#94A3B8' : '#64748B' }}>
                    Loading match scorecard...
                </ThemedText>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={containerStyle} edges={['top', 'right', 'left']}>



                    {/* Header */}
                    {!hideHeader && (
                        <Header
                            description={
                                score?.title ||
                                (score?.teams?.[0]?.title && score?.teams?.[1]?.title
                                    ? `${score.teams[0].title} vs ${score.teams[1].title}`
                                    : "Match Scorecard")
                            }
                        />
                    )}

                    <MatchOverview
                        team={score?.batting?.battingTeam || (score?.teams?.[0]?.title ?? "Team 1")}
                        score={
                            (score?.batting?.score?.runs ?? "0") + "/" + (score?.batting?.score?.wicket ?? 0)
                        }
                        overs={score?.batting?.score?.over ? `${score.batting.score.over} Ov` : "0.0 Ov"}
                        crr={score?.batting?.score?.CRR}
                        projjectedScore={score?.batting?.score?.projectedScore}
                        matchStatus={getMatchStatusDisplay(score?.matchCurrentStatus) || (isMatchEnded ? "Ended" : "Live")}
                        result={isSuperOverEnded ? (superOverWinnerPrompt || rawPrompt) : (rawPrompt || "")}
                        motm={isMatchEnded ? score?.mom : null}
                        isSuperOverEnded={isSuperOverEnded}
                        inning1={inning1Overview}
                        inning2={inning2Overview}
                        superOverSummary={superOverSummary}
                        superOverList={superOverList}
                    />

                    <TabSwitch 
                        tabs={tabs} 
                        initialIndex={initialTabIndex}
                    />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
