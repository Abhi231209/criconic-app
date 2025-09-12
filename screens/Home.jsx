import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  useWindowDimensions,
  ImageBackground,
  useColorScheme,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import useMatches from "../hooks/useMatches";
import RenderHtml from "react-native-render-html";
import { useNavigation } from "@react-navigation/native";
import ThemedText from "@/components/ui/custom/ThemedText";
import { useAxiosGet } from "@/hooks/useApi";
import ScoreCard from "@/components/ui/ScoreCard";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import NavBar from "@/components/ui/NavBar";
import AntDesign from "@expo/vector-icons/AntDesign";
import { SafeAreaView } from "react-native-safe-area-context";
import SCREENS from "@/screens";

export default function Home({}) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [homeConfig, setHomeConfig] = useState({});
  const [tournaments, setTournaments] = useState([
    {
      id: "1",
      title: "IPL 2024",
      logo: "https://example.com/ipl-logo.jpg",
      matches: [
        {
          id: "101",
          team1: "MI",
          team2: "CSK",
          date: "May 5, 7:30 PM",
          venue: "Wankhede",
        },
      ],
    },
  ]);
  const { matchesIds, setMatchesIds } = useMatches({
    initialCondition: { items: 5 },
  });
  const {
    get: getConfigDetails,
    isLoading,
    data,
    error,
  } = useAxiosGet("api/configs", {
    showAlert: true,
    useBaseURL: true,
  });

  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const getConfig = async () => {
    const res = await getConfigDetails();
    if (res?.data?.content && res?.data?.success) {
      setHomeConfig(res.data.content.homePage);
      if (res.data.content?.tournaments?.length) {
        setTournaments(res.data.content.tournaments);
      }
    }
  };

  const handleDelete = (matchId) => {
    const updated = matchesIds.filter((match) => match._id !== matchId);
    setMatchesIds(updated);
  };

  useEffect(() => {
    getConfig();
  }, []);

  // Reusable Section Header Component
  const SectionHeader = ({ title, actionText, onAction }) => (
    <View className="flex-row justify-between items-center mb-3">
      <ThemedText className={`text-xl font-bold ${isDarkMode ? "text-white":""}`}>
        {title}
      </ThemedText>
      <TouchableOpacity onPress={onAction}>
        <ThemedText className={`text-sm font-medium text-blue-600 ${isDarkMode ? "text-white":""}`}>
          {actionText}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <NavBar />
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          className="px-4"
        >

          {/* Hero Carousel */}
          <View className="mb-6">
            <Carousel
              loop
              width={width - 32}
              height={width * 0.5}
              autoPlay={true}
              autoPlayInterval={5000}
              data={[1, 2, 3, 4, 5]}
              scrollAnimationDuration={1000}
              mode="parallax"
              parallaxScrollingScale={0.9}
              parallaxScrollingOffset={50}
              renderItem={({ item, index }) => (
                <TouchableOpacity activeOpacity={0.9} className="shadow-lg">
                  <View className="rounded-xl overflow-hidden shadow-lg">
                    <ImageBackground
                      source={require("../assets/stadium-background-image.jpg")}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.8)"]}
                      className="absolute bottom-0 left-0 right-0 h-1/3 px-4 pb-4 justify-end"
                    >
                      <ThemedText className="text-white text-lg font-bold">
                        Match Highlight {index + 1}
                      </ThemedText>
                      <ThemedText className="text-white text-sm mt-1">
                        Click to watch highlights
                      </ThemedText>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Recent Matches Section */}
          <SectionHeader
            title="Recent Matches"
            actionText="View All"
            onAction={() => navigation.navigate("Matches")}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            {matchesIds?.map((id, index) => (
              <View
                key={`scorecard_${index}`}
                style={{
                  marginRight: index !== matchesIds.length - 1 ? 16 : 0,
                }}
              >
                <ScoreCard
                  matchId={id?._id || id}
                  startDate={id?.startDate || id?.createdAt}
                />
              </View>
            ))}
          </ScrollView>

          <SectionHeader
            title="Quick-Start"
            // onAction={() => navigation.navigate("Matches")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row "
          >
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 3,
              }}
            >
              <View
                style={{
                  backgroundColor: isDarkMode ? '#37474F' : '#EDEDED',
                  borderRadius: 10,
                  paddingTop: 4,
                  paddingBottom: 10,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <TouchableOpacity onPress={() => navigation.navigate(SCREENS.CreateMatch)}>
                  <ThemedText className={`${isDarkMode ? "text-white":""}`}>+ Create Match</ThemedText>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#37474F' : '#EDEDED',
                  borderRadius: 10,
                  paddingTop: 4,
                  paddingBottom: 10,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                className="shadow-sm"
              >
                <TouchableOpacity style={{ lineHeight: 20 }}  onPress={() => navigation.navigate(SCREENS.CreateTeam)}>
                  <ThemedText className={`${isDarkMode ? "text-white":""}`}>
                    <AntDesign name="team" size={8} color={isDarkMode ? "#FFFFFF" : "#000000"} /> Add Team
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  backgroundColor: isDarkMode ? '#37474F' : '#EDEDED',
                  borderRadius: 10,
                  paddingTop: 4,
                  paddingBottom: 10,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <TouchableOpacity style={{ lineHeight: 20 }} onPress={() => navigation.navigate(SCREENS.CreateTournament)}>
                  <ThemedText className={`${isDarkMode ? "text-white":""}`}>
                    <AntDesign name="Trophy" size={8} color={isDarkMode ? "#FFFFFF" : "#000000"} /> Add Tournament
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Live Matches Banner */}
          <View className="space-y-3" style={{ marginTop: 5 }}>
            <TouchableOpacity
              className="mb-6 rounded-xl overflow-hidden"
              activeOpacity={0.8}
              style={{ borderRadius: 16 }}
            >
              <ImageBackground
                source={require("../assets/dark-background.png") 
                  // : require("../assets/light-background.png")
                }
                className="w-full aspect-video justify-center items-center"
                resizeMode="cover"
                style={{
                  width: "100%",
                  height: 200,
                  marginTop: 10,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
                imageStyle={{
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                }}
              >
                <View className="bg-red-600 px-3 py-1 rounded-full absolute top-3 left-3 flex-row items-center">
                  <View className="w-2 h-2 bg-white rounded-full mr-1" />
                  <ThemedText className="text-white text-xs font-bold">
                    LIVE
                  </ThemedText>
                </View>
                <ThemedText className="text-white text-xl font-bold">
                  Watch Live Matches
                </ThemedText>
                <ThemedText className="text-white text-sm mt-1">
                  Tap to join live streaming
                </ThemedText>
              </ImageBackground>
              
            </TouchableOpacity>
          </View>

          {/* Tournaments Section */}
          {tournaments?.map((tournament, index) => (
            <View key={`tournament_${index}`} className="mb-6">
              <SectionHeader
                title={tournament?.title || "Tournament"}
                actionText="View All"
                onAction={() =>
                  navigation.navigate("TournamentDetail", {
                    slug: tournament?.slug || tournament?._id,
                  })
                }
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                {tournament?.matches?.map((item, idx) => (
                  <TouchableOpacity
                    key={`tournament_match_${idx}`}
                    className="rounded-lg p-4 mr-4"
                    style={{
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                    }}
                  >
                    <ScoreCard
                      key={item.id}
                      match={item}
                      onPress={() =>
                        navigation.navigate("MatchDetail", { id: match.id })
                      }
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}

          {/* Tournament Matches Section */}
          <View className="mt-6">
            <SectionHeader title="Tournament Matches" actionText="View All" />

            {tournaments?.map((tournament) => (
              <View key={tournament.id} className="mb-6">
                <TouchableOpacity
                  className="flex-row items-center mb-2"
                  onPress={() =>
                    navigation.navigate("TournamentDetail", {
                      id: tournament.id,
                    })
                  }
                >
                  <Image
                    source={{ uri: tournament.logo }}
                    className="w-8 h-8 mr-2"
                  />
                  <ThemedText className="font-bold">
                    {tournament.name}
                  </ThemedText>
                </TouchableOpacity>

                {tournament?.matches?.map((match) => (
                  <ScoreCard
                    key={match.id}
                    match={match}
                    onPress={() =>
                      navigation.navigate("MatchDetail", { id: match.id })
                    }
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}