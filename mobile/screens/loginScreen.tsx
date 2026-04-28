import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import tw from 'twrnc';
import { theme } from '../styles/theme';
import { login } from '../services/api';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigation.replace('HomeHub');
    } catch (error: any) {
      Alert.alert('Login failed', error.message || 'Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      {...panHandlers}
    >
      <View style={[tw`flex-1 justify-center px-6`, { backgroundColor: theme.colors.background }]}>
        <View
          style={[
            tw`px-[22px] py-7`,
          ]}
        >
          <Text style={[tw`text-xs font-bold tracking-[2px] mb-[10px] text-center`, { color: theme.colors.accent }]}>IOTEA</Text>
          <Text style={[tw`text-[34px] font-bold text-center mb-[10px]`, { color: theme.colors.textPrimary }]}>Welcome back</Text>
          <Text style={[tw`text-base text-center mb-7`, { color: theme.colors.textMuted }]}>Sign in to manage your brew devices.</Text>

          <TextInput
            style={[
              tw`px-[15px] py-3 rounded-xl mb-[15px] border text-base border-black/15`,
              { backgroundColor: theme.colors.inputBg, color: theme.colors.textPrimary },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={Boolean(!loading)}
          />

          <TextInput
            style={[
              tw`px-[15px] py-3 rounded-xl mb-[15px] border text-base border-black/15`,
              { backgroundColor: theme.colors.inputBg, color: theme.colors.textPrimary },
            ]}
            placeholder="Password"
            placeholderTextColor={theme.colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            editable={Boolean(!loading)}
          />

          <TouchableOpacity
            style={[
              tw`py-[14px] rounded-xl items-center mt-[10px]`,
              { backgroundColor: loading ? '#51961f/95' : '#51961f' },
            ]}
            onPress={handleLogin}
            disabled={Boolean(loading)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white text-lg font-bold`}>Sign in</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={Boolean(loading)}
          >
            <Text style={[tw`text-center mt-5 text-sm`, { color: theme.colors.textMuted }]}>
              New here? <Text style={[tw`font-bold`, { color: theme.colors.accent }]}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}