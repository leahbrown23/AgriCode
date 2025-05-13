"use client"

export default function LoginForm({ onLoginClick, onSignUpClick }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#d1e6b2] p-6">
      <div className="w-full space-y-4">
        <input type="text" placeholder="Username" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <input type="password" placeholder="Password" className="w-full bg-white border border-gray-300 p-2 rounded" />
        <button onClick={onLoginClick} className="bg-[#2a9d4a] hover:bg-[#238a3e] text-white w-full py-2 rounded">
          Login
        </button>
        <div className="text-center mt-4">
          <button onClick={onSignUpClick} className="text-sm text-gray-700 hover:underline">
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
