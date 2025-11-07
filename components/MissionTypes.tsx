'use client'

import { Plus } from 'lucide-react'
import { missionTypes } from '@/lib/data'

interface MissionTypesProps {
  onPageChange?: (page: string) => void
}

export default function MissionTypes({ onPageChange }: MissionTypesProps) {
  const handleMissionTypeClick = (missionTypeName: string) => {
    if (onPageChange) {
      onPageChange('plan-mission')
    }
  }

  return (
    <div className="flex-1 bg-slate-900 min-h-screen p-8">
      <div className="bg-blue-600 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Mission Types</h1>
            <p className="text-blue-100">Select a mission type to view details and create new missions</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
              <Plus size={20} />
              <span>Add New Type</span>
            </button>
            <div className="bg-slate-900 px-6 py-3 rounded-lg shadow-lg">
              <div className="text-slate-400 text-sm">Total Mission Types</div>
              <div className="text-3xl font-bold text-center text-white">8</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {missionTypes.map((type, index) => {
          const Icon = type.icon
          return (
            <div
              key={index}
              onClick={() => handleMissionTypeClick(type.name)}
              className={`${type.color} rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer shadow-xl`}
            >
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-black bg-opacity-20 rounded-full flex items-center justify-center">
                  <Icon size={32} className="text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-2">{type.name}</h3>
              <p className="text-white text-opacity-90 text-center text-sm mb-6">{type.description}</p>
              <div className="flex items-center justify-between text-white text-sm">
                <div>
                  <div className="text-white text-opacity-80">Active Missions</div>
                  <div className="text-white text-opacity-80">Last used: {type.lastUsed}</div>
                </div>
                <div className="text-3xl font-bold">{type.active}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}