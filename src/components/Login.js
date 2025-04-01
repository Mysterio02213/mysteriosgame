import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract email from URL query if present (redirected from signup)
    const params = new URLSearchParams(location.search);
    const prefilledEmail = params.get("email");
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch the user's document to check if a username exists
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().username) {
        // Username exists, rely on App.js to handle redirection
        console.log("User has a username. Login successful.");
      } else {
        console.log("User does not have a username. Redirecting to set username.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      switch (error.code) {
        case "auth/user-not-found":
          setError("Account does not exist. Redirecting to Sign Up...");
          setTimeout(() => navigate("/signup"), 2000);
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        default:
          setError("Login failed. Please check your credentials.");
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
                Login
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
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
                  Login
                </button>
              </form>
              <p className="mt-10 text-gray-400 text-center">
                Don't have an account?{" "}
                <a href="/signup" className="text-white underline hover:text-gray-300">
                  Sign Up
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex-shrink-0 text-center text-gray-500 py-4 border-t border-gray-700">
            <p className="text-sm">© 2025 Mysterio's Game. All rights reserved.</p>
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

export default Login;
