import { Tabs, router } from "expo-router";
import { Image, Text, TouchableOpacity, View, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { icons } from "@/constants";
import useAuthStore from "@/stores/authStore";

const TabsLayout = () => {
  const phoneNumber = "+94720804389";
  const whatsappNumber = "94720804389";

  const handlePhoneCall = () => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    const message = "Hello, I'm interested in your services";
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      message
    )}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${whatsappNumber}`);
    });
  };

  const handleSubmitAd = () => {
    const state = useAuthStore.getState();
    if (state.isSignedIn) {
      router.push("/#");
    } else {
      router.push("/#");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Blue Status Bar */}
      <StatusBar 
        style="light" 
        backgroundColor="#3b82f6" 
        translucent={false}
      />
      
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            display: 'none', // Hide the default tab bar
          },
        }}
      >
        <Tabs.Screen name="home" options={{ headerShown: false }} />
        <Tabs.Screen
          name="SubmitPost"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Custom Bottom Navigation */}
      <View style={styles.customTabBar} className="rounded-t-3xl shadow-lg">
        

        {/* Navigation Items */}
        <View style={styles.navItemsContainer}>
          <TouchableOpacity style={styles.navItem}>
            <View style={[styles.iconContainer, styles.iconContainerActive]}>
              <Image 
                source={icons.nav_home} 
                style={styles.navIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.iconContainer}>
              <Image 
                source={icons.nav_exam} 
                style={styles.navIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navText}>Exams</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.iconContainer}>
              <Image 
                source={icons.home_publication} 
                style={styles.navIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navText}>Publication</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.iconContainer}>
              <Image 
                source={icons.nav_user} 
                style={styles.navIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>

        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2C3036",
  },
  customTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "white",
    height: 90,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "white",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#3A3F47",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#3A3F47",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  buttonText: {
    color: "#FEE01C",
    fontWeight: '500',
    fontSize: 14,
  },
  navItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  navItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9E9E9E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: '#005CFF',
  },
  navIcon: {
    width: 25,
    height: 25,
    tintColor: 'white',
  },
  navText: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 4,
  },
  navTextActive: {
    color: "#005CFF",
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: "#FEE01C",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: 'black',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default TabsLayout;