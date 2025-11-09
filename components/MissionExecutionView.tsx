'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  Radio, 
  Activity, 
  MapPin, 
  Battery, 
  Gauge, 
  Navigation, 
  Camera,
  Video,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Maximize2,
  Settings,
  Target,
  Upload
} from 'lucide-react'
import TelemetryPanel from './TelemetryPanel'

interface MissionExecutionViewProps {
  missionId: string
  onBack?: () => void
}

interface MissionStatus {
  armed: boolean
  flying: boolean
  mission_active: boolean
  current_waypoint: number
  total_waypoints: number
  flight_mode: string
  battery_level: number
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
  }
  geofence_violation: boolean
  geofence_message: string
}

export default function MissionExecutionView({ missionId, onBack }: MissionExecutionViewProps) {
  // State Management
  const [isConnected, setIsConnected] = useState(false)
  const [missionStatus, setMissionStatus] = useState<MissionStatus>({
    armed: false,
    flying: false,
    mission_active: false,
    current_waypoint: 0,
    total_waypoints: 0,
    flight_mode: 'UNKNOWN',
    battery_level: 0
  })
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null)
  const [videoStream, setVideoStream] = useState<string | null>(null)
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [commandStatus, setCommandStatus] = useState<string>('')
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string; timestamp: string }>>([])

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // WebSocket Connection for Real-time Telemetry
  useEffect(() => {
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [missionId])

  const connectWebSocket = () => {
    try {
      // Connect to WebSocket telemetry server
      const ws = new WebSocket('ws://localhost:8002/ws/telemetry')
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // Subscribe to mission telemetry
        ws.send(JSON.stringify({
          action: 'subscribe',
          mission_id: missionId,
          vehicle_id: 'UAV-001'
        }))

        addAlert('success', 'Connected to telemetry stream')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'telemetry_update') {
            handleTelemetryUpdate(data.data)
          }
        } catch (error) {
          console.error('Error parsing telemetry:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
        addAlert('error', 'Telemetry connection error')
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect...')
          connectWebSocket()
        }, 5000)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }

  const handleTelemetryUpdate = (data: TelemetryData) => {
    setTelemetryData(data)

    // Update mission status
    if (data.drone_state) {
      setMissionStatus({
        armed: data.drone_state.armed,
        flying: data.drone_state.flying,
        mission_active: data.drone_state.mission_active,
        current_waypoint: data.drone_state.mission_current,
        total_waypoints: data.drone_state.mission_count,
        flight_mode: data.drone_state.flight_mode,
        battery_level: data.drone_state.battery_level
      })

      // Check for alerts
      if (data.drone_state.battery_level < 20) {
        addAlert('warning', `Low battery: ${data.drone_state.battery_level}%`)
      }

      if (data.geofence_violation) {
        addAlert('error', `Geofence violation: ${data.geofence_message}`)
      }
    }
  }

  const addAlert = (type: string, message: string) => {
    const newAlert = {
      type,
      message,
      timestamp: new Date().toISOString()
    }
    setAlerts(prev => [newAlert, ...prev].slice(0, 10)) // Keep last 10 alerts
  }

  // Mission Control Commands
  const handleArmVehicle = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/arm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId })
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('success', 'Vehicle armed successfully')
    } catch (error) {
      console.error('Arm failed:', error)
      addAlert('error', 'Failed to arm vehicle')
    }
  }

  const handleDisarmVehicle = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/disarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId })
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('success', 'Vehicle disarmed')
    } catch (error) {
      console.error('Disarm failed:', error)
      addAlert('error', 'Failed to disarm vehicle')
    }
  }

  const handleTakeoff = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/takeoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId, altitude: 10 })
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('success', 'Takeoff initiated')
    } catch (error) {
      console.error('Takeoff failed:', error)
      addAlert('error', 'Failed to initiate takeoff')
    }
  }

  const handleLand = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/land`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId })
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('success', 'Landing initiated')
    } catch (error) {
      console.error('Landing failed:', error)
      addAlert('error', 'Failed to initiate landing')
    }
  }

  const handleStartMission = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('success', 'Mission started')
    } catch (error) {
      console.error('Mission start failed:', error)
      addAlert('error', 'Failed to start mission')
    }
  }

  const handlePauseMission = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('info', 'Mission paused')
    } catch (error) {
      console.error('Mission pause failed:', error)
      addAlert('error', 'Failed to pause mission')
    }
  }

  const handleStopMission = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('warning', 'Mission stopped')
    } catch (error) {
      console.error('Mission stop failed:', error)
      addAlert('error', 'Failed to stop mission')
    }
  }

  const handleRTL = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/missions/${missionId}/rtl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setCommandStatus(data.message)
      addAlert('info', 'Returning to launch')
    } catch (error) {
      console.error('RTL failed:', error)
      addAlert('error', 'Failed to return to launch')
    }
  }

  // Video Controls
  const handleStartVideo = async () => {
    try {
      const response = await fetch('http://localhost:8000/camera/start_video', {
        method: 'POST'
      })
      const data = await response.json()
      setIsRecording(true)
      addAlert('success', 'Video recording started')
    } catch (error) {
      console.error('Failed to start video:', error)
      addAlert('error', 'Failed to start video')
    }
  }

  const handleStopVideo = async () => {
    try {
      const response = await fetch('http://localhost:8000/camera/stop_video', {
        method: 'POST'
      })
      const data = await response.json()
      setIsRecording(false)
      addAlert('success', 'Video recording stopped')
    } catch (error) {
      console.error('Failed to stop video:', error)
      addAlert('error', 'Failed to stop video')
    }
  }

  const handleTakePhoto = async () => {
    try {
      const response = await fetch('http://localhost:8000/camera/take_photo', {
        method: 'POST'
      })
      const data = await response.json()
      addAlert('success', 'Photo captured')
    } catch (error) {
      console.error('Failed to take photo:', error)
      addAlert('error', 'Failed to capture photo')
    }
  }

  const toggleFullscreen = () => {
    setIsVideoFullscreen(!isVideoFullscreen)
  }

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-400' : 'text-red-400'
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-400'
    if (level > 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-green-400" />
      case 'error': return <AlertTriangle size={16} className="text-red-400" />
      case 'warning': return <AlertTriangle size={16} className="text-yellow-400" />
      default: return <Activity size={16} className="text-blue-400" />
    }
  }

  return (
    <div className="flex-1 bg-slate-900 min-h-screen">
      <div className="p-6">
        {/* Header */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Mission Execution</h1>
                <p className="text-slate-400">Mission ID: {missionId}</p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${isConnected ? 'bg-green-500 bg-opacity-20' : 'bg-red-500 bg-opacity-20'}`}>
                <Radio size={16} className={isConnected ? 'text-green-400' : 'text-red-400'} />
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${missionStatus.armed ? 'bg-orange-500 bg-opacity-20' : 'bg-slate-700'}`}>
                <Target size={16} className={missionStatus.armed ? 'text-orange-400' : 'text-slate-400'} />
                <span className={missionStatus.armed ? 'text-orange-400' : 'text-slate-400'}>
                  {missionStatus.armed ? 'ARMED' : 'DISARMED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Video Feed & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Feed */}
            <div className={`bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden ${isVideoFullscreen ? 'fixed inset-0 z-50' : ''}`}>
              <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Video size={20} className="text-blue-400" />
                  <span>Live Video Feed</span>
                </h2>
                <div className="flex items-center space-x-2">
                  {isRecording && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-red-500 bg-opacity-20 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-400 text-sm font-medium">REC</span>
                    </div>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="relative bg-black aspect-video">
                {/* Video stream would be rendered here */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Video size={64} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">Video stream will appear here</p>
                    <p className="text-slate-600 text-sm mt-2">Connect to camera feed</p>
                  </div>
                </div>
                
                {/* Video Overlay - Position/Status Info */}
                {telemetryData && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-3 text-white text-sm space-y-1">
                    <div className="flex items-center space-x-2">
                      <MapPin size={14} className="text-blue-400" />
                      <span>
                        {telemetryData.drone_state.current_position.lat.toFixed(6)}, 
                        {telemetryData.drone_state.current_position.lon.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Gauge size={14} className="text-green-400" />
                      <span>Alt: {telemetryData.drone_state.current_position.alt.toFixed(1)}m</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Navigation size={14} className="text-purple-400" />
                      <span>{missionStatus.flight_mode}</span>
                    </div>
                  </div>
                )}
                
                {/* Battery Overlay */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Battery size={20} className={getBatteryColor(missionStatus.battery_level)} />
                    <span className={`font-bold ${getBatteryColor(missionStatus.battery_level)}`}>
                      {missionStatus.battery_level}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Camera Controls */}
              <div className="p-4 bg-slate-900 border-t border-slate-700">
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={handleTakePhoto}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Camera size={16} />
                    <span>Photo</span>
                  </button>
                  
                  {!isRecording ? (
                    <button
                      onClick={handleStartVideo}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <Video size={16} />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopVideo}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Square size={16} />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mission Control Panel */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Settings size={20} className="text-blue-400" />
                <span>Mission Control</span>
              </h2>
              
              {/* Mission Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Mission Progress</span>
                  <span className="text-white font-bold">
                    {missionStatus.current_waypoint} / {missionStatus.total_waypoints} waypoints
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${missionStatus.total_waypoints > 0 ? (missionStatus.current_waypoint / missionStatus.total_waypoints) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Control Buttons Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Pre-flight Controls */}
                <button
                  onClick={handleArmVehicle}
                  disabled={missionStatus.armed}
                  className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Target size={16} />
                  <span>Arm</span>
                </button>
                
                <button
                  onClick={handleDisarmVehicle}
                  disabled={!missionStatus.armed || missionStatus.flying}
                  className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Target size={16} />
                  <span>Disarm</span>
                </button>
                
                {/* Flight Controls */}
                <button
                  onClick={handleTakeoff}
                  disabled={!missionStatus.armed || missionStatus.flying}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Upload size={16} />
                  <span>Takeoff</span>
                </button>
                
                <button
                  onClick={handleLand}
                  disabled={!missionStatus.flying}
                  className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <ArrowLeft size={16} className="rotate-90" />
                  <span>Land</span>
                </button>
                
                {/* Mission Controls */}
                <button
                  onClick={handleStartMission}
                  disabled={!missionStatus.flying || missionStatus.mission_active}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Play size={16} />
                  <span>Start</span>
                </button>
                
                <button
                  onClick={handlePauseMission}
                  disabled={!missionStatus.mission_active}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Pause size={16} />
                  <span>Pause</span>
                </button>
                
                <button
                  onClick={handleStopMission}
                  disabled={!missionStatus.mission_active}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Square size={16} />
                  <span>Stop</span>
                </button>
                
                {/* Emergency Controls */}
                <button
                  onClick={handleRTL}
                  disabled={!missionStatus.flying}
                  className="px-4 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Navigation size={16} />
                  <span>RTL</span>
                </button>
              </div>

              {/* Command Status */}
              {commandStatus && (
                <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-300 text-sm">{commandStatus}</p>
                </div>
              )}
            </div>

            {/* Alerts Panel */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <AlertTriangle size={20} className="text-yellow-400" />
                <span>Alerts & Notifications</span>
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No alerts</p>
                ) : (
                  alerts.map((alert, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-700 rounded-lg flex items-start space-x-3"
                    >
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-white text-sm">{alert.message}</p>
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Telemetry Panel */}
          <div className="lg:col-span-1">
            <TelemetryPanel telemetryData={telemetryData} />
          </div>
        </div>
      </div>
    </div>
  )
}