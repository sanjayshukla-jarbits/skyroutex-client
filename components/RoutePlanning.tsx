'use client'

import { useState } from 'react'
import { CheckCircle, MapPin, Plus, X, Map as MapIcon } from 'lucide-react'
import { Waypoint } from '@/types'

export default function RoutePlanning() {
  const [waypoints] = useState<Waypoint[]>([
    { id: 'start', label: 'Start: Mohanlalganj', coords: '26.7465° N, 80.8769° E', alt: '120m AGL', color: 'bg-green-500' },
    { id: 'stop1', label: 'Stop: Ajgain', coords: '26.6789° N, 80.5234° E', alt: '100m AGL', color: 'bg-blue-500' },
    { id: 'end', label: 'End: IIT Kanpur', coords: '26.5123° N, 80.2329° E', alt: '100m AGL', color: 'bg-red-500' }
  ])

  return (
    <div className="flex-1 bg-slate-900 min-h-screen">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Mohanlalganj to IIT Kanpur - Corridor Mission</h1>
          <p className="text-slate-400 text-sm">Uttar Pradesh Surveillance Route • Distance: ~45 km • Duration: ~18 min</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
            <CheckCircle size={20} />
            <span>Validate</span>
          </button>
          <button className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg">
            <span>Save Mission</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6">
        <div className="col-span-2 bg-slate-800 rounded-xl p-6 relative shadow-xl" style={{ height: '600px' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapIcon size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Interactive Map View - Route: Mohanlalganj → Ajgain → IIT Kanpur</p>
              <div className="mt-6 flex items-center justify-center space-x-4">
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                <div className="w-16 border-t-2 border-dashed border-blue-400"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                <div className="w-16 border-t-2 border-dashed border-blue-400"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
              </div>
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg">
            <h3 className="text-white font-semibold mb-3 text-sm">LEGEND</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-300">Start Point</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Waypoint/Stop</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-slate-300">End Point</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 border-t-2 border-dashed border-blue-400"></div>
                <span className="text-slate-300">Flight Path</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-300">Alert Zone</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                <span className="text-slate-300">No-Fly Zone</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400 text-xs mb-1">Total Distance</div>
                <div className="text-green-400 font-bold">44.8 km</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Flight Time</div>
                <div className="text-white font-bold">~18 min</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Battery Usage</div>
                <div className="text-white font-bold">~45%</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Waypoints</div>
                <div className="text-white font-bold">3 points</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Avg Speed</div>
                <div className="text-green-400 font-bold">150 km/h</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-green-500 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="text-green-500" size={16} />
                <span className="text-slate-400 text-xs font-semibold">MISSION START POINT</span>
              </div>
              <X className="text-slate-500 cursor-pointer hover:text-white" size={16} />
            </div>
            <div className="text-white font-medium">Mohanlalganj, Uttar Pradesh 226301</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-red-500 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="text-red-500" size={16} />
                <span className="text-slate-400 text-xs font-semibold">MISSION END POINT</span>
              </div>
              <X className="text-slate-500 cursor-pointer hover:text-white" size={16} />
            </div>
            <div className="text-white font-medium">IIT Kanpur, Kalyanpur, Kanpur</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-semibold">ADD INTERMEDIATE STOPS</span>
            </div>
            <input
              type="text"
              placeholder="Search location or enter coordinates..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm"
            />
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              <span className="text-sm">Add Stop to Route</span>
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">ROUTE WAYPOINTS</h3>
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">{waypoints.length}</span>
            </div>
            <div className="space-y-3">
              {waypoints.map((waypoint, index) => (
                <div key={waypoint.id}>
                  <div className="flex items-start space-x-3">
                    <div className={`${waypoint.color} text-white font-bold w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0 shadow-lg`}>
                      {waypoint.id === 'start' ? 'S' : waypoint.id === 'end' ? 'E' : '1'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{waypoint.label}</div>
                      <div className="text-slate-400 text-xs">{waypoint.coords}</div>
                      <div className="text-blue-400 text-xs">{waypoint.alt}</div>
                    </div>
                    <X className="text-slate-500 cursor-pointer hover:text-white flex-shrink-0" size={16} />
                  </div>
                  {index < waypoints.length - 1 && (
                    <div className="ml-4 my-2 text-blue-400">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}