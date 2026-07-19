import React from 'react';
import { View, Image, ViewStyle } from 'react-native';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
  logoUrl?: string;
}

export function Logo({ size = 120, style, logoUrl }: LogoProps) {
  return (
    <View style={style}>
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size, height: size, resizeMode: 'contain' }}
        />
      ) : (
        <Image
          source={require('@/assets/images/icon.png')}
          style={{ width: size, height: size, resizeMode: 'contain' }}
        />
      )}
    </View>
  );
}
