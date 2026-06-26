import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Typography } from "@/components/Typography";

interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomDrawer({ visible, onClose, title, children }: BottomDrawerProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && screenWidth >= 768;
  const insets = useSafeAreaInsets();

  const [
    bgColor,
    borderColor,
    textPrimaryColor,
    textSecondaryColor,
    bgSecondaryColor,
  ] = useThemeColor(
    "background",
    "border",
    "text",
    "textSecondary",
    "backgroundSecondary"
  );

  // Animated value for vertical translation
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  // Animated value for backdrop opacity
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Flag to check if component is active/mounted to avoid state updates after unmount
  const activeAnim = useRef<Animated.CompositeAnimation | null>(null);

  const scrollY = useRef(0);
  const handleScroll = (event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  useEffect(() => {
    if (activeAnim.current) {
      activeAnim.current.stop();
    }

    if (visible) {
      activeAnim.current = Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 280,
          useNativeDriver: true,
        }),
      ]);
      activeAnim.current.start();
    } else {
      scrollY.current = 0;
      activeAnim.current = Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]);
      activeAnim.current.start();
    }
  }, [visible, screenHeight]);

  const handleClose = () => {
    if (activeAnim.current) activeAnim.current.stop();

    activeAnim.current = Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);
    
    activeAnim.current.start(() => {
      onClose();
    });
  };

  // PanResponder to track swipe down gestures on the handle / header area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Trigger responder if swiping down, scroll is at the top, and vertical drag exceeds horizontal drag
        const isSwipingDown = gestureState.dy > 5;
        const isScrollAtTop = scrollY.current <= 0;
        const isVerticalMove = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isSwipingDown && isScrollAtTop && isVerticalMove;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Capture swipe gestures from inner ScrollView when scroll is at top
        const isSwipingDown = gestureState.dy > 5;
        const isScrollAtTop = scrollY.current <= 0;
        const isVerticalMove = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        return isSwipingDown && isScrollAtTop && isVerticalMove;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.6) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, isDesktop ? styles.desktopOverlay : styles.mobileOverlay]}>
        {/* Backdrop (Common) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#000000",
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {isDesktop ? (
          /* Desktop Layout: Centered modal */
          <Animated.View
            style={[
              styles.desktopBox,
              {
                backgroundColor: bgSecondaryColor,
                borderColor,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
              <Typography type="subtitle" style={{ flex: 1, fontSize: 18, color: textPrimaryColor }}>
                {title}
              </Typography>
              <Pressable
                onPress={handleClose}
                style={{
                  padding: 6,
                  backgroundColor: borderColor,
                  borderRadius: 20,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Typography type="md" style={{ color: textSecondaryColor, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>✕</Typography>
              </Pressable>
            </View>
            <View style={[styles.content, { flex: 1 }]}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </View>
          </Animated.View>
        ) : (
          /* Mobile Layout: Bottom Sheet Drawer (Draggable) */
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.mobileDrawer,
              {
                backgroundColor: bgColor,
                transform: [{ translateY }],
                paddingBottom: Math.max(insets.bottom, 24),
                minHeight: screenHeight * 0.8,
                maxHeight: screenHeight * 0.9,
              },
            ]}
          >
            {/* Drag Handle & Header (Gesture Responder area) */}
            <View style={styles.gestureHeader}>
              <View style={[styles.dragHandle, { backgroundColor: borderColor }]} />
              <Typography
                type="subtitle"
                style={{
                  fontSize: 18,
                  fontFamily: "Poppins_600SemiBold",
                  color: textPrimaryColor,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {title}
              </Typography>
            </View>
            <View style={[styles.content, { flex: 1 }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 10 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {children}
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  mobileOverlay: {
    justifyContent: "flex-end",
  },
  desktopOverlay: {
    justifyContent: "center",
    alignItems: "center",
  },
  desktopBox: {
    width: 440,
    maxHeight: "85%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    flexShrink: 1,
  },
  mobileDrawer: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexShrink: 1,
  },
  gestureHeader: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
  },
  content: {
    width: "100%",
    flexShrink: 1,
  },
});
