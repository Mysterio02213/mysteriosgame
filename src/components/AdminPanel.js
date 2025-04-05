import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase"; // Import Firebase auth and database instances
import {
  collection,       // To reference Firestore collections
  addDoc,           // To add a new document to a collection
  deleteDoc,        // To delete a specific document
  doc,              // To reference a specific document
  onSnapshot,       // To listen for real-time updates
  updateDoc,        // To update an existing document
  getDocs,          // To retrieve multiple documents from a collection
  getDoc,           // To retrieve a single document
  query,            // To create Firestore queries
  where,            // To add conditions to Firestore queries
  setDoc,           // To set or merge data into a document
  deleteField       // To delete a specific field from a document
} from "firebase/firestore";
import { useNavigate } from "react-router-dom"; // For navigation between pages
import { ToastContainer, toast } from "react-toastify"; // For notifications
import "react-toastify/dist/ReactToastify.css"; // Toastify's CSS for styling


const AdminPanel = () => {
  const [taskHeading, setTaskHeading] = useState("");
  const [taskText, setTaskText] = useState("");
  const [taskCode, setTaskCode] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState({}); // Track confirmation state for each user
  const [requirePicture, setRequirePicture] = useState(false);

  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const tasksSnapshot = await getDocs(collection(db, "tasks"));
      const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasks); // Assuming `setTasks` is your state setter
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  

  // Authentication Check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== "mysterionotmail@gmail.com") {
        toast.error("Access denied. Redirecting to Dashboard...");
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch Tasks in Real-Time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  // Fetch Users in Real-Time
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userCollection = collection(db, "users"); // Assuming "users" is your Firestore collection
        const userSnapshot = await getDocs(userCollection);
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users.");
      }
    };

    fetchUsers();
  }, []);

  // Add New Task
  const handleTaskSubmit = useCallback(async () => {
    // Validation logic adjusted
    if (
      !taskHeading.trim() || 
      !taskText.trim() || 
      (!requirePicture && !taskCode.trim()) || // Only check taskCode when requirePicture is false
      !selectedSeason
    ) {
      toast.warn("All required fields must be filled!");
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, "tasks"), {
        heading: taskHeading.trim(),
        text: taskText.trim(),
        verificationCode: taskCode.trim(), // If requirePicture is true, taskCode will be blank
        season: selectedSeason,
        status: "active", // Change "new" to "active"
        timestamp: new Date(),
        pictureRequired: requirePicture, // Dynamically add this property
      });
      toast.success("Task added successfully!");
      // Reset form state
      setTaskHeading("");
      setTaskText("");
      setTaskCode("");
      setSelectedSeason("");
      setRequirePicture(false); // Reset the "Require Picture" state
    } catch (error) {
      toast.error("Failed to add the task. Please try again.");
      console.error("Error adding task:", error);
    } finally {
      setUploading(false);
    }
  }, [taskHeading, taskText, taskCode, selectedSeason, requirePicture]);

  const handleRejectTask = async (taskId) => {
    try {
      const taskDocRef = doc(db, "tasks", taskId);
      await updateDoc(taskDocRef, {
        status: "active", // Reset status to active
        approvalSentBy: deleteField(), // Remove the sent by field
      });
      toast.warn("Task rejected and reset to active.");
      await fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error("Error rejecting task:", error);
      toast.error("Failed to reject the task. Please try again.");
    }
  };

  const handleApproveTask = async (taskId, approvalSentBy) => {
    try {
      const taskDocRef = doc(db, "tasks", taskId);
      const userQuery = query(
        collection(db, "users"),
        where("username", "==", approvalSentBy)
      );
      const userSnapshot = await getDocs(userQuery);
  
      if (userSnapshot.empty) {
        toast.error("User who sent the task for approval not found.");
        return;
      }
  
      const userDocRef = userSnapshot.docs[0].ref; // Get the user's document reference
      const userDoc = userSnapshot.docs[0].data(); // Get user data
  
      // Increment the `completedTasks` count for the user
      const currentTaskCount = userDoc.completedTasks || 0;
      await updateDoc(userDocRef, {
        completedTasks: currentTaskCount + 1, // Increment completed task count
      });
  
      // Update the task to "completed" and log the "completed by" user
      await updateDoc(taskDocRef, {
        status: "completed",
        completedBy: auth.currentUser.uid, // Admin UID
        completedByUsername: approvalSentBy, // Use the approval sender's username as "completedBy"
        completedAt: new Date().toISOString(), // Timestamp of approval
      });
  
      toast.success("Task approved successfully!");
      await fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error("Error approving task:", error);
      toast.error("Failed to approve the task. Please try again.");
    }
  };
  
  


  // Delete Task
  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast.success("Task deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete the task. Please try again.");
      console.error("Error deleting task:", error);
    }
  }, []);

  // Update Username
  const handleUpdateUsername = async (userId, newUsername) => {
    if (!newUsername.trim()) {
      toast.warn("Username cannot be empty!");
      return;
    }
    try {
      const userDoc = doc(db, "users", userId);
      await updateDoc(userDoc, { username: newUsername.trim() });
      toast.success("Username updated successfully!");
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, username: newUsername.trim() } : user
        )
      );
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username.");
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    try {
      // Delete from Firestore only
      const userDoc = doc(db, "users", userId);
      await deleteDoc(userDoc);

      toast.success("User deleted successfully!");
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <h1
        className="uppercase text-4xl font-extrabold mb-6 text-center"
        style={{ textShadow: "0 3px 6px rgba(255, 255, 255, 0.2)" }}
      >
        Admin Panel
      </h1>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Updated Task Creation Form */}
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

  {/* Enable Picture Feature */}
  <div className="flex items-center mb-6">
    <input
      type="checkbox"
      id="enablePicture"
      className="mr-2"
      checked={requirePicture}
      onChange={(e) => setRequirePicture(e.target.checked)}
    />
    <label htmlFor="enablePicture" className="text-white">
      Require Picture
    </label>
  </div>

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

  {/* Verification Code Field (Hidden when Require Picture is active) */}
  {!requirePicture && (
    <input
      type="text"
      className="w-full p-3 mb-4 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
      placeholder="Verification code..."
      value={taskCode}
      onChange={(e) => setTaskCode(e.target.value)}
    />
  )}

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



      {/* User Management Card */}
      <div
        className="w-full max-w-lg bg-gray-800 p-6 rounded-lg border border-gray-700 mt-6"
        style={{
          boxShadow:
            "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2 className="uppercase text-2xl font-bold mb-6 text-center">
          User Management
        </h2>
        {users.filter((user) => user.email !== "mysterionotmail@gmail.com").length === 0 ? (
          <p className="text-center">No users available.</p>
        ) : (
          users
            .filter((user) => user.email !== "mysterionotmail@gmail.com") // Exclude admin user
            .map((user) => (
              <div
                key={user.id}
                className="p-4 rounded mb-4 bg-gray-700 border border-gray-600"
                style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
              >
                <h3 className="text-xl font-bold text-gray-200">
                  {user.username || "No Username"}
                </h3>
                <p className="text-gray-300">{user.email}</p>
                <div className="flex items-center mt-2">
                  <input
                    type="text"
                    className="flex-1 p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    placeholder="New username..."
                    onChange={(e) =>
                      setUsers((prevUsers) =>
                        prevUsers.map((u) =>
                          u.id === user.id ? { ...u, newUsername: e.target.value } : u
                        )
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      handleUpdateUsername(user.id, user.newUsername || "")
                    }
                    className="ml-2 bg-gray-800 py-1 px-4 rounded text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm"
                    style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
                  >
                    Update
                  </button>
                </div>
                <button
                  onClick={() =>
                    confirmDelete[user.id]
                      ? handleDeleteUser(user.id)
                      : setConfirmDelete((prev) => ({ ...prev, [user.id]: true }))
                  }
                  className="mt-2 py-1 px-4 rounded text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm bg-gray-800"
                  style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
                >
                  {confirmDelete[user.id] ? "Confirm Delete" : "Delete User"}
                </button>
              </div>
            ))
        )}
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
          task.status === "active" ? "" : "opacity-50"
        }`}
        style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
      >
        <h3 className="text-xl font-bold text-gray-200">{task.heading}</h3>
        <p className="text-gray-300">{task.text}</p>

        {/* Show Verification Code ONLY if Picture is NOT Required */}
        {!task.pictureRequired && (
          <p className="text-sm text-gray-400">
            <strong>Verification Code:</strong>{" "}
            {task.verificationCode || "No code provided"}
          </p>
        )}

        <p className="text-sm text-gray-400">
          <strong>Status:</strong>{" "}
          {task.status === "waiting_for_approval"
            ? "Waiting for Approval"
            : task.status === "completed"
            ? "Completed"
            : "Active"}
        </p>
        <p className="text-sm text-gray-400">
          <strong>Picture Required:</strong>{" "}
          {task.pictureRequired ? "Yes" : "No"}
        </p>
        <button
          onClick={() => handleDeleteTask(task.id)}
          className="mt-2 bg-gray-800 py-1 px-4 rounded text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm"
          style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
        >
          Delete Task
        </button>
      </div>
    ))
  )}
</div>

{/* Task Approval */}
<div
  className="w-full max-w-lg bg-gray-800 p-6 rounded-lg border border-gray-700 mt-6"
  style={{
    boxShadow:
      "0 10px 20px rgba(0, 0, 0, 0.7), 0 5px 10px rgba(0, 0, 0, 0.5)",
  }}
>
  <h2 className="uppercase text-2xl font-bold mb-6 text-center">
    Task Approval
  </h2>
  {tasks.filter((task) => task.status === "waiting_for_approval").length ===
  0 ? (
    <p className="text-center text-gray-400">No tasks waiting for approval.</p>
  ) : (
    tasks
      .filter((task) => task.status === "waiting_for_approval")
      .map((task) => (
        <div
          key={task.id}
          className="p-4 rounded mb-4 bg-gray-700 border border-gray-600"
          style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
        >
{/* Sent By Heading */}
<h3 className="text-2xl font-bold text-gray-200 text-center mb-6">
  {task.approvalSentBy || "Unknown User"}
</h3>


          {/* Task Details */}
          <h4 className="text-xl font-bold text-gray-200">{task.heading}</h4>
          <p className="text-gray-300">{task.text}</p>

          <p className="text-sm text-gray-400 mt-2">
            <strong>Picture Required:</strong>{" "}
            {task.pictureRequired ? "Yes" : "No"}
          </p>

          <div className="flex space-x-4 mt-4">
            {/* Reject Button */}
            <button
              onClick={() => handleRejectTask(task.id)}
              className="w-full py-1 px-4 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm"
              style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
            >
              Reject
            </button>

            {/* Approve Button */}
            <button
              onClick={() => handleApproveTask(task.id, task.approvalSentBy)}
              className="w-full py-1 px-4 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition transform duration-200 hover:-translate-y-1 active:translate-y-0 text-sm"
              style={{ boxShadow: "0 5px 10px rgba(0, 0, 0, 0.5)" }}
            >
              Approve
            </button>
          </div>
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
