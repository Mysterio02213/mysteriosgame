import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate("/dashboard");
        } catch (error) {
            if (error.code === "auth/email-already-in-use") {
                setError("This email is already in use. Redirecting to Login...");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setError("Signup failed. Please try again.");
            }
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-black">
            <div className="bg-gray-900 text-white p-8 rounded-lg shadow-lg w-96 border border-gray-700">
                <h2 className="text-3xl font-bold text-center mb-6" style={{ textShadow: "2px 2px 6px rgba(255, 255, 255, 0.3)" }}>
                    Mysterio's Game
                </h2>
                <form onSubmit={handleSignup} className="space-y-4">
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <label className="block text-gray-400">Email</label>
                        <input
                            type="email"
                            className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400">Password</label>
                        <input
                            type="password"
                            className="w-full p-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
                        style={{ boxShadow: "0 2px 6px rgba(255, 255, 255, 0.2)" }}
                    >
                        Sign Up
                    </button>
                </form>
                <p className="mt-4 text-gray-400 text-center">
                    Already have an account?{" "}
                    <a href="/login" className="text-white underline hover:text-gray-300">
                        Login
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Signup;
