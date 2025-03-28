import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import SetUsername from "./components/SetUsername";
import AdminPanel from "./components/AdminPanel";

function App() {
  const [hasUsername, setHasUsername] = useState(null); // null = loading, true/false when determined
  const [userLoaded, setUserLoaded] = useState(false); // Tracks loading of authentication state

  useEffect(() => {
    const checkUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setHasUsername(userDoc.exists() && userDoc.data().username);
      } else {
        setHasUsername(false);
      }
      setUserLoaded(true);
    };

    auth.onAuthStateChanged((user) => {
      if (user) {
        checkUsername();
      } else {
        setUserLoaded(true);
      }
    });
  }, []);

  if (!userLoaded) {
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
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/set-username"
          element={
            hasUsername ? <Navigate to="/dashboard" /> : <SetUsername setHasUsername={setHasUsername} />
          }
        />
        <Route
          path="/dashboard"
          element={hasUsername ? <Dashboard /> : <Navigate to="/set-username" />}
        />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
