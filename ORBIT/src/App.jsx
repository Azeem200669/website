import { useEffect, useState } from "react";
import AppRoutes from "./routes";
import SplashScreen from "./components/SplashScreen";
import { useAuth } from "./contexts/AuthContext"; // <-- Import useAuth

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const { loading: authLoading } = useAuth(); // <-- Get auth loading state

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen UNTIL both the 2.5s timer finishes AND AuthContext verifies the user isn't banned
  if (!splashDone || authLoading) {
    return <SplashScreen />;
  }

  return <AppRoutes />;
}

export default App;