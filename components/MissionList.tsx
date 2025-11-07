'use client'

import { useState } from 'react'
import { Search, Filter, Plus, AlertTriangle } from 'lucide-react'
import { missionsData } from '@/lib/data'
import { Mission } from '@/types'

interface MissionListProps {
  onPageChange?: (page: string) => void
}

export default function MissionList({ onPageChange }: MissionListProps) {
  const [filter, setFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const getStatusColor = (status: Mission['status']): string => {
    switch (status) {
      case 'In Flight': return 'bg-green-500'
      case 'Completed': return 'bg-green-500'
      case 'Pending': return 'bg-purple-500'
      case 'Low Battery': return 'bg-yellow-500'
      case 'Failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'Surveillance': return 'bg-blue-600'
      case 'Logistics': return 'bg-orange-700'
      case 'Agriculture': return 'bg-green-600'
      case 'Emergency': return 'bg-red-700'
      case 'Inspection': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  const filteredMissions = missionsData.filter(mission => {
    if (filter !== 'All' && mission.status !== filter) return false
    if (searchQuery && !mission.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handlePlanMission = () => {
    if (onPageChange) {
      onPageChange('mission-types')
    }
  }

  return (
    <div className="flex-1 bg-slate-900 min-h-screen">
      <div className="p-8">
        <div className="bg-blue-600 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mission List</h1>
              <p className="text-blue-100">Manage and monitor all UAV missions</p>
            </div>
            <div className="bg-slate-900 px-6 py-3 rounded-lg shadow-lg">
              <div className="text-slate-400 text-sm">Total Missions</div>
              <div className="text-3xl font-bold text-center text-white">24</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search Missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button className="flex items-center space-x-2 px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors">
              <Filter size={20} />
              <span>Filters</span>
            </button>
            <button 
              onClick={handlePlanMission} 
              className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Plus size={20} />
              <span>Plan Mission</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="flex border-b border-slate-700">
            {['All', 'Active', 'Completed', 'Pending', 'Failed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-8 py-4 font-medium transition-colors ${
                  filter === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Mission ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredMissions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-semibold">{mission.id}</div>
                        <div className="text-slate-400 text-xs mt-1">Created {mission.created}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{mission.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`${getTypeColor(mission.type)} px-3 py-1 rounded-full text-white text-sm font-medium`}>
                        {mission.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white">{mission.vehicle}</div>
                        <div className="text-slate-400 text-sm">{mission.operator}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 ${getStatusColor(mission.status)} rounded-full`}></div>
                        <span className="text-white">{mission.status}</span>
                        {mission.alert && <AlertTriangle size={16} className="text-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${mission.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-medium text-sm w-12">{mission.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white">{mission.date}</div>
                        <div className="text-slate-400 text-sm">{mission.time}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
            <div className="text-slate-400 text-sm">Showing {filteredMissions.length} of 24 missions</div>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                Previous
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">1</button>
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">2</button>
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">3</button>
              <span className="px-2 text-slate-400">...</span>
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">5</button>
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}