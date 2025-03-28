import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getDoc, setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { signOut } from "firebase/auth";
import "react-toastify/dist/ReactToastify.css";

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [season, setSeason] = useState("Season 2");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const navigate = useNavigate();

  // Fetch tasks from Firestore (each task is now a global/shared object)
  const fetchTasks = useCallback(async () => {
    try {
      const taskSnapshot = await getDocs(collection(db, "tasks"));
      const taskList = taskSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    } catch (error) {
      toast.error("Error fetching tasks. Please try again.");
      console.error("Error fetching tasks:", error);
    }
  }, []);

  // Listen for auth changes and fetch tasks
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsAdmin(user.email === "admin@mysterio.com");
        await fetchTasks();
        setLoading(false);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [fetchTasks, navigate]);

  // Tasks for the current season
  const filteredTasks = tasks.filter((task) => task.season === season);

  // Only allow clicking if task is not already completed
  const handleTaskClick = useCallback((task) => {
    if (task.completed) return;
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
      // Fetch the username of the current user
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : "Unknown User";
  
      // Update the task as completed—for example, add completed, completedBy, completedByUsername, and timestamp
      const taskDocRef = doc(db, "tasks", selectedTask.id);
      await setDoc(
        taskDocRef,
        {
          completed: true,
          completedBy: auth.currentUser.uid,
          completedByUsername: username, // Add the username here
          completedAt: new Date().toISOString(), // optionally use serverTimestamp() if desired
        },
        { merge: true }
      );
  
      toast.success("Task verified and completed successfully!");
      setSelectedTask(null);
      // Re-fetch tasks to update local state
      await fetchTasks();
    } catch (error) {
      toast.error("Failed to verify the task. Please try again.");
      console.error("Error verifying task:", error);
    }
  } else {
    toast.error("Incorrect code. Please try again.");
  }
  
  }, [selectedTask, verificationCode, season, tasks, fetchTasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="text-center flex flex-col items-center">
          <div className="loader mb-4"></div>
          <p className="text-gray-400 font-medium text-lg animate-pulse">
            Loading Tasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <h1
        className="uppercase text-4xl font-extrabold mb-6 text-center"
        style={{ textShadow: "0 4px 8px rgba(255,255,255,0.2)" }}
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
            className={`py-2 px-4 rounded-lg border border-gray-700 transition transform duration-200 hover:-translate-y-1 ${
              season === seasonName
                ? "bg-gray-700 text-white"
                : "bg-gray-800 text-gray-400"
            }`}
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
          >
            {seasonName}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div
        className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700"
        style={{ boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)" }}
      >
        <h2 className="uppercase text-2xl font-bold mb-6 text-center text-gray-400">
          {season} Tasks
        </h2>
        {season === "Season 1" ? (
          <p className="text-green-500 text-center font-semibold">
            Season Completed
          </p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-center">No tasks available.</p>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className={`p-4 rounded mb-4 bg-gray-700 border border-gray-600 cursor-pointer transition-transform duration-200 ${
                task.completed ? "opacity-50 cursor-default" : ""
              }`}
              style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
            >
              <h3 className="text-xl font-bold text-gray-200">
                {task.heading}
              </h3>
              <p className="text-gray-300">{task.text}</p>
              {task.completed && (
              <span className="text-gray-500 mt-2 inline-block">
             Completed {task.completedByUsername && `by ${task.completedByUsername}`}
             </span>
             )}

            </div>
          ))
        )}
      </div>

      {/* Verification Modal */}
      {selectedTask && (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-lg mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h3 className="text-xl font-bold mb-4">{selectedTask.heading}</h3>
      <p className="text-gray-400 mb-4">Enter the verification code:</p>
      <input
        type="text"
        className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
      />
      <button
        onClick={handleVerifyTask}
        className="w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 mt-2"
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
      >
        Verify
      </button>
      <button
        onClick={() => setSelectedTask(null)}
        className="w-full py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 mt-2"
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
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
            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
          >
            Admin Panel
          </button>
        </div>
      )}

      {/* Logout and Help Buttons */}
      <div className="flex justify-center mt-12 space-x-4">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Logout
        </button>
        <button
          onClick={() => setShowHelpModal(true)}
          className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Help
        </button>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-lg mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
      <p className="text-gray-400 mb-6">
        Are you sure you want to log out? You may lose access to your data if you don’t remember your credentials.
      </p>
      <div className="flex justify-between">
        <button
          onClick={() => {
            signOut(auth);
            navigate("/login");
          }}
          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Logout
        </button>
        <button
          onClick={() => setShowLogoutModal(false)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


      {/* Help Modal */}
      {showHelpModal && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-lg mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h3 className="text-xl font-bold mb-4">Need Help?</h3>
      <p className="text-gray-400 mb-6">
        If you experience any issues or need further assistance, please contact our support team directly via DM on Instagram at:
        <a
          href="https://www.instagram.com/mysterio_notfound"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline ml-2"
        >
          @mysterio_notfound
        </a>
      </p>
      <div className="flex justify-between">
        <button
          onClick={() =>
            window.open("https://www.instagram.com/mysterio_notfound", "_blank")
          }
          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Visit Instagram
        </button>
        <button
          onClick={() => setShowHelpModal(false)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
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
