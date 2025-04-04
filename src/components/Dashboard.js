import React, { useEffect, useState, useCallback } from "react";
import { collection, getDocs, getDoc, setDoc, doc, updateDoc } from "firebase/firestore"; // Added updateDoc
import { auth, db } from "../firebase"; // Added storage
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
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [verifyDisabled, setVerifyDisabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("Verify"); // Default button text
const [dmSent, setDmSent] = useState(false); // For enabling/disabling the Confirm button
const [showConfirmation, setShowConfirmation] = useState(false); // For showing/hiding the confirmation modal
const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1357973536441896960/T0Z4id95nOGJSY03mRFbm_ejZ9c6q_UR1POiSjNN4tqO0Bj_znG-_0eKa7CdT5CelxJ-"; // Replace with your actual webhook URL


const sendDiscordNotification = async (message) => {
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }), // Message content for Discord
    });
    console.log("Notification sent to Discord.");
  } catch (error) {
    console.error("Failed to send notification to Discord:", error);
  }
};

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

  // Fetch Leaderboard Data
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const adminUsernames = ["Mysterio", "TestAdmin"]; // List of admin usernames
  
        const userSnapshot = await getDocs(collection(db, "users"));
        const leaderboard = userSnapshot.docs
          .map((doc) => ({
            username: doc.data().username || "Unknown User",
            completedTasks: doc.data().completedTasks || 0,
          }))
          .filter((user) => !adminUsernames.includes(user.username)) // Exclude admins dynamically
          .sort((a, b) => b.completedTasks - a.completedTasks); // Sort by completedTasks (descending order)
  
        setLeaderboardData(leaderboard);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
      }
    };
  
    fetchLeaderboardData();
  }, []);
  

  // Listen for auth changes and fetch tasks
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsAdmin(user.email === "mysterionotmail@gmail.com");
        await fetchTasks();
        setLoading(false);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [fetchTasks, navigate]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!auth.currentUser) {
        console.error("No authenticated user found.");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const fetchedUsername = userDoc.exists() ? userDoc.data().username : "Unknown User";
        setUsername(fetchedUsername);
        console.log("Fetched username:", fetchedUsername); // Debug log
      } catch (error) {
        console.error("Failed to fetch username:", error);
      }
    };
    
    fetchUsername();
  }, []);

  useEffect(() => {
    const checkUsername = async () => {
      if (!auth.currentUser) {
        console.error("No authenticated user found.");
        navigate("/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const fetchedUsername = userDoc.exists() ? userDoc.data().username : null;
  
        if (!fetchedUsername) {
          navigate("/set-username"); // Redirect to SetUsername page if username is missing
        } else {
          setUsername(fetchedUsername);
        }
      } catch (error) {
        console.error("Failed to fetch username:", error);
      }
    };
  
    checkUsername();
  }, [navigate]);
  

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
  
    if (!isCodeCorrect) {
      toast.error("Incorrect code. Please try again.");
      return;
    }
  
    if (selectedTask.pictureRequired && !selectedTask.pictureURL) {
      toast.error("This task requires a picture to be uploaded before submission.");
      return;
    }
  
    try {
      setVerifyDisabled(true); // Disable the button immediately
      setVerifyStatus("Verifying..."); // Update button text to "Verifying..."
  
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const currentTaskCount = userDoc.exists()
        ? userDoc.data().completedTasks || 0
        : 0;
  
      // Update user task count
      await setDoc(
        userDocRef,
        { completedTasks: currentTaskCount + 1 },
        { merge: true }
      );
  
      // Update task status to "completed"
      const taskDocRef = doc(db, "tasks", selectedTask.id);
      await setDoc(
        taskDocRef,
        {
          status: "completed",
          completedBy: auth.currentUser.uid,
          completedByUsername: userDoc.data().username || "Unknown User",
          completedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  
      // Notify Discord about task completion
      const message = `✅ **Task Completed**\nTask Name: **${selectedTask.heading}**\nCompleted By: **${userDoc.data().username || "Unknown User"}**`;
      sendDiscordNotification(message);
  
      setVerifyStatus("Verified!");
      toast.success("Task Verified! Closing Now...");
      setTimeout(() => {
        setSelectedTask(null); // Close the modal
        setVerifyStatus("Verify"); // Reset button text
      }, 1000); // 1-second delay before closing
      await fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error("Error verifying task:", error);
      toast.error("Failed to verify the task. Please try again.");
      setVerifyStatus("Verify"); // Reset button text on error
      setVerifyDisabled(false); // Re-enable button if an error occurs
    } finally {
      setVerifyDisabled(false); // Re-enable button after the process completes
    }
  }, [selectedTask, verificationCode, fetchTasks]);  
  

  const handlePictureConfirmation = useCallback(async (taskId) => {
    try {
      const taskDocRef = doc(db, "tasks", taskId);
      const taskDoc = await getDoc(taskDocRef);
  
      if (!taskDoc.exists()) {
        toast.error("Task not found.");
        return;
      }
  
      const taskData = taskDoc.data(); // Retrieve task data, including heading
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
  
      const username = userDoc.exists()
        ? userDoc.data().username || "Unknown User"
        : "Unknown User";
  
      // Update the task in Firestore
      await updateDoc(taskDocRef, {
        status: "waiting_for_approval",
        confirmationReceived: true,
        confirmedAt: new Date().toISOString(),
        approvalSentBy: username,
      });
  
      // Notify Discord about the approval
      const message = `📢 **Approval Sent**\nTask Name: **${taskData.heading}**\nSent By: **${username}**`;
      sendDiscordNotification(message);
  
      toast.success("Approval sent! Closing modal...");
      setSelectedTask(null); // Close the modal
      await fetchTasks(); // Refresh tasks
    } catch (error) {
      console.error("Error confirming picture submission:", error);
      toast.error("Failed to confirm picture submission. Please try again.");
    }
  }, [fetchTasks]);    
  

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-black">
        <div className="flex justify-center items-center flex-grow">
          <div className="loader" style={{ width: "100px", height: "100px" }}></div>
        </div>
      </div>
        );
      }

  

  return (
<div className="flex flex-col min-h-screen bg-black">
  {/* Main Content */}
  <div className="flex-grow relative pt-20 sm:pt-24 md:pt-20 pb-0">
        {/* Header */}
        <h1
          className="uppercase text-5xl font-extrabold mb-8 text-center"
          style={{
            textShadow: "0 6px 12px rgba(255,255,255,0.3)", // Enhanced shadow
            letterSpacing: "2px", // Add spacing between letters
          }}
        >
          Dashboard
        </h1>
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Top Bar */}
        <div
          className={`fixed inset-x-4 top-0 bg-gray-800 bg-opacity-90 z-50 h-16 sm:h-16 shadow-lg mb-6`}
          style={{
            maxWidth: "calc(100% - 2rem)", // Add spacing from the edges
            borderTopLeftRadius: "0", // Always pointed
            borderTopRightRadius: "0", // Always pointed
            borderBottomLeftRadius: isSidebarOpen ? "0" : "8px", // Pointed when open, rounded when closed
            borderBottomRightRadius: isSidebarOpen ? "0" : "8px", // Pointed when open, rounded when closed
          }}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 h-full">
            {/* Left Section (Hi, Username and MYSTERIO'S GAME) */}
            <div className="flex flex-col text-left">
          <span
            className="text-gray-200 font-medium text-sm sm:text-base"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            Hi, {username}
          </span>
          <h1
            className="text-gray-200 font-extrabold tracking-wide text-lg sm:text-2xl"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            MYSTERIO'S GAME
          </h1>
            </div>

            {/* Hamburger Button */}
                  <div className="text-right">
                  <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full focus:outline-none transition duration-300 transform ${
            isSidebarOpen
              ? "bg-gray-600 text-white rotate-90"
              : "bg-transparent text-gray-300 hover:text-gray-400 rotate-0"
          }`}
          style={{ fontSize: "1.5rem", zIndex: 50 }}
        >
          ☰
        </button>
                  </div>
                  </div>

                  {/* Sidebar */}
                  <div
                  className={`absolute top-full left-0 w-full bg-gray-800 bg-opacity-90 shadow-xl transform ${
                  isSidebarOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
                  } transition-all duration-300 ease-in-out z-40`}
                  style={{
                  borderBottomLeftRadius: "8px", // Always rounded
                  borderBottomRightRadius: "8px", // Always rounded
                  }}
                  >
                  <div className="p-4 flex flex-col space-y-4">
                  {/* Sidebar Buttons */}
                  <button
                  onClick={() => setShowInstructionModal(true)}
                  className={`py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
                    isSidebarOpen
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-500 text-gray-400 cursor-not-allowed"
                  }`}
                  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
                  disabled={!isSidebarOpen} // Disable when sidebar is closed
                  >
                  Instruction
                  </button>
                  <button
  onClick={() => (window.location.href = "/support")} // Redirect to the support page
  className={`py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
    isSidebarOpen
      ? "bg-gray-700 hover:bg-gray-600 text-white"
      : "bg-gray-500 text-gray-400 cursor-not-allowed"
  }`}
  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
  disabled={!isSidebarOpen} // Disable when sidebar is closed
>
  Support
</button>


                    {/* Admin Panel Button */}
                {isAdmin && (
                <button
                  onClick={() => navigate("/admin")}
                  className={`py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
                  isSidebarOpen
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-500 text-gray-400 cursor-not-allowed"
                  }`}
                  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
                  disabled={!isSidebarOpen} // Disable when sidebar is closed
                >
                  Admin Panel
                </button>
                )}
                
                  <button
                  onClick={() => setShowLogoutModal(true)}
                  className={`py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
                    isSidebarOpen
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-500 text-gray-400 cursor-not-allowed"
                  }`}
                  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
                  disabled={!isSidebarOpen} // Disable when sidebar is closed
                  >
                  Logout
                  </button>
                  </div>
                  </div>
                </div>

                {/* Season Selection */}
                <div className="flex justify-center space-x-6 mb-[-10px] mt-2">
                  {["Season 1", "Season 2"].map((seasonName) => (
                    <button
                      key={seasonName}
                      onClick={() => setSeason(seasonName)}
                      className={`py-3 px-6 rounded-lg border border-gray-700 transition-transform duration-300 hover:scale-105 ${
                        season === seasonName
                          ? "bg-gray-700 text-white shadow-lg"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                      style={{
                        boxShadow: season === seasonName ? "0 6px 12px rgba(0,0,0,0.6)" : "0 4px 8px rgba(0,0,0,0.4)",
                      }}
                    >
                      {seasonName}
                    </button>
                  ))}
                </div>


                {/* Task List and Leaderboard Container */}
                <div className="min-h-screen bg-black text-white flex flex-col items-center mb-6 mt-6">
                  {/* Task List */}
