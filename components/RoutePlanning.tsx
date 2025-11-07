'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, MapPin, Plus, X, Map as MapIcon, Search } from 'lucide-react'
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
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

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
      id: `stop${waypoints.length}`,
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
        {/* Map Section */}
        <div className="col-span-2 bg-slate-800 rounded-xl overflow-hidden shadow-xl" style={{ height: '600px' }}>
          <MapComponent waypoints={waypoints} />
        </div>

        {/* Controls Section */}
        <div className="space-y-6">
          {/* Start Point */}
          <div className="bg-slate-800 rounded-xl p-4 border border-green-500 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="text-green-500" size={16} />
                <span className="text-slate-400 text-xs font-semibold">MISSION START POINT</span>
              </div>
            </div>
            <div className="text-white font-medium">{waypoints[0]?.label.replace('Start: ', '')}</div>
            <div className="text-slate-400 text-xs mt-1">{waypoints[0]?.coords}</div>
          </div>

          {/* End Point */}
          <div className="bg-slate-800 rounded-xl p-4 border border-red-500 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="text-red-500" size={16} />
                <span className="text-slate-400 text-xs font-semibold">MISSION END POINT</span>
              </div>
            </div>
            <div className="text-white font-medium">{waypoints[waypoints.length - 1]?.label.replace('End: ', '')}</div>
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
              <h3 className="text-white font-semibold">ROUTE WAYPOINTS</h3>
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">{waypoints.length}</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {waypoints.map((waypoint, index) => (
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
                    <div className="ml-4 my-2 text-blue-400">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mission Stats */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-white font-semibold mb-3 text-sm">MISSION STATISTICS</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
                <div className="text-white font-bold">{waypoints.length} points</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}