import { Lottie } from "lottie-react";
import loadingAnimation from "./assets/loading.json";
import "./LoadingScreen.css";

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="Loading GeneAir">
      <div className="loading-content">
        <Lottie
          src={loadingAnimation}
          className="loading-animation"
          aria-hidden="true"
          loop
          autoplay
        />
      </div>
    </main>
  );
}

export default LoadingScreen;