<div className="w-full max-w-lg p-2 sm:p-8 md:p-8 relative pt-2 sm:pt-2 md:pt-8 pb-0">
  <div
    className="bg-gray-800 p-8 rounded-lg border border-gray-700"
    style={{
      boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
    }}
  >
    <h2 className="uppercase text-2xl font-bold mb-6 text-center text-gray-400">
      {season} Tasks
    </h2>

    {/* Handle Season Completed */}
    {season === "Season 1" ? (
      <div className="text-center">
        <p className="text-green-500 font-semibold">Season Completed</p>
        <p className="text-[#b8860b] font-semibold">@binte.syedd (Winner)</p>
      </div>
    ) : filteredTasks.length === 0 ? (
      <p className="text-gray-500 text-center">No tasks available.</p>
    ) : (
      filteredTasks.map((task) => (
        <div
          key={task.id}
          onClick={() =>
            task.status === "active" && handleTaskClick(task)
          } // Prevent click for tasks not active
          className={`p-4 rounded mb-4 bg-gray-700 border border-gray-600 cursor-pointer transition-transform duration-200 ${
            task.status === "completed"
              ? "opacity-45 cursor-default" // Gray out completed tasks
              : task.status === "waiting_for_approval"
              ? "opacity-75 cursor-default" // Gray out tasks waiting for approval
              : "hover:scale-105" // Hover effect for active tasks
          }`}
          style={{
            boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
            position: "relative",
          }}
        >
          {/* Task Heading */}
          <h3 className="text-xl font-bold text-gray-200">{task.heading}</h3>
          <p className="text-gray-300">{task.text}</p>

          {/* Show Additional Information Based on Status */}
          {task.status === "completed" && (
            <div className="mt-2 text-sm text-gray-400">
              <p>
                Completed by:{" "}
                <span className="text-gray-300 font-semibold">
                  {task.completedByUsername || "Unknown"}
                </span>
              </p>
            </div>
          )}

          {task.status === "waiting_for_approval" && (
            <p className="text-sm text-gray-400 mt-2">
              Waiting for admin approval, Sent by:{" "}
              <span className="text-gray-300 font-semibold">
              {task.approvalSentBy || "Unknown"}
              </span>
            </p>
          )}
        </div>
      ))
    )}
  </div>
