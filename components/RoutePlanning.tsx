'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, MapPin, Plus, X, Map as MapIcon, Search, Save, ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import dynamic from 'next/dynamic'
import Select from 'react-select'
import { Waypoint } from '@/types'
import { createMission, updateMission, type ApiMission } from '@/services/missionService'

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800">
      <div className="text-center">
        <MapIcon size={64} className="text-slate-600 mx-auto mb-4 animate-pulse" />
        <p className="text-slate-500 text-sm">Loading Map...</p>
      </div>
    </div>
  )
})

interface RoutePlanningProps {
  selectedMission?: ApiMission | null
  editMode?: boolean
  onMissionSaved?: () => void
  onBackToMissions?: () => void
}

interface LocationOption {
  value: string
  label: string
  lat: number
  lon: number
  display_name: string
}

interface CorridorOption {
  value: string
  label: string
  color: string
  description: string
}

interface MissionStats {
  totalDistance: number
  flightTime: number
  batteryUsage: number
}

export default function RoutePlanning({ 
  selectedMission,
  editMode = false,
  onMissionSaved,
  onBackToMissions
}: RoutePlanningProps) {
  // Corridor options
  const corridorOptions: CorridorOption[] = [
  // Primary Lucknow Corridors
  { 
    value: 'mlg-kni', 
    label: 'MLG - KNI Corridor', 
    color: '#438535ff', 
    description: 'MLG - KNI Corridor'
  },
  { 
    value: 'lucknow-kanpur', 
    label: 'Lucknow - Kanpur Corridor', 
    color: '#3b82f6', 
    description: 'LKO-KNU highway corridor'
  },
  { 
    value: 'lucknow-varanasi', 
    label: 'Lucknow - Varanasi Corridor', 
    color: '#f59e0b', 
    description: 'LKO-VNS eastern route'
  },
  { 
    value: 'lucknow-agra', 
    label: 'Lucknow - Agra Corridor', 
    color: '#ec4899', 
    description: 'LKO-AGR southwest corridor'
  },
  { 
    value: 'lucknow-bareilly', 
    label: 'Lucknow - Bareilly Corridor', 
    color: '#8b5cf6', 
    description: 'LKO-BEY northern corridor'
  },
  { 
    value: 'lucknow-prayagraj', 
    label: 'Lucknow - Prayagraj Corridor', 
    color: '#22c55e', 
    description: 'LKO-IXD southeast route'
  },
  ]

  // Corridor state
  const [selectedCorridor, setSelectedCorridor] = useState<CorridorOption | null>(corridorOptions[0])

  // Save Mission states - ADDED
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [missionName, setMissionName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { 
      id: 'start', 
      label: 'Start: Mohanlalganj', 
      coords: '26.7465° N, 80.8769° E', 
      alt: '120m AGL', 
      color: 'bg-green-500',
      lat: 26.7465,
      lon: 80.8769
    },
    { 
      id: 'stop1', 
      label: 'Stop: Ajgain', 
      coords: '26.6789° N, 80.5234° E', 
      alt: '100m AGL', 
      color: 'bg-blue-500',
      lat: 26.6789,
      lon: 80.5234
    },
    { 
      id: 'end', 
      label: 'End: IIT Kanpur', 
      coords: '26.5123° N, 80.2329° E', 
      alt: '100m AGL', 
      color: 'bg-red-500',
      lat: 26.5123,
      lon: 80.2329
    }
  ])
  
  const [searchOptions, setSearchOptions] = useState<LocationOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)
  const [searchInput, setSearchInput] = useState('')
  
  // Start point search states
  const [startSearchOptions, setStartSearchOptions] = useState<LocationOption[]>([])
  const [isStartSearching, setIsStartSearching] = useState(false)
  const [selectedStartLocation, setSelectedStartLocation] = useState<LocationOption | null>(null)
  const [startSearchInput, setStartSearchInput] = useState('')
  const [editingStart, setEditingStart] = useState(false)
  
  // End point search states
  const [endSearchOptions, setEndSearchOptions] = useState<LocationOption[]>([])
  const [isEndSearching, setIsEndSearching] = useState(false)
  const [selectedEndLocation, setSelectedEndLocation] = useState<LocationOption | null>(null)
  const [endSearchInput, setEndSearchInput] = useState('')
  const [editingEnd, setEditingEnd] = useState(false)
  
  const [missionStats, setMissionStats] = useState<MissionStats>({
    totalDistance: 0,
    flightTime: 0,
    batteryUsage: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Load mission data when selectedMission changes
  useEffect(() => {
    if (selectedMission) {
      console.log('Loading mission:', selectedMission)
      
      // Load waypoints
      if (selectedMission.waypoints && Array.isArray(selectedMission.waypoints)) {
        const loadedWaypoints: Waypoint[] = selectedMission.waypoints.map((wp: any, index: number) => {
          let lat = wp.lat
          let lon = wp.lon
          
          // Parse coords string if needed
          if (typeof wp.coords === 'string' && wp.coords.includes('°')) {
            const coordMatch = wp.coords.match(/([\d.]+)°\s*[NS],\s*([\d.]+)°\s*[EW]/)
            if (coordMatch) {
              lat = parseFloat(coordMatch[1])
              lon = parseFloat(coordMatch[2])
            }
          }
          
          // Determine color
          let color = 'bg-blue-500'
          if (index === 0) color = 'bg-green-500'
          else if (index === selectedMission.waypoints.length - 1) color = 'bg-red-500'
          else if (wp.color) color = wp.color
          
          return {
            id: wp.id || `wp${index}`,
            label: wp.label || `Waypoint ${index + 1}`,
            coords: wp.coords || `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
            alt: wp.alt || '100m AGL',
            color: color,
            lat: lat,
            lon: lon
          }
        })
        
        setWaypoints(loadedWaypoints)
      }
      
      // Load stats
      setMissionStats({
        totalDistance: selectedMission.total_distance || 0,
        flightTime: selectedMission.flight_time || 0,
        batteryUsage: selectedMission.battery_usage || 0
      })
      
      // Load corridor
      if (selectedMission.corridor_label) {
        const corridor = corridorOptions.find(c => c.label === selectedMission.corridor_label)
        if (corridor) {
          setSelectedCorridor(corridor)
        } else {
          setSelectedCorridor({
            value: selectedMission.corridor_value || 'custom',
            label: selectedMission.corridor_label,
            color: selectedMission.corridor_color || 'blue',
            description: selectedMission.corridor_description || ''
          })
        }
      }
      
      // Load mission name
      setMissionName(selectedMission.mission_name || '')
    }
  }, [selectedMission])

  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const startSearchTimeoutRef = useRef<NodeJS.Timeout>()
  const endSearchTimeoutRef = useRef<NodeJS.Timeout>()

  // Haversine formula to calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180)
  }

  // Calculate total route distance and update mission stats
  const calculateMissionStats = (waypointsList: Waypoint[]): MissionStats => {
    let totalDistance = 0

    // Calculate distance between consecutive waypoints
    for (let i = 0; i < waypointsList.length - 1; i++) {
      const current = waypointsList[i]
      const next = waypointsList[i + 1]
      const segmentDistance = calculateDistance(current.lat, current.lon, next.lat, next.lon)
      totalDistance += segmentDistance
    }

    // Assumptions for calculations:
    // Average speed: 150 km/h
    // Battery consumption: 1% per km (adjustable)
    const avgSpeed = 150 // km/h
    const batteryPerKm = 1 // % per km

    const flightTime = (totalDistance / avgSpeed) * 60 // Convert to minutes
    const batteryUsage = Math.min(totalDistance * batteryPerKm, 100) // Cap at 100%

    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      flightTime: parseFloat(flightTime.toFixed(1)),
      batteryUsage: parseFloat(batteryUsage.toFixed(1))
    }
  }

  // Update mission stats whenever waypoints change
  useEffect(() => {
    const stats = calculateMissionStats(waypoints)
    setMissionStats(stats)
  }, [waypoints])

  // Generic function to search locations using Nominatim API
  const searchLocations = async (
    query: string, 
    setOptions: React.Dispatch<React.SetStateAction<LocationOption[]>>,
    setSearching: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!query || query.length < 3) {
      setOptions([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`
      )
      const data = await response.json()
      
      const options: LocationOption[] = data.map((item: any) => ({
        value: item.place_id,
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name
      }))
      
      setOptions(options)
    } catch (error) {
      console.error('Error searching locations:', error)
      setOptions([])
    } finally {
      setSearching(false)
    }
  }

  // Debounced search for intermediate stops
  const handleSearchInputChange = (inputValue: string) => {
    setSearchInput(inputValue)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(inputValue, setSearchOptions, setIsSearching)
    }, 500)
  }

  // Debounced search for start point
  const handleStartSearchInputChange = (inputValue: string) => {
    setStartSearchInput(inputValue)
    
    if (startSearchTimeoutRef.current) {
      clearTimeout(startSearchTimeoutRef.current)
    }
    
    startSearchTimeoutRef.current = setTimeout(() => {
      searchLocations(inputValue, setStartSearchOptions, setIsStartSearching)
    }, 500)
  }

  // Debounced search for end point
  const handleEndSearchInputChange = (inputValue: string) => {
    setEndSearchInput(inputValue)
    
    if (endSearchTimeoutRef.current) {
      clearTimeout(endSearchTimeoutRef.current)
    }
    
    endSearchTimeoutRef.current = setTimeout(() => {
      searchLocations(inputValue, setEndSearchOptions, setIsEndSearching)
    }, 500)
  }

  const handleLocationSelect = (option: LocationOption | null) => {
    setSelectedLocation(option)
  }

  const handleStartLocationSelect = (option: LocationOption | null) => {
    setSelectedStartLocation(option)
  }

  const handleEndLocationSelect = (option: LocationOption | null) => {
    setSelectedEndLocation(option)
  }

  // Handle corridor selection
  const handleCorridorSelect = (option: CorridorOption | null) => {
    setSelectedCorridor(option)
  }

  // Update start point
  const updateStartPoint = () => {
    if (!selectedStartLocation) return

    const newStartPoint: Waypoint = {
      id: 'start',
      label: `Start: ${selectedStartLocation.label.split(',')[0]}`,
      coords: `${selectedStartLocation.lat.toFixed(4)}° N, ${selectedStartLocation.lon.toFixed(4)}° E`,
      alt: '120m AGL',
      color: 'bg-green-500',
      lat: selectedStartLocation.lat,
      lon: selectedStartLocation.lon
    }

    const updatedWaypoints = [newStartPoint, ...waypoints.slice(1)]
    setWaypoints(updatedWaypoints)
    setSelectedStartLocation(null)
    setStartSearchInput('')
    setEditingStart(false)
  }

  // Update end point
  const updateEndPoint = () => {
    if (!selectedEndLocation) return

    const newEndPoint: Waypoint = {
      id: 'end',
      label: `End: ${selectedEndLocation.label.split(',')[0]}`,
      coords: `${selectedEndLocation.lat.toFixed(4)}° N, ${selectedEndLocation.lon.toFixed(4)}° E`,
      alt: '100m AGL',
      color: 'bg-red-500',
      lat: selectedEndLocation.lat,
      lon: selectedEndLocation.lon
    }

    const updatedWaypoints = [...waypoints.slice(0, -1), newEndPoint]
    setWaypoints(updatedWaypoints)
    setSelectedEndLocation(null)
    setEndSearchInput('')
    setEditingEnd(false)
  }

  // Add intermediate waypoint
  const addWaypoint = () => {
    if (!selectedLocation) return

    const newWaypoint: Waypoint = {
      id: `stop${Date.now()}`, // Use timestamp for unique ID
      label: `Stop: ${selectedLocation.label.split(',')[0]}`,
      coords: `${selectedLocation.lat.toFixed(4)}° N, ${selectedLocation.lon.toFixed(4)}° E`,
      alt: '100m AGL',
      color: 'bg-blue-500',
      lat: selectedLocation.lat,
      lon: selectedLocation.lon
    }

    // Insert before the last waypoint (end point)
    const updatedWaypoints = [
      ...waypoints.slice(0, -1),
      newWaypoint,
      waypoints[waypoints.length - 1]
    ]
    
    setWaypoints(updatedWaypoints)
    setSelectedLocation(null)
    setSearchInput('')
  }

  const removeWaypoint = (id: string) => {
    if (id === 'start' || id === 'end') return // Prevent removing start and end points
    setWaypoints(waypoints.filter(wp => wp.id !== id))
  }

  // Get color class for corridor badges
  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-600 border-blue-500',
      orange: 'bg-orange-600 border-orange-500',
      green: 'bg-green-600 border-green-500',
      purple: 'bg-purple-600 border-purple-500',
      yellow: 'bg-yellow-600 border-yellow-500',
    }
    return colorMap[color] || 'bg-blue-600 border-blue-500'
  }

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#334155',
      borderColor: '#475569',
      minHeight: '40px',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#334155',
      border: '1px solid #475569'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#475569' : '#334155',
      color: '#fff',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#475569'
      }
    }),
    singleValue: (base: any) => ({
      ...base,
      color: '#fff'
    }),
    input: (base: any) => ({
      ...base,
      color: '#fff'
    }),
    placeholder: (base: any) => ({
      ...base,
      color: '#94a3b8'
    }),
    loadingMessage: (base: any) => ({
      ...base,
      color: '#94a3b8'
    }),
    noOptionsMessage: (base: any) => ({
      ...base,
      color: '#94a3b8'
    })
  }

  // Custom styles for corridor dropdown
  const customCorridorSelectStyles = {
    ...customSelectStyles,
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#475569' : '#334155',
      color: '#fff',
      cursor: 'pointer',
      padding: '10px 12px',
      '&:hover': {
        backgroundColor: '#475569'
      }
    })
  }

  // Format corridor option label with color indicator and description
  const formatCorridorOptionLabel = (option: CorridorOption) => (
    <div className="flex items-start space-x-3">
      <div className={`w-3 h-3 rounded-full mt-1 ${getColorClass(option.color).split(' ')[0]}`}></div>
      <div className="flex-1">
        <div className="font-medium text-white">{option.label}</div>
        <div className="text-xs text-slate-400">{option.description}</div>
      </div>
    </div>
  )

  // Format flight time display
  const formatFlightTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins} min`
  }

  // Get battery status color
  const getBatteryColor = (percentage: number): string => {
    if (percentage <= 25) return 'text-red-400'
    if (percentage <= 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  // Save mission to database via API - CORRECTED
  const saveMission = async () => {
    if (!missionName.trim()) {
      setSaveError('Please enter a mission name')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const missionData = {
        mission_name: missionName,
        mission_type: 'Surveillance',
        corridor: selectedCorridor ? {
          value: selectedCorridor.value,
          label: selectedCorridor.label,
          color: selectedCorridor.color,
          description: selectedCorridor.description
        } : null,
        mission_stats: {
          total_distance: missionStats.totalDistance,
          flight_time: missionStats.flightTime,
          battery_usage: missionStats.batteryUsage,
        },
        waypoints: waypoints.map(wp => ({
          id: wp.id,
          label: wp.label,
          coords: wp.coords,
          alt: wp.alt,
          color: wp.color,
          lat: wp.lat,
          lon: wp.lon,
        })),
        created_by: 'current_user',
        notes: '',
        vehicle_id: null,
        operator_id: null,
      }

      let result
      if (editMode && selectedMission) {
        // Update existing mission
        result = await updateMission(selectedMission.id, missionData)
        console.log('Mission updated:', result)
      } else {
        // Create new mission
        result = await createMission(missionData)
        console.log('Mission created:', result)
      }

      setSaveSuccess(true)
      setShowSaveDialog(false)
      setMissionName('')
      
      setTimeout(() => {
        setSaveSuccess(false)
        if (onMissionSaved) {
          onMissionSaved()
        }
      }, 2000)

    } catch (error: any) {
      console.error('Error saving mission:', error)
      setSaveError(error.message || 'Failed to save mission')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 bg-slate-900 h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10">
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          {(selectedMission || editMode) && onBackToMissions && (
            <button
              onClick={onBackToMissions}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={20} />
              <span>Back to Missions</span>
            </button>
          )}
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-1">
              {editMode ? `Edit: ${selectedMission?.mission_name || 'Mission'}` : 
              selectedMission ? `View: ${selectedMission.mission_name}` : 
              `${waypoints[0]?.label.replace('Start: ', '')} to ${waypoints[waypoints.length - 1]?.label.replace('End: ', '')}`}
            </h1>
            <p className="text-slate-400 text-sm">
              Distance: {missionStats.totalDistance.toFixed(2)} km • 
              Duration: {formatFlightTime(missionStats.flightTime)} • 
              Battery: {missionStats.batteryUsage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {(!selectedMission || editMode) && (
            <button 
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <Save size={20} />
              <span>{editMode ? 'Update Mission' : 'Save Mission'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Message - ADDED */}
      {saveSuccess && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center space-x-2 animate-bounce">
          <CheckCircle size={20} />
          <span className="font-semibold">
            {editMode ? 'Mission Updated Successfully!' : 'Mission Saved Successfully!'}
          </span>
        </div>
      )}

      {/* Save Mission Dialog - ADDED */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 shadow-2xl border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Save Mission</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Mission Name</label>
                <input
                  type="text"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  placeholder="Enter mission name..."
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="bg-slate-700 rounded-lg p-3 text-sm">
                <div className="text-slate-400 mb-2">Mission Summary:</div>
                <div className="text-white space-y-1">
                  <div>• Route: {waypoints[0]?.label.replace('Start: ', '')} → {waypoints[waypoints.length - 1]?.label.replace('End: ', '')}</div>
                  <div>• Waypoints: {waypoints.length}</div>
                  <div>• Distance: {missionStats.totalDistance} km</div>
                  <div>• Duration: {formatFlightTime(missionStats.flightTime)}</div>
                  <div>• Corridor: {selectedCorridor?.label || 'Not selected'}</div>
                </div>
              </div>

              {saveError && (
                <div className="bg-red-900 bg-opacity-30 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {saveError}
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setMissionName('')
                    setSaveError(null)
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMission}
                  disabled={isSaving || !missionName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Mission'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Full Height Map with Sidebar */}
      <div className="flex-1 relative overflow-hidden">
        {/* Full Height Map */}
        <div className="absolute inset-0">
          <MapComponent waypoints={waypoints} missionStats={missionStats} />
        </div>

        {/* Collapsible Sidebar */}
        <div 
          className={`absolute top-0 right-0 h-full bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 ease-in-out z-20 ${
            sidebarOpen ? 'w-96' : 'w-0'
          }`}
        >
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -left-10 top-4 bg-slate-800 text-white p-2 rounded-l-lg hover:bg-slate-700 transition-colors border border-slate-700 border-r-0"
          >
            {sidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* Sidebar Content */}
          <div className={`h-full overflow-y-auto p-4 space-y-4 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Corridor Selection */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-2 mb-3">
                <MapIcon className="text-blue-400" size={18} />
                <span className="text-slate-300 text-xs font-semibold">OPERATION CORRIDOR</span>
              </div>
              
              <Select
                value={selectedCorridor}
                onChange={handleCorridorSelect}
                options={corridorOptions}
                placeholder="Select corridor..."
                formatOptionLabel={formatCorridorOptionLabel}
                styles={customCorridorSelectStyles}
                isClearable={false}
                isSearchable={true}
                className="text-sm"
              />
            </div>

            {/* Start Point */}
            <div className="bg-slate-800 rounded-xl p-4 border border-green-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-green-500" size={16} />
                  <span className="text-slate-400 text-xs font-semibold">START POINT</span>
                </div>
                {(!selectedMission || editMode) && (
                <button 
                  onClick={() => setEditingStart(!editingStart)}
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title="Edit start point"
                >
                  <Edit size={16} />
                </button>
              )}
              </div>
              
              {editingStart ? (
                <div className="space-y-2">
                  <Select
                    value={selectedStartLocation}
                    onChange={handleStartLocationSelect}
                    onInputChange={handleStartSearchInputChange}
                    inputValue={startSearchInput}
                    options={startSearchOptions}
                    isLoading={isStartSearching}
                    placeholder="Search new start location..."
                    noOptionsMessage={() => startSearchInput.length < 3 ? "Type at least 3 characters" : "No locations found"}
                    loadingMessage={() => "Searching..."}
                    styles={customSelectStyles}
                    isClearable
                    className="text-sm"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={updateStartPoint}
                      disabled={!selectedStartLocation}
                      className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                        selectedStartLocation
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingStart(false)
                        setSelectedStartLocation(null)
                        setStartSearchInput('')
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 text-white rounded text-xs font-semibold hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-white font-medium text-sm">{waypoints[0]?.label.replace('Start: ', '')}</div>
                  <div className="text-slate-400 text-xs mt-1">{waypoints[0]?.coords}</div>
                </>
              )}
            </div>

            {/* End Point */}
            <div className="bg-slate-800 rounded-xl p-4 border border-red-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-red-500" size={16} />
                  <span className="text-slate-400 text-xs font-semibold">END POINT</span>
                </div>
                <button 
                  onClick={() => setEditingEnd(!editingEnd)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Edit end point"
                >
                  <Edit size={16} />
                </button>
              </div>
              
              {editingEnd ? (
                <div className="space-y-2">
                  <Select
                    value={selectedEndLocation}
                    onChange={handleEndLocationSelect}
                    onInputChange={handleEndSearchInputChange}
                    inputValue={endSearchInput}
                    options={endSearchOptions}
                    isLoading={isEndSearching}
                    placeholder="Search new end location..."
                    noOptionsMessage={() => endSearchInput.length < 3 ? "Type at least 3 characters" : "No locations found"}
                    loadingMessage={() => "Searching..."}
                    styles={customSelectStyles}
                    isClearable
                    className="text-sm"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={updateEndPoint}
                      disabled={!selectedEndLocation}
                      className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                        selectedEndLocation
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingEnd(false)
                        setSelectedEndLocation(null)
                        setEndSearchInput('')
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 text-white rounded text-xs font-semibold hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-white font-medium text-sm">{waypoints[waypoints.length - 1]?.label.replace('End: ', '')}</div>
                  <div className="text-slate-400 text-xs mt-1">{waypoints[waypoints.length - 1]?.coords}</div>
                </>
              )}
            </div>

            {/* Add Intermediate Stops */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold">ADD INTERMEDIATE STOPS</span>
              </div>
              
              <div className="mb-3">
                <label className="text-slate-300 text-xs mb-2 block">Search Location</label>
                <Select
                  value={selectedLocation}
                  onChange={handleLocationSelect}
                  onInputChange={handleSearchInputChange}
                  inputValue={searchInput}
                  options={searchOptions}
                  isLoading={isSearching}
                  placeholder="Type to search locations..."
                  noOptionsMessage={() => searchInput.length < 3 ? "Type at least 3 characters" : "No locations found"}
                  loadingMessage={() => "Searching..."}
                  styles={customSelectStyles}
                  isClearable
                  className="text-sm"
                />
              </div>

              {(!selectedMission || editMode) && (
                <button 
                  onClick={addWaypoint}
                  disabled={!selectedLocation}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedLocation 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                  <span className="text-sm">Add Stop to Route</span>
                </button>
              )}
            </div>

            {/* Route Waypoints */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">ROUTE WAYPOINTS</h3>
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">{waypoints.length}</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {waypoints.map((waypoint, index) => {
                  // Calculate distance to next waypoint
                  let distanceToNext = 0
                  if (index < waypoints.length - 1) {
                    const next = waypoints[index + 1]
                    distanceToNext = calculateDistance(waypoint.lat, waypoint.lon, next.lat, next.lon)
                  }

                  return (
                    <div key={waypoint.id}>
                      <div className="flex items-start space-x-3">
                        <div className={`${waypoint.color} text-white font-bold w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0 shadow-lg`}>
                          {waypoint.id === 'start' ? 'S' : waypoint.id === 'end' ? 'E' : index}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{waypoint.label}</div>
                          <div className="text-slate-400 text-xs">{waypoint.coords}</div>
                          <div className="text-blue-400 text-xs">{waypoint.alt}</div>
                        </div>
                        {(!selectedMission || editMode) && waypoint.id !== 'start' && waypoint.id !== 'end' && (
                          <button
                            onClick={() => removeWaypoint(waypoint.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      {index < waypoints.length - 1 && (
                        <div className="ml-4 my-2 flex items-center space-x-2">
                          <div className="text-blue-400">↓</div>
                          <div className="text-slate-500 text-xs">
                            {distanceToNext.toFixed(2)} km
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}