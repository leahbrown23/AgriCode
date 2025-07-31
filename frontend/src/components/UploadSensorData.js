"use client"

import { ArrowLeft, Home, User, Menu, Upload, X, FileSpreadsheet, HelpCircle } from "lucide-react"
import { useState, useRef } from "react"
import api from "../api/api"

export default function UploadSensorDataScreen({ onBackClick, onHomeClick, onProfileClick, onMenuClick }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  const handleFileSelect = (file) => {
    if (file && file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      setSelectedFile(file)
      setUploadError("")
    } else {
      setUploadError("Please select a valid .xlsx file")
    }
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    setUploadError("")
    setUploadSuccess(false)
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError("")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await api.post("/api/upload-sensor-data/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      setUploadSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setTimeout(() => {
        setUploadSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(error.response?.data?.message || "Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full pb-12">
      {/* Top Header */}
      <div className="p-4 bg-white flex items-center shadow-sm">
        <button onClick={onBackClick} className="mr-2 p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Upload Sensor Data</h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-[#d1e6b2] p-4 space-y-4">
        {/* Success Message */}
        {uploadSuccess && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center text-white">
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="font-medium">File uploaded successfully!</span>
            </div>
          </div>
        )}
        {/* Error Message */}
        {uploadError && (
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-4">
            <div className="flex items-center text-white">
              <div className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <span className="font-medium">{uploadError}</span>
            </div>
          </div>
        )}
        {/* Upload Area */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Upload Sensor Data</h2>
            <p className="text-gray-600 text-sm">Drag and drop your .xlsx file here or click below to select</p>
          </div>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-blue-900">{selectedFile.name}</div>
                    <div className="text-sm text-blue-600">{formatFileSize(selectedFile.size)}</div>
                  </div>
                </div>
                <button
                  onClick={handleFileRemove}
                  className="p-2 hover:bg-red-100 rounded-full transition-colors group"
                  title="Remove file"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                </button>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {selectedFile && (
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  "Upload Sensor Data"
                )}
              </button>
            </div>
          )}
        </div>
        {/* Help Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Need Help?</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            If you're having trouble uploading your data, make sure your Excel file follows the correct format. The file
            should contain columns for sensor readings including pH, nitrogen, phosphorus, potassium, and moisture
            levels. Contact support if the issue persists.
          </p>
        </div>
        <div className="h-2" /> {/* Spacer to prevent content from touching nav */}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center h-12 border-t bg-white shadow-lg">
        <button
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button
          onClick={onProfileClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <User size={20} className="text-gray-600" />
        </button>
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-1/3 hover:bg-gray-50 transition-colors py-2"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>
    </div>
  )
}
