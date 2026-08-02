import "./SplashScreen.css";
import orbitLogo from "../assets/logo.png";

export default function SplashScreen() {
    return (
        <div className="splash-screen">
            {/* Starfield background */}
            <div className="stars"></div>
            <div className="stars stars2"></div>

            <div className="scene-wrapper">
                {/* 3D Perspective Container */}
                <div className="scene-3d">
                    <div className="orbit-system">
                        {/* Intersecting 3D Rings with Satellites */}
                        <div className="orbit-ring ring-1">
                            <div className="satellite sat-1"></div>
                        </div>
                        <div className="orbit-ring ring-2">
                            <div className="satellite sat-2"></div>
                        </div>
                        <div className="orbit-ring ring-3">
                            <div className="satellite sat-3"></div>
                        </div>

                        {/* Center Core / Logo */}
                        <div className="planet-core">
                            <div className="planet-glow"></div>
                            <img
                                src={orbitLogo}
                                alt="Orbit Logo"
                                className="orbit-logo"
                            />
                        </div>
                    </div>
                </div>

                <div className="splash-text">
                    <h1>Orbit</h1>
                    <p>Connect • Explore • Grow</p>
                </div>
            </div>

            {/* Native app-style loading bar */}
            <div className="progress-bar-container">
                <div className="progress-bar"></div>
            </div>
        </div>
    );
}