import re

with open("app/(tabs)/index.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add WatchPacket interface and Base64 decoder
deps = """
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

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) { lookup[chars.charCodeAt(i)] = i; }

function decodeBase64(base64: string): Uint8Array {
  let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i+1)];
    encoded3 = lookup[base64.charCodeAt(i+2)];
    encoded4 = lookup[base64.charCodeAt(i+3)];
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

"""
content = content.replace("const bleManager = new BleManager();", deps + "const bleManager = new BleManager();")

# Add state
state_removal = "  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);"
state_addition = """  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [watchData, setWatchData] = useState<WatchPacket | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);"""
content = content.replace(state_removal, state_addition)

# Update connectToDevice function
connect_fn_removal = """  const connectToDevice = async (device: Device) => {
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

connect_fn_addition = """  const connectToDevice = async (device: Device) => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      Alert.alert('Connecting', `Connecting to ${device.name}...`);
      
      const connected = await device.connect();
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(discovered);
      Alert.alert('Connected', `Successfully connected to ${discovered.name}`);
      setDeviceOpen(false);

      // Start monitoring watch data
      discovered.monitorCharacteristicForService(
        '12345678-1234-1234-1234-123456789000',
        '12345678-1234-1234-1234-123456789001',
        (error, char) => {
          if (error) {
            console.log('Monitor error:', error);
            return;
          }
          if (char?.value) {
            const data = parseWatchPacket(char.value);
            if (data) setWatchData(data);
          }
        }
      );

      discovered.onDisconnected((err, dev) => {
        setConnectedDevice(null);
        setWatchData(null);
        Alert.alert("Disconnected", "Device connection lost.");
      });

    } catch (error) {
      console.log(error);
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  const disconnectDevice = async () => {
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      setWatchData(null);
    }
  };"""

content = content.replace(connect_fn_removal, connect_fn_addition)

# Modify render UI to show live watch data
ui_target = """        <Pressable style={styles.deviceCard} onPress={() => setDeviceOpen(true)}>
          <View style={styles.deviceIcon}><MaterialIcons name="add" size={27} color="#3549b7" /></View>
          <View style={styles.insightContent}><Text style={styles.insightTitle}>Add a device</Text><Text style={styles.insightCopy}>Scan for nearby devices via Bluetooth.</Text></View>
          <MaterialIcons name="chevron-right" size={24} color="#3549b7" />
        </Pressable>"""

ui_addition = """        {!connectedDevice ? (
          <Pressable style={styles.deviceCard} onPress={() => setDeviceOpen(true)}>
            <View style={styles.deviceIcon}><MaterialIcons name="add" size={27} color="#3549b7" /></View>
            <View style={styles.insightContent}><Text style={styles.insightTitle}>Add a device</Text><Text style={styles.insightCopy}>Scan for nearby devices via Bluetooth.</Text></View>
            <MaterialIcons name="chevron-right" size={24} color="#3549b7" />
          </Pressable>
        ) : (
          <View style={styles.watchLiveCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>GeneAir Watch Live</Text>
              <Pressable onPress={disconnectDevice}><Text style={styles.link}>Disconnect</Text></Pressable>
            </View>
            
            <View style={styles.watchGrid}>
              <View style={styles.watchMetric}>
                <MaterialIcons name="favorite" size={24} color="#e91e63" />
                <Text style={styles.watchValue}>{watchData?.heartRate.toFixed(1) || '--'} <Text style={styles.watchUnit}>BPM</Text></Text>
                <Text style={styles.watchLabel}>Heart Rate</Text>
              </View>
              <View style={styles.watchMetric}>
                <MaterialIcons name="directions-walk" size={24} color="#4caf50" />
                <Text style={styles.watchValue}>{watchData?.steps || '--'}</Text>
                <Text style={styles.watchLabel}>Steps</Text>
              </View>
              <View style={styles.watchMetric}>
                <MaterialIcons name="thermostat" size={24} color="#ff9800" />
                <Text style={styles.watchValue}>{watchData?.bodyTemp.toFixed(1) || '--'} <Text style={styles.watchUnit}>°C</Text></Text>
                <Text style={styles.watchLabel}>Body Temp</Text>
              </View>
              <View style={styles.watchMetric}>
                <MaterialIcons name="bloodtype" size={24} color="#f44336" />
                <Text style={styles.watchValue}>{watchData?.spo2 || '--'} <Text style={styles.watchUnit}>%</Text></Text>
                <Text style={styles.watchLabel}>SpO2</Text>
              </View>
              <View style={styles.watchMetric}>
                <MaterialIcons name="light-mode" size={24} color="#ffc107" />
                <Text style={styles.watchValue}>{watchData?.lightLux || '--'} <Text style={styles.watchUnit}>lux</Text></Text>
                <Text style={styles.watchLabel}>Ambient</Text>
              </View>
              <View style={styles.watchMetric}>
                <MaterialIcons name="3d-rotation" size={24} color="#9c27b0" />
                <Text style={styles.watchValue}>{watchData?.gyroX.toFixed(0) || '--'} <Text style={styles.watchUnit}>x</Text></Text>
                <Text style={styles.watchLabel}>Gyroscope</Text>
              </View>
            </View>
          </View>
        )}"""

content = content.replace(ui_target, ui_addition)

# Add Styles
style_addition = """
  watchLiveCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#e4e8f2',
    shadowColor: "#182b6b",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  watchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  watchMetric: {
    width: '48%',
    backgroundColor: '#f5f7fc',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  watchValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#172752',
    marginTop: 6,
  },
  watchUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#73809d',
  },
  watchLabel: {
    fontSize: 12,
    color: '#73809d',
    marginTop: 2,
  },"""

content = content.replace('  deviceModal: {', style_addition + '\n  deviceModal: {')


with open("app/(tabs)/index.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("done")
