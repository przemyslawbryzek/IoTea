import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/loginScreen';
import RegisterScreen from './screens/registerScreen';
import DevicesScreen from './screens/devicesScreen';
import AddDevicesScreen from './screens/addDevicesScreen';
import HomeHubScreen from './screens/homeHubScreen';
import RecipesScreen from './screens/recipesScreen';
import TeaScreen from './screens/teaScreen';
import TeaDetailsScreen from './screens/teaDetailsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}