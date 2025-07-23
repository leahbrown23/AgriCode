"use client"

import { ArrowLeft, CheckCircle, Home, Menu, Upload, User, X } from "lucide-react"
import { useEffect, useState } from "react"
import api from "../api/api"
import LoadingSpinner from "./LoadingSpinner"

export default function UploadSensorData({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [user, setUser] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState("")

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
      setUploadSuccess(false)
      setUploadError("")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.")
      return
    }

    setUploading(true)
    setUploadError("")
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await api.post("/api/upload-soil/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      setUploadSuccess(true)
      setSelectedFile(null)
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Upload failed", error)
      setUploadError("Error uploading file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const dismissSuccess = () => {
    setUploadSuccess(false)
  }

  const dismissError = () => {
    setUploadError("")
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Upload Sensor Data</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#d1e6b2]">
        {/* Success Message */}
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-green-800 font-medium">Upload Successful!</p>
                <p className="text-green-700 text-sm">Your sensor data has been processed and stored.</p>
              </div>
            </div>
            <button onClick={dismissSuccess} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <p className="text-red-800 font-medium">Upload Failed</p>
                <p className="text-red-700 text-sm">{uploadError}</p>
              </div>
            </div>
            <button onClick={dismissError} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Upload Instructions</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Upload your sensor data in Excel (.xlsx) format</p>
            <p>• Ensure your file contains columns for moisture, nitrogen, phosphorus, and potassium levels</p>
            <p>• Include plot numbers and timestamp data for proper organization</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-dashed border-2 border-gray-300 p-8 flex flex-col items-center justify-center text-gray-600">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Upload Sensor Data</h3>
            <p className="text-sm text-center mb-4">
              Drag and drop your .xlsx file here or click below to select
            </p>
            
            {/* File Input */}
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              id="file-upload"
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg cursor-pointer transition-colors mb-4 inline-block"
            >
              Choose File
            </label>

            {/* Selected File Display */}
            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full max-w-sm">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded mr-3">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="bg-gray-50 px-8 py-4">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                selectedFile && !uploading
                  ? "bg-[#2a9d4a] hover:bg-[#238a3e] text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                "Upload Sensor Data"
              )}
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Need Help?</h3>
          <p className="text-xs text-gray-600">
            If you're having trouble uploading your data, make sure your Excel file follows the correct format. 
            Contact support if the issue persists.
          </p>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button onClick={onHomeClick} className="flex flex-col items-center justify-center w-1/3 py-2 hover:bg-gray-50">
          <Home size={20} />
        </button>
        <button onClick={onProfileClick} className="flex flex-col items-center justify-center w-1/3 py-2 hover:bg-gray-50">
          <User size={20} />
        </button>
        <button onClick={() => onMenuClick(prev => !prev)} className="flex flex-col items-center justify-center w-1/3 py-2 hover:bg-gray-50">
          <Menu size={20} />
        </button>
      </div>
    </div>
  )
}