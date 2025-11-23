import  { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
  ImageSourcePropType,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { icons } from "@/constants";
import DateTimePicker from '@react-native-community/datetimepicker';

// Data arrays
const districtZoneData = {
  "Ampara": ["Akkaraipattu", "Ampara", "Kalmunai", "Sainthamaruthu", "Uhana", "Pottuvil", "Damana", "Mahaoya", "Navithanveli", "Irakkamam", "Dehiattakandiya", "Lahugala", "Thirukkovil", "Nintavur", "Addalaichenai"],
  "Anuradhapura": ["Anuradhapura", "Kekirawa", "Medawachchiya", "Mihintale", "Nochchiyagama", "Thalawa", "Galenbindunuwewa", "Horowpothana", "Kahatagasdigiliya", "Ipalogama", "Palagala", "Palugaswewa", "Rambewa", "Thambuttegama", "Kebithigollewa"],
  "Badulla": ["Badulla", "Bandarawela", "Mahiyanganaya", "Welimada", "Hali Ela", "Passara", "Kandaketiya", "Lunugala", "Rideemaliyadda", "Soranathota", "Haputale", "Diyatalawa", "Haldummulla", "Ella", "Uva Paranagama"],
  "Batticaloa": ["Batticaloa", "Kattankudy", "Eravur", "Valaichchenai", "Vakarai", "Porativu", "Koralai Pattu", "Manmunai", "Eravur Pattu", "Kiran", "Vellavely", "Oddamavadi", "Vantharamoolai"],
  "Colombo": ["Colombo", "Dehiwala", "Moratuwa", "Sri Jayawardenepura Kotte", "Kolonnawa", "Kaduwela", "Homagama", "Maharagama", "Kesbewa", "Ratmalana", "Boralesgamuwa", "Nugegoda", "Pannipitiya", "Hanwella", "Padukka"],
  "Galle": ["Galle", "Ambalangoda", "Hikkaduwa", "Elpitiya", "Bentota", "Karapitiya", "Baddegama", "Imaduwa", "Neluwa", "Nagoda", "Thawalama", "Akmeemana", "Habaraduwa", "Yakkalamulla", "Udugama"],
  "Gampaha": ["Gampaha", "Negombo", "Kelaniya", "Kadawatha", "Ja-Ela", "Wattala", "Minuwangoda", "Divulapitiya", "Mirigama", "Veyangoda", "Biyagama", "Dompe", "Mahara", "Katana", "Attanagalla"],
  "Hambantota": ["Hambantota", "Tangalle", "Ambalantota", "Tissamaharama", "Beliatta", "Weeraketiya", "Lunugamwehera", "Okewela", "Sooriyawewa", "Angunakolapelessa", "Katuwana", "Walasmulla", "Middeniya"],
  "Jaffna": ["Jaffna", "Chavakachcheri", "Nallur", "Point Pedro", "Karainagar", "Kayts", "Vaddukoddai", "Uduppidy", "Kopay", "Tellippalai", "Maruthnkerny", "Chankanai", "Sandilipay"],
  "Kalutara": ["Kalutara", "Panadura", "Horana", "Beruwala", "Matugama", "Agalawatta", "Bandaragama", "Bulathsinhala", "Madurawala", "Millaniya", "Palindanuwara", "Walallavita", "Ingiriya"],
  "Kandy": ["Kandy", "Gampola", "Nawalapitiya", "Kadugannawa", "Peradeniya", "Kundasale", "Akurana", "Ampitiya", "Pilimatalawa", "Galagedara", "Harispattuwa", "Pathadumbara", "Udunuwara", "Yatinuwara", "Udapalatha", "Minipe", "Hatharaliyadda"],
  "Kegalle": ["Kegalle", "Mawanella", "Rambukkana", "Warakapola", "Galigamuwa", "Yatiyantota", "Dehiowita", "Deraniyagala", "Aranayaka", "Ruwanwella"],
  "Kilinochchi": ["Kilinochchi", "Pallai", "Kandavalai", "Karachchi", "Poonakary"],
  "Kurunegala": ["Kurunegala", "Kuliyapitiya", "Pannala", "Narammala", "Polgahawela", "Alawwa", "Bingiriya", "Wariyapola", "Giriulla", "Melsiripura", "Nikaweratiya", "Mahawa", "Galgamuwa", "Panduwasnuwara", "Kobeigane", "Ibbagamuwa"],
  "Mannar": ["Mannar", "Nanattan", "Madhu", "Musali", "Manthai West"],
  "Matale": ["Matale", "Dambulla", "Galewela", "Ukuwela", "Rattota", "Palapathwela", "Naula", "Wilgamuwa", "Yatawatta"],
  "Matara": ["Matara", "Weligama", "Hakmana", "Devinuwara", "Akuressa", "Kamburupitiya", "Athuraliya", "Malimbada", "Thihagoda", "Pasgoda", "Kotapola", "Dickwella"],
  "Moneragala": ["Moneragala", "Wellawaya", "Bibile", "Buttala", "Katharagama", "Madulla", "Sevanagala", "Siyambalanduwa", "Thanamalwila", "Medagana"],
  "Mullaitivu": ["Mullaitivu", "Oddusuddan", "Puthukudiyiruppu", "Thunukkai", "Manthai East", "Maritimepattu", "Welioya"],
  "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakele", "Kotagala", "Ginigathena", "Hanguranketha", "Walapane", "Ragala", "Ambagamuwa", "Maskeliya"],
  "Polonnaruwa": ["Polonnaruwa", "Kaduruwela", "Hingurakgoda", "Medirigiriya", "Lankapura", "Thamankaduwa", "Welikanda", "Dimbulagala"],
  "Puttalam": ["Puttalam", "Chilaw", "Wennappuwa", "Dankotuwa", "Nattandiya", "Marawila", "Anamaduwa", "Kalpitiya", "Pallama", "Vanathavilluwa", "Madampe"],
  "Ratnapura": ["Ratnapura", "Balangoda", "Embilipitiya", "Pelmadulla", "Eheliyagoda", "Kuruwita", "Nivithigala", "Kahawatta", "Godakawela", "Ayagama", "Kalawana", "Opanayaka", "Weligepola", "Rakwana"],
  "Trincomalee": ["Trincomalee", "Kinniya", "Muthur", "Kuchchaveli", "Gomarankadawala", "Morawewa", "Seruvila", "Thambalagamuwa", "Verugal"],
  "Vavuniya": ["Vavuniya", "Vengalacheddikulam", "Nedunkerny", "Cheddikulam"]
};

