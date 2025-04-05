import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import SetUsername from "./components/SetUsername";
import SetPassword from "./components/SetPassword"; // Import the SetPassword component
import AdminPanel from "./components/AdminPanel";
import SupportPage from "./components/SupportPage";

function App() {
  const [user, setUser] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [hasPassword, setHasPassword] = useState(false); // New state to track password status
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const [transitioning, ] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Show loader during state updates
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : { username: null, hasPassword: false };
  
          console.log("Fetched Firestore user data:", userData); // Debug log
  
          setHasUsername(!!userData?.username);
          setHasPassword(
            userData?.hasPassword === true || userData?.hasPassword === "Email/Password"
              ? "Email/Password"
              : false
          ); // Normalize `hasPassword` to "Email/Password"
        } catch (error) {
          console.error("Error fetching user data:", error);
          setHasUsername(false);
          setHasPassword(false); // Reset states on error
        }
      } else {
        setUser(null);
        setHasUsername(false);
        setHasPassword(false);
      }
      setTimeout(() => setLoading(false), 500); // Delay for smooth UX transitions
    });
  
    return () => unsubscribe(); // Cleanup on unmount
  }, []);
  
  

  // Show a loading screen until the checks are complete
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="loader" style={{ width: "100px", height: "100px" }}></div>
      </div>
    );
  }

  return (
<Router>
  <Routes>
    {/* Redirect based on user, username, and password state */}
    <Route
      path="/"
      element={
        user ? (
          hasUsername ? (
            hasPassword ? <Navigate to="/dashboard" /> : <Navigate to="/set-password" />
          ) : (
            <Navigate to="/set-username" />
          )
        ) : (
          <Login />
        )
      }
    />
    <Route
      path="/login"
      element={
        user ? (
          hasUsername ? (
            hasPassword ? <Navigate to="/dashboard" /> : <Navigate to="/set-password" />
          ) : (
            <Navigate to="/set-username" />
          )
        ) : (
          <Login />
        )
      }
    />
    <Route
      path="/signup"
      element={
        user ? (
          hasUsername ? (
            hasPassword ? <Navigate to="/dashboard" /> : <Navigate to="/set-password" />
          ) : (
            <Navigate to="/set-username" />
          )
        ) : (
          <Signup />
        )
      }
    />
    <Route
      path="/set-username"
      element={
        user && !hasUsername ? (
          <SetUsername setHasUsername={setHasUsername} />
        ) : (
          <Navigate to="/dashboard" />
        )
      }
    />
    <Route
      path="/set-password"
      element={
        transitioning || loading ? (
          <div className="flex justify-center items-center min-h-screen bg-black">
            <div className="loader" style={{ width: "100px", height: "100px" }}></div>
          </div>
        ) : user && hasPassword === "Email/Password" ? (
          <Navigate to="/dashboard" /> // Redirect to dashboard if hasPassword is valid
        ) : user && hasPassword !== "Email/Password" ? (
          <SetPassword setHasPassword={setHasPassword} /> // Render Set Password Page
        ) : (
          <Navigate to="/login" /> // Fallback for missing user
        )
      }
    />
    <Route
      path="/dashboard"
      element={
        user ? (
          hasUsername ? (
            hasPassword ? (
              <Dashboard />
            ) : (
              <Navigate to="/set-password" /> // Adjusted for "false" handling
            )
          ) : (
            <Navigate to="/set-username" />
          )
        ) : (
          <Navigate to="/login" />
        )
      }
    />
    <Route
      path="/admin"
      element={user ? <AdminPanel /> : <Navigate to="/login" />}
    />
    <Route
      path="/support"
      element={user ? <SupportPage /> : <Navigate to="/login" />}
    />
  </Routes>
</Router>

  );
}

export default App;
