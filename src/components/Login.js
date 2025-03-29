import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
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
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().username) {
        navigate("/dashboard");
      } else {
        navigate("/set-username");
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
    <div className="flex justify-center items-center min-h-screen bg-black p-4">
      {/* Show Loading Animation Only When Logging In */}
      {loading ? (
        <div className="text-center flex flex-col items-center">
          <div className="loader mb-4 w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium text-lg animate-pulse">
            Logging In...
          </p>
        </div>
      ) : (
        // Show Login Form When Not Loading
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
      )}
    </div>
  );
};

export default Login;
