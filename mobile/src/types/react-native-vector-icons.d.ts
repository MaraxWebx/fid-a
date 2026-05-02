declare module 'react-native-vector-icons/Ionicons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  type IconProps = TextProps & {
    color?: string;
    name: string;
    size?: number;
  };

  const Ionicons: ComponentType<IconProps>;
  export default Ionicons;
}
