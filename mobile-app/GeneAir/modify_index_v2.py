import re

path = "app/(tabs)/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { BleManager, Device } from "react-native-ble-plx";',
    'import { BleManager, Device } from "react-native-ble-plx";\nimport * as Location from "expo-location";\nimport { LineChart } from "react-native-chart-kit";\nimport { Dimensions } from "react-native";'
)

# 2. State Variables
state_search = "  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);"
state_replace = """  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [locationName, setLocationName] = useState<string>("Locating...");
  const [hrHistory, setHrHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);"""
content = content.replace(state_search, state_replace)

# 3. getLocation function inside HomeScreen
fn_search = "  const requestBluetoothPermissions = async () => {"
fn_replace = """  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationName('Permission denied');
      return;
    }
    try {
      let loc = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geocode.length > 0) {
        setLocationName(`${geocode[0].city || geocode[0].region}, ${geocode[0].country}`);
      } else {
        setLocationName("Location found");
      }
    } catch (e) {
      setLocationName("Location unavailable");
    }
  };

  const requestBluetoothPermissions = async () => {"""
content = content.replace(fn_search, fn_replace)

# 4. Trigger getLocation and update hrHistory in connectToDevice
monitor_search = """          if (char?.value) {
            const data = parseWatchPacket(char.value);
            if (data) setWatchData(data);
          }"""
monitor_replace = """          if (char?.value) {
            const data = parseWatchPacket(char.value);
            if (data) {
              setWatchData(data);
              setHrHistory(prev => {
                const newHistory = [...prev, data.heartRate];
                if (newHistory.length > 15) newHistory.shift(); // Keep last 15 points
                return newHistory;
              });
            }
          }"""
content = content.replace(monitor_search, monitor_replace)

connect_search = "Alert.alert('Connected', `Successfully connected to ${discovered.name}`);"
connect_replace = "Alert.alert('Connected', `Successfully connected to ${discovered.name}`);\n      getLocation();"
content = content.replace(connect_search, connect_replace)

# 5. Top corner connection state
header_search = """        <View style={styles.dashboardHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
            <Text style={styles.welcome}>Good morning, {displayName || "there"}</Text>
          </View>
          <View style={styles.headerActions}>"""

header_replace = """        <View style={styles.dashboardHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
            <Text style={styles.welcome}>Good morning, {displayName || "there"}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center', marginRight: 10 }}>
             {connectedDevice ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50', marginRight: 6 }} />
                   <Text style={{ fontSize: 11, color: '#4caf50', fontWeight: 'bold' }}>Watch Connected</Text>
                </View>
             ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#98a3bd', marginRight: 6 }} />
                   <Text style={{ fontSize: 11, color: '#98a3bd', fontWeight: 'bold' }}>Disconnected</Text>
                </View>
             )}
          </View>
          <View style={styles.headerActions}>"""
content = content.replace(header_search, header_replace)

# 6. Watch UI Charts and Location
ui_search = """            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>GeneAir Watch Live</Text>
              <Pressable onPress={disconnectDevice}><Text style={styles.link}>Disconnect</Text></Pressable>
            </View>
            
            <View style={styles.watchGrid}>"""

ui_replace = """            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>GeneAir Watch Live</Text>
              <Pressable onPress={disconnectDevice}><Text style={styles.link}>Disconnect</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="location-on" size={16} color="#73809d" />
              <Text style={{ color: '#73809d', fontSize: 13, marginLeft: 4 }}>{locationName}</Text>
            </View>
            
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#172752', marginBottom: 8 }}>Heart Rate Trend</Text>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <LineChart
                data={{
                  labels: [],
                  datasets: [{ data: hrHistory }]
                }}
                width={Dimensions.get("window").width - 80}
                height={140}
                yAxisSuffix=""
                withDots={true}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={true}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "3", strokeWidth: "2", stroke: "#e91e63" }
                }}
                bezier
                style={{ borderRadius: 16, paddingRight: 0 }}
              />
            </View>

            <View style={styles.watchGrid}>"""
content = content.replace(ui_search, ui_replace)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("done")
