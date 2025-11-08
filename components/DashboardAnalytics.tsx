'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Clock,
  MapPin,
  Battery,
  Target,
  BarChart3
} from 'lucide-react'

interface MissionStats {
  total_missions: number
  by_status: {
    [key: string]: number
  }
  average_distance_km: number
  average_flight_time_min: number
  total_distance_km: number
}

interface DashboardData {
  recentMissions: Array<{
    id: string
    name: string
    status: string
    time: string
  }>
  activeVehicles: number
  todayFlights: number
  successRate: number
}

export default function DashboardAnalytics() {
  const [stats, setStats] = useState<MissionStats | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<string>('7d')

  // Fetch statistics from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/missions/stats/summary')
        const data = await response.json()
        if (data.success) {
          setStats(data.statistics)
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Mock data for demonstration
  const dashboardData: DashboardData = {
    recentMissions: [
      { id: 'M-2024-045', name: 'Border Surveillance Alpha', status: 'Completed', time: '2h ago' },
      { id: 'M-2024-046', name: 'Supply Drop Beta', status: 'In Flight', time: '30m ago' },
      { id: 'M-2024-047', name: 'Inspection Route C', status: 'Pending', time: '1h ago' },
      { id: 'M-2024-048', name: 'Emergency Response', status: 'In Flight', time: '15m ago' },
    ],
    activeVehicles: 12,
    todayFlights: 24,
    successRate: 98.5
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'bg-green-500'
      case 'In Flight': return 'bg-blue-500'
      case 'Pending': return 'bg-yellow-500'
      case 'Failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color 
  }: { 
    title: string
    value: string | number
    icon: any
    trend?: string
    color: string 
  }) => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl hover:border-blue-500 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <div className="flex items-center space-x-1 text-green-400 text-sm">
            <TrendingUp size={16} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{title}</div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex-1 bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-slate-900 min-h-screen overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard & Analytics</h1>
              <p className="text-slate-400">Real-time mission insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-3">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Missions"
            value={stats?.total_missions || 0}
            icon={Target}
            trend="+12%"
            color="bg-blue-500"
          />
          <StatCard
            title="Active Vehicles"
            value={dashboardData.activeVehicles}
            icon={Package}
            trend="+5%"
            color="bg-green-500"
          />
          <StatCard
            title="Success Rate"
            value={`${dashboardData.successRate}%`}
            icon={CheckCircle}
            trend="+2.3%"
            color="bg-purple-500"
          />
          <StatCard
            title="Total Distance"
            value={`${stats?.total_distance_km.toFixed(0) || 0} km`}
            icon={MapPin}
            trend="+18%"
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Mission Status Breakdown */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <BarChart3 size={24} className="text-blue-400" />
                <span>Mission Status Overview</span>
              </h2>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                View Details →
              </button>
            </div>

            {/* Status Bars */}
            <div className="space-y-4">
              {stats?.by_status && Object.entries(stats.by_status).map(([status, count]) => {
                const percentage = ((count / stats.total_missions) * 100).toFixed(1)
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 font-medium">{status}</span>
                      <span className="text-white font-bold">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className={`${getStatusColor(status)} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {stats?.by_status['Completed'] || 0}
                </div>
                <div className="text-slate-400 text-sm mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {stats?.by_status['In Flight'] || 0}
                </div>
                <div className="text-slate-400 text-sm mt-1">In Flight</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {stats?.by_status['Pending'] || 0}
                </div>
                <div className="text-slate-400 text-sm mt-1">Pending</div>
              </div>
            </div>
          </div>

          {/* Recent Missions */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Activity size={24} className="text-blue-400" />
              <span>Recent Missions</span>
            </h2>
            <div className="space-y-3">
              {dashboardData.recentMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-3 bg-slate-700 rounded-lg hover:bg-slate-650 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{mission.id}</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 ${getStatusColor(mission.status)} rounded-full`}></div>
                      <span className="text-xs text-slate-400">{mission.time}</span>
                    </div>
                  </div>
                  <div className="text-slate-300 text-xs">{mission.name}</div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              View All Missions
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Average Flight Time */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Avg Flight Time</div>
                <div className="text-2xl font-bold text-white">
                  {stats?.average_flight_time_min.toFixed(1) || 0} min
                </div>
              </div>
            </div>
            <div className="text-green-400 text-sm flex items-center space-x-1">
              <TrendingUp size={14} />
              <span>8% faster than last week</span>
            </div>
          </div>

          {/* Average Distance */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <MapPin size={20} className="text-purple-400" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Avg Distance</div>
                <div className="text-2xl font-bold text-white">
                  {stats?.average_distance_km.toFixed(1) || 0} km
                </div>
              </div>
            </div>
            <div className="text-green-400 text-sm flex items-center space-x-1">
              <TrendingUp size={14} />
              <span>12% increase</span>
            </div>
          </div>

          {/* Battery Efficiency */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <Battery size={20} className="text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Battery Efficiency</div>
                <div className="text-2xl font-bold text-white">94.2%</div>
              </div>
            </div>
            <div className="text-green-400 text-sm flex items-center space-x-1">
              <TrendingUp size={14} />
              <span>Optimal performance</span>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <AlertTriangle size={24} className="text-yellow-400" />
            <span>System Alerts & Notifications</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-yellow-400 mt-1" />
                <div>
                  <div className="text-yellow-400 font-semibold">Low Battery Warning</div>
                  <div className="text-slate-300 text-sm mt-1">
                    Vehicle UAV-007 reporting 15% battery - Mission M-2024-046
                  </div>
                  <div className="text-slate-400 text-xs mt-2">5 minutes ago</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle size={20} className="text-blue-400 mt-1" />
                <div>
                  <div className="text-blue-400 font-semibold">Mission Completed</div>
                  <div className="text-slate-300 text-sm mt-1">
                    Border Surveillance Alpha completed successfully
                  </div>
                  <div className="text-slate-400 text-xs mt-2">2 hours ago</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <Package size={20} className="text-green-400 mt-1" />
                <div>
                  <div className="text-green-400 font-semibold">New Vehicle Added</div>
                  <div className="text-slate-300 text-sm mt-1">
                    UAV-015 (DJI Matrice 300) added to fleet
                  </div>
                  <div className="text-slate-400 text-xs mt-2">1 day ago</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-500 bg-opacity-10 border border-purple-500 rounded-lg">
              <div className="flex items-start space-x-3">
                <Target size={20} className="text-purple-400 mt-1" />
                <div>
                  <div className="text-purple-400 font-semibold">Route Optimized</div>
                  <div className="text-slate-300 text-sm mt-1">
                    AI optimized route for Mission M-2024-048, saving 12 minutes
                  </div>
                  <div className="text-slate-400 text-xs mt-2">3 hours ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}