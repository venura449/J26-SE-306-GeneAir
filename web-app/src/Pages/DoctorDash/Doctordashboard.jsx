import {
  CalendarDays,
  Users,
  ClipboardCheck,
  Sparkles,
  Clock3,
  ChevronRight,
  MoreHorizontal,
  Activity,
  FileText,
  MessageSquareText,
  Plus,
  ArrowUpRight,
  Search,
  Bell,
  LayoutDashboard,
  Wind,
  TriangleAlert,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserRound,
  Camera,
  Save,
  X,
} from "lucide-react";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import logo from "../../assets/logo.png";
import API_URL from "../../config/api";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./Dashboard.css";

const sidebarItems = [
  { id: 1, label: "Dashboard", icon: LayoutDashboard, active: true },
  { id: 2, label: "Patients", icon: Users },
  { id: 3, label: "Risk Monitoring", icon: Wind },
  { id: 4, label: "Alerts", icon: TriangleAlert },
  { id: 5, label: "Reports", icon: BarChart3 },
  { id: 6, label: "Settings", icon: Settings },
  { id: 7, label: "Profile", icon: UserRound },
];

const countryCodes = [
  ["+1", "United States / Canada"],
  ["+44", "United Kingdom"],
  ["+61", "Australia"],
  ["+91", "India"],
  ["+94", "Sri Lanka"],
  ["+27", "South Africa"],
  ["+33", "France"],
  ["+49", "Germany"],
  ["+81", "Japan"],
  ["+86", "China"],
  ["+971", "United Arab Emirates"],
];

const patients = [
  {
    id: 1,
    patient: "Amelia Martin",
    detail: "Moderate persistent asthma",
    checkIn: "Today, 09:00 AM",
    status: "Stable",
    risk: "Low risk",
  },
  {
    id: 2,
    patient: "Daniel Smith",
    detail: "Allergic asthma",
    checkIn: "Today, 10:30 AM",
    status: "Monitoring",
    risk: "Medium risk",
  },
  {
    id: 3,
    patient: "Sophia Wilson",
    detail: "Severe asthma",
    checkIn: "Yesterday, 12:00 PM",
    status: "Needs review",
    risk: "High risk",
  },
  {
    id: 4,
    patient: "James Taylor",
    detail: "Exercise-induced asthma",
    checkIn: "Yesterday, 02:30 PM",
    status: "Stable",
    risk: "Low risk",
  },
];

const activities = [
  {
    id: 1,
    icon: FileText,
    title: "Clinical note generated",
    description: "AI summary created for Amelia Martin",
    time: "4 min ago",
  },
  {
    id: 2,
    icon: Activity,
    title: "Patient record updated",
    description: "Vitals added for Daniel Smith",
    time: "18 min ago",
  },
  {
    id: 3,
    icon: MessageSquareText,
    title: "New patient message",
    description: "Sophia Wilson sent a message",
    time: "35 min ago",
  },
  {
    id: 4,
    icon: Sparkles,
    title: "AI analysis completed",
    description: "Patient history summarized",
    time: "1 hour ago",
  },
];

const chartData = [
  { day: "Mon", patients: 12 },
  { day: "Tue", patients: 17 },
  { day: "Wed", patients: 14 },
  { day: "Thu", patients: 21 },
  { day: "Fri", patients: 18 },
  { day: "Sat", patients: 10 },
  { day: "Sun", patients: 8 },
];

function createCroppedImage(imageSource, pixelCrop, fileType) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const context = canvas.getContext("2d");
      context.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );
      canvas.toBlob((blob) => {
        if (blob)
          resolve(
            new File([blob], "profile-photo.jpg", {
              type: fileType || "image/jpeg",
            }),
          );
        else reject(new Error("Unable to crop this image."));
      }, fileType || "image/jpeg");
    };
    image.onerror = reject;
    image.src = imageSource;
  });
}

