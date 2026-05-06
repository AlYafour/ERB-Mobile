// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Tab bar
  'house': 'home',
  'house.fill': 'home',
  'bell': 'notifications-none',
  'bell.fill': 'notifications',
  'bell.slash': 'notifications-off',
  'person': 'person-outline',
  'person.fill': 'person',

  // Navigation
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',

  // Actions
  'magnifyingglass': 'search',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'trash': 'delete-outline',
  'trash.fill': 'delete',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'slider.horizontal.3': 'tune',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'pencil': 'edit',
  'square.and.pencil': 'edit',
  'ellipsis': 'more-horiz',
  'ellipsis.circle': 'more-vert',
  'square.and.arrow.up': 'share',
  'arrow.clockwise': 'refresh',
  'line.3.horizontal.decrease.circle': 'filter-list',
  'line.3.horizontal.decrease': 'filter-list',

  // Content & business
  'building.columns.fill': 'account-balance',
  'building.2.fill': 'business',
  'cube.box.fill': 'inventory',
  'info.circle.fill': 'info',
  'info.circle': 'info-outline',
  'moon.fill': 'dark-mode',
  'rectangle.portrait.and.arrow.right': 'logout',
  'gearshape.fill': 'settings',
  'gearshape': 'settings',
  'person.2.fill': 'group',
  'person.2': 'group',
  'doc.text.fill': 'description',
  'doc.text': 'description',
  'doc.fill': 'article',
  'doc': 'article',
  'cart.fill': 'shopping-cart',
  'cart': 'shopping-cart',
  'shippingbox.fill': 'local-shipping',
  'shippingbox': 'local-shipping',
  'quote.bubble.fill': 'format-quote',
  'list.bullet.rectangle.fill': 'list-alt',
  'list.bullet': 'list',
  'folder.fill': 'folder',
  'folder': 'folder-open',
  'dollarsign.circle.fill': 'attach-money',
  'dollarsign': 'attach-money',
  'clock.fill': 'schedule',
  'clock': 'access-time',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'star.fill': 'star',
  'star': 'star-border',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'tag.fill': 'label',
  'tag': 'label-outline',
  'calendar': 'calendar-today',
  'calendar.circle.fill': 'event',
  'map.fill': 'map',
  'location.fill': 'location-on',
  'phone.fill': 'phone',
  'envelope.fill': 'email',
  'envelope': 'mail-outline',
  'lock.fill': 'lock',
  'lock.open.fill': 'lock-open',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'photo.fill': 'photo',
  'camera.fill': 'camera-alt',
  'paperclip': 'attach-file',
  'link': 'link',
  'network': 'wifi',
  'wifi': 'wifi',
  'chart.bar.fill': 'bar-chart',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'checkmark.seal.fill': 'verified',
  'shield.fill': 'security',
  'bell.badge.fill': 'notifications-active',

  // Legacy / used in boilerplate
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name] ?? 'circle';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
