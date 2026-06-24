import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

// Three-pillar enterprise mark — white pillars + gold unity bar on transparent bg.
// Background color is provided by the container (navy tile in app bar / login).
const logoSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10"  y="50" width="22" height="40" rx="5" fill="white"/>
  <rect x="39"  y="20" width="22" height="70" rx="5" fill="white"/>
  <rect x="68"  y="36" width="22" height="54" rx="5" fill="white"/>
  <rect x="8"   y="45" width="84" height="9"  rx="4" fill="#C8A24A"/>
</svg>`;

export function Logo({ size = 120, style }: LogoProps) {
  return (
    <View style={style}>
      <SvgXml xml={logoSvg} width={size} height={size} />
    </View>
  );
}
