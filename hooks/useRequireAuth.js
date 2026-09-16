import { useCallback } from "react";
import { Alert } from "react-native";
import { useSelector } from "react-redux";
import SCREENS from "@/screens";
import User from "@/utils/User";

export default function useRequireAuth(passedNav) {
  const navigation = passedNav;
  const authUser = useSelector((state) => state.auth?.user);

  const isLoggedIn = Boolean(
    User.isLogin() ||
    authUser?._id ||
    authUser?.id ||
    User.user?._id ||
    User.user?.id
  );

  const requireAuth = useCallback(
    (actionCallback, message = "You need to log in to perform this action.") => {
      if (isLoggedIn) {
        actionCallback?.();
      } else {
        Alert.alert(
          "Login Required",
          message,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Log In",
              style: "default",
              onPress: () => {
                navigation?.navigate?.(SCREENS.LoginScreen);
              },
            },
          ],
          { cancelable: true }
        );
      }
    },
    [isLoggedIn, navigation]
  );

  return {
    isLoggedIn,
    authUser,
    requireAuth,
  };
}
