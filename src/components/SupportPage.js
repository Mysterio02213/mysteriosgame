import React, { useState } from "react";
import { auth } from "../firebase"; // Added storage
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1357985258158424177/B_q2TmnkOEJgRA7o_JR0EBR1q6YH1dpSm1B_QSErcsvlL1OURkr98E0KOq0I1ZK3Xr-R"; // Replace with your actual webhook URL

const SupportPage = ({ user }) => {
  const [category, setCategory] = useState("");
  const [heading, setHeading] = useState(""); // Heading field
  const [problem, setProblem] = useState(""); // Problem field
  const [contact, setContact] = useState(""); // Email/Instagram Username field
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
    const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar toggle state
  const navigate = useNavigate();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    // Validate form inputs
    if (!category || !heading.trim() || !problem.trim() || !contact.trim()) {
      setErrorMessage("All fields are required. Please complete the form.");
      setLoading(false);
      return;
    }

    // Format the current date and time in 12-hour format
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const formattedDate = now.toLocaleDateString("en-US");

    // First Message (Detailed Support Request for You)
    const adminMessage = `📌 **Support Request Received**
━━━━━━━━━━━━━━━━━━━━━━━
🗂 **Category**
${category}

📝 **Heading**
${heading}

💬 **Problem Description**
\`\`\`
${problem}
\`\`\`

📞 **Contact Information**
${contact}

🕒 **Time Submitted**
${formattedTime}

📅 **Date Submitted**
${formattedDate}
━━━━━━━━━━━━━━━━━━━━━━━`;


    try {
      // Send the first message to Discord
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: adminMessage }),
      });

      setSuccessMessage("Your support request has been sent successfully!");
      setCategory("");
      setHeading("");
      setProblem("");
      setContact("");
    } catch (error) {
      console.error("Error sending support request:", error);
      setErrorMessage("Failed to send support request. Please try again.");
    } finally {
      setLoading(false);
    }
};

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
  {/* Top Bar */}
  <div
    className={`fixed inset-x-4 top-0 bg-gray-800 bg-opacity-90 z-50 h-16 sm:h-16`}
    style={{
      borderTopLeftRadius: "0",
      borderTopRightRadius: "0",
      borderBottomLeftRadius: isSidebarOpen ? "0" : "8px",
      borderBottomRightRadius: isSidebarOpen ? "0" : "8px",
    }}
  >
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 h-full">
      <div className="flex flex-col text-left">
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
  </div>

  {/* Sidebar */}
  <div
    className={`fixed inset-x-4 top-16 bg-gray-800 bg-opacity-90 shadow-xl z-40 transition-all duration-300 ease-in-out ${
      isSidebarOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
    }`} 
    style={{
      borderBottomLeftRadius: "8px",
      borderBottomRightRadius: "8px",
    }}
  >
    <div className="p-4 flex flex-col space-y-4">
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
      >
        Dashboard
      </button>
      {user && (
        <button
          onClick={() => setShowLogoutModal(true)}
          className="py-2 px-4 rounded-lg transition transform duration-200 hover:-translate-y-1 active:translate-y-0 bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
        >
          Logout
        </button>
      )}
    </div>
  </div>

  {/* Main Content - Support Form */}
  <div className="flex-grow mt-20 px-4 sm:px-6 md:px-8 bg-black">
    <div
      className="w-full max-w-lg mx-auto p-8 bg-gray-800 rounded-lg border border-gray-700"
      style={{
        boxShadow: "0 8px 16px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5)",
      }}
    >
      <h1 className="text-2xl font-bold text-center text-gray-200 mb-6">Support</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="category" className="block text-gray-400 mb-2">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none"
          >
            <option value="" disabled>
              Select a category
            </option>
            <option value="Help with Task">Help with Task</option>
            <option value="Problem with Website">Problem with Website</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="heading" className="block text-gray-400 mb-2">
            Heading
          </label>
          <input
            id="heading"
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            maxLength={50}
            className="w-full p-3 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none"
            placeholder="Enter a brief heading (Max 50 characters)"
          />
          <p className="text-gray-400 text-sm mt-1">{50 - heading.length} characters remaining</p>
        </div>
        <div className="mb-4">
          <label htmlFor="problem" className="block text-gray-400 mb-2">
            Describe Problem
          </label>
          <textarea
            id="problem"
            rows="5"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none"
            placeholder="Describe your problem in detail"
          ></textarea>
        </div>
        <div className="mb-6">
          <label htmlFor="contact" className="block text-gray-400 mb-2">
            Email or Instagram Username
          </label>
          <input
            id="contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full p-3 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none"
            placeholder="Enter your email or Instagram username"
          />
        </div>
        {successMessage && <p className="text-green-400 mb-4">{successMessage}</p>}
        {errorMessage && <p className="text-red-400 mb-4">{errorMessage}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
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

  {/* Footer */}
  <footer className="text-center text-gray-500 py-4 border-t border-gray-700 mt-10">
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
    </div>
  </footer>
</div>

  );   
};

export default SupportPage;
