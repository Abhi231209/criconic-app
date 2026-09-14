import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import {
  Maximize2,
  X,
  Tv,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 16:9 Broadcast & Theme Strip Assets
export const BROADCAST_PREVIEWS = {
  fox: require('../../../assets/preview-fox-cricket.png'),
  ipl: require('../../../assets/preview-ipl-2025.png'),
};

export const THEME_STRIP_PREVIEWS = {
  fox: require('../../../assets/theme-fox-cricket.png'),
  ipl: require('../../../assets/theme-ipl-2025.png'),
};

export default function DesktopOverlayPreview({
  theme,
  teamAColor,
  teamBColor,
  teamAName = 'Team A',
  teamBName = 'Team B',
  isDark = true,
}) {
  const [isFullscreenModalVisible, setIsFullscreenModalVisible] = useState(false);

  const themeKey = (theme?.componentKey || theme?.id || 'fox').toLowerCase();
  const isIpl = themeKey.includes('ipl');
  const activeBroadcastImage = isIpl ? BROADCAST_PREVIEWS.ipl : BROADCAST_PREVIEWS.fox;

  const primaryA = teamAColor?.config?.primaryColor || (isIpl ? '#004BA0' : '#2563EB');
  const primaryB = teamBColor?.config?.primaryColor || (isIpl ? '#D32F2F' : '#DC2626');

  return (
    <View style={monitorStyles.container}>
      {/* Monitor Header Toolbar */}
      <View style={monitorStyles.topBar}>
        <View style={monitorStyles.liveIndicatorRow}>
          <View style={monitorStyles.redDot} />
          <Text style={monitorStyles.liveText}>1080p BROADCAST MONITOR</Text>
          <View style={monitorStyles.resBadge}>
            <Text style={monitorStyles.resText}>16:9 HD</Text>
          </View>
        </View>

        {/* Action Controls */}
        <View style={monitorStyles.controlsRow}>
          {/* Active Colors Swatch Mini-Badge */}
          <View style={monitorStyles.colorIndicatorsRow}>
            <View style={[monitorStyles.miniDot, { backgroundColor: primaryA }]} />
            <Text style={monitorStyles.vsText}>vs</Text>
            <View style={[monitorStyles.miniDot, { backgroundColor: primaryB }]} />
          </View>

          {/* Fullscreen Modal Button */}
          <TouchableOpacity
            onPress={() => setIsFullscreenModalVisible(true)}
            style={monitorStyles.iconBtn}
            activeOpacity={0.7}
          >
            <Maximize2 size={13} color="#94A3B8" />
            <Text style={monitorStyles.btnLabel}>Zoom</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main 16:9 Broadcast Monitor Screen Frame */}
      <View style={monitorStyles.screenFrame}>
        <Image
          source={activeBroadcastImage}
          style={monitorStyles.broadcastImage}
          resizeMode="cover"
        />

        {/* Subtle Top Overlay Bar within Monitor */}
        <View style={monitorStyles.monitorOverlayHeader}>
          <View style={monitorStyles.channelBadge}>
            <Tv size={11} color="#38BDF8" />
            <Text style={monitorStyles.channelText}>OBS LIVE</Text>
          </View>
          <View style={monitorStyles.themeNameBadge}>
            <Sparkles size={11} color={isIpl ? '#00FF78' : '#FDB913'} />
            <Text style={[monitorStyles.themeNameText, { color: isIpl ? '#00FF78' : '#FDB913' }]}>
              {isIpl ? 'IPL 2025 Graphics' : 'Fox Cricket Graphics'}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer helper */}
      <View style={monitorStyles.footerHint}>
        <View style={monitorStyles.footerHintRow}>
          <CheckCircle2 size={12} color="#10B981" />
          <Text style={monitorStyles.hintText}>
            Selected theme active • Matches web OBS stream in 1920×1080
          </Text>
        </View>
      </View>

      {/* Fullscreen Broadcast Modal */}
      <Modal
        visible={isFullscreenModalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsFullscreenModalVisible(false)}
      >
        <View style={modalStyles.modalContainer}>
          {/* Header */}
          <View style={modalStyles.modalHeader}>
            <View style={modalStyles.modalHeaderTitleRow}>
              <Tv size={18} color="#3B82F6" />
              <Text style={modalStyles.modalTitle}>
                {isIpl ? 'IPL 2025 Broadcast Overlay' : 'Fox Cricket Broadcast Overlay'}
              </Text>
              <View style={modalStyles.badge1080}>
                <Text style={modalStyles.badge1080Text}>1080p Stream</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsFullscreenModalVisible(false)}
              style={modalStyles.closeBtn}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Center Image Container */}
          <View style={modalStyles.imageCenterContainer}>
            <Image
              source={activeBroadcastImage}
              style={modalStyles.fullscreenImage}
              resizeMode="contain"
            />
          </View>

          {/* Modal Footer */}
          <View style={modalStyles.modalFooter}>
            <Text style={modalStyles.modalFooterText}>
              Broadcast theme ready for live OBS streaming • Criconic Live
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const monitorStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  resText: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  miniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  vsText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  screenFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#020617',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  broadcastImage: {
    width: '100%',
    height: '100%',
  },
  monitorOverlayHeader: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(56,189,248,0.4)',
  },
  channelText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  themeNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeNameText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerHint: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  footerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hintText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  badge1080: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badge1080Text: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  imageCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  modalFooterText: {
    color: '#64748B',
    fontSize: 12,
  },
});
