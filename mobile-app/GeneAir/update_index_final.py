import re

path = "app/(tabs)/index.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add GeneAir to header and fix wrapping
header_search = """        <View style={styles.dashboardHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
            <Text style={styles.welcome}>Good morning, {displayName || "there"}</Text>
          </View>"""

header_replace = """        <View style={styles.dashboardHeader}>
          <View style={[styles.headerCopy, { flexShrink: 1, marginRight: 10 }]}>
            <Text style={styles.eyebrow}>GENEAIR HEALTH</Text>
            <Text style={[styles.welcome, { fontSize: 22, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>Good morning, {displayName || "there"}</Text>
          </View>"""
content = content.replace(header_search, header_replace)


# 2. Add syncWatchData to imports from api
api_search = """  profileImageUrl,
} from "@/config/api";"""
api_replace = """  profileImageUrl,
  syncWatchData,
} from "@/config/api";"""
if "syncWatchData" not in content:
    content = content.replace(api_search, api_replace)

# 3. Call syncWatchData
sync_search = """              setTempHistory(prev => {
                const newHistory = [...prev, data.bodyTemp];
                if (newHistory.length > 15) newHistory.shift();
                return newHistory;
              });
            }
          }"""
sync_replace = """              setTempHistory(prev => {
                const newHistory = [...prev, data.bodyTemp];
                if (newHistory.length > 15) newHistory.shift();
                return newHistory;
              });
              
              // Send to MongoDB Backend
              syncWatchData(data);
            }
          }"""
if "syncWatchData(data);" not in content:
    content = content.replace(sync_search, sync_replace)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("index.tsx updated")
