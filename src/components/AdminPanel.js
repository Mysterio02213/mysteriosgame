import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminPanel = () => {
  const [taskHeading, setTaskHeading] = useState("");
  const [taskText, setTaskText] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  // Authentication Check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== "admin@mysterio.com") {
        toast.error("Access denied. Redirecting to Dashboard...");
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch Tasks
  useEffect(() => {
    const fetchTasks = async () => {
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
    };

    fetchTasks();
  }, []);

  // Add New Task
  const handleTaskSubmit = useCallback(async () => {
    if (!taskHeading || !taskText || !taskCode || !selectedSeason) {
      toast.warn("All fields are required!");
      return;
    }
    setUploading(true);
    try {
      await addDoc(collection(db, "tasks"), {
        heading: taskHeading.trim(),
        text: taskText.trim(),
        verificationCode: taskCode.trim(),
        season: selectedSeason,
        status: "new",
        timestamp: new Date(),
      });
      toast.success("Task added successfully!");
      setTaskHeading("");
      setTaskText("");
      setTaskCode("");
      setSelectedSeason("");
    } catch (error) {
      toast.error("Failed to add the task. Please try again.");
      console.error("Error adding task:", error);
    } finally {
      setUploading(false);
    }
  }, [taskHeading, taskText, taskCode, selectedSeason]);

  // Delete Task
  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      toast.success("Task deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete the task. Please try again.");
      console.error("Error deleting task:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <h1
        className="uppercase text-4xl font-extrabold mb-6 text-center"
        style={{ textShadow: "0 3px 6px rgba(255, 255, 255, 0.2)" }}
      >
        Admin Panel
      </h1>

      <ToastContainer position="top-right" autoClose={3000} />

      {/* Task Creation Form */}
      <div
        className="w-full max-w-lg bg-gray-800 p-6 rounded-lg border border-gray-700"
        style={{
          boxShadow:
            "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2 className="uppercase text-2xl font-bold mb-6 text-center">
          Create New Task
        </h2>
        <input
          type="text"
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
          placeholder="Task heading..."
          value={taskHeading}
          onChange={(e) => setTaskHeading(e.target.value)}
        />
        <textarea
          rows="4"
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
          placeholder="Task description..."
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
        />
        <input
          type="text"
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
          placeholder="Verification code..."
          value={taskCode}
          onChange={(e) => setTaskCode(e.target.value)}
        />
        <select
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
        >
          <option value="" disabled>
            Select Season
          </option>
          <option value="Season 1">Season 1</option>
          <option value="Season 2">Season 2</option>
        </select>
        <button
          onClick={handleTaskSubmit}
          disabled={uploading}
          className={`w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
            uploading && "cursor-not-allowed"
          }`}
          style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
        >
          {uploading ? "Uploading..." : "Add Task"}
        </button>
      </div>

      {/* Task History */}
      <div
        className="w-full max-w-lg bg-gray-800 p-6 rounded-lg border border-gray-700 mt-6"
        style={{
          boxShadow:
            "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2 className="uppercase text-2xl font-bold mb-6 text-center">
          Task History
        </h2>
        {tasks.length === 0 ? (
          <p className="text-center">No tasks available.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded mb-4 bg-gray-700 border border-gray-600 ${
                task.status === "new" ? "" : "opacity-50"
              }`}
              style={{
                boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)",
              }}
            >
              <h3 className="text-xl font-bold text-gray-200">
                {task.heading}
              </h3>
              <p className="text-gray-300">{task.text}</p>
              <p className="text-sm text-gray-400">
                Status: {task.status === "new" ? "Active" : "Completed"}
              </p>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="mt-2 bg-gray-800 py-1 px-4 rounded text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm"
                style={{
                  boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)",
                }}
              >
                Delete Task
              </button>
            </div>
          ))
        )}
      </div>

      {/* Back to Dashboard Button */}
      <div className="text-center mt-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
