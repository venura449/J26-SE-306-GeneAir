import re

path = "app/(tabs)/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Imports
content = content.replace(
    'import { LineChart } from "react-native-chart-kit";',
    'import { LineChart, ProgressChart, BarChart } from "react-native-chart-kit";'
)

# 2. Update State Variables
state_search = """  const [hrHistory, setHrHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);"""
state_replace = """  const [hrHistory, setHrHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [spo2History, setSpo2History] = useState<number[]>([95, 95, 95, 95, 95, 95]);
  const [tempHistory, setTempHistory] = useState<number[]>([36.5, 36.5, 36.5, 36.5, 36.5, 36.5]);"""
content = content.replace(state_search, state_replace)

# 3. Update Monitor Callback
monitor_search = """          if (char?.value) {
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
monitor_replace = """          if (char?.value) {
            const data = parseWatchPacket(char.value);
            if (data) {
              setWatchData(data);
              setHrHistory(prev => {
                const newHistory = [...prev, data.heartRate];
                if (newHistory.length > 15) newHistory.shift();
                return newHistory;
              });
              setSpo2History(prev => {
                const newHistory = [...prev, data.spo2];
                if (newHistory.length > 15) newHistory.shift();
                return newHistory;
              });
              setTempHistory(prev => {
                const newHistory = [...prev, data.bodyTemp];
                if (newHistory.length > 15) newHistory.shift();
                return newHistory;
              });
            }
          }"""
content = content.replace(monitor_search, monitor_replace)

# 4. Update UI
ui_search = """            <Text style={{ fontSize: 14, fontWeight: '600', color: '#172752', marginBottom: 8 }}>Heart Rate Trend</Text>
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
            </View>"""

ui_replace = """
            {/* Vitals Charts Container */}
            <View style={{ backgroundColor: '#f9fafc', borderRadius: 16, padding: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#172752', marginBottom: 8 }}>Heart Rate (BPM)</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#e91e63' }}>{watchData?.heartRate.toFixed(1) || '--'}</Text>
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
                  backgroundColor: "#f9fafc", backgroundGradientFrom: "#f9fafc", backgroundGradientTo: "#f9fafc",
                  decimalPlaces: 0, color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                  style: { borderRadius: 16 }
                }}
                bezier
                style={{ paddingRight: 0, marginVertical: 4 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#172752', marginBottom: 8 }}>Blood Oxygen (%)</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#2196f3' }}>{watchData?.spo2 || '--'}</Text>
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
                  backgroundColor: "#f9fafc", backgroundGradientFrom: "#f9fafc", backgroundGradientTo: "#f9fafc",
                  decimalPlaces: 1, color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                  style: { borderRadius: 16 }
                }}
                bezier
                style={{ paddingRight: 0, marginVertical: 4 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#172752', marginBottom: 8 }}>Body Temp (°C)</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#ff9800' }}>{watchData?.bodyTemp.toFixed(1) || '--'}</Text>
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
                  backgroundColor: "#f9fafc", backgroundGradientFrom: "#f9fafc", backgroundGradientTo: "#f9fafc",
                  decimalPlaces: 1, color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                  style: { borderRadius: 16 }
                }}
                bezier
                style={{ paddingRight: 0, marginVertical: 4 }}
              />
            </View>

            {/* Activity & Environment Grid */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              
              <View style={[styles.watchMetric, { flex: 1, padding: 8 }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#172752', marginBottom: 4 }}>Daily Steps</Text>
                <ProgressChart
                  data={{ labels: ["Steps"], data: [Math.min((watchData?.steps || 0) / 10000, 1)] }}
                  width={Dimensions.get("window").width / 2 - 50}
                  height={80}
                  strokeWidth={10}
                  radius={30}
                  chartConfig={{
                    backgroundColor: "#f5f7fc", backgroundGradientFrom: "#f5f7fc", backgroundGradientTo: "#f5f7fc",
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                  }}
                  hideLegend={true}
                />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#4caf50' }}>{watchData?.steps || 0}</Text>
                <Text style={{ fontSize: 10, color: '#73809d' }}>/ 10,000</Text>
              </View>

              <View style={[styles.watchMetric, { flex: 1, padding: 8 }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#172752', marginBottom: 4 }}>Motion & Light</Text>
                <BarChart
                  data={{
                    labels: ["X", "Y", "Z"],
                    datasets: [{ data: [watchData?.gyroX || 0, watchData?.gyroY || 0, watchData?.gyroZ || 0] }]
                  }}
                  width={Dimensions.get("window").width / 2 - 50}
                  height={80}
                  yAxisLabel=""
                  yAxisSuffix=""
                  withHorizontalLabels={false}
                  withInnerLines={false}
                  showBarTops={false}
                  chartConfig={{
                    backgroundColor: "#f5f7fc", backgroundGradientFrom: "#f5f7fc", backgroundGradientTo: "#f5f7fc",
                    color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(115, 128, 157, ${opacity})`,
                    barPercentage: 0.6,
                  }}
                  style={{ paddingRight: 0 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                   <MaterialIcons name="light-mode" size={14} color="#ffc107" />
                   <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffc107' }}>{watchData?.lightLux || 0} lx</Text>
                </View>
              </View>

            </View>"""
content = content.replace(ui_search, ui_replace)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("done")
