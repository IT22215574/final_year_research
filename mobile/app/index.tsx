import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import useAuthStore from "@/stores/authStore";

const Home = () => {
  const { isSignedIn, currentUser, checkAuthStatus } = useAuthStore();
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

// if user role based need
// if (isSignedIn && currentUser) {
//   if (currentUser.role === "fisher admin") {
//     return <Redirect href="/(fisheradmin)/(tabs)/home" />;
//   }
//   return <Redirect href="/(root)/(tabs)/home" />;
// }

// return <Redirect href="/(auth)/onBoard1" />;