</div>



                  {/* Leaderboard Section */}
                  <div className="w-full max-w-lg p-2 sm:p-8 md:p-8 relative pt-2 sm:pt-2 md:pt-8 pb-0 mt-4">
                    <div
                      className="bg-gray-800 p-8 rounded-lg border border-gray-700"
                      style={{
                        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
                      }}
                    >
                      <h2 className="uppercase text-2xl font-bold mb-6 text-center text-gray-400">
                        Leaderboard
                      </h2>
                      {leaderboardData.length === 0 ? (
                        <p className="text-gray-500 text-center">No leaderboard data available.</p>
                      ) : (
                        leaderboardData.slice(0, 10).map((user, index) => {
                          // Determine the rank suffix
                          const rankSuffix =
                            index === 0
                              ? "st"
                              : index === 1
                              ? "nd"
                              : index === 2
                              ? "rd"
                              : "th";

                          // Determine the rank color
                          const rankColor =
                            index === 0
                              ? "text-yellow-400"
                              : index === 1
                              ? "text-gray-300"
                              : index === 2
                              ? "text-[#cd7f32]"
                              : "text-gray-400";

                          return (
                            <div
                              key={index}
                              className="p-4 rounded mb-4 bg-gray-700 border border-gray-600 flex items-center space-x-4"
                              style={{
                                boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
                              }}
                            >
                              {/* Rank Indicator */}
                              <div
                                className={`flex items-center justify-center ${rankColor} text-lg font-bold`}
                              >
                                <span>{index + 1}</span>
                                <sup className="text-sm">{rankSuffix}</sup>
                              </div>
                              {/* User Info */}
                              <div>
                                <h3 className="text-xl font-bold text-gray-200">{user.username}</h3>
                                <p className="text-gray-300">Tasks Completed: {user.completedTasks}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

{/* Verification Modal */}
{selectedTask && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 transition-opacity duration-300">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-lg mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      {/* Task Heading */}
      <h3 className="text-xl font-bold mb-4 text-gray-300 text-center">
        {selectedTask.heading}
      </h3>

      {/* Task Description */}
      <p className="text-gray-400 mb-6">{selectedTask.text}</p>

      {/* Picture Submission Workflow */}
      {selectedTask.pictureRequired && selectedTask.status === "active" ? (
        <div className="mt-4">
          {/* Button to Send Picture */}
          <button
            className="w-full py-2 px-4 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
            onClick={() => {
              window.open('https://www.instagram.com/mysterio_notfound/', '_blank');
              setDmSent(true); // Enable Confirm Button after DM is sent
            }}
          >
            Send Picture via Instagram DM
          </button>

          {/* Confirm Picture Sent */}
          <button
            disabled={!dmSent} // Confirm button is disabled until Send DM button is clicked
            onClick={() => setShowConfirmation(true)} // Trigger confirmation modal
            className={`w-full py-2 px-4 mt-2 rounded-lg ${
              !dmSent
                ? "bg-gray-500 text-gray-400 cursor-not-allowed"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } transition-transform duration-200 hover:-translate-y-1 active:translate-y-0`}
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
          >
            Confirm Picture Sent
          </button>

{/* Confirmation Modal */}
{showConfirmation && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-md mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.7), 0 4px 8px rgba(0, 0, 0, 0.5)",
      }}
    >
      <h3 className="text-lg font-bold text-center text-gray-200 mb-4">
        Confirm Submission
      </h3>
      <p className="text-gray-400 mb-6 text-center">
        Have you sent the required picture via Instagram DM?
      </p>
      <div className="flex space-x-4">
        {/* Yes Button */}
        <button
          onClick={() => {
            handlePictureConfirmation(selectedTask.id); // Handle confirmation logic
            setShowConfirmation(false); // Close modal
          }}
          className="w-full py-2 px-4 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.6)" }}
        >
          Yes, I sent it
        </button>

        {/* No Button */}
        <button
          onClick={() => setShowConfirmation(false)} // Close modal without action
          className="w-full py-2 px-4 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.6)" }}
        >
          No, cancel
        </button>
      </div>
    </div>
  </div>
)}

        </div>
      ) : selectedTask.status === "waiting_for_approval" ? (
        /* Disabled Task Workflow when Waiting for Approval */
        <p className="text-gray-400 text-center mt-4">
          This task is waiting for approval and cannot be modified.
        </p>
      ) : selectedTask.status === "completed" ? (
        /* Completed Task Workflow */
        <p className="text-gray-400 text-center mt-4">
          This task is completed and cannot be modified.
        </p>
      ) : (
        /* Non-Picture Task Verification */
        <div className="mt-4">
          <p className="text-gray-400 mb-2">Enter the verification code:</p>
          <input
            type="text"
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button
            onClick={handleVerifyTask}
            className={`w-full py-2 px-4 mt-4 rounded-lg ${
              verifyDisabled
                ? "bg-gray-500 cursor-not-allowed text-gray-400"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } transition-transform duration-200 hover:-translate-y-1 active:translate-y-0`}
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
            disabled={verifyDisabled} // Disable button when pressed
          >
            {verifyStatus} {/* Dynamic text */}
          </button>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setSelectedTask(null)}
          className="w-full py-2 px-4 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


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



