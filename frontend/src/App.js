"use client"

import { Home, Menu, User } from "lucide-react"
import { useState } from "react"
import "./App.css"
import DashboardScreen from "./components/DashboardScreen"
import DiscussionForumScreen from "./components/DiscussionForumScreen"
import InsightsScreen from "./components/InsightsScreen"
import LoginForm from "./components/LoginForm"
import LoginScreen from "./components/LoginScreen"
import RecommendationsScreen from "./components/RecommendationsScreen"
import RegisterForm from "./components/RegisterForm"
import SoilHealthScreen from "./components/SoilHealthScreen"

function App() {
  const [currentScreen, setCurrentScreen] = useState("login")

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
        return <RegisterForm onRegisterClick={() => setCurrentScreen("dashboard")} />
      case "dashboard":
        return (
          <DashboardScreen
            onSoilHealthClick={() => setCurrentScreen("soilHealth")}
            onInsightsClick={() => setCurrentScreen("insights")}
            onRecommendationsClick={() => setCurrentScreen("recommendations")}
            onDiscussionForumClick={() => setCurrentScreen("discussionForum")}
          />
        )
      case "soilHealth":
        return <SoilHealthScreen onBackClick={() => setCurrentScreen("dashboard")} />
      case "insights":
        return <InsightsScreen onBackClick={() => setCurrentScreen("dashboard")} />
      case "recommendations":
        return <RecommendationsScreen onBackClick={() => setCurrentScreen("dashboard")} />
      case "discussionForum":
        return <DiscussionForumScreen onBackClick={() => setCurrentScreen("dashboard")} />
      default:
        return <LoginScreen onLoginClick={() => setCurrentScreen("loginForm")} />
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm h-[600px] overflow-hidden relative bg-white shadow-lg rounded-lg">
        {renderScreen()}

        {/* Bottom Navigation - Only show on main screens */}
        {["dashboard", "soilHealth", "insights"].includes(currentScreen) && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
            <button
              onClick={() => setCurrentScreen("dashboard")}
              className="flex flex-col items-center justify-center w-1/3"
            >
              <Home size={20} />
            </button>
            <button className="flex flex-col items-center justify-center w-1/3">
              <User size={20} />
            </button>
            <button className="flex flex-col items-center justify-center w-1/3">
              <Menu size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
