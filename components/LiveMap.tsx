'use client'

import { Activity, MapPin, Plus, AlertTriangle } from 'lucide-react'

export default function LiveMap() {
  return (
    <div className="flex-1 bg-slate-900 min-h-screen">
      <div className="p-6">
        <div className="bg-blue-600 rounded-xl p-6 mb-6 flex items-center justify-between shadow-xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Northern Border Corridor - Live Map</h1>
            <p className="text-blue-100">Real-time mission tracking and corridor overview</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors">
              <Activity size={20} />
              <span>Refresh</span>
            </button>
            <button className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors">
              <MapPin size={20} />
              <span>Center</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl" style={{ height: '600px' }}>
          <div className="h-full relative bg-gradient-to-br from-slate-700 to-slate-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full px-20">
                <div className="flex items-center justify-between relative">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">I</div>
                  <div className="flex-1 mx-4 border-t-4 border-dashed border-blue-400 relative">
                    <div className="absolute left-1/4 top-0 transform -translate-y-1/2">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                        <AlertTriangle className="text-white" size={20} />
                      </div>
                    </div>
                    <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg text-center text-sm">
                        NB-001<br />ACTIVE
                      </div>
                    </div>
                    <div className="absolute left-3/4 top-0 transform -translate-y-1/2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">P</div>
                    </div>
                    <div className="absolute left-1/3 top-0 transform -translate-y-1/2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">A</div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">D</div>
                </div>
              </div>
            </div>

            <div className="absolute top-6 right-6 bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg">
              <h3 className="text-white font-semibold mb-3 text-sm">Legend</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-300">Active Mission</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-slate-300">Pending Mission</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-slate-300">Alert/Warning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 border-t-2 border-blue-400"></div>
                  <span className="text-slate-300">Active Corridor</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                  <span className="text-slate-300">No-Fly Zone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-700 rounded-full"></div>
                  <span className="text-slate-300">Restricted Area</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 border-t-2 border-dashed border-blue-400"></div>
                  <span className="text-slate-300">Flight Path</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 left-6 bg-orange-800 rounded-lg px-6 py-3 border-2 border-orange-600 shadow-lg">
              <div className="text-orange-300 font-bold">RESTRICTED</div>
            </div>

            <div className="absolute bottom-6 right-6 bg-red-900 rounded-full w-32 h-32 flex items-center justify-center border-2 border-red-700 shadow-lg">
              <div className="text-red-300 font-bold text-center">
                NO<br />FLY
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
              <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg">
                <Plus size={20} />
              </button>
              <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg">
                −
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
