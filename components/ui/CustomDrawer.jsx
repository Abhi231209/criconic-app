import React from "react";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { View, Image } from "react-native";
import ThemedText from "@/components/ui/custom/ThemedText";
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  IconButton,
  Button,
  Badge,
  Divider,
} from "@gluestack-ui/themed";
import { TouchableOpacity } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Fontisto from '@expo/vector-icons/Fontisto';
// import { SettingsIcon, WalletIcon, GiftIcon, FriendsIcon, LearnIcon, LogoutIcon } from '@gluestack-ui/icons';

export default function CustomDrawer(props) {
  return (
    <DrawerContentScrollView {...props} className="bg-gray-900 flex-1 p-4">
      {/* Profile Section */}
      <VStack space="md" alignItems="flex-start">
        <Avatar
          size="lg"
          source={{
            uri: "https://minifigpricelist.com/media/catalog/product/cache/9c5c6eabc511e7d038f8b1e1c1ab62c2/1/1/11045.jpeg",
          }}
          className="mb-2"
        />
        <ThemedText className=" font-bold text-lg">Bardia Adibi</ThemedText>
        {/* <ThemedText className="text-gray-400 text-sm">
          Bardiaadb@gmail.com
        </ThemedText> */}

        <View
          style={{
            backgroundColor: "#EDEDED",
            borderRadius: 10,
            // paddingVertical: 4,
            marginBottom:10,
            paddingTop: 4,
            paddingBottom: 10,
            paddingHorizontal: 10,
            justifyContent: "center", // ✅ vertical centering
            alignItems: "center",
            minHeight: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            width:"100%",

            // 🔥 Shadow (Android)
            elevation: 3,
            
          }}
        >
          <TouchableOpacity>
            <ThemedText style={{ lineHeight: 20 }}>
              <AntDesign name="setting" size={10} color="black" />
              Setting</ThemedText>
          </TouchableOpacity>
        </View>
        {/* <Divider className="my-2 bg-gray-700" /> */}
      </VStack>

      {/* <Box className="px-4 py-3"> */}
      {/* <HStack alignItems="center" textAlign={"center"} className="w-full"> */}
      {/* Left line */}
      <SectionHeading title="Quick Action" />
      {/* </HStack> */}
      {/* </Box> */}

      {/* Menu Items */}
      <VStack space="lg" my="$4">
        <View
          style={{
            backgroundColor: "#EDEDED",
            borderRadius: 10,
            // paddingVertical: 4,
            paddingTop: 4,
            paddingBottom: 10,
            paddingHorizontal: 10,
            justifyContent: "center", // ✅ vertical centering
            alignItems: "center",
            minHeight: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,

            // 🔥 Shadow (Android)
            elevation: 3,
          }}
        >
          <TouchableOpacity>
            <ThemedText>+ Create Match</ThemedText>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#EDEDED",
            borderRadius: 10,
            paddingTop: 4,
            paddingBottom: 10,
            paddingHorizontal: 10,
            justifyContent: "center", // ✅ vertical centering
            alignItems: "center",
            minHeight: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,

            // 🔥 Shadow (Android)
            elevation: 3,
          }}
          className="shadow-sm"
        >
          <TouchableOpacity style={{ lineHeight: 20 }}>
            <ThemedText>
              <AntDesign name="team" size={8} color="black" /> Add Team
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#EDEDED",
            borderRadius: 10,
            // paddingVertical: 4,
            paddingTop: 4,
            paddingBottom: 10,
            paddingHorizontal: 10,
            justifyContent: "center", // ✅ vertical centering
            alignItems: "center",
            minHeight: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,

            // 🔥 Shadow (Android)
            elevation: 3,
          }}
        >
          <TouchableOpacity style={{ lineHeight: 20 }}>
            <ThemedText>
              <AntDesign name="Trophy" size={8} color="black" /> Add Tournament
            </ThemedText>
          </TouchableOpacity>
        </View>

        <SectionHeading title="My Cricket" />

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <AntDesign name="Trophy" size={10} color="black" /> My Tournaments
          </ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <MaterialCommunityIcons name="cricket" size={10} color="black" /> My
            Matches
          </ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <AntDesign name="team" size={10} color="black" />
            My Teams
          </ThemedText>
        </HStack>

        <SectionHeading title="Cricket Management" />

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <AntDesign name="Trophy" size={10} color="black" /> All Tournaments
          </ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <MaterialCommunityIcons name="cricket" size={10} color="black" /> My
            Matches
          </ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <AntDesign name="team" size={10} color="black" /> All Teams
          </ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            <AntDesign name="team" size={10} color="black" /> All Players
          </ThemedText>
        </HStack>

        {/* <SectionHeading title="Legal" /> */}

        {/* <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">
            
            <AntDesign name="team" size={10} color="black" /> Terms of service</ThemedText>
        </HStack> */}

        {/* <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">Get wallet</ThemedText>
        </HStack>

        <HStack space="md" alignItems="center">
          <ThemedText className=" text-base">Setting</ThemedText>
        </HStack> */}
      </VStack>

      {/* Sign Out Button */}
      <Box mt="auto">
        <Button
          className="bg-gray-700 w-full py-3 rounded-lg"
          style={{backgroundColor: "#EDEDED",}}
          onPress={() => console.log("Sign Out")}
        >
          <ThemedText className=" text-base font-semibold">Sign out</ThemedText>
        </Button>
      </Box>
    </DrawerContentScrollView>
  );
}

function SectionHeading({ title = "Quick Start" }) {
  return (
    <View className="flex flex-row items-center justify-center">
      {/* Left line */}
      <Divider className="flex-1 bg-gray-700" />

      {/* Title */}
      <ThemedText className="text-lg uppercase tracking-wider px-3 ">
        {title}
      </ThemedText>

      {/* Right line */}
      <Divider className="flex-1 bg-gray-700" />
    </View>
  );
}
