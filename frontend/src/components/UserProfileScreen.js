"use client"

import { useState } from "react"

export default function UserProfileScreen({ onSaveClick, onFarmSetupClick }) {
  const [userInfo, setUserInfo] = useState({
    firstName: "",
    username: "",
    email: "",
    farmName: "",
    location: ""
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setUserInfo((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
      <h2 className="text-right text-[#2a9d4a] font-medium mb-4">Your Profile</h2>

      <div className="w-full space-y-3">
        <input
          name="firstName"
          value={userInfo.firstName}
          onChange={handleChange}
          type="text"
          placeholder="First Name"
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <input
          name="username"
          value={userInfo.username}
          onChange={handleChange}
          type="text"
          placeholder="Username"
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <input
          name="email"
          value={userInfo.email}
          onChange={handleChange}
          type="email"
          placeholder="Email"
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <input
          name="farmName"
          value={userInfo.farmName}
          onChange={handleChange}
          type="text"
          placeholder="Farm Name"
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />
        <input
          name="location"
          value={userInfo.location}
          onChange={handleChange}
          type="text"
          placeholder="Location"
          className="w-full bg-white border border-gray-300 p-2 rounded"
        />

        <button
          onClick={() => onSaveClick(userInfo)}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
        >
          Save Changes
        </button>

        <button
          onClick={onFarmSetupClick}
          className="text-sm text-gray-700 hover:underline text-center w-full mt-1"
        >
          Go to Farm Setup
        </button>
      </div>
    </div>
  )
}
