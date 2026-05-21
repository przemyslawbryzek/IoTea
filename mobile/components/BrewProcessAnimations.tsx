import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import tw from 'twrnc';

type BrewStage = 'starting' | 'heating' | 'pumping' | 'brewing' | 'completed' | 'error';

type BrewProcessAnimationsProps = {
  stage: BrewStage;
  heatingDetail?: string | null;
  brewingDetail?: string | null;
  completedDetail?: string | null;
};

type StageMeta = {
  key: BrewStage;
  subtitle: string;
  progressLabel: string;
  render: React.ReactNode;
};

const pumpIcon = 'https://img.icons8.com/?size=100&id=36251&format=png&color=000000';
const teaLeafIcon = 'https://img.icons8.com/?size=100&id=m4R7gAErloIZ&format=png&color=47BA3F';

function usePulse(duration = 1600) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, value]);

  return value;
}

function useWave(duration: number, delay: number) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, value]);

  return value;
}

function HeatingAnimation() {
  const wave1 = useWave(1600, 0);
  const wave2 = useWave(1600, 500);

  const waveStyle = (value: Animated.Value, offsetX: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.75, 0] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [8, -14] }) },
      { translateX: offsetX },
    ],
  });

  return (
    <View style={tw`relative h-28 w-28 items-center justify-center`}>
      <Animated.View style={[tw`absolute top-2 h-10 w-2 rounded-full bg-[#ffb17a]`, waveStyle(wave1, -10)]} />
      <Animated.View style={[tw`absolute top-2 h-10 w-2 rounded-full bg-[#ffb17a]`, waveStyle(wave2, 10)]} />
      <Svg width={112} height={96} viewBox="0 0 112 96">
        <Rect x={50} y={10} width={12} height={54} rx={6} fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        <Circle cx={56} cy={73} r={15} fill="#fff" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
        <Rect x={53.5} y={16} width={5} height={42} rx={3} fill="#ff8b3d" />
        <Circle cx={56} cy={73} r={11} fill="#ff8b3d" />
        <Line x1={66} y1={18} x2={72} y2={18} stroke="rgba(0,0,0,0.25)" />
        <Line x1={66} y1={28} x2={72} y2={28} stroke="rgba(0,0,0,0.25)" />
        <Line x1={66} y1={38} x2={72} y2={38} stroke="rgba(0,0,0,0.25)" />
        <Line x1={66} y1={48} x2={72} y2={48} stroke="rgba(0,0,0,0.25)" />
      </Svg>
    </View>
  );
}

function PumpingAnimation() {
  const drop1 = useWave(1400, 0);
  const drop2 = useWave(1400, 400);
  const drop3 = useWave(1400, 800);

  const dropStyle = (value: Animated.Value, offsetX: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
      { translateX: offsetX },
    ],
  });

  return (
    <View style={tw`relative h-28 w-28 items-center justify-center`}>
      <Image source={{ uri: pumpIcon }} style={tw`h-14 w-14`} resizeMode="contain" />
      <View style={tw`absolute top-14 h-6 w-10 rounded-b-2xl border border-black/25 bg-white`} />
      <Animated.View style={[tw`absolute top-20 h-2 w-2 rounded-full bg-[#6b3d18]`, dropStyle(drop1, -8)]} />
      <Animated.View style={[tw`absolute top-20 h-2 w-2 rounded-full bg-[#6b3d18]`, dropStyle(drop2, 0)]} />
      <Animated.View style={[tw`absolute top-20 h-2 w-2 rounded-full bg-[#6b3d18]`, dropStyle(drop3, 8)]} />
    </View>
  );
}

