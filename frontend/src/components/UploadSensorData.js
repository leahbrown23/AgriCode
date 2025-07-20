"use client"

import { ArrowLeft, Home, Menu, Upload, User } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function UploadSensorData({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [user, setUser] = useState(null)


    useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/profile/")
        setUser(res.data)
      } catch (err) {
        console.error("Failed to load user profile:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])


  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

   const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await api.post("/api/upload-soil/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      alert("Upload successful!")
    } catch (error) {
      console.error("Upload failed", error)
      alert("Error uploading file")
    }
  }

  if (loading) return <LoadingSpinner />


  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Upload Sensor Data</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4 bg-[#d1e6b2]">
        <div className="text-sm text-gray-700 text-center">
          Upload your sensor data Excel sheet to store or process it.
        </div>

        {/* Upload Area */}
        <div className="bg-white border-dashed border-2 border-gray-300 p-6 rounded-md flex flex-col items-center justify-center text-gray-600 text-sm">
          <Upload className="w-6 h-6 mb-2" />
          <p>Drag and drop your .xlsx file here or click to upload</p>
          <input type="file" accept=".xlsx" className="mt-2" onChange={handleFileChange}/>
          <button
            onClick={handleUpload}
            className="mt-4 bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded"
          >
            Upload Sensor Data
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white">
        <button onClick={onHomeClick} className="flex flex-col items-center justify-center w-1/3">
          <Home size={20} />
        </button>
        <button onClick={onProfileClick} className="flex flex-col items-center justify-center w-1/3">
          <User size={20} />
        </button>
        <button onClick={() => onMenuClick(prev => !prev)} className="flex flex-col items-center justify-center w-1/3">
          <Menu size={20} />
        </button>
      </div>
    </div>
  )
}
