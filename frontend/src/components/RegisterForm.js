"use client"

export default function RegisterForm({ onRegisterClick, onBackClick }) {
  return (
    <div className="flex flex-col h-full bg-[#d1e6b2] p-6">
      <h2 className="text-right text-[#2a9d4a] font-medium mb-4">Create an account</h2>
      <div className="w-full space-y-3">
        <input type="text" placeholder="First Name" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="text" placeholder="Last Name" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="email" placeholder="Email" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="password" placeholder="Password" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="text" placeholder="Farm Name" className="w-full bg-white border border-gray-300 p-2 rounded" />
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
  )
}
