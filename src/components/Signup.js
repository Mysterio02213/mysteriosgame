import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const [formData, setFormData] = useState({ email: "", password: "" }); // Combine email and password states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1357973536441896960/T0Z4id95nOGJSY03mRFbm_ejZ9c6q_UR1POiSjNN4tqO0Bj_znG-_0eKa7CdT5CelxJ-"; // Replace with your actual webhook URL

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


  // Helper function to update form data state
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle email/password signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
  
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { email: user.email, username: null, hasPassword: "Email/Password" });

      // Format current date and time
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const formattedDate = now.toLocaleDateString("en-US");

      // Send notification to Discord
      const message = `🎉 **New Account Created**
━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**: ${user.email}
🔑 **Signup Method**: Email/Password

📅 **Date Created**: ${formattedDate}
🕒 **Time Created**: ${formattedTime}
━━━━━━━━━━━━━━━━━━━━━━━`;
      sendDiscordNotification(message);

      // Fetch Firestore fields after signup
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : { username: null, hasPassword: "Email/Password" };

      if (!userData?.username) {
        setTimeout(() => navigate("/set-username"), 500); // Smooth transition
      } else if (userData?.hasPassword === false) {
        setTimeout(() => navigate("/set-password"), 500); // Smooth transition
      } else {
        setTimeout(() => navigate("/dashboard"), 500); // Smooth transition
      }
    } catch (error) {
      console.error("Signup error:", error.code, error.message);
      setError(getSignupErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
};

const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    setError("");
    setLoading(true);
  
    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const userDocRef = doc(db, "users", googleUser.uid);
  
      const signInMethods = await fetchSignInMethodsForEmail(auth, googleUser.email);

      // Format current date and time
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const formattedDate = now.toLocaleDateString("en-US");

      if (signInMethods.includes("password")) {
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        if (userData?.hasPassword !== false) {
          await setDoc(userDocRef, { hasPassword: false }, { merge: true });
          console.log("Updated Firestore to require re-setting password for Google login.");
        }
        setTimeout(() => navigate("/set-password"), 500); // Redirect after validation
      } else {
        await setDoc(userDocRef, { email: googleUser.email, username: null, hasPassword: false });

        // Send notification to Discord
        const message = `🎉 **New Account Created**
━━━━━━━━━━━━━━━━━━━━━━━
📧 **Email**: ${googleUser.email}
🔑 **Signup Method**: Google

📅 **Date Created**: ${formattedDate}
🕒 **Time Created**: ${formattedTime}
━━━━━━━━━━━━━━━━━━━━━━━`;
        sendDiscordNotification(message);

        setTimeout(() => navigate("/dashboard"), 500); // Redirect for new users
      }
    } catch (error) {
      console.error("Google signup error:", error.code, error.message);
      setError("Google signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
};

  
  // Error handling for email/password signup
  const getSignupErrorMessage = (code) => {
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already in use. Redirecting to Login...";
      case "auth/weak-password":
        return "Password must be at least 6 characters long.";
      default:
        return "Signup failed. Please try again.";
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
            {/* Email/Password Sign Up Card */}
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-8 rounded-lg border border-gray-700"
              style={{ boxShadow: "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)" }}
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
                    name="email"
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
                  style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
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

            {/* Divider */}
            <div className="my-6 text-center text-gray-400 text-sm uppercase">Or</div>

            {/* Sign Up Methods Card */}
            <div
              className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-6 rounded-lg border border-gray-700"
              style={{ boxShadow: "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)" }}
            >
              <h3 className="text-center text-lg font-bold mb-4">Continue With</h3>
              <button
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200"
                style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
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

export default Signup;
