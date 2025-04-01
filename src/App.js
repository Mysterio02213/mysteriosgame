import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import SetUsername from "./components/SetUsername";
import AdminPanel from "./components/AdminPanel";

function App() {
  const [user, setUser] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Start loading when auth state changes
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setHasUsername(userDoc.exists() && !!userDoc.data().username);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setHasUsername(false);
        }
      } else {
        setUser(null);
        setHasUsername(false);
      }
      setLoading(false); // Stop loading after checks are complete
    });

    return () => unsubscribe();
  }, []);

  // Show a loading screen until the user and username checks are complete
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
        {/* Redirect based on user and username state */}
        <Route
          path="/"
          element={
            user ? (
              hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/signup"
          element={
            user ? (
              hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />
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
          path="/dashboard"
          element={
            user ? (
              hasUsername ? <Dashboard /> : <Navigate to="/set-username" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={user ? <AdminPanel /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
