import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const Dashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [userTasks, setUserTasks] = useState([]);
    const [season, setSeason] = useState("Season 2");
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const fetchUserTasks = useCallback(async () => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            setUserTasks(userDoc.data().completedTasks || []);
        } else {
            await setDoc(userDocRef, { completedTasks: [] });
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setIsAdmin(user.email === "admin@mysterio.com");
                try {
                    const taskSnapshot = await getDocs(collection(db, "tasks"));
                    const taskList = taskSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setTasks(taskList);

                    await fetchUserTasks();
                } catch (error) {
                    toast.error("Error fetching tasks. Please try again.");
                    console.error("Error fetching tasks:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                navigate("/login");
            }
        });

        return () => unsubscribe();
    }, [fetchUserTasks, navigate]);

    const filteredTasks = tasks.filter((task) => task.season === season);

    const handleTaskClick = useCallback((task) => {
        setSelectedTask(task);
        setVerificationCode("");
    }, []);

    const handleVerifyTask = useCallback(async () => {
        if (!selectedTask || !verificationCode.trim()) {
            toast.warn("Please enter the verification code.");
            return;
        }

        const isCodeCorrect =
            verificationCode.trim().toLowerCase() ===
            selectedTask.verificationCode.trim().toLowerCase();

        if (isCodeCorrect) {
            try {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                const updatedTasks = [...userTasks, selectedTask.id];
                await setDoc(userDocRef, { completedTasks: updatedTasks }, { merge: true });

                setUserTasks(updatedTasks);
                toast.success("Task verified and completed successfully!");
                setSelectedTask(null);
            } catch (error) {
                toast.error("Failed to verify the task. Please try again.");
                console.error("Error verifying task:", error);
            }
        } else {
            toast.error("Incorrect code. Please try again.");
        }
    }, [selectedTask, verificationCode, userTasks]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-black text-white">
                <div className="text-center flex flex-col items-center">
                    <div className="loader mb-4"></div>
                    <p className="text-gray-400 font-medium text-lg animate-pulse">Loading Tasks...</p>
                </div>
            </div>
        );
    }
    
    

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <h1
                className="text-4xl font-extrabold mb-6 text-center text-gray-200"
                style={{ textShadow: "2px 2px 8px rgba(255, 255, 255, 0.2)" }}
            >
                Dashboard
            </h1>

            <ToastContainer position="top-right" autoClose={3000} />

            {/* Season Tabs */}
            <div className="flex justify-center space-x-4 mb-6">
                {["Season 1", "Season 2"].map((seasonName) => (
                    <button
                        key={seasonName}
                        onClick={() => setSeason(seasonName)}
                        className={`py-2 px-4 rounded-lg ${
                            season === seasonName
                                ? "bg-gray-700 text-white"
                                : "bg-gray-800 text-gray-400"
                        }`}
                    >
                        {seasonName}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-400">
                    {season} Tasks
                </h2>
                {season === "Season 1" ? (
                    <p className="text-green-500 text-center font-semibold">Season Completed</p>
                ) : filteredTasks.length === 0 ? (
                    <p className="text-gray-500 text-center">No tasks available.</p>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            className={`p-4 border border-gray-700 rounded mb-4 bg-gray-700 ${
                                userTasks.includes(task.id) ? "opacity-50" : ""
                            }`}
                            onClick={() => handleTaskClick(task)}
                        >
                            <h3 className="text-xl font-bold text-gray-200">{task.heading}</h3>
                            <p className="text-gray-300">{task.text}</p>
                            {userTasks.includes(task.id) && (
                                <span className="text-gray-500 mt-2 inline-block">
                                    Completed
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Verification Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4">{selectedTask.heading}</h3>
                        <p className="text-gray-400 mb-4">Enter the verification code:</p>
                        <input
                            type="text"
                            className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                        />
                        <button
                            onClick={handleVerifyTask}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                        >
                            Verify
                        </button>
                        <button
                            onClick={() => setSelectedTask(null)}
                            className="mt-2 w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Admin Panel Button */}
            {isAdmin && (
                <div className="text-center mt-8">
                    <button
                        onClick={() => navigate("/admin")}
                        className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                        Admin Panel
                    </button>
                </div>
            )}

            {/* Logout Button */}
            <div className="text-center mt-12">
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                    Logout
                </button>
            </div>

            {/* Custom Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center">
                    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                        <h3 className="text-xl font-bold mb-4 text-gray-200">Confirm Logout</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to log out? You may lose access to your data if
                            you don't remember your email or password.
                        </p>
                        <div className="flex justify-between">
                            <button
                                onClick={() => {
                                    signOut(auth);
                                    navigate("/login");
                                }}
                                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
                            >
                                Logout
                            </button>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