const districts = Object.keys(districtZoneData);
const mediums = ["Sinhala", "Tamil", "English"];

const API = process.env.EXPO_PUBLIC_API_KEY;

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    district: "",
    zone: "",
    medium: "",
    password: "",
    confirmPassword: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showZoneDropdown, setShowZoneDropdown] = useState(false);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showMediumDropdown, setShowMediumDropdown] = useState(false);
  const [availableZones, setAvailableZones] = useState([]);
  const [tempDate, setTempDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Animation values for icons
  const animatedValues = useRef(
    Array(15).fill(0).map(() => new Animated.Value(0))
  ).current;
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);

  // Animation functions
  const startAnimations = () => {
    // Clear any existing animations
    animationRefs.current.forEach(animation => animation.stop());
    animationRefs.current = [];

    // Reset all animated values to start position
    animatedValues.forEach(value => value.setValue(0));

    // Start floating animations for all icons
    const iconAnimations = animatedValues.map((animValue, index) => {
      const delay = index * 150 + Math.random() * 400;
      
      // Create a continuous floating animation
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            // Float up and down
            Animated.timing(animValue, {
              toValue: 1,
              duration: 3000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      animationRefs.current.push(animation);
      return animation;
    });

    // Start all animations
    iconAnimations.forEach(animation => animation.start());
  };

  const stopAnimations = () => {
    animationRefs.current.forEach(animation => animation.stop());
    animationRefs.current = [];
  };

  // Start animations when component mounts
  useEffect(() => {
    startAnimations();

    return () => {
      stopAnimations();
    };
  }, []);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "district") {
      setAvailableZones(districtZoneData[value] || []);
      setFormData(prev => ({ ...prev, zone: "" }));
    }
  };


  const handleMediumSelect = (medium) => {
    handleChange("medium", medium);
    setShowMediumDropdown(false);
  };

  // Dropdown selection handlers
  const handleDistrictSelect = (district) => {
    handleChange("district", district);
    setShowDistrictDropdown(false);
  };

  const handleZoneSelect = (zone) => {
    handleChange("zone", zone);
    setShowZoneDropdown(false);
  };


  // Render dropdown items
  const renderDropdownItem = ({ item, onSelect }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onSelect(item)}
    >
      <Text style={styles.dropdownItemText}>{item}</Text>
    </TouchableOpacity>
  );

