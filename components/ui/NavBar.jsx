// components/NavBar.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import {
  Ionicons,
  MaterialCommunityIcons,
  AntDesign,
} from "@expo/vector-icons";
import SCREENS from "@/screens";
// import QRScanner from "../components/scanner/Scanner";
// import RightSideBar from "./RightSideBar";
// import BottomSheetList from "./BottomSheetList";
// import handleScan from "../components/scanner/ScanHandler";
// import useAlert from "../components/pop/AlertHandler";
// import { PATHS } from "../../paths";
// import { FooterTabs } from "@/utils/Common";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NavBar({ handleSearch }) {
//   const alert = useAlert();

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
    <View className="bg-white px-4 py-3">
        <SafeAreaView edges={["top"]}>

      <View className="flex-row justify-between items-center">
        <TouchableOpacity
              onPress={() => {
                setIsLeftSheet(true);
                // bottomSheetHandler(true, "left");
                navigation.openDrawer()
                // navigation.dispatch(DrawerActions.toggleDrawer())
                
              }}
              className="ml-2"
            >
              <MaterialCommunityIcons name="menu" size={24} color="black" />
            </TouchableOpacity>


        {!showInput && (
          <TouchableOpacity onPress={() => navigation.navigate(SCREENS.Home)}>
            <Image
              source={require("../../assets/Logo.png")}
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
              className="flex-1 bg-gray-200 text-black px-3 py-1 rounded-md"
            />
          )}

          <TouchableOpacity
            onPress={() => handleSearchFlag(!showInput)}
            className="ml-2"
          >
            {showInput ? (
              <AntDesign name="close" size={24} color="black" />
            ) : (
              <Ionicons name="search" size={20} color="black" />
            )}
          </TouchableOpacity>

          {!showInput && (
            <TouchableOpacity
              onPress={() => {
                setQRScanner(true);
                bottomSheetHandler(true, "top");
                navigation.openDrawer()
              }}
              className="ml-2"
            >
              <Ionicons name="qr-code" size={24} color="black" />
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
        //   <QRScanner
        //     onScan={(data) => {
        //       handleScan(data, alert);
        //       bottomSheetHandler(false);
        //     }}
        //   />
            <View className="flex-1 justify-center items-center">
                <Text>QR Scanner Component</Text>
            </View>
        ) : isLeftSheet ? (
            
        //   <RightSideBar onClose={() => bottomSheetHandler(false)} />
            <View className="flex-1 justify-center items-center">
                <Text>Right Side Bar Component</Text>
            </View>
        ) : null}
      </BottomSheetList> */}
    </View>
  );
}
