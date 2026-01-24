
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";

const ScreenLayout = () => {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="chat_window"
          options={({ route }) => ({
            headerShown: true,
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#623B1C",
            headerTitle: () => <ChatHeader receiverId={route.params?.id} />,
          })}
        />

        

        <Stack.Screen
          name="update_profile"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#623B1C",
            headerTitleStyle: { fontWeight: "bold" },
            title: "Update Profile",
          }}
        />

        
        <Stack.Screen
          name="single_profile"
          options={{
            headerShown: false,
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#623B1C",
            headerTitleStyle: { fontWeight: "bold" },
            title: "Matching Profiles",
          }}
        />

       
         <Stack.Screen
          name="Account"
          options={{
            headerShown: false,
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#623B1C",
            headerTitleStyle: { fontWeight: "bold" },
            title: "Account",
          }}
        />

         
        

        
      </Stack>

      

      

      
      <Toast />
    </>
  );
};

export default ScreenLayout;