function BrewingAnimation() {
  const steam1 = useWave(2000, 0);
  const steam2 = useWave(2000, 500);
  const steam3 = useWave(2000, 1000);
  const leafPulse = usePulse(2200);

  const steamStyle = (value: Animated.Value, offsetX: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.55, 0] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [8, -18] }) },
      { translateX: offsetX },
    ],
  });

  return (
    <View style={tw`relative h-28 w-28 items-center justify-center`}>
      <Svg width={112} height={96} viewBox="0 0 112 96">
        <Defs>
          <LinearGradient id="brew-tea-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#5e3213" />
            <Stop offset="35%" stopColor="#b96f2f" />
            <Stop offset="70%" stopColor="#7f3f17" />
            <Stop offset="100%" stopColor="#df9a49" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={50} cy={81} rx={31} ry={4} fill="rgba(0,0,0,0.08)" />
        <Ellipse cx={50} cy={34} rx={27} ry={5} fill="#f8efe4" />
        <Path
          d="M24 34h52v28a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z"
          fill="#fff"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth={1.5}
        />
        <Path d="M76 40h9a8 8 0 0 1 0 16h-9" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
        <Rect x={25} y={39} width={52} height={34} fill="url(#brew-tea-gradient)" />
        <Ellipse cx={50} cy={44} rx={24} ry={4} fill="#f2c07c" />
      </Svg>
      <Animated.View style={[tw`absolute bottom-10 h-8 w-1.5 rounded-full bg-[#caa67a]`, steamStyle(steam1, -12)]} />
      <Animated.View style={[tw`absolute bottom-10 h-8 w-1.5 rounded-full bg-[#caa67a]`, steamStyle(steam2, 0)]} />
      <Animated.View style={[tw`absolute bottom-10 h-8 w-1.5 rounded-full bg-[#caa67a]`, steamStyle(steam3, 12)]} />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 6,
          transform: [
            {
              scale: leafPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] }),
            },
          ],
        }}
      >
        <Image source={{ uri: teaLeafIcon }} style={tw`h-5 w-5`} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

function CompletedAnimation() {
  const pulse = usePulse(1600);

  return (
    <View style={tw`h-28 w-28 items-center justify-center`}>
      <Animated.View
        style={{
          transform: [
            {
              scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
            },
          ],
        }}
      >
        <Svg width={112} height={96} viewBox="0 0 112 96">
          <Circle cx={56} cy={48} r={26} fill="#fff" stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
          <Path
            d="M42 48l9 9 20-20"
            fill="none"
            stroke="#51961f"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const STAGES: StageMeta[] = [
  {
    key: 'heating',
    subtitle: 'Bringing water to the target temperature.',
    progressLabel: 'Stage 1/4',
    render: <HeatingAnimation />,
  },
  {
    key: 'pumping',
    subtitle: 'Moving hot water into the brewing chamber.',
    progressLabel: 'Stage 2/4',
    render: <PumpingAnimation />,
  },
  {
    key: 'brewing',
    subtitle: 'Extracting the leaves and finishing the infusion.',
    progressLabel: 'Stage 3/4',
    render: <BrewingAnimation />,
  },
  {
    key: 'completed',
    subtitle: 'Tea is ready for a quick rating.',
    progressLabel: 'Stage 4/4',
    render: <CompletedAnimation />,
  },
];

export function BrewProcessAnimations({
  stage,
  heatingDetail,
  brewingDetail,
  completedDetail,
}: BrewProcessAnimationsProps) {
  const normalizedStage: BrewStage = stage === 'starting' ? 'heating' : stage;
  const activeIndex = Math.max(0, STAGES.findIndex((item) => item.key === normalizedStage));
  const activeStage = STAGES[activeIndex] ?? STAGES[0];

  const detail = useMemo(() => {
    if (activeStage.key === 'heating') return heatingDetail;
    if (activeStage.key === 'brewing') return brewingDetail;
    if (activeStage.key === 'completed') return completedDetail;
    return null;
  }, [activeStage.key, brewingDetail, completedDetail, heatingDetail]);

  return (
    <View style={tw`mt-4 rounded-2xl border border-black/10 bg-white/85 p-4`}>
      <Text style={tw`text-[12px] uppercase tracking-[2.2px] text-black/40`}>
        Process
      </Text>
      <View style={tw`mt-3 items-center`}>
        {activeStage.render}
        {detail ? (
          <Text style={tw`mt-2 text-[18px] font-semibold text-black`}>{detail}</Text>
        ) : null}
        <Text style={tw`mt-2 text-[13px] text-black/60`}>{activeStage.subtitle}</Text>
        <Text style={tw`mt-1 text-[11px] uppercase tracking-[2.2px] text-black/40`}>
          {activeStage.progressLabel}
        </Text>
      </View>
    </View>
  );
}