function DoctorDashboard() {
  const [profile, setProfile] = useState(() => {
    try {
      return {
        name: "Dr. Anderson",
        email: "",
        countryCode: "+1",
        phone: "",
        specialty: "",
        organization: "",
        bio: "",
        profileImage: "",
        ...JSON.parse(localStorage.getItem("geneair_user") || "{}"),
      };
    } catch {
      return {
        name: "Dr. Anderson",
        email: "",
        countryCode: "+1",
        phone: "",
        specialty: "",
        organization: "",
        bio: "",
        profileImage: "",
      };
    }
  });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const logout = async () => {
    const token = localStorage.getItem("geneair_token");
    if (token)
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    localStorage.removeItem("geneair_token");
    localStorage.removeItem("geneair_user");
    window.location.href = "/";
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const loadProfile = async () => {
    const token = localStorage.getItem("geneair_token");
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Unable to load your profile.");
      const data = await response.json();
      setProfile(data);
      setSavedProfile(data);
      localStorage.setItem("geneair_user", JSON.stringify(data));
    } catch (error) {
      setProfileMessage(error.message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const profileImageUrl = profile.profileImage
    ? `${API_URL.replace(/\/api$/, "")}${profile.profileImage}`
    : "";
  const visibleProfileImage = profileImagePreview || profileImageUrl;
  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
  const updateProfileField = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  const selectProfileImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropSource(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    event.target.value = "";
  };
  const cancelCrop = () => {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource("");
  };
  const applyCrop = async () => {
    try {
      const croppedFile = await createCroppedImage(
        cropSource,
        croppedAreaPixels,
        "image/jpeg",
      );
      setProfileImageFile(croppedFile);
      setProfileImagePreview(URL.createObjectURL(croppedFile));
      cancelCrop();
    } catch (error) {
      setProfileMessage(error.message);
    }
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    ["name", "countryCode", "phone", "specialty", "organization", "bio"].forEach((field) =>
      formData.append(field, profile[field] || ""),
    );
    if (profileImageFile) formData.append("profileImage", profileImageFile);
    setProfileBusy(true);
    setProfileMessage("");
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("geneair_token")}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to save your profile.");
      setProfile(data);
      setSavedProfile(data);
      localStorage.setItem("geneair_user", JSON.stringify(data));
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
      setProfileImagePreview("");
      setProfileImageFile(null);
      setProfileMessage("Profile saved successfully.");
      setIsProfileOpen(false);
    } catch (error) {
      setProfileMessage(error.message);
    } finally {
      setProfileBusy(false);
    }
  };
  const openProfile = () => {
    setProfile(savedProfile);
    setProfileImageFile(null);
    setProfileImagePreview("");
    setProfileMessage("");
    setIsProfileOpen(true);
    loadProfile();
  };
  const cancelProfile = () => {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    if (cropSource) URL.revokeObjectURL(cropSource);
    setProfile(savedProfile);
    setProfileImageFile(null);
    setProfileImagePreview("");
    setCropSource("");
    setProfileMessage("");
    setIsProfileOpen(false);
  };

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="GeneAir logo" className="brand-logo" />
          <div>
            <h2>GeneAir</h2>
            <p>Asthma Management</p>
          </div>
        </div>

        <button
          className="sidebar-toggle"
          type="button"
          aria-label={
            isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${item.active ? "active" : ""}`}
                onClick={() =>
                  item.label === "Profile" && openProfile()
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="topbar-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search patients, alerts, reports..."
            />
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn">
              <Bell size={18} />
              <span className="topbar-dot"></span>
            </button>

            <div className="topbar-profile">
              <button
                className="logout-button"
                onClick={logout}
                title="Sign out"
              >
                <LogOut size={16} /> <span>Logout</span>
              </button>
              <button
                className="topbar-avatar"
                type="button"
                aria-label="Open profile"
                title="Open profile"
                onClick={openProfile}
              >
                {visibleProfileImage ? (
                  <img src={visibleProfileImage} alt="Profile" />
                ) : (
                  initials || "DR"
                )}
              </button>
              <div className="topbar-profile-text">
                <strong>{profile.name}</strong>
                <span>{profile.specialty || "GeneAir clinician"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="doctor-dashboard">
          <motion.div
            className="doctor-dashboard-header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <p className="dashboard-label">DOCTOR WORKSPACE</p>
              <h1>Good morning, {profile.name}</h1>
              <p className="dashboard-description">
                Review asthma status, risk levels, and recent patient updates.
              </p>
            </div>

            <div className="doctor-header-actions">
              <button className="doctor-secondary-button">
                <CalendarDays size={17} />
                View Patient Records
              </button>

              <button className="doctor-primary-button">
                <Plus size={17} />
                Add Patient
              </button>
            </div>
          </motion.div>

          {isProfileOpen && (
            <div
              className="profile-overlay"
              onClick={cancelProfile}
            >
              <section
                className="doctor-card profile-section"
                id="profile-section"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="doctor-card-header">
                  <div>
                    <h2>Your profile</h2>
                    <p>
                      Keep your professional details current for your care team.
                    </p>
                  </div>
                  <button
                    className="profile-close-button"
                    type="button"
                    aria-label="Close profile"
                    title="Close profile"
                    onClick={cancelProfile}
                  >
                    <X size={19} />
                  </button>
                </div>

                <form className="profile-form" onSubmit={saveProfile}>
                  <div className="profile-photo-column">
                    <div className="profile-photo">
                      {visibleProfileImage ? (
                        <img
                          src={visibleProfileImage}
                          alt={`${profile.name} profile`}
                        />
                      ) : (
                        initials || <UserRound size={32} />
                      )}
                    </div>
                    <label className="profile-photo-button">
                      <Camera size={15} />
                      Change photo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={selectProfileImage}
                      />
                    </label>
                    <small>PNG, JPG, WEBP or GIF up to 5 MB</small>
                  </div>

                  <div className="profile-fields">
                    <label>
                      Full name
                      <input
                        value={profile.name}
                        onChange={(event) =>
                          updateProfileField("name", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Email address
                      <input value={profile.email} readOnly />
                    </label>
                    <label className="profile-phone-field">
                      Phone number
                      <span className="phone-input-group">
                        <span className="country-code-picker">
                          <button
                            className="country-select-button"
                            type="button"
                            aria-label="Country calling code"
                            aria-expanded={isCountryMenuOpen}
                            onClick={() => setIsCountryMenuOpen((open) => !open)}
                          >
                            {profile.countryCode || "+1"}
                          </button>
                          {isCountryMenuOpen && (
                            <span className="country-code-menu">
                              {countryCodes.map(([code, country]) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => {
                                    updateProfileField("countryCode", code);
                                    setIsCountryMenuOpen(false);
                                  }}
                                >
                                  <strong>{code}</strong>
                                  <span>{country}</span>
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                        <input
                          value={profile.phone}
                          onChange={(event) =>
                            updateProfileField("phone", event.target.value)
                          }
                          placeholder="555 000 0000"
                        />
                      </span>
                    </label>
                    <label>
                      Specialty
                      <input
                        value={profile.specialty}
                        onChange={(event) =>
                          updateProfileField("specialty", event.target.value)
                        }
                        placeholder="Pulmonologist"
                      />
                    </label>
                    <label className="profile-field-wide">
                      Organization
                      <input
                        value={profile.organization}
                        onChange={(event) =>
                          updateProfileField("organization", event.target.value)
                        }
                        placeholder="GeneAir Care Center"
                      />
                    </label>
                    <label className="profile-field-wide">
                      About you
                      <textarea
                        value={profile.bio}
                        onChange={(event) =>
                          updateProfileField("bio", event.target.value)
                        }
                        rows="3"
                        placeholder="Share a short professional bio."
                      />
                    </label>
                    <div className="profile-actions">
                      <button
                        className="doctor-secondary-button profile-cancel-button"
                        type="button"
                        onClick={cancelProfile}
                      >
                        Cancel
                      </button>
                      <button
                        className="doctor-primary-button profile-save-button"
                        type="submit"
                        disabled={profileBusy}
                      >
                        <Save size={17} />
                        {profileBusy ? "Saving..." : "Save profile"}
                      </button>
                    </div>
                  </div>
                </form>
                {cropSource && (
                  <div className="crop-overlay" onClick={cancelCrop}>
                    <div
                      className="crop-dialog"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="crop-dialog-header">
                        <div>
                          <h3>Crop profile photo</h3>
                          <p>Drag to position your photo inside the square.</p>
                        </div>
                        <button
                          className="profile-close-button"
                          type="button"
                          aria-label="Cancel crop"
                          onClick={cancelCrop}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="crop-area">
                        <Cropper
                          image={cropSource}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          cropShape="rect"
                          showGrid={false}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={(_, pixels) =>
                            setCroppedAreaPixels(pixels)
                          }
                        />
                      </div>
                      <label className="crop-zoom">
                        Zoom
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.1"
                          value={zoom}
                          onChange={(event) =>
                            setZoom(Number(event.target.value))
                          }
                        />
                      </label>
                      <div className="crop-actions">
                        <button
                          className="doctor-secondary-button"
                          type="button"
                          onClick={cancelCrop}
                        >
                          Cancel
                        </button>
                        <button
                          className="doctor-primary-button"
                          type="button"
                          onClick={applyCrop}
                          disabled={!croppedAreaPixels}
                        >
                          Use photo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          <section className="doctor-stat-grid">
            <StatCard
              icon={CalendarDays}
              title="Total Patients"
              value="248"
              change="+8"
              description="in your care"
            />

            <StatCard
              icon={Users}
              title="High-Risk Patients"
              value="18"
              change="3 new"
              description="need close monitoring"
            />

            <StatCard
              icon={ClipboardCheck}
              title="Active Alerts"
              value="7"
              change="3 urgent"
              description="require review"
            />

            <StatCard
              icon={Sparkles}
              title="Records Reviewed"
              value="36"
              change="+12%"
              description="this week"
              ai
            />
          </section>

          <section className="doctor-main-grid">
            <div className="doctor-card appointments-card">
              <div className="doctor-card-header">
                <div>
                  <h2>Patient Overview</h2>
                  <p>Recently updated asthma records</p>
                </div>

                <button className="text-button">
                  View all patients
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="appointment-list">
                {patients.map((patient, index) => (
                  <motion.div
                    className="appointment-row"
                    key={patient.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileHover={{ x: 3 }}
                  >
                    <div className="appointment-time">
                      <Clock3 size={16} />
                      <span>{patient.checkIn}</span>
                    </div>

                    <div className="patient-avatar">
                      {patient.patient
                        .split(" ")
                        .map((name) => name[0])
                        .join("")}
                    </div>

                    <div className="appointment-patient">
                      <strong>{patient.patient}</strong>
                      <span>{patient.detail}</span>
                    </div>

                    <span className="consultation-type">{patient.status}</span>

                    <span
                      className={`appointment-status ${patient.risk === "High risk" ? "waiting" : ""}`}
                    >
                      {patient.risk}
                    </span>

                    <button className="row-action">
                      <ChevronRight size={18} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="doctor-card ai-assistant-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="ai-card-top">
                <div className="ai-icon">
                  <Sparkles size={22} />
                </div>

                <span>GeneAir AI</span>
              </div>

              <h2>Clinical AI Assistant</h2>

              <p>
                Review asthma symptoms, medication adherence, and patient
                history from one place.
              </p>

              <div className="ai-suggestion-list">
                <button>
                  <FileText size={17} />
                  Summarize patient history
                  <ChevronRight size={15} />
                </button>

                <button>
                  <ClipboardCheck size={17} />
                  Review asthma history
                  <ChevronRight size={15} />
                </button>

                <button>
                  <MessageSquareText size={17} />
                  Check medication plan
                  <ChevronRight size={15} />
                </button>
              </div>

              <button className="open-ai-button">
                <Sparkles size={17} />
                Open AI Assistant
                <ArrowUpRight size={16} />
              </button>
            </motion.div>
          </section>

          <section className="doctor-bottom-grid">
            <div className="doctor-card consultations-card">
              <div className="doctor-card-header">
                <div>
                  <h2>Patient Monitoring Activity</h2>
                  <p>Records updated in the last 7 days</p>
                </div>

                <select>
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>3 Months</option>
                </select>
              </div>

              <div className="doctor-chart">
                <ResponsiveContainer width="100%" height={255}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="doctorAreaGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#eef2f7"
                    />

                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />

                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="patients"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#doctorAreaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="doctor-card activity-card">
              <div className="doctor-card-header">
                <div>
                  <h2>Recent Activity</h2>
                  <p>Latest patient updates</p>
                </div>

                <button className="icon-action-button">
                  <MoreHorizontal size={19} />
                </button>
              </div>

              <div className="doctor-activity-list">
                {activities.map((activity, index) => {
                  const Icon = activity.icon;

                  return (
                    <motion.div
                      className="doctor-activity-item"
                      key={activity.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <div className="activity-icon-box">
                        <Icon size={17} />
                      </div>

                      <div>
                        <strong>{activity.title}</strong>
                        <span>{activity.description}</span>
                        <small>{activity.time}</small>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  change,
  description,
  ai = false,
}) {
  return (
    <motion.div
      className={`doctor-stat-card ${ai ? "ai-stat-card" : ""}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <div className="doctor-stat-top">
        <div className="doctor-stat-icon">
          <Icon size={20} />
        </div>

        <span className="doctor-stat-change">{change}</span>
      </div>

      <span className="doctor-stat-title">{title}</span>
      <strong className="doctor-stat-value">{value}</strong>
      <span className="doctor-stat-description">{description}</span>
    </motion.div>
  );
}

export default DoctorDashboard;
