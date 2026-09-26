import re

api_path = "config/api.ts"
with open(api_path, "r", encoding="utf-8") as f:
    api_content = f.read()

if "syncWatchData" not in api_content:
    addition = """
export async function syncWatchData(data: any) {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (!token) return;
  try {
    await request("/mobile/auth/watch-sync", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    console.log("Watch sync error", e);
  }
}
"""
    api_content = api_content + addition
    with open(api_path, "w", encoding="utf-8") as f:
        f.write(api_content)
    
print("api.ts updated")
