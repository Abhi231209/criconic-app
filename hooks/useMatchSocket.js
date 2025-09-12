import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useMatchSocket = (matchId) => {
  const {
    socket,
    isConnected,
    joinMatch,
    leaveMatch,
    subscribeToMatchUpdates,
    unsubscribeFromMatchUpdates,
    emit,
  } = useSocket();

  const matchDataRef = useRef(null);
  const isSubscribedRef = useRef(false);

  // Join match room when component mounts
  useEffect(() => {
    if (matchId && isConnected) {
      joinMatch(matchId);
    }
  }, [matchId, isConnected, joinMatch]);

  // Leave match room when component unmounts
  useEffect(() => {
    return () => {
      if (matchId && isConnected) {
        leaveMatch(matchId);
      }
    };
  }, [matchId, isConnected, leaveMatch]);

  // Subscribe to match updates
  const subscribeToUpdates = useCallback((callback) => {
    if (matchId && socket && !isSubscribedRef.current) {
      subscribeToMatchUpdates(matchId, callback);
      isSubscribedRef.current = true;
    }
  }, [matchId, socket, subscribeToMatchUpdates]);

  // Unsubscribe from match updates
  const unsubscribeFromUpdates = useCallback((callback) => {
    if (matchId && socket && isSubscribedRef.current) {
      unsubscribeFromMatchUpdates(matchId, callback);
      isSubscribedRef.current = false;
    }
  }, [matchId, socket, unsubscribeFromMatchUpdates]);

  // Emit match-specific events
  const emitMatchEvent = useCallback((event, data) => {
    if (matchId && isConnected) {
      emit(event, { matchId, ...data });
    }
  }, [matchId, isConnected, emit]);

  // Specific match event emitters
  const updateScore = useCallback((scoreData) => {
    emitMatchEvent('update_score', scoreData);
  }, [emitMatchEvent]);

  const updateWicket = useCallback((wicketData) => {
    emitMatchEvent('update_wicket', wicketData);
  }, [emitMatchEvent]);

  const updateOver = useCallback((overData) => {
    emitMatchEvent('update_over', overData);
  }, [emitMatchEvent]);

  const addCommentary = useCallback((commentaryData) => {
    emitMatchEvent('add_commentary', commentaryData);
  }, [emitMatchEvent]);

  const updateMatchStatus = useCallback((statusData) => {
    emitMatchEvent('update_match_status', statusData);
  }, [emitMatchEvent]);

  // Listen for specific match events
  const onScoreUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.on(`score_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const onWicketUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.on(`wicket_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const onOverUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.on(`over_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const onCommentaryUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.on(`commentary_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const onMatchStatusUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.on(`match_status_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  // Generic score event listener
  const onScore = useCallback((callback) => {
    if (matchId && socket) {
      socket.on('score', callback);
    }
  }, [matchId, socket]);

  // Remove event listeners
  const offScoreUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.off(`score_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const offWicketUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.off(`wicket_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const offOverUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.off(`over_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const offCommentaryUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.off(`commentary_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  const offMatchStatusUpdate = useCallback((callback) => {
    if (matchId && socket) {
      socket.off(`match_status_update_${matchId}`, callback);
    }
  }, [matchId, socket]);

  // Remove generic score event listener
  const offScore = useCallback((callback) => {
    if (matchId && socket) {
      socket.off('score', callback);
    }
  }, [matchId, socket]);

  return {
    // Connection status
    isConnected,
    
    // Subscription methods
    subscribeToUpdates,
    unsubscribeFromUpdates,
    
    // Event emitters
    emitMatchEvent,
    updateScore,
    updateWicket,
    updateOver,
    addCommentary,
    updateMatchStatus,
    
    // Event listeners
    onScore,
    onScoreUpdate,
    onWicketUpdate,
    onOverUpdate,
    onCommentaryUpdate,
    onMatchStatusUpdate,
    
    // Event removers
    offScore,
    offScoreUpdate,
    offWicketUpdate,
    offOverUpdate,
    offCommentaryUpdate,
    offMatchStatusUpdate,
  };
};
