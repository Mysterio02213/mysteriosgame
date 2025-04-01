import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Filter } from "bad-words";

const SetUsername = ({ setHasUsername }) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateUsername = (username, isAdmin) => {
    if (isAdmin) {
      // If the user is an admin, bypass all restrictions
      return true;
    }

    const regex = /^[a-zA-Z0-9_]{3,15}$/;
    const blacklist = ["admin", "test", "username", "inappropriate", "kuta", "kuti", "bkl", "terimkc", "lora", "muther", "mysterio", "Mysterio"];
    const filter = new Filter();

    const words = username.split(/[\s_]+/); // Split into words
    const hasInvalidWords = words.some(
      (word) => blacklist.includes(word.toLowerCase()) || filter.isProfane(word)
    );

    return regex.test(username) && !hasInvalidWords;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    const isAdmin = user?.email === "admin@mysterio.com"; // Replace with your logic to identify admins

    if (!validateUsername(username, isAdmin)) {
      setError(
        "The username must be 3 to 15 characters long, containing only letters, numbers, or underscores. It must not include blacklisted or inappropriate words."
      );
      return;
    }

    setLoading(true);
    try {
      if (user) {
        const email = user.email; // Get the user's email
        await setDoc(
          doc(db, "users", user.uid),
          { username, email }, // Save both username and email
          { merge: true }
        );
        setHasUsername(true);
        navigate("/dashboard");
      } else {
        setError("User is not authenticated. Please log in again.");
      }
    } catch (err) {
      setError("Failed to set username. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="loader" style={{ width: "100px", height: "100px" }}></div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-black">
      <div className="w-full max-w-sm md:max-w-md lg:max-w-lg bg-gray-800 text-white p-6 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-400">
          Set Your Username
        </h2>
        <p className="text-sm text-gray-400 mb-4 text-center">
          Choose a username that's easy to identify, like your Instagram handle or something professional.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <label className="block text-gray-400">Username</label>
            <input
              type="text"
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          >
            Save Username
          </button>
        </form>
      </div>

         {/* Footer */}
   <footer className="text-center text-gray-500 py-4 mt-8 border-t border-gray-700">
  <p className="text-sm">
    © 2025 Mysterio's Game. All rights reserved.
  </p>
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
    </div>
  );
  
};

export default SetUsername;
