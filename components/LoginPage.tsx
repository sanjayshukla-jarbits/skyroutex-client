'use client'

import { useState, FormEvent } from 'react'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [remember, setRemember] = useState<boolean>(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onLogin()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center animate-fadeIn">
      <div className="w-full max-w-md px-4">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-white">J</div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Jarbits</h1>
            <p className="text-slate-400 text-sm">FUTURE IS NOW</p>
            <h2 className="text-2xl font-semibold text-white mt-6">Login</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-slate-300 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                />
                Remember me
              </label>
              <a href="#" className="text-blue-400 text-sm hover:text-blue-300">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-lg"
            >
              Sign In
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-8">
            © 2025 Jarbits - SkyrouteX Platform v1.0
          </p>
        </div>
      </div>
    </div>
  )
}