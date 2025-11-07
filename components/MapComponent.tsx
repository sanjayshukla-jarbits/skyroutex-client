'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Waypoint } from '@/types'

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MissionStats {
  totalDistance: number
  flightTime: number
  batteryUsage: number
}

interface MapComponentProps {
  waypoints: Waypoint[]
  missionStats: MissionStats
}

export default function MapComponent({ waypoints, missionStats }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [26.6, 80.4],
      zoom: 10,
      zoomControl: true,
      attributionControl: true
    })

    // Add satellite tile layer (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    }).addTo(map)

    // Add labels overlay for better visibility
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map)

    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || waypoints.length === 0) return

    const map = mapRef.current

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    // Create custom icons for different waypoint types
    const createCustomIcon = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color === 'bg-green-500' ? '#22c55e' : color === 'bg-red-500' ? '#ef4444' : '#3b82f6'};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              color: white;
              font-weight: bold;
              font-size: 14px;
              transform: rotate(45deg);
            ">${label}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      })
    }

    // Add markers for each waypoint
    waypoints.forEach((waypoint, index) => {
      let markerLabel = 'S'
      if (waypoint.id === 'start') markerLabel = 'S'
      else if (waypoint.id === 'end') markerLabel = 'E'
      else markerLabel = String(index)

      const icon = createCustomIcon(waypoint.color, markerLabel)
      
      const marker = L.marker([waypoint.lat, waypoint.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: #1e293b; font-size: 14px;">${waypoint.label}</strong><br/>
            <span style="color: #64748b; font-size: 12px;">${waypoint.coords}</span><br/>
            <span style="color: #3b82f6; font-size: 12px;">${waypoint.alt}</span>
          </div>
        `)

      markersRef.current.push(marker)
    })

    // Draw polyline connecting all waypoints
    if (waypoints.length > 1) {
      const latLngs: L.LatLngExpression[] = waypoints.map(wp => [wp.lat, wp.lon])
      const polyline = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map)

      polylineRef.current = polyline

      // Fit map bounds to show all waypoints
      const bounds = L.latLngBounds(latLngs)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [waypoints])

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
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Legend Overlay */}
      <div className="absolute top-20 left-3 bg-slate-800 bg-opacity-90 rounded-lg p-4 border border-slate-700 shadow-lg z-[1000]">
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
        </div>
      </div>

      {/* Mission Stats Overlay */}
      <div className="absolute bottom-4 left-3 bg-slate-800 bg-opacity-95 rounded-lg p-4 border border-slate-700 shadow-lg z-[1000]">
        <h3 className="text-white font-semibold mb-3 text-xs">REAL-TIME MISSION STATS</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-1">Total Distance</div>
            <div className="text-green-400 font-bold">{missionStats.totalDistance} km</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Flight Time</div>
            <div className="text-white font-bold">~{formatFlightTime(missionStats.flightTime)}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Battery Usage</div>
            <div className={`font-bold ${getBatteryColor(missionStats.batteryUsage)}`}>
              ~{missionStats.batteryUsage}%
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Waypoints</div>
            <div className="text-white font-bold">{waypoints.length} points</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Status:</span>
            <span className={`font-bold text-xs ${missionStats.batteryUsage > 80 ? 'text-red-400' : 'text-green-400'}`}>
              {missionStats.batteryUsage > 80 ? '⚠️ High Power' : '✓ Optimal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}