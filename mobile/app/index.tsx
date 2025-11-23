import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import useAuthStore from "@/stores/authStore";

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
  );
};

export default Home;
