import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import useAuthStore from "@/stores/authStore";

<<<<<<< HEAD
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-red-600">Edit app/index.tsx to edit this screen.</Text>
    </View>
=======
const Home = () => {
  const { isSignedIn, checkAuthStatus } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await checkAuthStatus();
      setLoading(false);
    };
    initialize();
  }, []);

  if (loading) return null;

  return isSignedIn ? (
    <Redirect href="/(root)/(tabs)/home" />
  ) : (
    <Redirect href="/(auth)/onBoard1" />
>>>>>>> 3e57d2b444f0ef4279d0188a6aa9e67cb5fdf39b
  );
};

export default Home;
