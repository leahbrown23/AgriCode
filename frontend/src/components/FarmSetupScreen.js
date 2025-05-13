"use client"

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  return (

    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Farm Set Up</h1>
      </div>
    <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
      <div className="w-full space-y-3">
        <input type="text" placeholder="Farm Name" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="text" placeholder="Location" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="email" placeholder="Crop Types" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="password" placeholder="Size (in hectares)" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="text" placeholder="LiveStock" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <button
          onClick={onRegisterClick}
          className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded mt-2"
        >
        Register
        </button>
        <button onClick={onBackClick} className="text-sm text-gray-700 hover:underline">
            Back
        </button>
      </div>
    </div>
    </div>
  )
}
