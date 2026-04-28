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
import { register } from '../services/api';
import { theme } from '../styles/theme';
import tw from 'twrnc';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      Alert.alert(
        'Success',
        'Account created. You can now sign in.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Registration failed', error.message || 'Please try again.');
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
            <Text style={[tw`text-[34px] font-bold text-center mb-[10px]`, { color: theme.colors.textPrimary }]}>Create account</Text>
            <Text style={[tw`text-base text-center mb-7`, { color: theme.colors.textMuted }]}>Set up your profile and start brewing smarter.</Text>

            <TextInput
              style={[
                tw`px-[15px] py-3 rounded-xl mb-[15px] border text-base border-black/15`,
                { backgroundColor: theme.colors.inputBg, color: theme.colors.textPrimary },
              ]}
              placeholder="Name"
              placeholderTextColor={theme.colors.placeholder}
              value={name}
              onChangeText={setName}
              editable={Boolean(!loading)}
            />

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

            <TextInput
              style={[
                tw`px-[15px] py-3 rounded-xl mb-[15px] border text-base border-black/15`,
                { backgroundColor: theme.colors.inputBg, color: theme.colors.textPrimary },
              ]}
              placeholder="Confirm password"
              placeholderTextColor={theme.colors.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
              editable={Boolean(!loading)}
            />

            <TouchableOpacity
              style={[
                tw`py-[14px] rounded-xl items-center mt-[10px]`,
                { backgroundColor: loading ? '#51961f/95' : '#51961f' },
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white text-lg font-bold`}>Create account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={[tw`text-center mt-5 text-sm`, { color: theme.colors.textMuted }]}>
                Already have an account? <Text style={[tw`font-bold`, { color: theme.colors.accent }]}>Sign in</Text>
              </Text>
            </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}