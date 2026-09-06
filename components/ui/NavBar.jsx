import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  useColorScheme,
} from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import SCREENS from "@/screens";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NavBar({ handleSearch }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [searchValue, setSearchValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [isQRScanner, setQRScanner] = useState(false);
  const [isLeftSheet, setIsLeftSheet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    Dimensions.get("window").width >= 768
  );
  const [sheetMetaData, setSheetMetaData] = useState({
    open: false,
    sheetType: "right",
  });

  const bottomSheetHandler = (visible, sheetType = "right") => {
    !visible && setQRScanner(false);
    !visible && setIsLeftSheet(false);
    setSheetMetaData({ open: visible, sheetType });
  };

  const handleSearchInput = async (term) => {
    if (!term) {
      handleSearch("content", []);
      return;
    }

    const res = await fetch(`https://your-api.com/api/search?q=${term}`);
    const data = await res.json();
    handleSearch("content", data);
  };

  const handleSearchFlag = (flag) => {
    handleSearch("enable", flag);
    setShowInput(flag);
    if (!flag) {
      setSearchValue("");
      handleSearch("searchTerm", "");
      handleSearch("content", []);
    }
  };

  useEffect(() => {
    const resizeListener = () => {
      setIsDesktop(Dimensions.get("window").width >= 768);
    };

    const sub = Dimensions.addEventListener("change", resizeListener);
    return () => sub.remove();
  }, []);

  const navigation = useNavigation();

  return (
    <View
      className={`px-4 pt-1 pb-3 border-b ${
        isDarkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-100"
      }`}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.2 : 0.04,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <SafeAreaView edges={["top"]}>
        <View className="flex-row justify-between items-center">
          {/* Menu Drawer Toggle */}
          <TouchableOpacity
            onPress={() => {
              setIsLeftSheet(true);
              navigation.openDrawer();
            }}
            activeOpacity={0.7}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isDarkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <MaterialCommunityIcons
              name="menu"
              size={22}
              color={isDarkMode ? "#FFFFFF" : "#1E293B"}
            />
          </TouchableOpacity>

          {/* Logo / Brand Name */}
          {!showInput && (
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.Home)}
              activeOpacity={0.8}
              className="flex-row items-center"
            >
              <Image
                source={require("../../assets/Logo.png")}
                className="w-24 h-9"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Right Action Buttons */}
          <View className={`flex-row items-center ${showInput ? "flex-1 ml-3" : ""}`}>
            {showInput && (
              <View
                className={`flex-1 flex-row items-center px-3 py-1.5 rounded-full mr-2 ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="search"
                  size={16}
                  color={isDarkMode ? "#9CA3AF" : "#64748B"}
                />
                <TextInput
                  value={searchValue}
                  onChangeText={(text) => {
                    setSearchValue(text);
                    handleSearchInput(text);
                  }}
                  autoFocus
                  placeholder="Search matches, teams, tournaments..."
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#64748B"}
                  className={`flex-1 ml-2 text-sm ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                />
              </View>
            )}

            {/* Search Trigger / Close */}
            <TouchableOpacity
              onPress={() => {
                if (showInput) {
                  handleSearchFlag(false);
                } else {
                  navigation.navigate(SCREENS.SearchScreen);
                }
              }}
              activeOpacity={0.7}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              {showInput ? (
                <AntDesign
                  name="close"
                  size={18}
                  color={isDarkMode ? "#FFFFFF" : "#1E293B"}
                />
              ) : (
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={isDarkMode ? "#FFFFFF" : "#1E293B"}
                />
              )}
            </TouchableOpacity>

            {/* QR Scanner Trigger */}
            {!showInput && (
              <TouchableOpacity
                onPress={() => {
                  setQRScanner(true);
                  bottomSheetHandler(true, "top");
                  navigation.openDrawer();
                }}
                activeOpacity={0.7}
                className={`w-10 h-10 rounded-full items-center justify-center ml-2 ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={20}
                  color={isDarkMode ? "#FFFFFF" : "#1E293B"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      {/* <BottomSheetList
        open={sheetMetaData.open}
        sheetType={sheetMetaData.sheetType}
        setOpen={bottomSheetHandler}
      >
        {isQRScanner ? (
          <View className={`flex-1 justify-center items-center ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <Text className={isDarkMode ? 'text-white' : 'text-black'}>
              QR Scanner Component
            </Text>
          </View>
        ) : isLeftSheet ? (
          <View className={`flex-1 justify-center items-center ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <Text className={isDarkMode ? 'text-white' : 'text-black'}>
              Right Side Bar Component
            </Text>
          </View>
        ) : null}
      </BottomSheetList> */}
    </View>
  );
}