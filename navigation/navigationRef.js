import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import SCREENS from "@/screens";

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function resetToAuth() {
  if (navigationRef.isReady()) {
    try {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "MainStack",
              state: {
                index: 0,
                routes: [{ name: SCREENS.LoginScreen }],
              },
            },
          ],
        })
      );
    } catch (e) {
      try {
        navigationRef.navigate("MainStack", { screen: SCREENS.LoginScreen });
      } catch (_) {}
    }
  }
}

export function resetToHome() {
  if (navigationRef.isReady()) {
    try {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "MainStack",
              state: {
                index: 0,
                routes: [{ name: SCREENS.Home }],
              },
            },
          ],
        })
      );
    } catch (e) {
      try {
        navigationRef.navigate("MainStack", { screen: SCREENS.Home });
      } catch (_) {}
    }
  }
}
