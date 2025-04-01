import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase"; // Import Firestore
import { doc, getDoc, setDoc } from "firebase/firestore"; // Firestore methods
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    console.log("Signup initiated");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User created:", user.uid);

      const userDocRef = doc(db, "users", user.uid);

      // Check if the user document exists
      const userDoc = await getDoc(userDocRef);
      console.log("User document exists:", userDoc.exists());

      // If the document doesn't exist, create it with a placeholder for the username
      if (!userDoc.exists()) {
        console.log("Creating new user document with placeholder username...");
        await setDoc(userDocRef, { email: user.email, username: null });
      }

      // Let App.js handle redirection based on global state
      console.log("Signup successful. Relying on App.js for redirection.");
    } catch (error) {
      console.error("Signup error:", error.code, error.message);
      if (error.code === "auth/email-already-in-use") {
        setError("This email is already in use. Redirecting to Login...");
        setTimeout(() => navigate(`/login?email=${encodeURIComponent(email)}`), 2000);
      } else if (error.code === "auth/weak-password") {
        setError("Password must be at least 6 characters long.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {loading ? (
        <div className="flex justify-center items-center flex-grow">
          <div className="loader" style={{ width: "100px", height: "100px" }}></div>
        </div>
      ) : (
        <>
          {/* Top Bar */}
          <div className="flex-shrink-0 fixed inset-x-0 top-0 flex items-center justify-center px-4 py-3 bg-gray-800 bg-opacity-90 z-50">
            <h1 className="text-lg sm:text-xl md:text-3xl text-white font-extrabold tracking-widest uppercase text-center">
              MYSTERIO'S GAME
            </h1>
          </div>

          {/* Main Content */}
          <div className="flex-grow flex flex-col justify-center items-center p-4 mt-16">
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-8 rounded-lg border border-gray-700"
              style={{
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
              }}
            >
              <h2
                className="uppercase text-3xl font-bold text-center mb-6"
                style={{ textShadow: "0 3px 6px rgba(255, 255, 255, 0.1)" }}
              >
                Sign Up
              </h2>
              <form onSubmit={handleSignup} className="space-y-4">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div>
                  <label className="block text-gray-400">Email</label>
                  <input
                    type="email"
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400">Password</label>
                  <input
                    type="password"
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
                  style={{
                    boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  Sign Up
                </button>
              </form>
              <p className="mt-10 text-gray-400 text-center">
                Already have an account?{" "}
                <a href="/login" className="text-white underline hover:text-gray-300">
                  Login
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex-shrink-0 text-center text-gray-500 py-4 border-t border-gray-700">
            <p className="text-sm">© 2025 MYSTERIO'S GAME. All rights reserved.</p>
            <div className="flex justify-center space-x-4 mt-2">
              <a
                href="https://www.instagram.com/mysterio_notfound"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition duration-200"
              >
                Instagram
              </a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default Signup;
