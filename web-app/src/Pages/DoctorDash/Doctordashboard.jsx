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
  Trash2,
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
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
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
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecord, setPatientRecord] = useState(null);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [comparisonMetric, setComparisonMetric] = useState("spo2");


  
  const fetchPatients = async () => {
    const token = localStorage.getItem("geneair_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/patients`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDoctorPatients(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSearchPatients = async (query) => {
    setPatientSearchQuery(query);
    if (!query.trim()) { setPatientSearchResults([]); return; }
    setIsSearching(true);
    const token = localStorage.getItem("geneair_token");
    try {
      const res = await fetch(`${API_URL}/auth/patients/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPatientSearchResults(await res.json());
    } catch (e) { console.error(e); } finally { setIsSearching(false); }
  };

  const addPatient = async (patientId) => {
    const token = localStorage.getItem("geneair_token");
    try {
      const res = await fetch(`${API_URL}/auth/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId })
      });
      if (res.ok) {
        closeAddPatientModal();
        await fetchPatients();
        setSuccessMessage("Patient added successfully");
        setTimeout(() => setSuccessMessage(""), 3500);
      }
    } catch (e) { console.error(e); }
  };

  const removePatient = async (patient) => {
    if (!window.confirm(`Remove ${patient.name || "this patient"} from your patient list?`)) return;
    const token = localStorage.getItem("geneair_token");
    const res = await fetch(`${API_URL}/auth/patients/${patient._id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setDoctorPatients((current) => current.filter((item) => item._id !== patient._id));
      setSuccessMessage("Patient removed successfully");
      setTimeout(() => setSuccessMessage(""), 3500);
    }
  };

  const openPatientRecord = async (patient) => {
    setSelectedPatient(patient);
    setPatientRecord(null);
    setIsRecordLoading(true);
    setHistorySearch("");
    try {
      const token = localStorage.getItem("geneair_token");
      const res = await fetch(`${API_URL}/auth/patients/${patient._id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPatientRecord(await res.json());
    } finally { setIsRecordLoading(false); }
  };

  useEffect(() => {
    if (!selectedPatient) return undefined;
    const refreshPatientRecord = async () => {
      try {
        const token = localStorage.getItem("geneair_token");
        const res = await fetch(`${API_URL}/auth/patients/${selectedPatient._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPatientRecord(await res.json());
      } catch (error) {
        console.error("Unable to refresh patient history:", error);
      }
    };
    const intervalId = window.setInterval(refreshPatientRecord, 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedPatient]);

  useEffect(() => { fetchPatients(); }, []);

  const closeAddPatientModal = () => {
    setIsAddPatientModalOpen(false);
    setPatientSearchQuery("");
    setPatientSearchResults([]);
    setIsSearching(false);
  };

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
  const initials = (profile.name || "Doctor")
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
                className={`sidebar-nav-item ${(item.label === activeSection || (item.label === "Dashboard" && activeSection === "Dashboard")) ? "active" : ""}`}
                onClick={() => {
                  if (item.label === "Profile") openProfile();
                  else if (["Dashboard", "Patients"].includes(item.label)) setActiveSection(item.label);
                }}
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
              <h1>{activeSection === "Patients" ? "Patients" : `Good morning, ${profile.name}`}</h1>
              <p className="dashboard-description">
                {activeSection === "Patients" ? "Manage your patients and review their monitoring history." : "Review asthma status, risk levels, and recent patient updates."}
              </p>
            </div>

            <div className="doctor-header-actions">
              <button className="doctor-secondary-button" type="button" onClick={() => setActiveSection("Patients")}>
                <CalendarDays size={17} />
                View Patient Records
              </button>

              <button className="doctor-primary-button" onClick={() => setIsAddPatientModalOpen(true)}>
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

          {activeSection === "Dashboard" && <section className="doctor-stat-grid">
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
          </section>}

          <section className={`doctor-main-grid ${activeSection === "Patients" ? "patients-tab-layout" : "dashboard-overview-grid"}`}>
            {activeSection === "Patients" && <div className="doctor-card appointments-card patient-list-card">
              <div className="doctor-card-header">
                <div>
                  <h2>Patient Overview</h2>
                  <p>Recently updated asthma records</p>
                </div>

                <button className="text-button" type="button" onClick={() => setActiveSection("Patients")}>
                  View all patients
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="appointment-list">
                {doctorPatients.length === 0 && <p className="add-patient-empty">No patients have been added yet.</p>}
                {doctorPatients.map((patient, index) => (
                  <motion.div
                    className="appointment-row"
                    key={patient._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileHover={{ x: 3 }}
                  >
                    <div className="appointment-time">
                      <Clock3 size={16} />
                      <span>Patient</span>
                    </div>

                      <div className="patient-avatar">
                      {(patient.name || "Patient")
                        .split(" ")
                        .map((name) => name[0])
                        .join("")}
                    </div>

                    <div className="appointment-patient">
                      <strong>{patient.name}</strong>
                      <span>{patient.email}</span>
                    </div>

                    <button className="row-action history-action" type="button" onClick={() => openPatientRecord(patient)}>View history <ChevronRight size={15} /></button>
                    <button className="row-action danger-action" type="button" title="Remove patient" onClick={() => removePatient(patient)}><Trash2 size={16} /><span>Remove</span></button>
                  </motion.div>
                ))}
              </div>
            </div>}

            {activeSection === "Dashboard" && <motion.div
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
            </motion.div>}
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
        {selectedPatient && <div className="history-search-bar"><Search size={17} /><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search readings by time or value..." /><select value={comparisonMetric} onChange={(event) => setComparisonMetric(event.target.value)} aria-label="Compare metric"><option value="spo2">Compare SpO₂</option><option value="bodyTemp">Compare temperature</option><option value="steps">Compare steps</option><option value="lightLux">Compare light</option></select></div>}
        </main>
      </div>

      {isAddPatientModalOpen && (
        <div
          className="profile-overlay add-patient-overlay"
          onClick={closeAddPatientModal}
        >
          <section
            className="doctor-card add-patient-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="doctor-card-header">
              <div>
                <h2>Add patient</h2>
                <p>Search the directory and attach a patient to your care list.</p>
              </div>
              <button
                className="profile-close-button"
                type="button"
                aria-label="Close add patient"
                title="Close"
                onClick={closeAddPatientModal}
              >
                <X size={19} />
              </button>
            </div>

            <div className="add-patient-body">
              <label className="add-patient-label">
                Search by name
                <span className="add-patient-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={patientSearchQuery}
                    onChange={(event) => handleSearchPatients(event.target.value)}
                    autoFocus
                  />
                </span>
              </label>

              <div className="add-patient-results">
                {isSearching && (
                  <p className="add-patient-empty">Searching directory…</p>
                )}

                {!isSearching &&
                  patientSearchResults.map((user) => (
                    <div key={user._id} className="add-patient-row">
                      <div className="add-patient-identity">
                        <div className="patient-avatar">
                          <UserRound size={18} />
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                      <button
                        className="doctor-primary-button"
                        type="button"
                        onClick={() => addPatient(user._id)}
                      >
                        <Plus size={15} />
                        Add
                      </button>
                    </div>
                  ))}

                {!isSearching &&
                  patientSearchQuery &&
                  patientSearchResults.length === 0 && (
                    <p className="add-patient-empty">No matching patients found.</p>
                  )}

                {!isSearching && !patientSearchQuery && (
                  <p className="add-patient-empty">
                    Start typing a name to find patients you can add.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {successMessage && <div className="success-overlay" role="status"><div className="success-message"><div className="success-check">✓</div><h2>{successMessage}</h2><p>Your patient list is up to date.</p></div></div>}
      {selectedPatient && <div className="profile-overlay" onClick={() => setSelectedPatient(null)}><section className="doctor-card patient-record-modal" onClick={(event) => event.stopPropagation()}><div className="doctor-card-header"><div><h2>{selectedPatient.name}'s history</h2><p>{selectedPatient.email}</p></div><button className="profile-close-button" type="button" onClick={() => setSelectedPatient(null)}><X size={19} /></button></div>{isRecordLoading && <p className="add-patient-empty">Loading patient history…</p>}{!isRecordLoading && patientRecord && <div className="patient-record-content"><div className="record-summary"><strong>{patientRecord.history?.length || 0}</strong><span>monitoring entries</span></div>{patientRecord.latest ? <><div className="record-latest"><h3>Latest reading</h3><p>{new Date(patientRecord.latest.createdAt).toLocaleString()}</p></div><div className="vital-card-grid">{[['Heart rate', patientRecord.latest.heartRate, 'BPM', '#2563eb'], ['SpO₂', patientRecord.latest.spo2, '%', '#16a34a'], ['Temperature', patientRecord.latest.bodyTemp, '°C', '#ea580c'], ['Steps', patientRecord.latest.steps, '', '#7c3aed']].map(([label, value, unit, color]) => <div className="vital-card" key={label}><span>{label}</span><strong style={{ color }}>{value ?? '—'} <small>{unit}</small></strong></div>)}</div><div className="history-chart-grid">{[['Heart rate', 'heartRate', '#2563eb'], ['SpO₂', 'spo2', '#16a34a'], ['Temperature', 'bodyTemp', '#ea580c']].map(([title, key, color]) => <div className="history-chart-card" key={key}><h3>{title} trend</h3><ResponsiveContainer width="100%" height={190}><LineChart data={patientRecord.history || []}><CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" /><XAxis dataKey="createdAt" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} /><Line type="monotone" dataKey={key} stroke={color} strokeWidth={3} dot={false} connectNulls /></LineChart></ResponsiveContainer></div>)}</div></> : <p className="add-patient-empty">No monitoring history is available for this patient.</p>}</div>}</section></div>}
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
