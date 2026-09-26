import re

with open("app/(tabs)/index.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { CameraView, useCameraPermissions } from "expo-camera";',
    'import { BleManager, Device } from "react-native-ble-plx";'
)

content = content.replace(
    'import {\n  Alert,\n  Pressable,\n  ScrollView,\n  StyleSheet,\n  Text,\n  TextInput,\n  View,\n  Modal,\n  Image,\n} from "react-native";',
    'import {\n  Alert,\n  Pressable,\n  ScrollView,\n  StyleSheet,\n  Text,\n  TextInput,\n  View,\n  Modal,\n  Image,\n  PermissionsAndroid,\n  Platform,\n  FlatList,\n  ActivityIndicator,\n} from "react-native";'
)

# Insert BleManager instance right before HomeScreen
content = content.replace(
    'type AuthMode = "login" | "register" | "forgot";\nexport default function HomeScreen() {',
    'type AuthMode = "login" | "register" | "forgot";\n\nconst bleManager = new BleManager();\n\nexport default function HomeScreen() {'
)

# 2. State hooks
state_removal = """  const [scannerOpen, setScannerOpen] = useState(false);
  const [sin, setSin] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();"""

state_addition = """  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);"""

content = content.replace(state_removal, state_addition)

# 3. Functions
function_removal = """  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) { Alert.alert("Camera permission needed", "Allow camera access to scan a device QR code."); return; }
    }
    setScannerOpen(true);
  };"""

function_addition = """  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      if (apiLevel >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  };

  const scanForDevices = async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      Alert.alert('Permission Denied', 'Bluetooth permissions are required to scan for devices.');
      return;
    }
    setScannedDevices([]);
    setIsScanning(true);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        setIsScanning(false);
        Alert.alert('Scan Error', error.message);
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
      Alert.alert('Connecting', `Connecting to ${device.name}...`);
      
      const connectedDevice = await device.connect();
      const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
      Alert.alert('Connected', `Successfully connected to ${discoveredDevice.name}`);
      setDeviceOpen(false);
    } catch (error) {
      console.log(error);
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };"""

content = content.replace(function_removal, function_addition)


# 4. Modal UI
modal_removal = """        <Modal visible={deviceOpen} animationType="slide" transparent onRequestClose={() => setDeviceOpen(false)}>
          <View style={styles.modalBackdrop}><View style={styles.deviceModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add device</Text><Pressable onPress={() => setDeviceOpen(false)}><Text style={styles.link}>Close</Text></Pressable></View>
            <Text style={styles.modalCopy}>Enter the device SIN or scan the QR code printed on the device.</Text>
            <ProfileField label="Device SIN" value={sin} placeholder="e.g. GA-123456" autoCapitalize="characters" onChangeText={setSin} />
            <Pressable style={styles.submit} onPress={() => Alert.alert("Device ready", sin.trim() ? `Device ${sin.trim()} can now be connected.` : "Enter a SIN first.")}><Text style={styles.submitText}>Add by SIN</Text></Pressable>
            <Text style={styles.orText}>or</Text>
            <Pressable style={styles.scanButton} onPress={openScanner}><MaterialIcons name="qr-code-scanner" size={22} color="#3549b7" /><Text style={styles.scanText}>Scan QR code</Text></Pressable>
          </View></View>
        </Modal>
        <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
          <View style={styles.scanner}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => { setSin(data); setScannerOpen(false); Alert.alert("QR code scanned", `Device code: ${data}`); }} /><Pressable style={styles.scannerClose} onPress={() => setScannerOpen(false)}><Text style={styles.submitText}>Close scanner</Text></Pressable></View>
        </Modal>"""

modal_addition = """        <Modal visible={deviceOpen} animationType="slide" transparent onRequestClose={() => setDeviceOpen(false)}>
          <View style={styles.modalBackdrop}><View style={styles.deviceModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Add device</Text><Pressable onPress={() => { setDeviceOpen(false); bleManager.stopDeviceScan(); setIsScanning(false); }}><Text style={styles.link}>Close</Text></Pressable></View>
            <Text style={styles.modalCopy}>Scan for nearby GeneAir devices via Bluetooth to connect.</Text>
            
            <Pressable style={styles.submit} onPress={scanForDevices} disabled={isScanning}>
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
                  <Pressable style={styles.deviceItem} onPress={() => connectToDevice(item)}>
                    <MaterialIcons name="bluetooth" size={24} color="#3549b7" />
                    <View style={styles.deviceItemContent}>
                      <Text style={styles.deviceItemName}>{item.name}</Text>
                      <Text style={styles.deviceItemId}>{item.id}</Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={() => (
                  <Text style={{ textAlign: 'center', color: '#73809d', marginTop: 20 }}>
                    {isScanning ? "Scanning..." : "No devices found."}
                  </Text>
                )}
              />
            </View>
          </View></View>
        </Modal>"""

content = content.replace(modal_removal, modal_addition)


# 5. Fix insightCopy (optional, let's update text)
content = content.replace(
    '<Text style={styles.insightCopy}>Connect using a SIN or scan its QR code.</Text>',
    '<Text style={styles.insightCopy}>Scan for nearby devices via Bluetooth.</Text>'
)

# Add new styles
style_addition = """
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e4e8f2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deviceItemContent: {
    marginLeft: 12,
  },
  deviceItemName: {
    color: '#172752',
    fontSize: 15,
    fontWeight: '600',
  },
  deviceItemId: {
    color: '#73809d',
    fontSize: 12,
    marginTop: 2,
  },"""

content = content.replace('  deviceModal: {', style_addition + '\n  deviceModal: {')


with open("app/(tabs)/index.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("done")
