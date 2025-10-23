// src/App.js
"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, Home, LogOut, Menu, User } from "lucide-react"
import "./App.css"


// ✅ Import the default export only (works whether named helpers exist or not)
import api from "./api/api"

import CropSetupScreen from "./components/CropSetupScreen"
import DashboardScreen from "./components/DashboardScreen"
import DiscussionForumScreen from "./components/DiscussionForumScreen"
import FarmSetupScreen from "./components/FarmSetupScreen"
import InsightsScreen from "./components/InsightsScreen"
import LoginForm from "./components/LoginForm"
import LoginScreen from "./components/LoginScreen"
import PlotManagementScreen from "./components/PlotManagementScreen"
import RecommendationsScreen from "./components/RecommendationsScreen"
import RegisterForm from "./components/RegisterForm"
import SensorSetupScreen from "./components/SensorSetupScreen"
import SoilHealthScreen from "./components/SoilHealthScreen"
import ThreadViewScreen from "./components/ThreadViewScreen"
import UploadSensorData from "./components/UploadSensorData"
import ViewSensorData from "./components/ViewSensorData"

function App() {
  // null = bootstrapping auth; then we pick a real screen
  const [currentScreen, setCurrentScreen] = useState(null)
  const [selectedThreadId, setSelectedThreadId] = useState(null)

  // menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false)
  const [isManagementExpanded, setIsManagementExpanded] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)

  // Helper: best-effort auth bootstrap that works with or without named helpers in api
  async function tryBootstrapAuth() {
    try {
      // If api provides a bootstrap helper, use it
      if (api && typeof api.bootstrapAuth === "function") {
        await api.bootstrapAuth()
        return true
      }

      // Check if we have tokens
      const access = localStorage.getItem("accessToken")
      const refresh = localStorage.getItem("refreshToken")
      
      if (access && refresh) {
        // Test if the token is actually valid by making a simple API call
        try {
          // Set the header first
          if (api?.defaults?.headers?.common) {
            api.defaults.headers.common["Authorization"] = `Bearer ${access}`
          }
          
          // Make a test API call to verify the token works
          await api.get("/api/profile/") // or any protected endpoint
          return true
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem("accessToken")
          localStorage.removeItem("refreshToken")
          return false
        }
      }
      
      return false
    } catch {
      return false
    }
  }

  // ----- Auth bootstrap (restore/refresh tokens and set header) -----
  useEffect(() => {
    ;(async () => {
      await tryBootstrapAuth()
      // Always start at login screen regardless of token status
      setCurrentScreen("login")
    })()
  }, [])

  // Close the menu when clicking outside / Esc
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false)
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setIsMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [isMenuOpen])

  // Collapse submenus whenever the menu closes
  useEffect(() => {
    if (!isMenuOpen) {
      setIsDashboardExpanded(false)
      setIsManagementExpanded(false)
    }
  }, [isMenuOpen])

  const toggleMenu = () => setIsMenuOpen((o) => !o)

  const handleLogout = () => {
    // Use api.logout() if present, otherwise clear tokens locally
    if (api && typeof api.logout === "function") {
      api.logout()
    } else {
      localStorage.removeItem("accessToken") // Fixed: changed from "access"
      localStorage.removeItem("refreshToken") // Fixed: changed from "refresh"
    }
    localStorage.removeItem("selectedSoilPlot")
    setCurrentScreen("loginForm")
    setIsMenuOpen(false)
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "login":
        return <LoginScreen onLoginClick={() => setCurrentScreen("loginForm")} />

      case "loginForm":
        return (
          <LoginForm
            onLoginClick={() => setCurrentScreen("dashboard")}
            onSignUpClick={() => setCurrentScreen("register")}
          />
        )

      case "register":
        return (
          <RegisterForm
            onRegisterClick={() => setCurrentScreen("dashboard")}
            onBackClick={() => setCurrentScreen("loginForm")}
          />
        )

      case "dashboard":
        return (
          <DashboardScreen
            onSoilHealthClick={() => setCurrentScreen("soilHealth")}
            onInsightsClick={() => setCurrentScreen("insights")}
            onRecommendationsClick={() => setCurrentScreen("recommendations")}
            onDiscussionForumClick={() => setCurrentScreen("discussionForum")}
          />
        )

      case "threadView":
        return (
          <ThreadViewScreen
            threadId={selectedThreadId}
            onBackClick={() => setCurrentScreen("discussionForum")}
          />
        )

      case "soilHealth":
        return (
          <SoilHealthScreen
            onBackClick={() => setCurrentScreen("dashboard")}
            onViewSensorClick={() => setCurrentScreen("viewSensorData")}
            onUploadSensorClick={() => setCurrentScreen("uploadSensorData")}
          />
        )

      case "insights":
        return <InsightsScreen onBackClick={() => setCurrentScreen("dashboard")} />

      case "recommendations":
        return <RecommendationsScreen onBackClick={() => setCurrentScreen("dashboard")} />

      case "discussionForum":
        return (
          <DiscussionForumScreen
            onBackClick={() => setCurrentScreen("dashboard")}
            onThreadClick={(threadId) => {
              if (threadId) {
                setSelectedThreadId(threadId)
                setCurrentScreen("threadView")
              } else {
                setCurrentScreen("discussionForum")
              }
            }}
          />
        )

      case "userProfile":
        return (
          <UserProfileScreen
            onBackClick={() => setCurrentScreen("dashboard")}
            onRegisterClick={() => alert("Farm details registered!")}
          />
        )

      case "farmSetup":
        return (
          <FarmSetupScreen
            onBackClick={() => setCurrentScreen("dashboard")}
            onAddCropsClick={() => setCurrentScreen("cropSetup")}
            onManagePlotsClick={() => setCurrentScreen("plotManagement")}
            onSensorSetupClick={() => setCurrentScreen("sensorSetup")}
            onThreadClick={(threadId) => {
              setSelectedThreadId(threadId)
              setCurrentScreen("threadView")
            }}
          />
        )

      case "cropSetup":
        return (
          <CropSetupScreen
            onBackClick={() => setCurrentScreen("farmSetup")}
            onHomeClick={() => setCurrentScreen("dashboard")}
            onProfileClick={() => setCurrentScreen("farmSetup")}
            onMenuClick={toggleMenu}
          />
        )

      case "plotManagement":
        return (
          <PlotManagementScreen
            onBackClick={() => setCurrentScreen("farmSetup")}
            onHomeClick={() => setCurrentScreen("dashboard")}
            onProfileClick={() => setCurrentScreen("farmSetup")}
            onMenuClick={toggleMenu}
          />
        )

      case "sensorSetup":
        return (
          <SensorSetupScreen
            onBackClick={() => setCurrentScreen("farmSetup")}
          />
        )

      case "viewSensorData":
        return (
          <ViewSensorData
            onBackClick={() => setCurrentScreen("soilHealth")}
            onHomeClick={() => setCurrentScreen("dashboard")}
            onProfileClick={() => setCurrentScreen("farmSetup")}
            onMenuClick={() => setIsMenuOpen(true)}
          />
        )

      case "uploadSensorData":
        return (
          <UploadSensorData
            onBackClick={() => setCurrentScreen("soilHealth")}
            onHomeClick={() => setCurrentScreen("dashboard")}
            onProfileClick={() => setCurrentScreen("farmSetup")}
            onMenuClick={() => setIsMenuOpen(true)}
          />
        )

      default:
        // Bootstrapping state
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        )
    }
  }

  const showNavbar = [
    "dashboard",
    "soilHealth",
    "insights",
    "recommendations",
    "userProfile",
    "farmSetup",
    "discussionForum",
    "threadView",
    "uploadSensorData",
    "viewSensorData",
    "cropSetup",
    "plotManagement",
    "sensorSetup",
  ].includes(currentScreen || "")

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm h-[600px] overflow-hidden relative bg-white shadow-lg rounded-lg">
        {renderScreen()}

        {/* Popup Menu */}
        {isMenuOpen && showNavbar && (
          <div
            ref={menuRef}
            className="absolute bottom-12 right-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="py-3 space-y-1">
              {/* Logout */}
              <div className="px-4 pb-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </div>

              {/* Dashboard Section */}
              <div className="px-4">
                <button
                  onClick={() => setIsDashboardExpanded((s) => !s)}
                  className="w-full flex justify-between items-center text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-lg px-3 py-2 transition"
                >
                  Dashboard
                  {isDashboardExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isDashboardExpanded && (
                  <div className="space-y-1 pl-3 mt-1">
                    {[
                      { label: "Insights", screen: "insights" },
                      { label: "Soil Health", screen: "soilHealth" },
                      { label: "Recommendations", screen: "recommendations" },
                      { label: "Discussion", screen: "discussionForum" },
                    ].map(({ label, screen }) => (
                      <button
                        key={screen}
                        onClick={() => {
                          setCurrentScreen(screen)
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left text-sm text-gray-600 hover:bg-gray-100 rounded px-2 py-1 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Management Section */}
              <div className="px-4 mt-1">
                <button
                  onClick={() => setIsManagementExpanded((s) => !s)}
                  className="w-full flex justify-between items-center text-sm text-gray-700 font-medium hover:bg-gray-100 rounded-lg px-3 py-2 transition"
                >
                  Management
                  {isManagementExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isManagementExpanded && (
                  <div className="space-y-1 pl-3 mt-1">
                    {[
                      { label: "User Management", screen: "farmSetup" },
                      { label: "Plot Management", screen: "plotManagement" },
                      { label: "Crop Management", screen: "cropSetup" },
                      { label: "Sensor Management", screen: "sensorSetup" },
                    ].map(({ label, screen }) => (
                      <button
                        key={screen}
                        onClick={() => {
                          setCurrentScreen(screen)
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left text-sm text-gray-600 hover:bg-gray-100 rounded px-2 py-1 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navbar */}
        {showNavbar && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="flex flex-col items-center justify-center w-1/3"
            >
              <Home size={20} />
            </button>
            <button
              onClick={() => setCurrentScreen("farmSetup")}
              className="flex flex-col items-center justify-center w-1/3"
            >
              <User size={20} />
            </button>
            <button
              ref={menuButtonRef}
              onClick={toggleMenu}
              className="flex flex-col items-center justify-center w-1/3"
            >
              <Menu size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App