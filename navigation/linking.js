import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import SCREENS from "@/screens";

// Website addresses for things people share. They open the page on the web
// for anyone, and in the app when it's set up to handle criconic.com links.
export const WEB_URL = "https://criconic.com";
export const webLinks = {
  match: (id) => `${WEB_URL}/matches/${id}`,
  team: (id) => `${WEB_URL}/team/${id}`,
  tournament: (idOrSlug) => `${WEB_URL}/tournament/${idOrSlug}`,
  player: (id) => `${WEB_URL}/players/${id}`,
};

// The screen a push notification opens when tapped (data set by the server's
// NotificationService), as one of the links below.
const urlForNotification = (response) => {
  const data = response?.notification?.request?.content?.data || {};
  if (data.matchId) return `criconic://matches/${data.matchId}`;
  if (data.teamId) return `criconic://team/${data.teamId}`;
  return null;
};

// Opens criconic:// links, and criconic.com links once universal/app links
// are set up for the domain, on the matching screen. Paths match the website.
// Home sits underneath, so back from a linked page goes Home. Tapping a push
// notification is handled the same way, including one that launched the app.
// Off on web,
// where it would also tie every screen to the browser's address bar.
export const linking =
  Platform.OS === "web"
    ? undefined
    : {
        prefixes: ["criconic://", WEB_URL, "https://www.criconic.com"],
        async getInitialURL() {
          const url = await Linking.getInitialURL();
          if (url) return url;
          return urlForNotification(await Notifications.getLastNotificationResponseAsync());
        },
        subscribe(listener) {
          const linkSub = Linking.addEventListener("url", ({ url }) => listener(url));
          const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const url = urlForNotification(response);
            if (url) listener(url);
          });
          return () => {
            linkSub.remove();
            tapSub.remove();
          };
        },
        config: {
          screens: {
            MainStack: {
              initialRouteName: SCREENS.Home,
              screens: {
                [SCREENS.MatchScoreCard]: "matches/:matchId",
                [SCREENS.TeamProfile]: "team/:teamId",
                [SCREENS.TournamentProfile]: "tournament/:tournamentId",
                [SCREENS.PlayerProfile]: "players/:playerId",
              },
            },
          },
        },
      };
