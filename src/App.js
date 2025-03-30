import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // ✅ Import Auth Correctly
import { doc, getDoc } from "firebase/firestore"; // ✅ Import Firestore Correctly
import { db } from "./firebase"; // ✅ Import Firebase DB Correctly
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import SetUsername from "./components/SetUsername";
import AdminPanel from "./components/AdminPanel";

function App() {
  const [user, setUser] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [loading, setLoading] = useState(true);

  const auth = getAuth(); // Initialize auth properly

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed. User:", user ? user.uid : "No user");

      if (user) {
        setUser(user);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const username = userDoc.data().username;
            console.log("User document found. Username:", username);
            setHasUsername(!!username);
          } else {
            console.log("User document does not exist. Creating default entry.");
            setHasUsername(false);
          }
        } catch (error) {
          console.error("Error checking username:", error);
        }
      } else {
        setUser(null);
        setHasUsername(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="text-center flex flex-col items-center">
          <div className="loader mb-4"></div>
          <p className="text-gray-400 font-medium text-lg animate-pulse">
            Loading Page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? (hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />) : <Login />}
        />
        <Route
          path="/login"
          element={user ? (hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />) : <Login />}
        />
        <Route
          path="/signup"
          element={user ? (hasUsername ? <Navigate to="/dashboard" /> : <Navigate to="/set-username" />) : <Signup />}
        />
        <Route
          path="/set-username"
          element={user && !hasUsername ? <SetUsername setHasUsername={setHasUsername} /> : <Navigate to="/dashboard" />}
        />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
