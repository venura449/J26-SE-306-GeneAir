import logo from "./assets/logo.png";
import "./LoadingScreen.css";

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="Loading GeneAir">
      <div className="loading-content">
        <div className="loading-logo-wrap">
          <img src={logo} alt="GeneAir logo" className="loading-logo" />
        </div>
        <p className="loading-kicker">GENETIC-ADAPTIVE ASTHMA INTELLIGENCE</p>
        <h1>GeneAir</h1>
        <p className="loading-message">
          Preparing your patient management workspace
        </p>
        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
        <p className="loading-status">Loading patient records...</p>
      </div>
    </main>
  );
}

export default LoadingScreen;
