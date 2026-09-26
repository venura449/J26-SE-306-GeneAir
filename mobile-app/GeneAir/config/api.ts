import * as SecureStore from "expo-secure-store";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_URL =
  configuredApiUrl || "http://localhost:4000/api".replace(/\/$/, "");
export const profileImageUrl = (value?: string) => {
  if (!value) return "";
  if (/^(https?:|file:|content:|data:)/i.test(value)) return value;
  return `${API_URL.replace(/\/api$/, "")}${value}`;
};
const tokenKey = "geneair.auth.token";
const localPhotoKey = "geneair.profile.photo";

export type User = {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  specialty: string;
  organization: string;
  bio: string;
  profileImage: string;
  dateOfBirth: string;
  bmi: number;
  static_bmi_range: string;
  static_age_diagnosed_range: string;
  static_max_pef_expected: number;
  static_pack_years: number;
  static_severity: string;
  static_pef_best: number;
};

type AuthResponse = { token: string; user: User };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  const isMultipart =
    typeof options.body === "object" &&
    options.body !== null &&
    "append" in options.body;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: isMultipart
        ? { ...options.headers }
        : { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      `Cannot connect to GeneAir at ${API_URL}. Check that the backend is running.`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Something went wrong.");
  return payload as T;
}

export async function register(name: string, email: string, password: string) {
  const result = await request<AuthResponse>("/mobile/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  await SecureStore.setItemAsync(tokenKey, result.token);
  return result.user;
}

export async function login(email: string, password: string) {
  const result = await request<AuthResponse>("/mobile/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync(tokenKey, result.token);
  return result.user;
}

export async function forgotPassword(email: string) {
  return request<{ message: string }>("/mobile/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function updateProfile(profile: Partial<User>, imageUri?: string) {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (!token) throw new Error("Please sign in again.");
  if (imageUri) await SecureStore.setItemAsync(localPhotoKey, imageUri);
  const localPhoto = await SecureStore.getItemAsync(localPhotoKey);
  const savedProfile = {
    ...profile,
    ...(localPhoto ? { profileImage: localPhoto } : {}),
  };
  const result = await request<User>("/mobile/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(savedProfile),
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ...result, ...(localPhoto ? { profileImage: localPhoto } : {}) };
}

export async function getProfile() {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (!token) return null;
  try {
    const profile = await request<User>("/mobile/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const localPhoto = await SecureStore.getItemAsync(localPhotoKey);
    return localPhoto ? { ...profile, profileImage: localPhoto } : profile;
  } catch (error) {
    await SecureStore.deleteItemAsync(tokenKey);
    throw error;
  }
}

export async function logout() {
  const token = await SecureStore.getItemAsync(tokenKey);
  await SecureStore.deleteItemAsync(tokenKey);
  if (token)
    await request<void>("/mobile/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
}

export async function syncWatchData(data: any) {
  const token = await SecureStore.getItemAsync(tokenKey);
  if (!token) return;
  try {
    await request("/mobile/auth/watch-sync", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    console.log("Watch sync error", e);
  }
}
