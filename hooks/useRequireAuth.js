import { useCallback } from "react";
import { useSelector } from "react-redux";
import SCREENS from "@/screens";
import User from "@/utils/User";
import { showGlobalAlert } from "@/contexts/AlertContext";

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
        showGlobalAlert({
          title: "Sign In Required",
          message,
          type: "info",
          confirmText: "Sign In",
          cancelText: "Cancel",
          onConfirm: () => {
            navigation?.navigate?.(SCREENS.LoginScreen);
          },
        });
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
