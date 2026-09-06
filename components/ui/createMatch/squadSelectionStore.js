/**
 * Module-level store for passing squad selection result back to CreateMatch.
 * Using a module-level object avoids React Navigation's param-merging issues
 * when navigating back multiple levels with pop().
 */
const squadSelectionStore = {
  pending: null, // { selectedTeam, selectedSquad, teamType } | null
};

export default squadSelectionStore;
