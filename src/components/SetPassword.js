import React, { useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Firebase setup
import { useNavigate } from "react-router-dom";

const SetPassword = ({ setHasPassword }) => {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    // Validate the password
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true); // Start loading
    try {
      const user = auth.currentUser;
      if (user) {
        // Update password in Firebase Authentication
        await updatePassword(user, newPassword);

        // Update Firestore `hasPassword` field to `true`
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { hasPassword: true });

        setSuccess("Password set successfully! Redirecting...");
        setHasPassword(true); // Update app state
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        throw new Error("No authenticated user found.");
      }
    } catch (error) {
      console.error("Error setting password:", error);
      setError("Failed to set password. Please try again.");
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
          {/* Main Content */}
          <div className="flex-grow flex justify-center items-center p-4">
            <div className="w-full max-w-sm md:max-w-md lg:max-w-lg bg-gray-800 text-white p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-400">
                Set Your Password
              </h2>
              <p className="text-sm text-gray-400 mb-4 text-center">
              Enter this password on the login page to log in.
              </p>
              <form onSubmit={handleSetPassword} className="space-y-4">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {success && <p className="text-green-500 text-sm text-center">{success}</p>}
                <div>
                  <label className="block text-gray-400">Password</label>
                  <input
                    type="password"
                    className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
                >
                  Save Password
                </button>
              </form>
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

export default SetPassword;
