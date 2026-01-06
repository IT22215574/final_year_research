import { GoogleInputProps } from "@/types/type";
import { Text, View } from "react-native";
const GoogleTextInput = ({
  icon,
  containerStyle,
  initialLocation,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  return (
    <View
      className={`flex flex-row items-center justify-center relative z-50roinded-xl ${containerStyle} mb-5`}
    >
      <Text>Search</Text>
    </View>
  );
};

export default GoogleTextInput;
