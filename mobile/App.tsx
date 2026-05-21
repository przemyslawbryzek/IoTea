import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import LoginScreen from './screens/loginScreen';
import RegisterScreen from './screens/registerScreen';
import DevicesScreen from './screens/devicesScreen';
import AddDevicesScreen from './screens/addDevicesScreen';
import HomeHubScreen from './screens/homeHubScreen';
import RecipesScreen from './screens/recipesScreen';
import TeaScreen from './screens/teaScreen';
import TeaDetailsScreen from './screens/teaDetailsScreen';
import BrewsScreen from './screens/brewsScreen';
import BrewScreen from './screens/brewScreen';
import { listenForPushTokenRefresh, registerForPushNotifications, playNotificationSound } from './services/notifications';
import { navigationRef, navigate } from './navigation';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      try {
        await registerForPushNotifications();
        unsubscribe = listenForPushTokenRefresh();
      } catch (error) {
        console.warn('Push registration failed', error);
      }
    };

    void init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const handleNotification = (message: { data?: { brewId?: string } }) => {
      const brewId = message.data?.brewId ? Number(message.data.brewId) : null;
      if (brewId) {
        navigate('Brew', { id: brewId });
      }
    };

    const unsubscribeForeground = messaging().onMessage(async () => {
      await playNotificationSound();
    });

    messaging()
      .getInitialNotification()
      .then((message) => {
        if (message) handleNotification(message);
      })
      .catch((error) => {
        console.warn('Failed to read initial notification', error);
      });

    const unsubscribe = messaging().onNotificationOpenedApp(handleNotification);
    return () => {
      unsubscribe();
      unsubscribeForeground();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />
        <Stack.Screen
          name="HomeHub"
          component={HomeHubScreen}
        />
        <Stack.Screen
          name="Recipes"
          component={RecipesScreen}
        />
        <Stack.Screen
          name="Tea"
          component={TeaScreen}
        />
        <Stack.Screen
          name="TeaDetails"
          component={TeaDetailsScreen}
        />
        <Stack.Screen
          name="Devices"
          component={DevicesScreen}
        />
        <Stack.Screen
          name="AddDevice"
          component={AddDevicesScreen}
        />
        <Stack.Screen
          name="Brews"
          component={BrewsScreen}
        />
        <Stack.Screen
          name="Brew"
          component={BrewScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}