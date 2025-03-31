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
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [verifyDisabled, setVerifyDisabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        setIsAdmin(user.email === "admin@mysterio.com");
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
  
    if (isCodeCorrect) {
      try {
        setVerifyDisabled(true); // Disable the button immediately
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
  
        // Mark task as completed
        const taskDocRef = doc(db, "tasks", selectedTask.id);
        await setDoc(
          taskDocRef,
          {
            completed: true,
            completedBy: auth.currentUser.uid,
            completedByUsername: userDoc.data().username || "Unknown User",
            completedAt: new Date().toISOString(),
          },
          { merge: true }
        );
  
        toast.success("Task Verified! Closing Now..."); // Inform the user
        setTimeout(() => {
          setSelectedTask(null); // Close the modal after a delay
        }, 2000); // 2-second delay before closing
  
        await fetchTasks();
  
        // Refresh leaderboard data
        const adminUsernames = ["Mysterio", "TestAdmin"]; // Exclude admins
        const userSnapshot = await getDocs(collection(db, "users"));
        const leaderboard = userSnapshot.docs
          .map((doc) => ({
            username: doc.data().username || "Unknown User",
            completedTasks: doc.data().completedTasks || 0,
          }))
          .filter((user) => !adminUsernames.includes(user.username)) // Exclude admins
          .sort((a, b) => b.completedTasks - a.completedTasks); // Sort by tasks completed
        setLeaderboardData(leaderboard);
      } catch (error) {
        console.error("Error verifying task:", error);
        toast.error("Failed to verify the task. Please try again.");
        setVerifyDisabled(false); // Re-enable button if an error occurs
      } finally {
        setVerifyDisabled(false); // Re-enable button after the process completes
      }
    } else {
      toast.error("Incorrect code. Please try again.");
    }
  }, [selectedTask, verificationCode, fetchTasks]);
  

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
    <div className="flex-grow p-2 sm:p-8 md:p-20 relative pt-20 sm:pt-24 md:pt-20 pb-0">
      {/* Header */}
        <h1
          className="uppercase text-4xl font-extrabold mb-6 text-center"
          style={{ textShadow: "0 4px 8px rgba(255,255,255,0.2)" }}
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
                  className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full focus:outline-none transition duration-200 ${
                    isSidebarOpen
                  ? "bg-gray-600 text-white"
                  : "bg-transparent text-gray-300 hover:text-gray-400"
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
                  onClick={() => setShowHelpModal(true)}
                  className={`py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 ${
                    isSidebarOpen
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-500 text-gray-400 cursor-not-allowed"
                  }`}
                  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
                  disabled={!isSidebarOpen} // Disable when sidebar is closed
                  >
                  Help
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
      <div className="flex justify-center space-x-4 mb-[-40px] mt-6">
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
<div className="min-h-screen bg-black text-white flex flex-col mb-6 mt-6">
  <div className="flex-grow p-2 sm:p-8 md:p-8 relative pt-2 sm:pt-2 md:pt-8 pb-0">
    <div
      className="max-w-lg mx-auto bg-gray-800 p-6 sm:p-8 md:p-10 mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8 md:mb-12 rounded-lg border border-gray-700"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h2 className="uppercase text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-400">
        {season} Tasks
      </h2>
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
            onClick={() => handleTaskClick(task)}
            className={`p-4 sm:p-6 rounded mb-4 bg-gray-700 border border-gray-600 cursor-pointer transition-transform duration-200 ${
              task.completed ? "opacity-50 cursor-default" : ""
            }`}
            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
          >
            <h3 className="text-lg sm:text-xl font-bold text-gray-200">{task.heading}</h3>
            <p className="text-gray-300 text-sm sm:text-base">{task.text}</p>
            {task.completed && (
              <span className="text-gray-500 mt-2 inline-block text-sm sm:text-base">
                Completed {task.completedByUsername && `by ${task.completedByUsername}`}
              </span>
            )}
          </div>
        ))
      )}
    </div>

    {/* Leaderboard Section */}
    <div
      className="max-w-lg mx-auto bg-gray-800 p-6 sm:p-8 md:p-10 mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8 md:mb-12 rounded-lg border border-gray-700"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h2 className="uppercase text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-400">
        Leaderboard
      </h2>
      {leaderboardData.length === 0 ? (
        <p className="text-gray-500 text-center">No leaderboard data available.</p>
      ) : (
        <div>
          {leaderboardData.map((user, index) => (
            <div
              key={index}
              className="p-4 sm:p-6 rounded mb-4 bg-gray-700 border border-gray-600"
              style={{
                boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
              }}
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-200">{user.username}</h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Tasks Completed: {user.completedTasks}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
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
<h3 className="text-xl font-bold mb-1 mt-[-12p]">{selectedTask.heading}</h3>
<p className="text-gray-300 mb-4">{selectedTask.text}</p>
<p className="text-gray-400 mb-2">Enter the verification code:</p>


      <input
        type="text"
        className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
      />
      <button
        onClick={handleVerifyTask}
        className={`w-full py-2 px-4 rounded-lg ${
          verifyDisabled
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-gray-700 hover:bg-gray-600"
        } text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 mt-2`}
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        disabled={verifyDisabled} // Disable button when pressed
      >
        {verifyDisabled ? "Verifying..." : "Verify"} {/* Dynamic text */}
      </button>
      <button
        onClick={() => setSelectedTask(null)}
        className="w-full py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition transform duration-200 hover:-translate-y-1 active:translate-y-0 mt-2"
        style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.6)" }}
        disabled={verifyDisabled} // Optional: disable Cancel while verifying
      >
        Cancel
      </button>
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
          Close
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
<footer className="text-center text-gray-500 mt-2 mb-[-20px] text-sm sm:text-base md:text-lg">
  © 2025 Mysterio's Game. All rights reserved.
</footer>

  </div>
  );
};

export default Dashboard;