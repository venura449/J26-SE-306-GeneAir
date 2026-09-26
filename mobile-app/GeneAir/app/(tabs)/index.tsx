import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Image,
  PermissionsAndroid,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { BleManager, Device } from "react-native-ble-plx";
import * as Location from "expo-location";
import { LineChart, ProgressChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  forgotPassword,
  getProfile,
  login,
  logout,
  register,
  User,
  updateProfile,
  profileImageUrl,
  syncWatchData,
} from "@/config/api";

type AuthMode = "login" | "register" | "forgot";

interface WatchPacket {
  version: number;
  sequence: number;
  heartRate: number;
  steps: number;
  lightLux: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  spo2: number;
  bodyTemp: number;
}

type TrendMetric = "heartRate" | "spo2" | "bodyTemp" | "steps" | "lightLux";

const trendOptions: {
  key: TrendMetric;
  label: string;
  unit: string;
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  {
    key: "heartRate",
    label: "Heart rate",
    unit: "BPM",
    color: "#e91e63",
    icon: "favorite",
  },
  {
    key: "spo2",
    label: "SpO2",
    unit: "%",
    color: "#237d78",
    icon: "bloodtype",
  },
  {
    key: "bodyTemp",
    label: "Temperature",
    unit: "C",
    color: "#e68a2e",
    icon: "thermostat",
  },
  {
    key: "steps",
    label: "Steps",
    unit: "steps",
    color: "#3549b7",
    icon: "directions-walk",
  },
  {
    key: "lightLux",
    label: "Ambient light",
    unit: "lux",
    color: "#c49a18",
    icon: "light-mode",
  },
];

const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

function decodeBase64(base64: string): Uint8Array {
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i,
    p = 0,
    encoded1,
    encoded2,
    encoded3,
    encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return bytes;
}

const parseWatchPacket = (base64: string): WatchPacket | null => {
  const bytes = decodeBase64(base64);
  if (bytes.length < 19) return null;
  const view = new DataView(bytes.buffer);
  return {
    version: view.getUint8(0),
    sequence: view.getUint8(1),
    heartRate: view.getUint16(2, true) / 10.0,
    steps: view.getUint32(4, true),
    lightLux: view.getUint16(8, true),
    gyroX: view.getInt16(10, true) / 10.0,
    gyroY: view.getInt16(12, true) / 10.0,
    gyroZ: view.getInt16(14, true) / 10.0,
    spo2: view.getUint8(16),
    bodyTemp: view.getInt16(17, true) / 100.0,
  };
};

const bleManager = new BleManager();

