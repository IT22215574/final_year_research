import type { ImageSourcePropType, TextInputProps, TouchableOpacityProps } from "react-native";
import type React from "react";

export type ButtonProps = TouchableOpacityProps & {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "success" | "outline";
  textVariant?: "default" | "primary" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
};

export type InputFieldProps = TextInputProps & {
  label?: string;
  labelStyle?: string;
  icon?: ImageSourcePropType;
  secureTextEntry?: boolean;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
};

export type GoogleInputProps = {
  icon?: ImageSourcePropType;
  containerStyle?: string;
  initialLocation?: string;
  textInputBackgroundColor?: string;
  handlePress?: (location: any) => void;
};
