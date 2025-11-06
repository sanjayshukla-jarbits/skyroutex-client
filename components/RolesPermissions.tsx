'use client'

import { Plus, User, CheckCircle, XCircle } from 'lucide-react'
import { rolesData } from '@/lib/data'

export default function RolesPermissions() {
  return (
    <div className="flex-1 bg-slate-900 min-h-screen p-8">
      <div className="bg-blue-600 rounded-xl p-6 mb-8 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Roles & Permissions</h1>
          <p className="text-blue-100">Manage user roles and access control</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
          <Plus size={20} />
          <span>Add New Role</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {rolesData.map((role, index) => (
          <div key={index} className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start space-x-4">
                <div className={`${role.color} w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}>
                  <User className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{role.name}</h3>
                  <p className="text-slate-400 text-sm">{role.description}</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Edit
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3 text-sm">Permissions</h4>
              <div className="space-y-2">
                {role.permissions.map((permission, pIndex) => (
                  <div key={pIndex} className="flex items-start space-x-3 p-3 bg-slate-700 rounded-lg">
                    {permission.allowed ? (
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
                    ) : (
                      <XCircle className="text-slate-500 flex-shrink-0 mt-0.5" size={18} />
                    )}
                    <div>
                      <div className={`font-medium text-sm ${permission.allowed ? 'text-white' : 'text-slate-500'}`}>
                        {permission.name}
                      </div>
                      <div className={`text-xs ${permission.allowed ? 'text-slate-400' : 'text-slate-600'}`}>
                        {permission.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-slate-400 text-sm">
              Active Users: <span className="text-white font-semibold">{role.activeUsers}</span> • Created: Jan 2025
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}