export default function HomeScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<User>>({});
  const [photoUri, setPhotoUri] = useState<string>();
  const [openSelect, setOpenSelect] = useState<"age" | "severity" | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [watchData, setWatchData] = useState<WatchPacket | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [locationName, setLocationName] = useState<string>("Locating...");
  const [hrHistory, setHrHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [spo2History, setSpo2History] = useState<number[]>([
    95, 95, 95, 95, 95, 95,
  ]);
  const [tempHistory, setTempHistory] = useState<number[]>([
    36.5, 36.5, 36.5, 36.5, 36.5, 36.5,
  ]);
  const [watchHistory, setWatchHistory] = useState<WatchPacket[]>([]);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("heartRate");
  const [trendRange, setTrendRange] = useState<6 | 12 | 20>(12);
  useEffect(() => {
    getProfile()
      .then(setUser)
      .catch(() => undefined);
  }, []);
  const submit = async () => {
    if (
      !email.includes("@") ||
      (mode !== "forgot" && password.length < 8) ||
      (mode === "register" && !name.trim())
    ) {
      Alert.alert(
        "Check your details",
        "Complete all fields. Passwords need at least 8 characters.",
      );
      return;
    }
    setLoading(true);
    try {
      if (mode === "forgot") {
        const result = await forgotPassword(email.trim());
        Alert.alert("Check your inbox", result.message);
      } else
        setUser(
          mode === "register"
            ? await register(name.trim(), email.trim(), password)
            : await login(email.trim(), password),
        );
    } catch (error) {
      Alert.alert(
        "Unable to continue",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const signOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      Alert.alert(
        "Unable to sign out",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const openProfile = () => {
    if (user) {
      setDraft({ ...user });
      setPhotoUri(undefined);
      setProfileOpen(true);
    }
  };
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo access to add a profile photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) {
      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [
          {
            crop: {
              originX: 0,
              originY: 0,
              width: result.assets[0].width,
              height: result.assets[0].height,
            },
          },
          { resize: { width: 800 } },
        ],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(cropped.uri);
    }
  };
  const saveProfile = async () => {
    setLoading(true);
    try {
      const saved = await updateProfile(draft, photoUri);
      setUser(saved);
      setProfileOpen(false);
      Alert.alert(
        "Profile updated",
        "Your patient profile is saved to this device and account.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to save",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationName("Permission denied");
      return;
    }
    try {
      let loc = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode.length > 0) {
        setLocationName(
          `${geocode[0].city || geocode[0].region}, ${geocode[0].country}`,
        );
      } else {
        setLocationName("Location found");
      }
    } catch (e) {
      setLocationName("Location unavailable");
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === "android") {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result["android.permission.BLUETOOTH_CONNECT"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.BLUETOOTH_SCAN"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  const scanForDevices = async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      Alert.alert(
        "Permission Denied",
        "Bluetooth permissions are required to scan for devices.",
      );
      return;
    }
    setScannedDevices([]);
    setIsScanning(true);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        setIsScanning(false);
        Alert.alert("Scan Error", error.message);
        return;
      }
      if (device && device.name) {
        setScannedDevices((prev) => {
          if (!prev.find((d) => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  const connectToDevice = async (device: Device) => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      Alert.alert("Connecting", `Connecting to ${device.name}...`);

      const connected = await device.connect();
      const discovered =
        await connected.discoverAllServicesAndCharacteristics();

      setConnectedDevice(discovered);
      Alert.alert("Connected", `Successfully connected to ${discovered.name}`);
      getLocation();
      setDeviceOpen(false);

      // Start monitoring watch data
      discovered.monitorCharacteristicForService(
        "12345678-1234-1234-1234-123456789000",
        "12345678-1234-1234-1234-123456789001",
        (error, char) => {
          if (error) {
            console.log("Monitor error:", error);
            return;
          }
          if (char?.value) {
            const data = parseWatchPacket(char.value);
            if (data) {
              setWatchData(data);
              setHrHistory((prev) => {
                const newHistory = [...prev, data.heartRate];
                if (newHistory.length > 15) newHistory.shift(); // Keep last 15 points
                return newHistory;
              });
              setWatchHistory((prev) => [...prev, data].slice(-20));
            }
          }
        },
      );

      discovered.onDisconnected((err, dev) => {
        setConnectedDevice(null);
        setWatchData(null);
        Alert.alert("Disconnected", "Device connection lost.");
      });
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Connection Failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      setWatchData(null);
      setWatchHistory([]);
    }
  };
  const displayName = typeof user?.name === "string" ? user.name.trim() : "";
  const displayEmail = typeof user?.email === "string" ? user.email : "";
  const savedImage = profileImageUrl(user?.profileImage);
  const selectedTrend =
    trendOptions.find((option) => option.key === trendMetric) ||
    trendOptions[0];
  const trendPoints = watchHistory
    .slice(-trendRange)
    .map((packet) => packet[trendMetric]);
  const trendLabels = watchHistory
    .slice(-trendRange)
    .map((_, index) => `${index + 1}`);
  if (user)
    return (
      <>
        <StatusBar
          style="dark"
          backgroundColor="#f5f7fc"
          translucent={false}
          hidden={false}
        />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <ScrollView
            contentContainerStyle={styles.dashboard}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dashboardHeader}>
              <View
                style={[styles.headerCopy, { flexShrink: 1, marginRight: 10 }]}
              >
                <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
                <Text
                  style={[styles.welcome, { fontSize: 22, flexShrink: 1 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Good morning, {displayName || "there"}
                </Text>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                {connectedDevice ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#4caf50",
                        marginRight: 6,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#4caf50",
                        fontWeight: "bold",
                      }}
                    >
                      Watch Connected
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#98a3bd",
                        marginRight: 6,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#98a3bd",
                        fontWeight: "bold",
                      }}
                    >
                      Disconnected
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityLabel="Open profile"
                  accessibilityRole="button"
                  onPress={openProfile}
                  style={styles.iconButton}
                >
                  {savedImage ? (
                    <Image
                      source={{ uri: savedImage }}
                      style={styles.headerAvatar}
                    />
                  ) : (
                    <MaterialIcons
                      name="account-circle"
                      size={34}
                      color="#3549b7"
                    />
                  )}
                </Pressable>
                <Pressable
                  accessibilityLabel="Log out"
                  accessibilityRole="button"
                  onPress={signOut}
                  style={styles.iconButton}
                >
                  <MaterialIcons name="logout" size={25} color="#687593" />
                </Pressable>
              </View>
            </View>

            {!connectedDevice ? (
              <Pressable
                style={styles.deviceCard}
                onPress={() => setDeviceOpen(true)}
              >
                <View style={styles.deviceIcon}>
                  <MaterialIcons name="add" size={27} color="#3549b7" />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Add a device</Text>
                  <Text style={styles.insightCopy}>
                    Scan for nearby devices via Bluetooth.
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#3549b7" />
              </Pressable>
            ) : (
              <View style={styles.watchLiveCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text style={styles.sectionTitle}>GeneAir Watch Live</Text>
                  <Pressable onPress={disconnectDevice}>
                    <Text style={styles.link}>Disconnect</Text>
                  </Pressable>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <MaterialIcons name="location-on" size={16} color="#73809d" />
                  <Text
                    style={{ color: "#73809d", fontSize: 13, marginLeft: 4 }}
                  >
                    {locationName}
                  </Text>
                </View>

                {/* Vitals Charts Container */}
                <View
                  style={{
                    backgroundColor: "#f9fafc",
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#172752",
                        marginBottom: 8,
                      }}
                    >
                      Heart Rate (BPM)
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#e91e63",
                      }}
                    >
                      {watchData?.heartRate.toFixed(1) || "--"}
                    </Text>
                  </View>
                  <LineChart
                    data={{ labels: [], datasets: [{ data: hrHistory }] }}
                    width={Dimensions.get("window").width - 100}
                    height={90}
                    yAxisSuffix=""
                    withDots={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundColor: "#f9fafc",
                      backgroundGradientFrom: "#f9fafc",
                      backgroundGradientTo: "#f9fafc",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(115, 128, 157, ${opacity})`,
                      style: { borderRadius: 16 },
                    }}
                    bezier
                    style={{ paddingRight: 0, marginVertical: 4 }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#172752",
                        marginBottom: 8,
                      }}
                    >
                      Blood Oxygen (%)
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#2196f3",
                      }}
                    >
                      {watchData?.spo2 || "--"}
                    </Text>
                  </View>
                  <LineChart
                    data={{ labels: [], datasets: [{ data: spo2History }] }}
                    width={Dimensions.get("window").width - 100}
                    height={90}
                    yAxisSuffix=""
                    withDots={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundColor: "#f9fafc",
                      backgroundGradientFrom: "#f9fafc",
                      backgroundGradientTo: "#f9fafc",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(115, 128, 157, ${opacity})`,
                      style: { borderRadius: 16 },
                    }}
                    bezier
                    style={{ paddingRight: 0, marginVertical: 4 }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#172752",
                        marginBottom: 8,
                      }}
                    >
                      Body Temp (°C)
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#ff9800",
                      }}
                    >
                      {watchData?.bodyTemp.toFixed(1) || "--"}
                    </Text>
                  </View>
                  <LineChart
                    data={{ labels: [], datasets: [{ data: tempHistory }] }}
                    width={Dimensions.get("window").width - 100}
                    height={90}
                    yAxisSuffix=""
                    withDots={false}
                    withInnerLines={false}
                    withOuterLines={false}
                    withVerticalLabels={false}
                    withHorizontalLabels={false}
                    chartConfig={{
                      backgroundColor: "#f9fafc",
                      backgroundGradientFrom: "#f9fafc",
                      backgroundGradientTo: "#f9fafc",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                      labelColor: (opacity = 1) =>
                        `rgba(115, 128, 157, ${opacity})`,
                      style: { borderRadius: 16 },
                    }}
                    bezier
                    style={{ paddingRight: 0, marginVertical: 4 }}
                  />
                </View>

                {/* Activity & Environment Grid */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={[styles.watchMetric, { flex: 1, padding: 8 }]}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#172752",
                        marginBottom: 4,
                      }}
                    >
                      Daily Steps
                    </Text>
                    <ProgressChart
                      data={{
                        labels: ["Steps"],
                        data: [Math.min((watchData?.steps || 0) / 10000, 1)],
                      }}
                      width={Dimensions.get("window").width / 2 - 50}
                      height={80}
                      strokeWidth={10}
                      radius={30}
                      chartConfig={{
                        backgroundColor: "#f5f7fc",
                        backgroundGradientFrom: "#f5f7fc",
                        backgroundGradientTo: "#f5f7fc",
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(115, 128, 157, ${opacity})`,
                      }}
                      hideLegend={true}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#4caf50",
                      }}
                    >
                      {watchData?.steps || 0}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#73809d" }}>
                      / 10,000
                    </Text>
                  </View>

                  <View style={[styles.watchMetric, { flex: 1, padding: 8 }]}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#172752",
                        marginBottom: 4,
                      }}
                    >
                      Motion & Light
                    </Text>
                    <BarChart
                      data={{
                        labels: ["X", "Y", "Z"],
                        datasets: [
                          {
                            data: [
                              watchData?.gyroX || 0,
                              watchData?.gyroY || 0,
                              watchData?.gyroZ || 0,
                            ],
                          },
                        ],
                      }}
                      width={Dimensions.get("window").width / 2 - 50}
                      height={80}
                      yAxisLabel=""
                      yAxisSuffix=""
                      withHorizontalLabels={false}
                      withInnerLines={false}
                      showBarTops={false}
                      chartConfig={{
                        backgroundColor: "#f5f7fc",
                        backgroundGradientFrom: "#f5f7fc",
                        backgroundGradientTo: "#f5f7fc",
                        color: (opacity = 1) =>
                          `rgba(156, 39, 176, ${opacity})`,
                        labelColor: (opacity = 1) =>
                          `rgba(115, 128, 157, ${opacity})`,
                        barPercentage: 0.6,
                      }}
                      style={{ paddingRight: 0 }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                        gap: 4,
                      }}
                    >
                      <MaterialIcons
                        name="light-mode"
                        size={14}
                        color="#ffc107"
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: "#ffc107",
                        }}
                      >
                        {watchData?.lightLux || 0} lx
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <Modal
              visible={profileOpen}
              animationType="slide"
              transparent
              onRequestClose={() => setProfileOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <ScrollView contentContainerStyle={styles.profileModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>My profile</Text>
                    <Pressable onPress={() => setProfileOpen(false)}>
                      <Text style={styles.link}>Close</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.photoSection} onPress={choosePhoto}>
                    <View style={styles.photoFrame}>
                      {photoUri || savedImage ? (
                        <Image
                          source={{ uri: photoUri || savedImage }}
                          style={styles.profilePhoto}
                        />
                      ) : (
                        <Text style={styles.profileInitial}>
                          {displayName.charAt(0).toUpperCase() || "G"}
                        </Text>
                      )}
                      <View style={styles.photoEditBadge}>
                        <MaterialIcons
                          name="photo-camera"
                          size={16}
                          color="#fff"
                        />
                      </View>
                    </View>
                    <Text style={styles.photoTitle}>Profile photo</Text>
                    <Text style={styles.photoHint}>
                      Tap to choose and crop a clear photo
                    </Text>
                  </Pressable>
                  <ProfileField
                    label="Name"
                    value={String(draft.name || "")}
                    onChangeText={(v) => setDraft({ ...draft, name: v })}
                  />
                  <ProfileField
                    label="Email (cannot be changed)"
                    value={displayEmail}
                    editable={false}
                  />
                  <ProfileField
                    label="Date of birth"
                    value={String(draft.dateOfBirth || "")}
                    placeholder="YYYY-MM-DD"
                    onChangeText={(v) => setDraft({ ...draft, dateOfBirth: v })}
                  />
                  <Text style={styles.modalSection}>Health status</Text>
                  <ProfileField
                    label="BMI"
                    value={String(draft.bmi ?? "")}
                    keyboardType="decimal-pad"
                    onChangeText={(v) => setDraft({ ...draft, bmi: Number(v) })}
                  />
                  <SelectField
                    label="Age diagnosed range"
                    value={String(draft.static_age_diagnosed_range || "")}
                    options={[
                      "0-6yo",
                      "7-12yo",
                      "13-17yo",
                      "18-40yo",
                      "41-60yo",
                      "61+yo",
                    ]}
                    open={openSelect === "age"}
                    onOpen={() =>
                      setOpenSelect(openSelect === "age" ? null : "age")
                    }
                    onSelect={(v) => {
                      setDraft({ ...draft, static_age_diagnosed_range: v });
                      setOpenSelect(null);
                    }}
                  />
                  <SelectField
                    label="Severity"
                    value={String(draft.static_severity || "")}
                    options={["Mild", "Moderate", "Severe"]}
                    open={openSelect === "severity"}
                    onOpen={() =>
                      setOpenSelect(
                        openSelect === "severity" ? null : "severity",
                      )
                    }
                    onSelect={(v) => {
                      setDraft({ ...draft, static_severity: v });
                      setOpenSelect(null);
                    }}
                  />
                  <ProfileField
                    label="Max PEF expected"
                    value={String(draft.static_max_pef_expected ?? "")}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setDraft({ ...draft, static_max_pef_expected: Number(v) })
                    }
                  />
                  <ProfileField
                    label="Pack years"
                    value={String(draft.static_pack_years ?? "")}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setDraft({ ...draft, static_pack_years: Number(v) })
                    }
                  />
                  <ProfileField
                    label="Best PEF"
                    value={String(draft.static_pef_best ?? "")}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setDraft({ ...draft, static_pef_best: Number(v) })
                    }
                  />
                  <Pressable
                    style={styles.submit}
                    onPress={saveProfile}
                    disabled={loading}
                  >
                    <Text style={styles.submitText}>
                      {loading ? "Saving..." : "Save profile"}
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            </Modal>

            <Text style={styles.sectionTitle}>Your health overview</Text>
            <View style={styles.metricsRow}>
              <MetricCard
                icon="air"
                label="Air quality"
                value="Good"
                tone="teal"
              />
              <MetricCard
                icon="monitor-heart"
                label="Monitoring"
                value="Ready"
                tone="blue"
              />
            </View>

            <View style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <MaterialIcons name="auto-graph" size={24} color="#237d78" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.cardEyebrow}>NEXT STEP</Text>
                <Text style={styles.insightTitle}>Start a new assessment</Text>
                <Text style={styles.insightCopy}>
                  Review your environment and health signals in one place.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#237d78" />
            </View>

            <Text style={styles.sectionTitle}>Quick actions</Text>
            <View style={styles.actionRow}>
              <ActionCard icon="history" label="History" />
              <ActionCard icon="person-outline" label="Profile" />
              <ActionCard icon="help-outline" label="Support" />
            </View>
            <Modal
              visible={deviceOpen}
              animationType="slide"
              transparent
              onRequestClose={() => setDeviceOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.deviceModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add device</Text>
                    <Pressable
                      onPress={() => {
                        setDeviceOpen(false);
                        bleManager.stopDeviceScan();
                        setIsScanning(false);
                      }}
                    >
                      <Text style={styles.link}>Close</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.modalCopy}>
                    Scan for nearby GeneAir devices via Bluetooth to connect.
                  </Text>

                  <Pressable
                    style={styles.submit}
                    onPress={scanForDevices}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Scan for Devices</Text>
                    )}
                  </Pressable>

                  <View style={{ marginTop: 20, maxHeight: 300 }}>
                    <FlatList
                      data={scannedDevices}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <Pressable
                          style={styles.deviceItem}
                          onPress={() => connectToDevice(item)}
                        >
                          <MaterialIcons
                            name="bluetooth"
                            size={24}
                            color="#3549b7"
                          />
                          <View style={styles.deviceItemContent}>
                            <Text style={styles.deviceItemName}>
                              {item.name}
                            </Text>
                            <Text style={styles.deviceItemId}>{item.id}</Text>
                          </View>
                        </Pressable>
                      )}
                      ListEmptyComponent={() => (
                        <Text
                          style={{
                            textAlign: "center",
                            color: "#73809d",
                            marginTop: 20,
                          }}
                        >
                          {isScanning ? "Scanning..." : "No devices found."}
                        </Text>
                      )}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  const title =
    mode === "login"
      ? "Welcome back"
      : mode === "register"
        ? "Create your account"
        : "Reset password";
  return (
    <>
      <StatusBar
        style="light"
        backgroundColor="#253b99"
        translucent={false}
        hidden={false}
      />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.page}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>✦</Text>
            </View>
            <Text style={styles.brand}>GeneAir</Text>
            <Text style={styles.heroTitle}>
              Care that{`\n`}moves <Text style={styles.accent}>with you.</Text>
            </Text>
            <Text style={styles.heroCopy}>
              A simpler way to connect with better healthcare.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Your health journey starts here.
            </Text>
            {mode === "register" && (
              <Field
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Jane Doe"
              />
            )}
            {
              <Field
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            }
            {mode !== "forgot" && (
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
              />
            )}
            {mode === "login" && (
              <Pressable onPress={() => setMode("forgot")}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.submit}
              onPress={submit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading
                  ? "Connecting..."
                  : mode === "login"
                    ? "Sign in"
                    : mode === "register"
                      ? "Create account"
                      : "Send reset link"}
              </Text>
            </Pressable>
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === "login"
                  ? "New to GeneAir?"
                  : "Already have an account?"}
              </Text>
              <Pressable
                onPress={() => setMode(mode === "login" ? "register" : "login")}
              >
                <Text style={styles.link}>
                  {mode === "login" ? " Create account" : " Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
function Field({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#98a3bd"
        {...props}
      />
    </View>
  );
}
function ProfileField({
  label,
  ...props
}: {
  label: string;
  [key: string]: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#98a3bd"
        {...props}
      />
    </View>
  );
}
function SelectField({
  label,
  value,
  options,
  open,
  onOpen,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onOpen: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={onOpen}>
        <Text style={{ color: value ? "#172752" : "#98a3bd" }}>
          {value || "Select"}
        </Text>
      </Pressable>
      {open && (
        <View style={styles.selectMenu}>
          {options.map((option) => (
            <Pressable
              key={option}
              style={styles.selectOption}
              onPress={() => onSelect(option)}
            >
              <Text style={styles.selectOptionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  tone: "blue" | "teal";
}) {
  return (
    <View style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          tone === "teal" ? styles.tealIcon : styles.blueIcon,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={21}
          color={tone === "teal" ? "#237d78" : "#3549b7"}
        />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.actionCard}>
      <MaterialIcons name={icon} size={23} color="#3549b7" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fc" },
  safeArea: { flex: 1, backgroundColor: "#f5f7fc" },
  hero: {
    backgroundColor: "#253b99",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 82,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#3549b7", fontSize: 22 },
  brand: { color: "#fff", fontSize: 19, fontWeight: "700", marginTop: 10 },
  heroTitle: {
    color: "#fff",
    fontSize: 39,
    lineHeight: 43,
    fontWeight: "700",
    marginTop: 48,
  },
  accent: { color: "#81e6d6" },
  heroCopy: { color: "#d4dcff", fontSize: 14, marginTop: 14 },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -45,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#182b6b",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },
  eyebrow: {
    color: "#3b4fbd",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { color: "#172752", fontSize: 27, fontWeight: "700", marginTop: 8 },
  subtitle: { color: "#73809d", fontSize: 13, marginTop: 8, marginBottom: 24 },
  field: { marginBottom: 15 },
  label: { color: "#334064", fontSize: 13, fontWeight: "600", marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: "#dce2ef",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#172752",
    fontSize: 14,
  },
  forgot: {
    color: "#3549b7",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 16,
  },
  submit: {
    backgroundColor: "#3549b7",
    borderRadius: 9,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchText: { color: "#73809d", fontSize: 13 },
  link: { color: "#3549b7", fontSize: 13, fontWeight: "700" },
  dashboard: {
    flexGrow: 1,
    backgroundColor: "#f5f7fc",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  headerActions: { flexDirection: "row", gap: 4, flexShrink: 0, marginTop: -5 },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
  },
  headerAvatar: {
    borderColor: "#cbd3ef",
    borderRadius: 19,
    borderWidth: 2,
    height: 38,
    width: 38,
  },
  profileBanner: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e4e8f2",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 26,
    padding: 16,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#dfe5ff",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: "#3549b7", fontSize: 20, fontWeight: "700" },
  profileDetails: { flex: 1, marginLeft: 12 },
  profileName: { color: "#172752", fontSize: 15, fontWeight: "700" },
  profileMeta: { color: "#73809d", fontSize: 12, marginTop: 4 },
  connectedBadge: { alignItems: "center", flexDirection: "row" },
  connectedDot: {
    backgroundColor: "#31b59d",
    borderRadius: 4,
    height: 8,
    marginRight: 5,
    width: 8,
  },
  connectedText: { color: "#237d78", fontSize: 11, fontWeight: "700" },
  sectionTitle: {
    color: "#172752",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 0,
  },
  metricsRow: { flexDirection: "row", gap: 12 },
  metricCard: {
    backgroundColor: "#fff",
    borderColor: "#e4e8f2",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 15,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    marginBottom: 14,
    width: 38,
  },
  tealIcon: { backgroundColor: "#e1f5f1" },
  blueIcon: { backgroundColor: "#e8ebff" },
  metricLabel: { color: "#73809d", fontSize: 12 },
  metricValue: {
    color: "#172752",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 5,
  },
  insightCard: {
    alignItems: "center",
    backgroundColor: "#e8f7f3",
    borderRadius: 18,
    flexDirection: "row",
    marginTop: 16,
    padding: 16,
  },
  insightIcon: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  insightContent: { flex: 1, marginHorizontal: 12 },
  cardEyebrow: {
    color: "#237d78",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  insightTitle: {
    color: "#164d4a",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  insightCopy: { color: "#4a7471", fontSize: 12, lineHeight: 17, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e4e8f2",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  actionLabel: {
    color: "#334064",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  welcome: {
    color: "#172752",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
    flexShrink: 1,
  },
  modalBackdrop: {
    backgroundColor: "rgba(12, 22, 58, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  profileModal: {
    backgroundColor: "#f5f7fc",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#172752", fontSize: 26, fontWeight: "700" },
  photoSection: {
    alignItems: "center",
    backgroundColor: "#e8ebff",
    borderRadius: 18,
    marginBottom: 20,
    padding: 20,
  },
  photoFrame: {
    alignItems: "center",
    backgroundColor: "#dfe5ff",
    borderColor: "#fff",
    borderRadius: 52,
    borderWidth: 4,
    height: 104,
    justifyContent: "center",
    position: "relative",
    width: 104,
  },
  profilePhoto: { borderRadius: 48, height: 96, width: 96 },
  profileInitial: { color: "#3549b7", fontSize: 38, fontWeight: "700" },
  photoEditBadge: {
    alignItems: "center",
    backgroundColor: "#3549b7",
    borderColor: "#fff",
    borderRadius: 15,
    borderWidth: 2,
    bottom: -2,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 30,
  },
  photoTitle: {
    color: "#172752",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  photoHint: { color: "#73809d", fontSize: 12, marginTop: 4 },
  modalSection: {
    color: "#172752",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    marginTop: 10,
  },
  selectMenu: {
    backgroundColor: "#fff",
    borderColor: "#dce2ef",
    borderRadius: 9,
    borderWidth: 1,
    marginTop: -8,
    overflow: "hidden",
  },
  selectOption: {
    borderBottomColor: "#edf0f7",
    borderBottomWidth: 1,
    padding: 13,
  },
  selectOptionText: { color: "#172752", fontSize: 14 },
  deviceCard: {
    alignItems: "center",
    backgroundColor: "#e8ebff",
    borderRadius: 18,
    flexDirection: "row",
    marginBottom: 26,
    padding: 16,
  },
  deviceIcon: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e4e8f2",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deviceItemContent: {
    marginLeft: 12,
  },
  deviceItemName: {
    color: "#172752",
    fontSize: 15,
    fontWeight: "600",
  },
  deviceItemId: {
    color: "#73809d",
    fontSize: 12,
    marginTop: 2,
  },

  watchLiveCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#e4e8f2",
    shadowColor: "#182b6b",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  watchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  watchMetric: {
    width: "48%",
    backgroundColor: "#f5f7fc",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  watchValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#172752",
    marginTop: 6,
  },
  watchUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#73809d",
  },
  watchLabel: {
    fontSize: 12,
    color: "#73809d",
    marginTop: 2,
  },
  deviceModal: {
    backgroundColor: "#f5f7fc",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 36,
  },
  modalCopy: {
    color: "#73809d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  orText: {
    color: "#98a3bd",
    fontSize: 13,
    marginVertical: 14,
    textAlign: "center",
  },
  scanButton: {
    alignItems: "center",
    borderColor: "#cbd3ef",
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  scanText: { color: "#3549b7", fontSize: 14, fontWeight: "700" },
  scanner: { backgroundColor: "#10152b", flex: 1, justifyContent: "flex-end" },
  camera: { ...StyleSheet.absoluteFillObject },
  scannerClose: {
    alignItems: "center",
    backgroundColor: "#3549b7",
    borderRadius: 9,
    margin: 24,
    paddingVertical: 15,
  },
});
