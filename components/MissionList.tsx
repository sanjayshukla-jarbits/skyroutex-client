'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, AlertTriangle, Trash2, Edit, Eye, Loader2, RefreshCw, Filter, Play, Pause, CheckCircle } from 'lucide-react'
import { 
  getMissions, 
  deleteMission, 
  startMission,
  pauseMission,
  completeMission,
  type ApiMission, 
  type PaginatedResponse 
} from '@/services/missionService'

interface MissionListComponentProps {
  onPageChange?: (page: string) => void
  onEditMission?: (mission: ApiMission) => void
  onViewMission?: (mission: ApiMission) => void
}

export default function MissionListComponent({ onPageChange, onEditMission, onViewMission }: MissionListComponentProps) {
  // State management
  const [missions, setMissions] = useState<ApiMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [totalMissions, setTotalMissions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const itemsPerPage = 10

  // Load missions on component mount and when filters change
  useEffect(() => {
    loadMissions()
  }, [filter, searchQuery, currentPage])

  const loadMissions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: any = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      }

      if (filter !== 'all') {
        params.status = filter
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const response = await getMissions(params)
      
      // Handle different API response formats
      if (response && typeof response === 'object') {
        // Check if response has missions array and total count
        if ('missions' in response && Array.isArray(response.missions)) {
          setMissions(response.missions)
          setTotalMissions(response.total || response.missions.length)
        } 
        // If response is directly an array
        else if (Array.isArray(response)) {
          setMissions(response)
          setTotalMissions(response.length)
        }
        // If response is paginated response
        else {
          setMissions([])
          setTotalMissions(0)
        }
      } else {
        setMissions([])
        setTotalMissions(0)
      }
      
      console.log('Loaded missions:', response) // Debug log
    } catch (err: any) {
      setError(err.message || 'Failed to load missions')
      console.error('Error loading missions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMissions()
    setRefreshing(false)
  }

  const handleDelete = async (id: number, missionName: string) => {
    if (!confirm(`Are you sure you want to delete mission "${missionName}"?`)) {
      return
    }

    try {
      await deleteMission(id)
      await loadMissions() // Reload the list
    } catch (err: any) {
      alert('Failed to delete mission: ' + err.message)
    }
  }

  // 🆕 NEW: Handle starting a mission
  const handleStartMission = async (mission: ApiMission) => {
    const confirmStart = confirm(
      `Start mission "${mission.mission_name}"?\n\n` +
      `Distance: ${mission.total_distance?.toFixed(2) || 'N/A'} km\n` +
      `Duration: ${mission.flight_time?.toFixed(1) || 'N/A'} min\n` +
      `Battery: ${mission.battery_usage?.toFixed(1) || 'N/A'}%`
    )

    if (!confirmStart) return

    try {
      await startMission(mission.id)
      alert(`✅ Mission "${mission.mission_name}" has been started!`)
      await loadMissions()
    } catch (err: any) {
      alert('Failed to start mission: ' + err.message)
      console.error('Error starting mission:', err)
    }
  }

  // 🆕 NEW: Handle pausing a mission
  const handlePauseMission = async (mission: ApiMission) => {
    if (!confirm(`Pause mission "${mission.mission_name}"?`)) return

    try {
      await pauseMission(mission.id)
      alert(`⏸️ Mission "${mission.mission_name}" has been paused.`)
      await loadMissions()
    } catch (err: any) {
      alert('Failed to pause mission: ' + err.message)
    }
  }

  // 🆕 NEW: Handle completing a mission
  const handleCompleteMission = async (mission: ApiMission) => {
    if (!confirm(`Mark mission "${mission.mission_name}" as completed?`)) return

    try {
      await completeMission(mission.id)
      alert(`✅ Mission "${mission.mission_name}" has been completed!`)
      await loadMissions()
    } catch (err: any) {
      alert('Failed to complete mission: ' + err.message)
    }
  }

  const handlePlanMission = () => {
    if (onPageChange) {
      onPageChange('mission-types')
    }
  }

  const handleViewMission = (mission: ApiMission) => {
    if (onViewMission) {
      onViewMission(mission)
    }
  }

  const handleEditMission = (mission: ApiMission) => {
    if (onEditMission) {
      onEditMission(mission)
    }
  }

  // Status color mapping
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'completed': return 'bg-green-500'
      case 'active':
      case 'in_progress':
      case 'in flight': return 'bg-blue-500'
      case 'pending':
      case 'draft': return 'bg-purple-500'
      case 'failed':
      case 'error': return 'bg-red-500'
      case 'paused': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  // ✅ ENHANCED: Mission type color mapping with more types
  const getTypeColor = (type: string | null): string => {
    if (!type) return 'bg-gray-600'
    const typeLower = type.toLowerCase()
    switch (typeLower) {
      // Surveillance & Security
      case 'surveillance': return 'bg-blue-600'
      case 'border surveillance': return 'bg-blue-700'
      case 'security patrol': return 'bg-cyan-600'
      
      // Route & Planning
      case 'route planning': return 'bg-indigo-600'
      case 'waypoint mission': return 'bg-indigo-500'
      case 'navigation': return 'bg-violet-600'
      
      // Logistics & Delivery
      case 'logistics': return 'bg-orange-700'
      case 'delivery': return 'bg-yellow-600'
      case 'supply drop': return 'bg-amber-600'
      
      // Agriculture
      case 'agriculture': return 'bg-green-600'
      case 'crop monitoring': return 'bg-lime-600'
      case 'spraying': return 'bg-emerald-600'
      
      // Emergency & Response
      case 'emergency': return 'bg-red-700'
      case 'search and rescue': return 'bg-red-600'
      case 'disaster response': return 'bg-rose-700'
      
      // Inspection & Maintenance
      case 'inspection': return 'bg-purple-600'
      case 'infrastructure inspection': return 'bg-purple-500'
      case 'maintenance': return 'bg-fuchsia-600'
      
      // Mapping & Survey
      case 'mapping': return 'bg-teal-600'
      case 'surveying': return 'bg-sky-600'
      case '3d mapping': return 'bg-cyan-700'
      case 'photogrammetry': return 'bg-blue-500'
      
      // Training & Testing
      case 'training': return 'bg-slate-600'
      case 'testing': return 'bg-gray-600'
      case 'demonstration': return 'bg-zinc-600'
      
      default: return 'bg-gray-600'
    }
  }

  // ✅ NEW: Convert corridor color name to Tailwind class
  const getCorridorBgColor = (color: string | null): string => {
    if (!color) return 'bg-gray-500'
    const colorLower = color.toLowerCase()
    switch (colorLower) {
      case 'blue': return 'bg-blue-500'
      case 'green': return 'bg-green-500'
      case 'orange': return 'bg-orange-500'
      case 'purple': return 'bg-purple-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      case 'pink': return 'bg-pink-500'
      case 'indigo': return 'bg-indigo-500'
      case 'cyan': return 'bg-cyan-500'
      case 'teal': return 'bg-teal-500'
      default: return 'bg-gray-500'
    }
  }

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } catch {
      return 'N/A'
    }
  }

  // Format time
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }) + ' UTC'
    } catch {
      return 'N/A'
    }
  }

  // Calculate time ago
  const getTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      return `${diffDays}d ago`
    } catch {
      return 'N/A'
    }
  }

  // Pagination
  const totalPages = totalMissions > 0 ? Math.ceil(totalMissions / itemsPerPage) : 1
  const pages = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1)

  // Filter tabs
  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' }
  ]

  return (
    <div className="flex-1 bg-slate-900 min-h-screen">
      <div className="p-8">
        {/* Header Section */}
        <div className="bg-blue-600 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mission List</h1>
              <p className="text-blue-100">Manage and monitor all UAV missions</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <div className="bg-slate-900 px-6 py-3 rounded-lg shadow-lg">
                <div className="text-slate-400 text-sm">Total Missions</div>
                <div className="text-3xl font-bold text-center text-white">{totalMissions}</div>
              </div>
            </div>
          </div>

          {/* Search and Actions Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search missions by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button 
              onClick={handlePlanMission} 
              className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Plus size={20} />
              <span>Plan Mission</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertTriangle size={20} />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Missions Table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Filter Tabs */}
          <div className="flex border-b border-slate-700">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setFilter(tab.value)
                  setCurrentPage(1) // Reset to first page on filter change
                }}
                className={`px-8 py-4 font-medium transition-colors ${
                  filter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={40} className="text-blue-500 animate-spin" />
              <span className="ml-3 text-slate-400 text-lg">Loading missions...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && missions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertTriangle size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">No missions found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'Create your first mission to get started'}
              </p>
            </div>
          )}

          {/* Missions Table */}
          {!loading && missions.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Mission ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Corridor</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Stats</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {missions.map((mission) => (
                      <tr key={mission.id} className="hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-white font-semibold">#{mission.id}</div>
                            <div className="text-slate-400 text-xs mt-1">{getTimeAgo(mission.created_at)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{mission.mission_name}</div>
                        </td>
                        {/* ✅ ENHANCED: Mission Type with gradient background */}
                        <td className="px-6 py-4">
                          {mission.mission_type ? (
                            <span className={`${getTypeColor(mission.mission_type)} px-3 py-1.5 rounded-full text-white text-xs font-semibold inline-block shadow-md`}>
                              {mission.mission_type}
                            </span>
                          ) : (
                            <span className="bg-gray-600 px-3 py-1.5 rounded-full text-white text-xs font-semibold inline-block">
                              No Type
                            </span>
                          )}
                        </td>
                        {/* ✅ ENHANCED: Corridor with color indicator */}
                        <td className="px-6 py-4">
                          <div>
                            {mission.corridor_label ? (
                              <div className="flex items-center space-x-2">
                                {/* Color indicator dot */}
                                <div className={`w-3 h-3 rounded-full ${getCorridorBgColor(mission.corridor_color)} shadow-md`}></div>
                                <div>
                                  <div className="text-white font-medium">{mission.corridor_label}</div>
                                  {mission.corridor_value && (
                                    <div className="text-slate-400 text-xs mt-0.5 capitalize">{mission.corridor_value}</div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">No corridor</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 ${getStatusColor(mission.status)} rounded-full animate-pulse`}></div>
                            <span className="text-white capitalize font-medium">{mission.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm space-y-1">
                            <div className="text-white font-medium">
                              {mission.total_distance ? `${mission.total_distance.toFixed(2)} km` : 'N/A'}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {mission.flight_time ? `${mission.flight_time.toFixed(1)} min` : 'N/A'}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {mission.battery_usage ? `${mission.battery_usage.toFixed(1)}%` : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-white">{formatDate(mission.created_at)}</div>
                            <div className="text-slate-400 text-sm">{formatTime(mission.created_at)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* 🆕 START BUTTON - Show for pending/draft missions */}
                            {(mission.status?.toLowerCase() === 'pending' || mission.status?.toLowerCase() === 'draft') && (
                              <button
                                onClick={() => handleStartMission(mission)}
                                className="p-2 text-green-400 hover:bg-slate-600 rounded transition-colors group relative"
                                title="Start Mission"
                              >
                                <Play size={18} className="fill-current" />
                                <span className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-xs text-white rounded whitespace-nowrap z-10">
                                  Start Mission
                                </span>
                              </button>
                            )}
                            
                            {/* 🆕 PAUSE BUTTON - Show for active missions */}
                            {(mission.status?.toLowerCase() === 'active' || mission.status?.toLowerCase() === 'in_progress') && (
                              <button
                                onClick={() => handlePauseMission(mission)}
                                className="p-2 text-yellow-400 hover:bg-slate-600 rounded transition-colors group relative"
                                title="Pause Mission"
                              >
                                <Pause size={18} className="fill-current" />
                                <span className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-xs text-white rounded whitespace-nowrap z-10">
                                  Pause Mission
                                </span>
                              </button>
                            )}
                            
                            {/* 🆕 COMPLETE BUTTON - Show for active/paused missions */}
                            {(mission.status?.toLowerCase() === 'active' || 
                              mission.status?.toLowerCase() === 'in_progress' || 
                              mission.status?.toLowerCase() === 'paused') && (
                              <button
                                onClick={() => handleCompleteMission(mission)}
                                className="p-2 text-green-500 hover:bg-slate-600 rounded transition-colors group relative"
                                title="Complete Mission"
                              >
                                <CheckCircle size={18} />
                                <span className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-xs text-white rounded whitespace-nowrap z-10">
                                  Complete Mission
                                </span>
                              </button>
                            )}

                            {/* VIEW BUTTON - Always visible */}
                            <button
                              onClick={() => handleViewMission(mission)}
                              className="p-2 text-blue-400 hover:bg-slate-600 rounded transition-colors"
                              title="View Mission"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {/* EDIT BUTTON - Only for non-active missions */}
                            {mission.status?.toLowerCase() !== 'active' && 
                             mission.status?.toLowerCase() !== 'in_progress' && (
                              <button
                                onClick={() => handleEditMission(mission)}
                                className="p-2 text-yellow-400 hover:bg-slate-600 rounded transition-colors"
                                title="Edit Mission"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            
                            {/* DELETE BUTTON - Only for draft/completed/failed missions */}
                            {(mission.status?.toLowerCase() === 'draft' || 
                              mission.status?.toLowerCase() === 'completed' || 
                              mission.status?.toLowerCase() === 'failed') && (
                              <button
                                onClick={() => handleDelete(mission.id, mission.mission_name)}
                                className="p-2 text-red-400 hover:bg-slate-600 rounded transition-colors"
                                title="Delete Mission"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
                <div className="text-slate-400 text-sm">
                  Showing {totalMissions > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {totalMissions > 0 ? Math.min(currentPage * itemsPerPage, totalMissions) : 0} of {totalMissions} missions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {pages.slice(0, 5).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="px-2 text-slate-400">...</span>}
                      {currentPage < totalPages - 1 && (
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                        >
                          {totalPages}
                        </button>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}