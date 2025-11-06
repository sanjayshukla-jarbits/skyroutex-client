'use client'

import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Lock, Globe, Moon, Sun, Shield, Database, Wifi, Volume2, Eye, Monitor } from 'lucide-react'

export default function Settings() {
  const [notifications, setNotifications] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)

  return (
    <div className="flex-1 bg-slate-900 min-h-screen p-8">
      {/* Header */}
      <div className="bg-blue-600 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-blue-100">Configure your application preferences and security</p>
          </div>
          <SettingsIcon size={40} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Notifications Settings */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Bell size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Notifications</h3>
              <p className="text-slate-400 text-sm">Manage your notification preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Push Notifications</div>
                <div className="text-slate-400 text-sm">Receive real-time mission updates</div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-14 h-8 rounded-full transition-colors ${notifications ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${notifications ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Email Alerts</div>
                <div className="text-slate-400 text-sm">Get mission summaries via email</div>
              </div>
              <button
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`relative w-14 h-8 rounded-full transition-colors ${emailAlerts ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${emailAlerts ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">SMS Alerts</div>
                <div className="text-slate-400 text-sm">Critical alerts via text message</div>
              </div>
              <button
                onClick={() => setSmsAlerts(!smsAlerts)}
                className={`relative w-14 h-8 rounded-full transition-colors ${smsAlerts ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${smsAlerts ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Notification Sound</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Default</option>
                <option>Alert Tone 1</option>
                <option>Alert Tone 2</option>
                <option>Silent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Lock size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Security</h3>
              <p className="text-slate-400 text-sm">Protect your account and data</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Two-Factor Authentication</div>
                <div className="text-slate-400 text-sm">Add an extra layer of security</div>
              </div>
              <button
                onClick={() => setTwoFactor(!twoFactor)}
                className={`relative w-14 h-8 rounded-full transition-colors ${twoFactor ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${twoFactor ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Change Password
              </button>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-2">Session Timeout</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
                <option>Never</option>
              </select>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <button className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors font-medium">
                View Active Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Monitor size={24} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Appearance</h3>
              <p className="text-slate-400 text-sm">Customize the look and feel</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Moon size={20} className="text-blue-400" />
                <div>
                  <div className="text-white font-medium">Dark Mode</div>
                  <div className="text-slate-400 text-sm">Enable dark theme</div>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative w-14 h-8 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${darkMode ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Theme Color</div>
              <div className="grid grid-cols-5 gap-3">
                <button className="w-12 h-12 bg-blue-600 rounded-lg border-2 border-white"></button>
                <button className="w-12 h-12 bg-purple-600 rounded-lg"></button>
                <button className="w-12 h-12 bg-green-600 rounded-lg"></button>
                <button className="w-12 h-12 bg-orange-600 rounded-lg"></button>
                <button className="w-12 h-12 bg-red-600 rounded-lg"></button>
              </div>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Font Size</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Small</option>
                <option>Medium (Default)</option>
                <option>Large</option>
                <option>Extra Large</option>
              </select>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Sidebar Position</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Left (Default)</option>
                <option>Right</option>
              </select>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Globe size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">General</h3>
              <p className="text-slate-400 text-sm">Application preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Language</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Time Zone</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>IST (GMT +5:30)</option>
                <option>UTC (GMT +0:00)</option>
                <option>EST (GMT -5:00)</option>
                <option>PST (GMT -8:00)</option>
              </select>
            </div>

            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="text-white font-medium mb-3">Date Format</div>
              <select className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Auto-Save</div>
                <div className="text-slate-400 text-sm">Automatically save changes</div>
              </div>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`relative w-14 h-8 rounded-full transition-colors ${autoSave ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${autoSave ? 'transform translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <Database size={24} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Data & Storage</h3>
              <p className="text-slate-400 text-sm">Manage your data and storage preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-2">Storage Used</div>
              <div className="text-2xl font-bold text-white mb-2">2.4 GB</div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '48%' }}></div>
              </div>
              <div className="text-slate-400 text-xs mt-2">48% of 5 GB</div>
            </div>

            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-2">Cached Data</div>
              <div className="text-2xl font-bold text-white mb-4">342 MB</div>
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                Clear Cache
              </button>
            </div>

            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-slate-400 text-sm mb-2">Backup Status</div>
              <div className="text-lg font-bold text-green-400 mb-4">Up to date</div>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Backup Now
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium">
              Export Data
            </button>
            <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <div className="mt-8 flex justify-end">
        <button className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-xl">
          Save All Settings
        </button>
      </div>
    </div>
  )
}