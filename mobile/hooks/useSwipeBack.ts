import { useMemo, useRef } from 'react';
import { PanResponder, PanResponderInstance } from 'react-native';

type Options = {
  edgeWidth?: number;
  swipeThreshold?: number;
  verticalTolerance?: number;
};

type UseSwipeBackResult = {
  panHandlers: PanResponderInstance['panHandlers'];
};

export function useSwipeBack(
  onBack: () => void,
  options: Options = {},
): UseSwipeBackResult {
  const { edgeWidth = 24, swipeThreshold = 60, verticalTolerance = 20 } = options;
  const hasTriggered = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => event.nativeEvent.pageX <= edgeWidth,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx > 6 && Math.abs(gestureState.dy) <= verticalTolerance,
        onPanResponderMove: (_, gestureState) => {
          if (hasTriggered.current) return;
          if (gestureState.dx >= swipeThreshold && Math.abs(gestureState.dy) <= verticalTolerance) {
            hasTriggered.current = true;
            onBack();
          }
        },
        onPanResponderRelease: () => {
          hasTriggered.current = false;
        },
        onPanResponderTerminate: () => {
          hasTriggered.current = false;
        },
      }),
    [edgeWidth, onBack, swipeThreshold, verticalTolerance],
  );

  return { panHandlers: panResponder.panHandlers };
}
