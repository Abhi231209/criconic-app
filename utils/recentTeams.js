import AsyncStorage from "@react-native-async-storage/async-storage";

// Teams this user picked for recent matches, newest first, so the team picker
// can offer them in one tap. Kept small: the squad screen loads players by id.
const MAX = 6;
const keyFor = (userId) => `@criconic_recent_teams_${userId || "guest"}`;

export const getRecentTeams = async (userId) => {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(keyFor(userId))) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const rememberRecentTeam = async (userId, team) => {
  const id = String(team?._id || team?.id || team?.teamId || "");
  if (!id) return;
  const slim = {
    _id: id,
    id,
    teamId: id,
    name: team.name || team.title,
    title: team.title || team.name,
    teamLogo: team.teamLogo || team.logo || null,
  };
  const list = (await getRecentTeams(userId)).filter((t) => t._id !== id);
  AsyncStorage.setItem(keyFor(userId), JSON.stringify([slim, ...list].slice(0, MAX))).catch(() => {});
};
