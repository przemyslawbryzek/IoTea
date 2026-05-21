import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import { registerMobilePushToken } from './api';

let soundRef: Audio.Sound | null = null;
let soundLoading: Promise<Audio.Sound> | null = null;
let audioModeReady = false;

async function getNotificationSound(): Promise<Audio.Sound> {
  if (soundRef) return soundRef;
  if (soundLoading) return soundLoading;

  const asset = Asset.fromModule(require('../assets/notification.wav'));
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  soundLoading = Audio.Sound.createAsync(
    { uri: asset.localUri ?? asset.uri },
    { shouldPlay: false },
  ).then(({ sound }) => {
    soundRef = sound;
    soundLoading = null;
    return sound;
  }).catch((error) => {
    soundLoading = null;
    throw error;
  });

  return soundLoading;
}

export async function registerForPushNotifications() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) return null;

  const token = await messaging().getToken();
  await registerMobilePushToken(token, Platform.OS as 'ios' | 'android');
  return token;
}

export function listenForPushTokenRefresh() {
  return messaging().onTokenRefresh(async (token) => {
    await registerMobilePushToken(token, Platform.OS as 'ios' | 'android');
  });
}

export async function playNotificationSound() {
  try {
    console.log('[notifications] Playing foreground notification sound');
    if (!audioModeReady) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      audioModeReady = true;
    }

    const sound = await getNotificationSound();
    await sound.setVolumeAsync(1);
    await sound.replayAsync();
  } catch (error) {
    console.warn('[notifications] Failed to play sound', error);
  }
}