{/* Instruction Modal */}
{showInstructionModal && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
    <div
      className="bg-gray-800 text-white p-6 rounded-lg border border-gray-700 w-full max-w-lg mx-4 sm:mx-auto"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      {/* Modal Header */}
      <h3 className="text-xl font-bold mb-4 text-gray-300 text-center">
        Game Instructions
      </h3>

{/* Scrollable Content */}
<div className="max-h-80 overflow-y-auto px-2">
  <p className="text-gray-400 text-sm leading-relaxed">
    <strong className="text-white">Mysterio's Game - Instruction Manual</strong>  
    <br /><br />
    <strong className="text-gray-300">Important Reminder:</strong>  
    For the best experience, <strong>Refresh Your Page</strong> frequently to see real-time updates and changes. This ensures that you don’t miss newly added tasks or other important updates during the game.  
    <br /><br />
    <strong className="text-gray-300">Introduction:</strong>  
    Welcome to <strong>Mysterio's Game</strong>, a task-based competition where players complete challenges to earn points. The player who completes the most tasks by the end of the season wins. If a cash prize is available, it will be awarded to the winner.  
    <br /><br />
    <strong className="text-gray-300">How to Play:</strong>
    <ol className="list-decimal ml-4 space-y-2">
      <li><strong>Accessing the Game:</strong> Open the game and enter to start playing.</li>
      <li><strong>Completing Tasks:</strong> View tasks on your dashboard and submit proof after completion. Admin will review and approve/reject submissions.</li>
      <li><strong>Winning the Game:</strong> The player who completes the most tasks wins. If a cash prize is available, the winner gets it.</li>
      <li><strong>Seasons & Reset:</strong> Tasks reset at the start of each season. Compete in new seasons for fresh rewards.</li>
      <li><strong>Entry Fees & Payments:</strong> Some seasons require an entry fee. Payments can be made via <strong>JazzCash, EasyPaisa</strong>, or other available options.</li>
    </ol>
    <br />
    <strong className="text-gray-300">Rules & Fair Play:</strong>  
    <ul className="list-disc ml-4 space-y-1">
      <li>All submissions must be genuine. Cheating results in disqualification.</li>
      <li>Admin decisions on task approvals are final.</li>
      <li>Cash prizes (if applicable) will only be awarded to eligible winners.</li>
    </ul>
  </p>
</div>


      {/*Instruction Modal Footer */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowInstructionModal(false)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 px-4 rounded-lg transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
          style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

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

  </div>
 </div>
  );
};

export default Dashboard;