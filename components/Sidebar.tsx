'use client'

import { Activity, Map as MapIcon, Target, CheckCircle, Clock, Package, User, Settings, BookOpen, LogOut } from 'lucide-react'
import { MenuItem } from '@/types'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: Activity },
    { id: 'awareness', label: 'Situational Awareness', icon: MapIcon },
    { id: 'missions', label: 'Missions', icon: Target },
    { id: 'plan-mission', label: 'Plan Mission', icon: CheckCircle, indent: true },
    { id: 'execute-mission', label: 'Execute Mission', icon: CheckCircle, indent: true },
    { id: 'vehicles', label: 'Vehicle Library', icon: Package },
    { id: 'operators', label: 'Operator Library', icon: User }
  ]

  return (
    <div className="w-72 bg-slate-900 min-h-screen border-r border-slate-800 flex flex-col animate-slideIn">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">J</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Jarbits</h1>
            <p className="text-xs text-slate-400">FUTURE IS NOW</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800'
              } ${item.indent ? 'ml-6' : ''}`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button 
          onClick={() => onPageChange('profile')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <User size={20} />
          <span className="text-sm">User Profile</span>
        </button>
        <button 
          onClick={() => onPageChange('settings')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Settings size={20} />
          <span className="text-sm">Settings</span>
        </button>
        <button 
          onClick={() => onPageChange('guide')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            currentPage === 'guide' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <BookOpen size={20} />
          <span className="text-sm">Guide</span>
        </button>
        <button className="w-full flex items-center justify-between px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
          <div className="flex items-center space-x-3">
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </div>
          <span className="text-xs text-slate-500">v1.0</span>
        </button>
      </div>
    </div>
  )
}