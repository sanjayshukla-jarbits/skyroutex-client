'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, MapPin, Plus, X, Map as MapIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import Select from 'react-select'
import { Waypoint } from '@/types'

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

interface LocationOption {
  value: string
  label: string
  lat: number
  lon: number
  display_name: string
}

interface MissionStats {
  totalDistance: number
  flightTime: number
  batteryUsage: number
}

export default function RoutePlanning() {
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
  const [missionStats, setMissionStats] = useState<MissionStats>({
    totalDistance: 0,
    flightTime: 0,
    batteryUsage: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

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

  // Function to search locations using Nominatim API
  const searchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchOptions([])
      return
    }

    setIsSearching(true)
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
      
      setSearchOptions(options)
    } catch (error) {
      console.error('Error searching locations:', error)
      setSearchOptions([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  const handleSearchInputChange = (inputValue: string) => {
    setSearchInput(inputValue)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(inputValue)
    }, 500)
  }

  const handleLocationSelect = (option: LocationOption | null) => {
    setSelectedLocation(option)
  }

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

  return (
    <div className="flex-1 bg-slate-900 h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white mb-1">
            {waypoints[0]?.label.replace('Start: ', '')} to {waypoints[waypoints.length - 1]?.label.replace('End: ', '')}
          </h1>
          <p className="text-slate-400 text-sm">
            Distance: {missionStats.totalDistance} km • Duration: ~{formatFlightTime(missionStats.flightTime)} • Battery: {missionStats.batteryUsage}%
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
            <CheckCircle size={18} />
            <span>Validate</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg text-sm">
            <span>Save Mission</span>
          </button>
        </div>
      </div>

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
            {/* Start Point */}
            <div className="bg-slate-800 rounded-xl p-4 border border-green-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-green-500" size={16} />
                  <span className="text-slate-400 text-xs font-semibold">START POINT</span>
                </div>
              </div>
              <div className="text-white font-medium text-sm">{waypoints[0]?.label.replace('Start: ', '')}</div>
              <div className="text-slate-400 text-xs mt-1">{waypoints[0]?.coords}</div>
            </div>

            {/* End Point */}
            <div className="bg-slate-800 rounded-xl p-4 border border-red-500 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="text-red-500" size={16} />
                  <span className="text-slate-400 text-xs font-semibold">END POINT</span>
                </div>
              </div>
              <div className="text-white font-medium text-sm">{waypoints[waypoints.length - 1]?.label.replace('End: ', '')}</div>
              <div className="text-slate-400 text-xs mt-1">{waypoints[waypoints.length - 1]?.coords}</div>
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
                        {waypoint.id !== 'start' && waypoint.id !== 'end' && (
                          <button 
                            onClick={() => removeWaypoint(waypoint.id)}
                            className="text-slate-500 hover:text-red-500 flex-shrink-0 transition-colors"
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