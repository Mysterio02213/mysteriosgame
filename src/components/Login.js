import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
} from "firebase/auth";
import { auth, db } from "../firebase"; // Firebase setup
import { doc, getDoc, setDoc } from "firebase/firestore"; // Firestore methods
import { useNavigate, useLocation } from "react-router-dom";

const Login = () => {
  // State variables
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1357973536441896960/T0Z4id95nOGJSY03mRFbm_ejZ9c6q_UR1POiSjNN4tqO0Bj_znG-_0eKa7CdT5CelxJ-"; // Replace with your actual Discord webhook URL

const sendDiscordNotification = async (message) => {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    console.log("Notification sent to Discord.");
  } catch (error) {
    console.error("Failed to send notification to Discord:", error);
  }
};


  // Prefill email if passed in query params
  useEffect(() => {
    const prefilledEmail = new URLSearchParams(location.search).get("email");
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [location]);

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTransitioning(true); // Start transition state

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid)); // Fetch Firestore document
        const userData = userDoc.exists() ? userDoc.data() : null;

        console.log("User Data from Firestore:", userData); // Debug log

        // Format current date and time
        const now = new Date();
        const formattedTime = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        const formattedDate = now.toLocaleDateString("en-US");

        // Notify Discord on successful login
        const message = `🔑 **User Login**
━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**: ${user.email}
🔑 **Login Method**: Email/Password

📅 **Date Logged In**: ${formattedDate}
🕒 **Time Logged In**: ${formattedTime}
━━━━━━━━━━━━━━━━━━━━━━━`;
        sendDiscordNotification(message);

        if (!userData?.username) {
            setTimeout(() => {
                setTransitioning(false); // End transition state
                navigate("/set-username");
            }, 500); // Allow time for transition
        } else if (userData?.hasPassword !== "Email/Password" && userData?.hasPassword !== true) {
            setTimeout(() => {
                setTransitioning(false); // End transition state
                navigate("/set-password");
            }, 500); // Allow time for transition
        } else {
            setTimeout(() => {
                setTransitioning(false); // End transition state
                navigate("/dashboard");
            }, 500); // Allow time for transition
        }
    } catch (error) {
        console.error("Login Error:", error);
        setError("Login failed. Please check your credentials.");
        setTransitioning(false);
    } finally {
        setLoading(false);
    }
};


// Google Login
const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError("");
    setLoading(true);

    try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;

        const userDocRef = doc(db, "users", googleUser.uid);
        const userDoc = await getDoc(userDocRef);

        // Format current date and time
        const now = new Date();
        const formattedTime = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
        const formattedDate = now.toLocaleDateString("en-US");

        // Default login message to Discord
        const loginMessage = `🔑 **User Login**
━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**: ${googleUser.email}
🔑 **Login Method**: Google

📅 **Date Logged In**: ${formattedDate}
🕒 **Time Logged In**: ${formattedTime}
━━━━━━━━━━━━━━━━━━━━━━━`;

        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Fetched Firestore Data:", userData);

            // Notify Discord with the default login message
            sendDiscordNotification(loginMessage);

            if (userData.hasPassword === "Email/Password") {
                await setDoc(userDocRef, { hasPassword: false }, { merge: true });
                console.log("Updated Firestore for Google continuation. Redirecting to set password.");
                navigate("/set-password");
            } else {
                console.log("No further steps needed. Redirecting to dashboard.");
                navigate("/dashboard");
            }
        } else {
            // User is new and does not exist in Firestore
            const newUserData = {
                email: googleUser.email,
                createdAt: new Date().toISOString(),
                hasPassword: false, // Default for Google login
            };

            await setDoc(userDocRef, newUserData);
            console.log("Created new Firestore document for Google user.");

            // Notify Discord for new user registration
            const newUserMessage = `🎉 **New Account Created**
━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**: ${googleUser.email}
🔑 **Signup Method**: Google

📅 **Date Created**: ${formattedDate}
🕒 **Time Created**: ${formattedTime}
━━━━━━━━━━━━━━━━━━━━━━━`;
            sendDiscordNotification(newUserMessage);

            // Notify Discord with the default login message for consistency
            sendDiscordNotification(loginMessage);

            console.log("Redirecting new Google user to dashboard.");
            navigate("/dashboard");
        }

        // Ensure loading persists until navigation completes
        setTimeout(() => setLoading(false), 500);
    } catch (error) {
        console.error("Google Login Error:", error);
        setError(error.message || "An error occurred during continuation with Google.");
        setLoading(false); // Reset loading state on error
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
            {/* Email/Password Login Card */}
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-8 rounded-lg border border-gray-700"
              style={{
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
              }}
            >
              <h2 className="uppercase text-3xl font-bold text-center mb-6">Login</h2>
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

            {/* Divider */}
            <div className="my-6 text-center text-gray-400 text-sm uppercase">Or</div>

            {/* Login Methods Card */}
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-6 rounded-lg border border-gray-700"
            >
              <h3 className="text-center text-lg font-bold mb-4">Continue With</h3>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google Logo"
                  className="w-5 h-5 mr-2"
                />
                Google
              </button>
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
    <a
      href="/support"
      className="text-gray-400 hover:text-blue-400 transition duration-200"
    >
      Support
    </a>
  </div>
</footer>

        </>
      )}
    </div>
  );
};

export default Login;
