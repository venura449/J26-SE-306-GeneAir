import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DoctorDashboard from "./Pages/DoctorDash/Doctordashboard";
import API_URL from "./config/api";

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const endpoint = mode === "forgot" ? "forgot-password" : mode;
    const body =
      mode === "register"
        ? form
        : {
            email: form.email,
            ...(mode === "login" ? { password: form.password } : {}),
          };
    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (data.token) localStorage.setItem("geneair_token", data.token);
      if (data.user)
        localStorage.setItem("geneair_user", JSON.stringify(data.user));
      setMessage(
        mode === "forgot"
          ? data.message
          : "You’re all set. Welcome to GeneAir.",
      );
      if (mode !== "forgot") window.location.href = "/doctor-dashboard";
    } catch (error) {
      setMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "login"
      ? "Welcome back"
      : mode === "register"
        ? "Create your account"
        : "Reset your password";
  const signInWithGoogle = () =>
    setMessage(
      "Google sign-in needs a Google OAuth client ID and callback URL configured first.",
    );
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <p className="brand-name">GeneAir</p>
        <h1>
          Care that moves
          <br />
          <em>with you.</em>
        </h1>
        <p className="brand-copy">
          A simpler way to connect with better healthcare.
        </p>
      </section>
      <section className="auth-card">
        <div className="auth-card-head">
          <p className="eyebrow">GENEAIR HEALTH</p>
          <h2>{title}</h2>
          <p>
            {mode === "login"
              ? "Sign in to continue to your care dashboard."
              : mode === "register"
                ? "Join GeneAir and take control of your health."
                : "Enter your email and we’ll help you get back in."}
          </p>
        </div>
        {mode !== "forgot" && (
          <>
            <button
              type="button"
              className="google-button"
              onClick={signInWithGoogle}
            >
              <span className="google-mark">G</span>Continue with Google
            </button>
            <div className="auth-divider">
              <span>or continue with email</span>
            </div>
          </>
        )}
        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Jane Doe"
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="you@example.com"
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="link-button"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          )}
          <button className="auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <p className="auth-switch">
          {mode === "forgot"
            ? "Remember your password?"
            : mode === "login"
              ? "New to GeneAir?"
              : "Already have an account?"}{" "}
          <button
            className="link-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<AuthPage />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