const handleSignUp = async () => {
  // Validate required fields
  if (!formData.email || !formData.phone || !formData.firstName || !formData.lastName || 
      !formData.password || !formData.confirmPassword) {
    Alert.alert("Error", "Please fill all required fields");
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    Alert.alert("Error", "Passwords do not match");
    return;
  }

  if (formData.password.length < 6) {
    Alert.alert("Error", "Password must be at least 6 characters long");
    return;
  }

  // Validate mobile number format (Sri Lankan)
  const mobileRegex = /^(071|076|077|075|078|070|074|072)\d{7}$/;
  if (!mobileRegex.test(formData.phone)) {
    Alert.alert("Error", "Please enter a valid Sri Lankan mobile number (e.g., 0712345678)");
    return;
  }

  setLoading(true);
  try {
    
    const firstName = formData.firstName;
    const lastName = formData.lastName;

    // Format phone number with country code
    const formattedPhone = `+94${formData.phone.substring(1)}`;

    const requestBody = {
      phone: formattedPhone,
      email: formData.email,
      password: formData.password,
      firstName: firstName,
      lastName: lastName,
      role: "INTERNAL_STUDENT",
      // Optional fields
      ...(formData.district && { district: formData.district }),
      ...(formData.zone && { zone: formData.zone }),
      ...(formData.medium && { medium: formData.medium }),

    };

    console.log("📤 Sending signup request to:", `${API}/api/v1/auth/complete-signup`);
    console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API}/api/v1/auth/complete-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📥 Response status:", response.status);
    
    const responseText = await response.text();
    console.log("📥 Raw response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse response as JSON:", parseError);
      throw new Error(`Server returned invalid JSON: ${responseText}`);
    }

    console.log("📥 Parsed response data:", data);

    if (!response.ok) {
      console.error("❌ API Error:", {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      if (data.message) {
        throw new Error(data.message);
      } else if (response.status === 400) {
        throw new Error("Bad request - please check your input");
      } else if (response.status === 409) {
        throw new Error("User already exists");
      } else if (response.status === 500) {
        throw new Error("Server error - please try again later");
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    console.log("✅ Signup successful:", data);

    // Show success message and redirect to sign-in
    Alert.alert(
      "Success", 
      "Account created successfully! Please sign in to continue.",
      [
        {
          text: "OK",
          onPress: () => {
            // Reset form and navigate to sign-in
            setFormData({
              email: "",
              phone: "",
              firstName: "",
              lastName: "",
              district: "",
              zone: "",
              medium: "",
              password: "",
              confirmPassword: "",
            });
            router.replace("/sign-in");
          }
        }
      ]
    );

  } catch (error) {
    console.error("❌ Signup error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    let errorMessage = error.message || "Failed to sign up. Please try again.";
    
    // Make error messages more user-friendly
    if (error.message.includes("User with this phone number already exists")) {
      errorMessage = "This phone number is already registered.";
    } else if (error.message.includes("Email already registered")) {
      errorMessage = "This email address is already registered.";
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      errorMessage = "Network error. Please check your internet connection.";
    } else if (error.message.includes("Internal teacher accounts")) {
      errorMessage = "This account type cannot be created through self-registration.";
    }
    
    Alert.alert("Sign Up Error", errorMessage);
  } finally {
    setLoading(false);
  }
};

  // Pick only the icons you want
  const selectedIcons: ImageSourcePropType[] = [
    icons.Icon1, icons.Icon2, icons.Icon3, icons.Icon4, icons.Icon5, icons.Icon6,
    icons.Icon1, icons.Icon3, icons.Icon2, icons.Icon4, icons.Icon3, icons.Icon5,
    icons.Icon1, icons.Icon6, icons.Icon2,
  ];

  const getPredefinedPositions = () => {
    const positions = [
      // Top row
      { top: 25, left: 10 }, { top: 25, left: 50 }, { top: 25, left: 90 },
      // Upper middle row
      { top: 60, left: 20 }, { top: 60, left: 80 },
      // Middle row
      { top: 95, left: 5 }, { top: 95, left: 35 }, { top: 95, left: 65 }, { top: 95, left: 95 },
      // Lower middle row
      { top: 130, left: 15 }, { top: 130, left: 50 }, { top: 130, left: 85 },
      // Bottom row
      { top: 165, left: 25 }, { top: 165, left: 75 },
      // Very bottom row
      { top: 200, left: 5 }, { top: 200, left: 40 }, { top: 200, left: 60 }, { top: 200, left: 95 },
    ];
    return positions;
  };

  const renderDistributedIcons = () => {
    const predefinedPositions = getPredefinedPositions();
    
    return selectedIcons.map((icon, index) => {
      let position;
      
      if (index < predefinedPositions.length) {
        position = predefinedPositions[index];
      } else {
        position = {
          top: 30 + Math.random() * 140,
          left: 15 + Math.random() * 70
        };
      }
      
      const randomOpacity = 0.8 + Math.random() * 0.2;
      const randomSize = 20 + Math.random() * 12;
      const randomRotation = Math.random() * 20 - 10;

      // Animation transforms - same as other screens
      const translateY = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15], // Increased movement for better visibility
      });

      const scale = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1], // Slightly more scale change
      });

      const rotate = animatedValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [`${randomRotation}deg`, `${randomRotation + 8}deg`], // More rotation
      });

      const opacity = animatedValues[index].interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [randomOpacity, randomOpacity * 1.4, randomOpacity],
      });

      return (
        <Animated.Image
          key={index}
          source={icon}
          style={{
            position: "absolute",
            top: position.top,
            left: `${position.left}%`,
            width: randomSize,
            height: randomSize,
            opacity: opacity,
            tintColor: "#FFFFFF",
            zIndex: 2,
            transform: [
              { translateY: translateY },
              { scale: scale },
              { rotate: rotate },
            ],
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
            elevation: 4,
          }}
          resizeMode="contain"
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Gradient with Icons and Waves */}
      <LinearGradient
        colors={["#4B3AFF", "#5C6CFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        {/* Icons Layer with Animation */}
        <View style={styles.iconsLayer}>{renderDistributedIcons()}</View>

        {/* Title - Only Learn APP in top section */}
        <Text style={styles.header}><Text  className="text-blue-400">S</Text>MART  <Text  className="text-blue-400">F</Text>ISHER </Text>
        <Text className="text-3xl font-PoppinsBold text-blue-300 mt-0">LANKA </Text>


        {/* Light Blue Wave - BELOW the white wave */}
        <View style={styles.lightBlueWaveContainer}>
          <Svg
            height="92"
            width="90%"
            viewBox="0 0 1440 320"
            style={styles.lightBlueWaveSvg}
          >
            <Path
              fill="#4B9BFF"
              d="M0,180L48,170C96,160,192,140,288,130C384,120,480,120,576,135C672,150,768,180,864,190C960,200,1056,190,1152,175C1248,160,1344,130,1392,115L1440,100L1440,320L0,320Z"
            />
          </Svg>
        </View>

        {/* White Wave - ABOVE the blue wave */}
        <Svg
          height="92"
          width="100%"
          viewBox="0 0 1440 320"
          style={styles.whiteWaveWrapper}
        >
          <Path
            fill="#ffffff"
            d="M0,224L48,202.7C96,181,192,139,288,128C384,117,480,139,576,165.3C672,192,768,224,864,234.7C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L0,320Z"
          />
        </Svg>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up for your account</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Personal Info Section */}
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {/* First Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                First Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="user" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="First Name"
                  placeholderTextColor="#9ca3af"
                  value={formData.firstName}
                  onChangeText={(t) => handleChange("firstName", t)}
                />
              </View>
            </View>

             {/* Last Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Last Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="user" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Last Name"
                  placeholderTextColor="#9ca3af"
                  value={formData.lastName}
                  onChangeText={(t) => handleChange("lastName", t)}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Phone Number (e.g., 0712345678)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => {
                    const cleanedText = text.replace(/[^0-9]/g, '');
                    if (cleanedText.length <= 10) {
                      handleChange("phone", cleanedText);
                    }
                  }}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(t) => handleChange("email", t)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Other Info Section */}
            <Text style={styles.sectionTitle}>Other Information</Text>

            {/* District */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>District</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                onPress={() => setShowDistrictDropdown(true)}
              >
                <MaterialIcons name="location-on" size={18} color="#999" style={styles.icon} />
                <Text style={[styles.textInput, !formData.district && { color: '#9ca3af' }]}>
                  {formData.district || "District"}
                </Text>
                <AntDesign name="down" size={16} color="#999" />
              </TouchableOpacity>

              <Modal
                visible={showDistrictDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDistrictDropdown(false)}
              >
                <TouchableWithoutFeedback onPress={() => setShowDistrictDropdown(false)}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.dropdownContainer}>
                      <FlatList
                        data={districts}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => renderDropdownItem({ 
                          item, 
                          onSelect: handleDistrictSelect 
                        })}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>

            {/* Zone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Zone</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, !formData.district && styles.disabledInput]} 
                onPress={() => formData.district && setShowZoneDropdown(true)}
                disabled={!formData.district}
              >
                <MaterialIcons name="map" size={18} color="#999" style={styles.icon} />
                <Text style={[styles.textInput, !formData.zone && { color: '#9ca3af' }]}>
                  {formData.zone || (formData.district ? "Zone" : "Select District First")}
                </Text>
                <AntDesign name="down" size={16} color="#999" />
              </TouchableOpacity>

              <Modal
                visible={showZoneDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowZoneDropdown(false)}
              >
                <TouchableWithoutFeedback onPress={() => setShowZoneDropdown(false)}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.dropdownContainer}>
                      <FlatList
                        data={availableZones}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => renderDropdownItem({ 
                          item, 
                          onSelect: handleZoneSelect 
                        })}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>

            {/* Medium */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Medium</Text>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                onPress={() => setShowMediumDropdown(true)}
              >
                <MaterialIcons name="translate" size={18} color="#999" style={styles.icon} />
                <Text style={[styles.textInput, !formData.medium && { color: '#9ca3af' }]}>
                  {formData.medium || "Medium"}
                </Text>
                <AntDesign name="down" size={16} color="#999" />
              </TouchableOpacity>

              <Modal
                visible={showMediumDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMediumDropdown(false)}
              >
                <TouchableWithoutFeedback onPress={() => setShowMediumDropdown(false)}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.dropdownContainer}>
                      <FlatList
                        data={mediums}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => renderDropdownItem({ 
                          item, 
                          onSelect: handleMediumSelect 
                        })}
                        showsVerticalScrollIndicator={false}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>


            {/* Password Section */}
            <Text style={styles.sectionTitle}>Password</Text>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(t) => handleChange("password", t)}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={18} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={formData.confirmPassword}
                  onChangeText={(t) => handleChange("confirmPassword", t)}
                />
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[styles.signUpButton, loading && styles.disabledButton]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signUpButtonText}>Sign UP</Text>
              )}
            </TouchableOpacity>

            {/* Sign In */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already Have An Account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topSection: {
    position: "relative",
    width: "100%",
    height: 230,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  iconsLayer: {
    position: "absolute",
    width: "100%",
    height: "95%",
    zIndex: 7,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    zIndex: 5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontFamily: "Poppins-Bold",
  },
  whiteWaveWrapper: {
    position: "absolute",
    bottom: -5,
    left: 0,
    zIndex: 3,
  },
  lightBlueWaveContainer: {
    position: "absolute",
    bottom: -0.1,
    left: "5%",
    right: "-20%",
    alignItems: "center",
    zIndex: 2,
  },
  lightBlueWaveSvg: {},
  scrollContainer: {
    flexGrow: 1,
  },
  headingContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "Poppins-Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
    fontFamily: "Poppins-Regular",
  },
  formContainer: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 20,
    marginBottom: 16,
    fontFamily: "Poppins-SemiBold",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: "#000",
    marginBottom: 8,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  required: {
    color: "#ef4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 15,
    minHeight: 50,
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  icon: { 
    marginRight: 8 
  },
  textInput: {
    flex: 1,
    color: "#000",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    paddingVertical: 0,
  },
  // Dropdown styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: 300,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Poppins-Regular",
  },
  signUpButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 16,
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  signInText: {
    color: "#666",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  signInLink: {
    color: "#3b82f6",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
});

export default SignUp;