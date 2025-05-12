"use client"
import africaLogo from "../assets/africa-logo.png"

export default function LoginScreen({ onLoginClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#b9d98a] p-6">
      <div className="bg-white rounded-lg p-6 mb-6 w-full max-w-[200px]">
        <img src={africaLogo || "/placeholder.svg"} alt="Smart Harvest Africa Logo" className="w-full h-auto" />
      </div>
      <button onClick={onLoginClick} className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded">
        Login
      </button>
    </div>
  )
}
