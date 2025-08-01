// Updated App.js with 'Management' collapsible section and Plot Management
"use client"

import axios from "axios"
import { ChevronDown, ChevronRight, Home, LogOut, Menu, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import "./App.css"
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
import SoilHealthScreen from "./components/SoilHealthScreen"
import ThreadViewScreen from "./components/ThreadViewScreen"
import UploadSensorData from "./components/UploadSensorData"
import UserProfileScreen from "./components/UserProfileScreen"
import ViewSensorData from "./components/ViewSensorData"

function App() {
  const [currentScreen, setCurrentScreen] = useState("login")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false)
  const [isManagementExpanded, setIsManagementExpanded] = useState(false)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const [selectedThreadId, setSelectedThreadId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    }
  }, [])

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
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (!isMenuOpen) {
      setIsDashboardExpanded(false)
      setIsManagementExpanded(false)
    }
  }, [isMenuOpen])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
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
  return <ThreadViewScreen threadId={selectedThreadId} onBackClick={() => setCurrentScreen("discussionForum")} />

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
              setSelectedThreadId(threadId)
              setCurrentScreen("threadView")
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
            onManagePlotsClick={() => setCurrentScreen("plotManagement")} // ✅ Added this line
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
      case "plotManagement": // ✅ Added this new case
        return (
          <PlotManagementScreen
            onBackClick={() => setCurrentScreen("farmSetup")}
            onHomeClick={() => setCurrentScreen("dashboard")}
            onProfileClick={() => setCurrentScreen("farmSetup")}
            onMenuClick={toggleMenu}
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
        return <LoginScreen onLoginClick={() => setCurrentScreen("loginForm")} />
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
    "cropSetup",
    "plotManagement", // ✅ Added this to show navbar on plot management screen
  ].includes(currentScreen)

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm h-[600px] overflow-hidden relative bg-white shadow-lg rounded-lg">
        {renderScreen()}
        {isMenuOpen && showNavbar && (
          <div
            ref={menuRef}
            className="absolute bottom-12 right-0 w-48 bg-white border border-gray-200 rounded-t-md shadow-lg z-50"
          >
            <div className="py-3">
              <div className="px-4 mb-2">
                <button
                  onClick={() => {
                    localStorage.removeItem("selectedPlot")
                    setCurrentScreen("login")
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </div>
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={() => setIsDashboardExpanded(!isDashboardExpanded)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>Dashboard</span> {isDashboardExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isDashboardExpanded && (
                  <div className="pl-4">
                    <button
                      onClick={() => {
                        setCurrentScreen("insights")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Insights
                    </button>
                    <button
                      onClick={() => {
                        setCurrentScreen("soilHealth")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Soil Health
                    </button>
                    <button
                      onClick={() => {
                        setCurrentScreen("recommendations")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Recommendations
                    </button>
                    <button
                      onClick={() => {
                        setCurrentScreen("discussionForum")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Discussion
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsManagementExpanded(!isManagementExpanded)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>Management</span>{" "}
                  {isManagementExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isManagementExpanded && (
                  <div className="pl-4">
                    <button
                      onClick={() => {
                        setCurrentScreen("farmSetup")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      User Management
                    </button>

                    <button
                      onClick={() => {
                        setCurrentScreen("plotManagement")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Plot Management
                    </button>

                    <button
                      onClick={() => {
                        setCurrentScreen("cropSetup")
                        setIsMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Crop Management
                    </button>
                    
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
