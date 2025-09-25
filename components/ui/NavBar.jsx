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
    <View className={`px-4 py-3 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <SafeAreaView edges={["top"]}>

      <View className="flex-row justify-between items-center">
        <TouchableOpacity
              onPress={() => {
                setIsLeftSheet(true);
                navigation.openDrawer();
              }}
              className="ml-2"
            >
              <MaterialCommunityIcons 
                name="menu" 
                size={24} 
                color={isDarkMode ? "#FFFFFF" : "#000000"} 
              />
            </TouchableOpacity>

        {!showInput && (
          <TouchableOpacity onPress={() => navigation.navigate(SCREENS.Home)}>
            <Image
              source={
                // isDarkMode 
                // ? 
                // require("../../assets/Logo-dark.png") 
                // : 
                require("../../assets/Logo.png")
              }
              className="w-20 h-10"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        <View className={`flex-row items-center ${showInput ? "flex-1" : ""}`}>
          {showInput && (
            <TextInput
              value={searchValue}
              onChangeText={(text) => {
                setSearchValue(text);
                handleSearchInput(text);
              }}
              placeholder="Search..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              className={`flex-1 px-3 py-1 rounded-md ${
                isDarkMode 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-200 text-black'
              }`}
            />
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate(SCREENS.SearchScreen)}
            className="ml-2"
          >
            {showInput ? (
              <AntDesign 
                name="close" 
                size={24} 
                color={isDarkMode ? "#FFFFFF" : "#000000"} 
              />
            ) : (
              <Ionicons 
                name="search" 
                size={20} 
                color={isDarkMode ? "#FFFFFF" : "#000000"} 
              />
            )}
          </TouchableOpacity>

          {!showInput && (
            <TouchableOpacity
              onPress={() => {
                setQRScanner(true);
                bottomSheetHandler(true, "top");
                navigation.openDrawer();
              }}
              className="ml-2"
            >
              <Ionicons 
                name="qr-code" 
                size={24} 
                color={isDarkMode ? "#FFFFFF" : "#000000"} 
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