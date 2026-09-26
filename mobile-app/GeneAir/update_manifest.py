import re

path = "android/app/src/main/AndroidManifest.xml"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

permissions = """  <uses-permission android:name="android.permission.BLUETOOTH"/>
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
"""

if "android.permission.BLUETOOTH" not in content:
    content = content.replace(
        '<uses-permission android:name="android.permission.CAMERA"/>',
        permissions + '  <uses-permission android:name="android.permission.CAMERA"/>'
    )

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("done")
