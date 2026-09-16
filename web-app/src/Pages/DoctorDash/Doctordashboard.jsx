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
} from "lucide-react";

import { motion } from "motion/react";
import { useState } from "react";
import logo from "../../assets/logo.png";

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

function DoctorDashboard() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
              <div className="topbar-avatar">DR</div>
              <div className="topbar-profile-text">
                <strong>Dr. Anderson</strong>
                <span>Pulmonologist</span>
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
              <h1>Good morning, Dr. Anderson</h1>
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
