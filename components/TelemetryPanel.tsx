'use client'

import { 
  Activity, 
  MapPin, 
  Navigation, 
  Gauge, 
  Battery, 
  Compass, 
  Wind, 
  Thermometer,
  Signal,
  Clock,
  Satellite,
  Radio
} from 'lucide-react'

interface TelemetryPanelProps {
  telemetryData: TelemetryData | null
}

interface TelemetryData {
  timestamp: string
  drone_state: {
    connected: boolean
    armed: boolean
    flying: boolean
    current_position: {
      lat: number
      lon: number
      alt: number
    }
    home_position?: {
      lat: number
      lon: number
      alt: number
    }
    battery_level: number
    flight_mode: string
    mission_active: boolean
    mission_current: number
    mission_count: number
  }
  telemetry: {
    position?: { lat: number; lon: number; alt: number }
    velocity?: { vx: number; vy: number; vz: number }
    attitude?: { roll: number; pitch: number; yaw: number }
    battery?: { voltage: number; current: number; remaining: number }
    gps?: {
      fix_type: number
      satellites_visible: number
      hdop: number
      vdop: number
    }
  }
  geofence_violation: boolean
  geofence_message: string
}

export default function TelemetryPanel({ telemetryData }: TelemetryPanelProps) {
  const formatCoordinate = (value: number, decimals: number = 6) => {
    return value.toFixed(decimals)
  }

  const formatSpeed = (vx: number, vy: number, vz: number) => {
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
    return speed.toFixed(2)
  }

  const getGPSFixType = (fixType: number) => {
    const types = ['No GPS', 'No Fix', '2D Fix', '3D Fix', 'DGPS', 'RTK Float', 'RTK Fixed']
    return types[fixType] || 'Unknown'
  }

  const getSignalQuality = (satellites: number) => {
    if (satellites >= 10) return { color: 'text-green-400', label: 'Excellent' }
    if (satellites >= 6) return { color: 'text-yellow-400', label: 'Good' }
    if (satellites >= 4) return { color: 'text-orange-400', label: 'Fair' }
    return { color: 'text-red-400', label: 'Poor' }
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-400'
    if (level > 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getAltitudeColor = (alt: number) => {
    if (alt > 50) return 'text-blue-400'
    if (alt > 20) return 'text-green-400'
    if (alt > 5) return 'text-yellow-400'
    return 'text-orange-400'
  }

  if (!telemetryData) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Activity size={20} className="text-blue-400" />
          <span>Telemetry</span>
        </h2>
        <div className="text-center py-12">
          <Radio size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">Waiting for telemetry data...</p>
          <p className="text-slate-600 text-sm mt-2">Connect to drone</p>
        </div>
      </div>
    )
  }

  const { drone_state, telemetry, timestamp } = telemetryData
  const signalQuality = telemetry.gps ? getSignalQuality(telemetry.gps.satellites_visible) : null

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Activity size={20} className="text-blue-400" />
          <span>Live Telemetry</span>
        </h2>
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${drone_state.connected ? 'bg-green-500 bg-opacity-20' : 'bg-red-500 bg-opacity-20'}`}>
            <div className="flex items-center space-x-2">
              <Radio size={16} className={drone_state.connected ? 'text-green-400' : 'text-red-400'} />
              <span className={`text-sm font-medium ${drone_state.connected ? 'text-green-400' : 'text-red-400'}`}>
                {drone_state.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${drone_state.flying ? 'bg-blue-500 bg-opacity-20' : 'bg-slate-700'}`}>
            <div className="flex items-center space-x-2">
              <Activity size={16} className={drone_state.flying ? 'text-blue-400' : 'text-slate-400'} />
              <span className={`text-sm font-medium ${drone_state.flying ? 'text-blue-400' : 'text-slate-400'}`}>
                {drone_state.flying ? 'Flying' : 'Grounded'}
              </span>
            </div>
          </div>
        </div>

        {/* Flight Mode */}
        <div className="p-4 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Flight Mode</span>
            <Navigation size={16} className="text-purple-400" />
          </div>
          <p className="text-white text-xl font-bold">{drone_state.flight_mode}</p>
        </div>

        {/* Position Section */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <MapPin size={16} className="text-blue-400" />
            <span>Position</span>
          </h3>
          
          <div className="space-y-2">
            {/* Latitude */}
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Latitude</span>
                <span className="text-white font-mono text-sm">
                  {formatCoordinate(drone_state.current_position.lat)}°
                </span>
              </div>
            </div>

            {/* Longitude */}
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Longitude</span>
                <span className="text-white font-mono text-sm">
                  {formatCoordinate(drone_state.current_position.lon)}°
                </span>
              </div>
            </div>

            {/* Altitude */}
            <div className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Altitude (MSL)</span>
                <span className={`font-mono text-sm font-bold ${getAltitudeColor(drone_state.current_position.alt)}`}>
                  {formatCoordinate(drone_state.current_position.alt, 2)} m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Velocity Section */}
        {telemetry.velocity && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Wind size={16} className="text-green-400" />
              <span>Velocity</span>
            </h3>
            
            <div className="space-y-2">
              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Ground Speed</span>
                  <span className="text-green-400 font-mono text-sm font-bold">
                    {formatSpeed(telemetry.velocity.vx, telemetry.velocity.vy, 0)} m/s
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-slate-700 rounded text-center">
                  <p className="text-slate-400 text-xs">VX</p>
                  <p className="text-white text-sm font-mono">{telemetry.velocity.vx.toFixed(1)}</p>
                </div>
                <div className="p-2 bg-slate-700 rounded text-center">
                  <p className="text-slate-400 text-xs">VY</p>
                  <p className="text-white text-sm font-mono">{telemetry.velocity.vy.toFixed(1)}</p>
                </div>
                <div className="p-2 bg-slate-700 rounded text-center">
                  <p className="text-slate-400 text-xs">VZ</p>
                  <p className="text-white text-sm font-mono">{telemetry.velocity.vz.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attitude Section */}
        {telemetry.attitude && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Compass size={16} className="text-purple-400" />
              <span>Attitude</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-slate-700 rounded-lg text-center">
                <p className="text-slate-400 text-xs mb-1">Roll</p>
                <p className="text-purple-400 text-lg font-bold font-mono">
                  {telemetry.attitude.roll.toFixed(1)}°
                </p>
              </div>
              <div className="p-3 bg-slate-700 rounded-lg text-center">
                <p className="text-slate-400 text-xs mb-1">Pitch</p>
                <p className="text-purple-400 text-lg font-bold font-mono">
                  {telemetry.attitude.pitch.toFixed(1)}°
                </p>
              </div>
              <div className="p-3 bg-slate-700 rounded-lg text-center">
                <p className="text-slate-400 text-xs mb-1">Yaw</p>
                <p className="text-purple-400 text-lg font-bold font-mono">
                  {telemetry.attitude.yaw.toFixed(1)}°
                </p>
              </div>
            </div>

            {/* Compass Visualization */}
            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-600 rounded-full"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <span className="text-red-400 font-bold">N</span>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                  <span className="text-slate-500 font-bold">S</span>
                </div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4">
                  <span className="text-slate-500 font-bold">W</span>
                </div>
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4">
                  <span className="text-slate-500 font-bold">E</span>
                </div>
                <div 
                  className="absolute top-1/2 left-1/2 w-1 h-14 bg-blue-400 origin-bottom transform -translate-x-1/2 -translate-y-full transition-transform"
                  style={{ transform: `translateX(-50%) translateY(-100%) rotate(${telemetry.attitude.yaw}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-blue-400"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Battery Section */}
        <div className="space-y-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <Battery size={16} className="text-yellow-400" />
            <span>Battery</span>
          </h3>
          
          <div className="p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Charge Level</span>
              <span className={`text-2xl font-bold ${getBatteryColor(drone_state.battery_level)}`}>
                {drone_state.battery_level}%
              </span>
            </div>
            
            {/* Battery Bar */}
            <div className="w-full bg-slate-600 rounded-full h-4 overflow-hidden">
              <div 
                className={`h-4 transition-all duration-500 ${
                  drone_state.battery_level > 50 ? 'bg-green-500' :
                  drone_state.battery_level > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${drone_state.battery_level}%` }}
              ></div>
            </div>

            {telemetry.battery && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="text-center">
                  <p className="text-slate-400 text-xs">Voltage</p>
                  <p className="text-white font-mono text-sm mt-1">
                    {telemetry.battery.voltage.toFixed(2)}V
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-xs">Current</p>
                  <p className="text-white font-mono text-sm mt-1">
                    {telemetry.battery.current.toFixed(2)}A
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GPS Section */}
        {telemetry.gps && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Satellite size={16} className="text-cyan-400" />
              <span>GPS Status</span>
            </h3>
            
            <div className="space-y-2">
              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Fix Type</span>
                  <span className="text-cyan-400 font-medium text-sm">
                    {getGPSFixType(telemetry.gps.fix_type)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Satellites</span>
                  <div className="flex items-center space-x-2">
                    <Signal size={14} className={signalQuality?.color} />
                    <span className={`text-sm font-bold ${signalQuality?.color}`}>
                      {telemetry.gps.satellites_visible}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Signal Quality</span>
                  <span className={`text-xs ${signalQuality?.color}`}>
                    {signalQuality?.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-700 rounded-lg text-center">
                  <p className="text-slate-400 text-xs mb-1">HDOP</p>
                  <p className="text-white font-mono text-sm">
                    {telemetry.gps.hdop.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg text-center">
                  <p className="text-slate-400 text-xs mb-1">VDOP</p>
                  <p className="text-white font-mono text-sm">
                    {telemetry.gps.vdop.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mission Progress */}
        {drone_state.mission_active && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <Activity size={16} className="text-blue-400" />
              <span>Mission Progress</span>
            </h3>
            
            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Waypoint</span>
                <span className="text-white font-bold">
                  {drone_state.mission_current} / {drone_state.mission_count}
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${drone_state.mission_count > 0 ? (drone_state.mission_current / drone_state.mission_count) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Geofence Warning */}
        {telemetryData.geofence_violation && (
          <div className="p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Activity size={16} className="text-red-400" />
              <span className="text-red-400 font-bold">GEOFENCE VIOLATION</span>
            </div>
            <p className="text-red-300 text-sm">{telemetryData.geofence_message}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs">
            <Clock size={12} />
            <span>Last Update: {new Date(timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}