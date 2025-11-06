'use client'

import { useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Award, Activity, Clock, Target, Edit, Camera, Shield, Bell } from 'lucide-react'

export default function UserProfile() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="flex-1 bg-slate-900 min-h-screen p-8">
      {/* Header */}
      <div className="bg-blue-600 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
            <p className="text-blue-100">Manage your personal information and preferences</p>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            <Edit size={20} />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="col-span-1 space-y-6">
          {/* Profile Image Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-5xl font-bold text-white">JS</span>
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg border-4 border-slate-800">
                    <Camera size={18} />
                  </button>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">John Smith</h2>
              <p className="text-blue-400 mb-2">Senior UAV Operator</p>
              <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm">
                <Shield size={16} />
                <span>Commander Role</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
              <div className="flex items-center space-x-3 text-slate-300">
                <Mail size={18} className="text-blue-400" />
                <span className="text-sm">john.smith@jarbits.com</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <Phone size={18} className="text-blue-400" />
                <span className="text-sm">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <MapPin size={18} className="text-blue-400" />
                <span className="text-sm">Pune, Maharashtra</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <Calendar size={18} className="text-blue-400" />
                <span className="text-sm">Joined: Jan 15, 2024</span>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <Activity size={20} className="text-blue-400" />
              <span>Activity Statistics</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Missions Completed</span>
                  <span className="text-white font-bold text-lg">127</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Success Rate</span>
                  <span className="text-green-400 font-bold text-lg">98.5%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Total Flight Hours</span>
                  <span className="text-blue-400 font-bold text-lg">342h</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Certifications Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <Award size={20} className="text-yellow-400" />
              <span>Certifications</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500 bg-opacity-20 rounded-full flex items-center justify-center">
                  <Award size={18} className="text-yellow-400" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Advanced UAV Pilot</div>
                  <div className="text-slate-400 text-xs">Expires: Dec 2025</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
                  <Award size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Mission Commander</div>
                  <div className="text-slate-400 text-xs">Expires: Mar 2026</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center">
                  <Award size={18} className="text-green-400" />
                </div>
                <div>
                  <div className="text-white font-medium text-sm">Safety Specialist</div>
                  <div className="text-slate-400 text-xs">Expires: Jun 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Personal Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">First Name</label>
                <input
                  type="text"
                  defaultValue="John"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  defaultValue="Smith"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  defaultValue="john.smith@jarbits.com"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Phone Number</label>
                <input
                  type="tel"
                  defaultValue="+91 98765 43210"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Date of Birth</label>
                <input
                  type="date"
                  defaultValue="1990-05-15"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Employee ID</label>
                <input
                  type="text"
                  defaultValue="EMP-2024-001"
                  disabled
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6">Address Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-slate-400 text-sm mb-2">Street Address</label>
                <input
                  type="text"
                  defaultValue="123 Aviation Street"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">City</label>
                <input
                  type="text"
                  defaultValue="Pune"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">State</label>
                <input
                  type="text"
                  defaultValue="Maharashtra"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">PIN Code</label>
                <input
                  type="text"
                  defaultValue="411001"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Country</label>
                <input
                  type="text"
                  defaultValue="India"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isEditing && 'opacity-60'}`}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock size={24} className="text-blue-400" />
              <span>Recent Activity</span>
            </h3>
            <div className="space-y-4">
              {[
                { action: 'Completed Mission #M-2024-045', time: '2 hours ago', color: 'bg-green-500' },
                { action: 'Updated Route Planning for Mission #M-2024-046', time: '5 hours ago', color: 'bg-blue-500' },
                { action: 'Approved Emergency Mission Request', time: '1 day ago', color: 'bg-yellow-500' },
                { action: 'Completed Safety Training Module', time: '2 days ago', color: 'bg-purple-500' },
                { action: 'Modified Vehicle Configuration', time: '3 days ago', color: 'bg-orange-500' }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-4 p-3 bg-slate-700 rounded-lg hover:bg-slate-650 transition-colors">
                  <div className={`${activity.color} w-2 h-2 rounded-full mt-2 flex-shrink-0`}></div>
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{activity.action}</div>
                    <div className="text-slate-400 text-xs mt-1">{activity.time}</div>
                  </div>
                  <Target size={16} className="text-slate-500 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end space-x-4">
              <button className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}