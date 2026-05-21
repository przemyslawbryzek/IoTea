import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface HomeHubScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

interface BubbleAction {
  id: string;
  label: string;
  iconUrl?: string;
  iconName?: string;
  size: number;
  x: number;
  y: number;
  onPress: (navigation: any) => void;
}

const orbitBubbles: BubbleAction[] = [
  {
    id: 'devices',
    label: 'Devices',
    iconUrl: 'https://img.icons8.com/?size=100&id=9648&format=png&color=000000',
    size: 106,
    x: width * 0.12,
    y: 190,
    onPress: (navigation) => navigation.navigate('Devices'),
  },
  {
    id: 'brew',
    label: 'Brews',
    iconUrl: 'https://img.icons8.com/?size=100&id=273&format=png&color=000000',
    size: 88,
    x: width * 0.72,
    y: 210,
    onPress: (navigation) => navigation.navigate('Brews'),
  },
  {
    id: 'account',
    label: 'Account',
    iconUrl: 'https://img.icons8.com/?size=100&id=15265&format=png&color=000000',
    size: 96,
    x: width * 0.08,
    y: 365,
    onPress: () => Alert.alert('Account', 'Account screen is coming soon.'),
  },
  {
    id: 'Recipes',
    label: 'Recipes',
    iconUrl: 'https://img.icons8.com/?size=100&id=K7JZCc6NsLV5&format=png&color=000000',
    size: 84,
    x: width * 0.72,
    y: 402,
    onPress: (navigation) => navigation.navigate('Recipes'),
  },
];

function BubbleIcon({ bubble }: { bubble: BubbleAction }) {
  return (
    <Image
      source={{ uri: bubble.iconUrl }}
      resizeMode="contain"
      style={[tw`h-8 w-8`, { tintColor: '#51961f' }]}
    />
  );
}

export default function HomeHubScreen({ navigation }: HomeHubScreenProps) {
  return (
    
    <SafeAreaView style={tw`flex-1 bg-[#fe7600]`}>
      <Image
          source={require('../assets/logo_nobg.png')}
          resizeMode="cover"
          style={tw`h-16 w-16 mx-auto mt-4`}
      />
      <View style={tw`px-6 pt-4`}>
        <Text style={tw`text-[11px] font-bold tracking-[2px] mb-2 text-[#ffe9cf]`}>IOTEA HUB</Text>
      </View>

      <View style={tw`flex-1`}>
        <View
          style={[
            tw`absolute rounded-full bg-[#ff9943] opacity-45`,
            { width: 260, height: 260, top: 210, left: width * 0.22 },
          ]}
        />
        <View
          style={[
            tw`absolute rounded-full bg-[#ffa65a] opacity-40`,
            { width: 120, height: 120, top: 126, left: width * 0.56 },
          ]}
        />

        <TouchableOpacity
          style={[
            tw`absolute items-center justify-center rounded-full border-4 bg-[#FFFBEF]/95`,
            {
              width: 174,
              height: 174,
              left: width * 0.30,
              top: 270,
              borderColor: '#ffc086',
              shadowColor: '#2a0f00',
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 14 },
              shadowRadius: 18,
              elevation: 10,
            },
          ]}
          onPress={() => navigation.navigate('Tea')}
          activeOpacity={0.88}
        >
          <Image 
            source={{ uri: 'https://img.icons8.com/?size=100&id=rCUgZeMLbaAM&format=png&color=000000' }}
            resizeMode="contain"
            style={[tw`h-16 w-16`, { tintColor: '#51961f' }]}
          />
          <Text style={tw`text-[35px] font-extrabold tracking-[0.5px] text-[#51961f]`}>Teas</Text>
        </TouchableOpacity>

        {orbitBubbles.map((bubble) => (
          <TouchableOpacity
            key={bubble.id}
            style={[
              tw`absolute items-center justify-center rounded-full border-2 bg-[#FFFBEF]/95`,
              {
                width: bubble.size,
                height: bubble.size,
                left: bubble.x,
                top: bubble.y,
                borderColor: '#ffe9d2',
                shadowColor: '#2a0f00',
                shadowOpacity: 0.18,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 12,
                elevation: 6,
              },
            ]}
            onPress={() => bubble.onPress(navigation)}
            activeOpacity={0.9}
          >
            <BubbleIcon bubble={bubble} />
            <Text style={tw`mt-2 text-[16px] font-bold text-[#51961f]`}>{bubble.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
