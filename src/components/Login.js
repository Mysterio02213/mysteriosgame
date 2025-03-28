import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase"; // Firebase Firestore
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if the user has a username
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().username) {
        navigate("/dashboard"); // If username exists, go to dashboard
      } else {
        navigate("/set-username"); // Redirect to set username if missing
      }
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        setError("Account does not exist. Redirecting to Sign Up...");
        setTimeout(() => navigate("/signup"), 2000);
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect credentials. Please try again.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex justify-center items-center min-h-screen bg-black p-4">
  <div
    className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-gray-800 text-white p-8 rounded-lg border border-gray-700"
    style={{
      boxShadow:
        "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
    }}
  >
    <h2
      className="uppercase text-3xl font-bold text-center mb-6"
      style={{ textShadow: "0 3px 6px rgba(255, 255, 255, 0.1)" }}
    >
      Login
    </h2>
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}
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
        className={`w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition ${
          loading ? "opacity-50" : ""
        }`}
        disabled={loading}
      >
        {loading ? "Logging In..." : "Login"}
      </button>
    </form>
    <p className="mt-10 text-gray-400 text-center">
      Don't have an account?{" "}
      <a
        href="/signup"
        className="text-white underline hover:text-gray-300"
      >
        Sign Up
      </a>
    </p>
  </div>
</div>

  );
};

export default Login;
