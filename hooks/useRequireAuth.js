import { useCallback } from "react";
import { useSelector } from "react-redux";
import SCREENS from "@/screens";
import User from "@/utils/User";
import { showGlobalAlert } from "@/contexts/AlertContext";

// The action a guest was trying to do when they were asked to sign in. Login
// takes it after a successful sign-in, goes back to the screen they were on
// and runs it, so they don't land on Home and have to find it again.
let pendingAuthAction = null;
export const takePendingAuthAction = () => {
  const action = pendingAuthAction;
  pendingAuthAction = null;
  return action;
};

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
            pendingAuthAction = actionCallback || null;
            navigation?.navigate?.(SCREENS.LoginScreen, { returnTo: true });
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
