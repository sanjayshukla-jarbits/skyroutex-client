'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, MapPin, Plane, Navigation, Battery, Zap } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface DemoWaypoint {
  lat: number;
  lon: number;
  alt?: number;
  label?: string;
}

interface DemoDrone {
  id: string;
  name: string;
  callsign: string;
  position: { lat: number; lon: number; alt: number };
  waypoints: DemoWaypoint[];
  status: string;
  battery: number;
  speed: number;
  heading: number;
  corridor?: string;
  corridorColor: string;
  mission: string;
  missionShape: 'linear' | 'triangle' | 'rectangle' | 'pentagon';
  currentWaypointIndex: number;
}

interface SelectedMissionData {
  id: string;
  mission_name: string;
  waypoints: Array<{
    lat: number;
    lon: number;
    lng?: number;
    alt?: number;
    label?: string;
  }>;
  corridor?: {
    value: string;
    label: string;
    color: string;
    description: string;
  };
  total_distance?: number;
  mission_type?: string;
  status?: string;
}

interface SituationalAwarenessProps {
  selectedMission?: SelectedMissionData | null;
}

interface TelemetryData {
  position?: { lat: number; lon: number; alt: number };
  velocity?: { vx: number; vy: number; vz: number };
  attitude?: { roll: number; pitch: number; yaw: number };
  battery?: { voltage: number; current: number; remaining: number };
  gps?: { satellites: number; fix_type: number; hdop: number };
}

// ============================================================================
// CUSTOM DRONE ICONS
// ============================================================================

const createDroneIcon = (color: string, heading: number = 0) => {
  return L.divIcon({
    className: 'drone-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        position: relative;
        transform: rotate(${heading}deg);
      ">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Drone body -->
          <circle cx="16" cy="16" r="6" fill="${color}" stroke="white" stroke-width="2"/>
          <!-- Drone arms -->
          <line x1="8" y1="8" x2="24" y2="24" stroke="${color}" stroke-width="2"/>
          <line x1="24" y1="8" x2="8" y2="24" stroke="${color}" stroke-width="2"/>
          <!-- Propellers -->
          <circle cx="8" cy="8" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.7"/>
          <circle cx="24" cy="8" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.7"/>
          <circle cx="8" cy="24" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.7"/>
          <circle cx="24" cy="24" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.7"/>
          <!-- Direction indicator -->
          <circle cx="16" cy="12" r="2" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const createWaypointIcon = (color: string) => {
  return L.divIcon({
    className: 'waypoint-marker',
    html: `
      <div style="width: 16px; height: 16px;">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" fill="${color}" stroke="white" stroke-width="2" opacity="0.7"/>
        </svg>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const createMissionDroneIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'mission-drone-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        position: relative;
        transform: rotate(${heading}deg);
      ">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Glow effect -->
          <circle cx="20" cy="20" r="15" fill="#10b981" opacity="0.2"/>
          <!-- Drone body -->
          <circle cx="20" cy="20" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
          <!-- Drone arms -->
          <line x1="9" y1="9" x2="31" y2="31" stroke="#10b981" stroke-width="2.5"/>
          <line x1="31" y1="9" x2="9" y2="31" stroke="#10b981" stroke-width="2.5"/>
          <!-- Propellers -->
          <circle cx="9" cy="9" r="5" fill="#10b981" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="31" cy="9" r="5" fill="#10b981" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="9" cy="31" r="5" fill="#10b981" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="31" cy="31" r="5" fill="#10b981" stroke="white" stroke-width="2" opacity="0.8"/>
          <!-- Direction indicator -->
          <circle cx="20" cy="14" r="3" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// ============================================================================
// INITIAL DEMO DRONES DATA (4 DIFFERENT SHAPES)
// ============================================================================

const INITIAL_DEMO_DRONES: DemoDrone[] = [
  {
    id: 'UAV-001',
    name: 'Northern Guardian',
    callsign: 'ALPHA-1',
    position: { lat: 26.7465, lon: 80.8769, alt: 120 },
    waypoints: [
      { lat: 26.7465, lon: 80.8769, alt: 120, label: 'Start' },
      { lat: 26.8123, lon: 80.9456, alt: 130, label: 'WP1' },
      { lat: 26.8789, lon: 81.0123, alt: 125, label: 'WP2' },
      { lat: 26.9234, lon: 81.0789, alt: 135, label: 'End' },
    ],
    status: 'patrol',
    battery: 78,
    speed: 12.5,
    heading: 45,
    corridor: 'Northern Border',
    corridorColor: '#3b82f6',
    mission: 'Border Patrol Alpha',
    missionShape: 'linear',
    currentWaypointIndex: 0,
  },
  {
    id: 'UAV-002',
    name: 'Western Scout',
    callsign: 'BRAVO-2',
    position: { lat: 26.6234, lon: 80.7123, alt: 115 },
    waypoints: [
      { lat: 26.6234, lon: 80.7123, alt: 115, label: 'Start' },
      { lat: 26.5678, lon: 80.8456, alt: 125, label: 'WP1' },
      { lat: 26.4789, lon: 80.7456, alt: 120, label: 'WP2' },
      { lat: 26.6234, lon: 80.7123, alt: 115, label: 'End' },
    ],
    status: 'active',
    battery: 92,
    speed: 10.8,
    heading: 225,
    corridor: 'Western Border',
    corridorColor: '#f97316',
    mission: 'Western Triangle Patrol',
    missionShape: 'triangle',
    currentWaypointIndex: 0,
  },
  {
    id: 'UAV-003',
    name: 'Eastern Sentinel',
    callsign: 'CHARLIE-3',
    position: { lat: 26.5678, lon: 81.2345, alt: 110 },
    waypoints: [
      { lat: 26.5678, lon: 81.2345, alt: 110, label: 'Start' },
      { lat: 26.6234, lon: 81.2345, alt: 130, label: 'WP1' },
      { lat: 26.6234, lon: 81.3456, alt: 125, label: 'WP2' },
      { lat: 26.5678, lon: 81.3456, alt: 130, label: 'WP3' },
      { lat: 26.5678, lon: 81.2345, alt: 110, label: 'End' },
    ],
    status: 'patrol',
    battery: 65,
    speed: 11.2,
    heading: 135,
    corridor: 'Eastern Border',
    corridorColor: '#22c55e',
    mission: 'Eastern Box Survey',
    missionShape: 'rectangle',
    currentWaypointIndex: 0,
  },
  {
    id: 'UAV-004',
    name: 'Coastal Watcher',
    callsign: 'DELTA-4',
    position: { lat: 26.4123, lon: 80.9123, alt: 105 },
    waypoints: [
      { lat: 26.4123, lon: 80.9123, alt: 105, label: 'Start' },
      { lat: 26.4678, lon: 80.9789, alt: 115, label: 'WP1' },
      { lat: 26.5234, lon: 80.9456, alt: 120, label: 'WP2' },
      { lat: 26.5123, lon: 80.8789, alt: 115, label: 'WP3' },
      { lat: 26.4456, lon: 80.8456, alt: 110, label: 'WP4' },
      { lat: 26.4123, lon: 80.9123, alt: 105, label: 'End' },
    ],
    status: 'active',
    battery: 88,
    speed: 13.5,
    heading: 90,
    corridor: 'Coastal Zone',
    corridorColor: '#a855f7',
    mission: 'Coastal Pentagon Recon',
    missionShape: 'pentagon',
    currentWaypointIndex: 0,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  
  return ((θ * 180) / Math.PI + 360) % 360;
};

const interpolatePosition = (
  start: { lat: number; lon: number; alt: number },
  end: { lat: number; lon: number; alt: number },
  progress: number
): { lat: number; lon: number; alt: number } => {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lon: start.lon + (end.lon - start.lon) * progress,
    alt: start.alt + (end.alt - start.alt) * progress,
  };
};

const generateCorridorPolygon = (waypoints: DemoWaypoint[], width: number = 0.02): [number, number][] => {
  if (waypoints.length < 2) return [];
  
  const polygon: [number, number][] = [];
  const halfWidth = width / 2;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i];
    const next = waypoints[i + 1];
    
    const dx = next.lon - current.lon;
    const dy = next.lat - current.lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;
    
    if (i === 0) {
      polygon.push([current.lat + offsetY, current.lon + offsetX]);
    }
    polygon.push([next.lat + offsetY, next.lon + offsetX]);
  }
  
  for (let i = waypoints.length - 1; i > 0; i--) {
    const current = waypoints[i];
    const previous = waypoints[i - 1];
    
    const dx = previous.lon - current.lon;
    const dy = previous.lat - current.lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;
    
    polygon.push([current.lat + offsetY, current.lon + offsetX]);
    if (i === 1) {
      polygon.push([previous.lat + offsetY, previous.lon + offsetX]);
    }
  }
  
  return polygon;
};

// ============================================================================
// MAP CENTER UPDATER
// ============================================================================

const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SituationalAwareness: React.FC<SituationalAwarenessProps> = ({ selectedMission }) => {
  const [demoDrones, setDemoDrones] = useState<DemoDrone[]>(INITIAL_DEMO_DRONES);
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);
  
  // Mission drone telemetry (from WebSocket)
  const [missionDroneTelemetry, setMissionDroneTelemetry] = useState<TelemetryData | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  const WS_BASE = process.env.NEXT_PUBLIC_DRONE_WS_URL || 'ws://localhost:7000';
  
  // Calculate map center
  const getMapCenter = (): [number, number] => {
    if (selectedMission?.waypoints?.[0]) {
      const firstWp = selectedMission.waypoints[0];
      const lon = firstWp.lng ?? firstWp.lon;
      return [firstWp.lat, lon];
    }
    
    const avgLat = demoDrones.reduce((sum, drone) => sum + drone.position.lat, 0) / demoDrones.length;
    const avgLon = demoDrones.reduce((sum, drone) => sum + drone.position.lon, 0) / demoDrones.length;
    return [avgLat, avgLon];
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>(getMapCenter());
  const [mapZoom] = useState<number>(selectedMission ? 12 : 11);

  // Update map center when selected mission changes
  useEffect(() => {
    setMapCenter(getMapCenter());
  }, [selectedMission]);

  // ============================================================================
  // DEMO DRONES ANIMATION
  // ============================================================================

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setDemoDrones(prevDrones => 
        prevDrones.map(drone => {
          const currentWpIndex = drone.currentWaypointIndex;
          const waypoints = drone.waypoints;
          
          // If at the last waypoint, restart from beginning
          if (currentWpIndex >= waypoints.length - 1) {
            return {
              ...drone,
              currentWaypointIndex: 0,
              position: {
                lat: waypoints[0].lat,
                lon: waypoints[0].lon,
                alt: waypoints[0].alt || 100,
              },
              battery: Math.max(20, drone.battery - 1),
            };
          }

          const currentWp = waypoints[currentWpIndex];
          const nextWp = waypoints[currentWpIndex + 1];

          // Calculate distance to next waypoint
          const distance = calculateDistance(
            drone.position.lat,
            drone.position.lon,
            nextWp.lat,
            nextWp.lon
          );

          // Speed in m/s, update every 100ms, so distance per update
          const moveDistance = (drone.speed * 0.1);

          // If close enough to next waypoint, move to it
          if (distance < moveDistance) {
            const newHeading = calculateBearing(
              drone.position.lat,
              drone.position.lon,
              nextWp.lat,
              nextWp.lon
            );

            return {
              ...drone,
              position: {
                lat: nextWp.lat,
                lon: nextWp.lon,
                alt: nextWp.alt || drone.position.alt,
              },
              currentWaypointIndex: currentWpIndex + 1,
              heading: newHeading,
              battery: Math.max(20, drone.battery - 0.1),
            };
          }

          // Interpolate position
          const progress = moveDistance / distance;
          const newPosition = interpolatePosition(
            drone.position,
            { lat: nextWp.lat, lon: nextWp.lon, alt: nextWp.alt || drone.position.alt },
            progress
          );

          const newHeading = calculateBearing(
            drone.position.lat,
            drone.position.lon,
            nextWp.lat,
            nextWp.lon
          );

          return {
            ...drone,
            position: newPosition,
            heading: newHeading,
            battery: Math.max(20, drone.battery - 0.05),
          };
        })
      );
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(animationInterval);
  }, []);

  // ============================================================================
  // WEBSOCKET FOR MISSION DRONE TELEMETRY
  // ============================================================================

  useEffect(() => {
    if (!selectedMission) {
      // Disconnect WebSocket if no mission selected
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setWsConnected(false);
      }
      return;
    }

    // Connect to WebSocket for real-time telemetry
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected for mission telemetry');
          setWsConnected(true);
          
          // Subscribe to mission
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: selectedMission.id
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'telemetry_update') {
              setMissionDroneTelemetry(message.data);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setWsConnected(false);
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket closed');
          setWsConnected(false);
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedMission]);

  // ============================================================================
  // STATUS HELPERS
  // ============================================================================

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: 'text-green-400',
      patrol: 'text-blue-400',
      rtl: 'text-yellow-400',
      standby: 'text-gray-400',
    };
    return statusColors[status] || 'text-gray-400';
  };

  const getStatusBadgeColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-600',
      patrol: 'bg-blue-600',
      rtl: 'bg-yellow-600',
      standby: 'bg-gray-600',
    };
    return statusColors[status] || 'bg-gray-600';
  };

  const getMissionShapeIcon = (shape: string): string => {
    const icons: Record<string, string> = {
      linear: '━━',
      triangle: '△',
      rectangle: '▭',
      pentagon: '⬟',
    };
    return icons[shape] || '○';
  };

  // Format mission waypoints
  const getMissionWaypoints = (): DemoWaypoint[] => {
    if (!selectedMission?.waypoints) return [];
    
    return selectedMission.waypoints.map(wp => ({
      lat: wp.lat,
      lon: wp.lng ?? wp.lon,
      alt: wp.alt ?? 100,
      label: wp.label
    }));
  };

  const missionWaypoints = getMissionWaypoints();
  const missionCorridorPolygon = missionWaypoints.length > 1 
    ? generateCorridorPolygon(missionWaypoints, 0.025) 
    : [];

  // Get mission drone position from telemetry
  const getMissionDronePosition = (): [number, number] => {
    if (missionDroneTelemetry?.position) {
      return [missionDroneTelemetry.position.lat, missionDroneTelemetry.position.lon];
    }
    // Default to first waypoint if no telemetry yet
    if (missionWaypoints.length > 0) {
      return [missionWaypoints[0].lat, missionWaypoints[0].lon];
    }
    return [26.7, 80.9];
  };

  const getMissionDroneHeading = (): number => {
    return missionDroneTelemetry?.attitude?.yaw || 0;
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex">
      {/* Left Sidebar - Drone Status */}
      <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="text-blue-400" size={24} />
            <h1 className="text-xl font-bold text-white">Situational Awareness</h1>
          </div>
          <p className="text-sm text-slate-400">Real-time fleet monitoring</p>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCorridors}
              onChange={(e) => setShowCorridors(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Show Corridors</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWaypoints}
              onChange={(e) => setShowWaypoints(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Show Waypoints</span>
          </label>
        </div>

        {/* Selected Mission Info */}
        {selectedMission && (
          <div className="p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-b border-slate-700">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="text-green-400" size={16} />
              <span className="text-xs font-semibold text-green-300">USER MISSION (LIVE)</span>
              {wsConnected && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              )}
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">{selectedMission.mission_name}</h3>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                selectedMission.corridor?.color === 'blue' ? 'bg-blue-600' :
                selectedMission.corridor?.color === 'orange' ? 'bg-orange-600' :
                selectedMission.corridor?.color === 'green' ? 'bg-green-600' :
                selectedMission.corridor?.color === 'purple' ? 'bg-purple-600' :
                selectedMission.corridor?.color === 'yellow' ? 'bg-yellow-600' :
                'bg-gray-600'
              }`}>
                {selectedMission.corridor?.label || 'No Corridor'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Type:</span>
                <span className="text-white ml-1">{selectedMission.mission_type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400">Distance:</span>
                <span className="text-white ml-1">{selectedMission.total_distance?.toFixed(1) || 'N/A'} km</span>
              </div>
              <div>
                <span className="text-slate-400">Waypoints:</span>
                <span className="text-white ml-1">{selectedMission.waypoints?.length || 0}</span>
              </div>
              {missionDroneTelemetry && (
                <>
                  <div>
                    <span className="text-slate-400">Battery:</span>
                    <span className="text-white ml-1">{missionDroneTelemetry.battery?.remaining.toFixed(0) || 'N/A'}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Altitude:</span>
                    <span className="text-white ml-1">{missionDroneTelemetry.position?.alt.toFixed(1) || 'N/A'}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Speed:</span>
                    <span className="text-white ml-1">
                      {missionDroneTelemetry.velocity 
                        ? Math.sqrt(
                            Math.pow(missionDroneTelemetry.velocity.vx, 2) + 
                            Math.pow(missionDroneTelemetry.velocity.vy, 2)
                          ).toFixed(1)
                        : 'N/A'} m/s
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Demo Drones List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <Plane className="text-slate-400" size={16} />
            <span className="text-xs font-semibold text-slate-400">DEMO DRONES ({demoDrones.length})</span>
          </div>
          
          {demoDrones.map((drone) => (
            <div
              key={drone.id}
              onClick={() => setSelectedDrone(selectedDrone === drone.id ? null : drone.id)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all
                ${selectedDrone === drone.id 
                  ? 'bg-slate-800 border-blue-500' 
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse" 
                    style={{ backgroundColor: drone.corridorColor }}
                  />
                  <span className="text-white font-semibold text-sm">{drone.name}</span>
                </div>
                <span className="text-xs text-slate-400">{getMissionShapeIcon(drone.missionShape)}</span>
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs text-slate-400">{drone.callsign}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeColor(drone.status)}`}>
                  {drone.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <Battery className="text-slate-400" size={12} />
                  <span className="text-white">{drone.battery.toFixed(0)}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="text-slate-400" size={12} />
                  <span className="text-white">{drone.speed.toFixed(1)} m/s</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Navigation className="text-slate-400" size={12} />
                  <span className="text-white">{drone.heading.toFixed(0)}°</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">WP:</span>
                  <span className="text-white">{drone.currentWaypointIndex + 1}/{drone.waypoints.length}</span>
                </div>
              </div>

              {selectedDrone === drone.id && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs space-y-1">
                    <div className="text-slate-400">Mission: <span className="text-white">{drone.mission}</span></div>
                    <div className="text-slate-400">Corridor: <span className="text-white">{drone.corridor || 'N/A'}</span></div>
                    <div className="text-slate-400">
                      Position: <span className="text-white">
                        {drone.position.lat.toFixed(5)}, {drone.position.lon.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
          
          {/* Satellite Base Layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
          />
          
          {/* Labels Overlay */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            maxZoom={19}
          />

          {/* Render Demo Drones */}
          {demoDrones.map((drone) => (
            <React.Fragment key={drone.id}>
              {/* Corridor Polygon */}
              {showCorridors && drone.waypoints.length > 1 && (
                <Polygon
                  positions={generateCorridorPolygon(drone.waypoints)}
                  pathOptions={{
                    color: drone.corridorColor,
                    fillColor: drone.corridorColor,
                    fillOpacity: 0.15,
                    weight: 2,
                    opacity: 0.6,
                  }}
                />
              )}

              {/* Flight Path */}
              <Polyline
                positions={drone.waypoints.map(wp => [wp.lat, wp.lon])}
                pathOptions={{
                  color: drone.corridorColor,
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '5, 10',
                }}
              />

              {/* Waypoint Markers */}
              {showWaypoints && drone.waypoints.map((wp, index) => (
                <Marker
                  key={`${drone.id}-wp-${index}`}
                  position={[wp.lat, wp.lon]}
                  icon={createWaypointIcon(drone.corridorColor)}
                >
                  <Popup>
                    <div className="text-white text-xs">
                      <div className="font-semibold">{drone.name}</div>
                      <div>{wp.label || `WP ${index + 1}`}</div>
                      <div className="text-slate-400">Alt: {wp.alt || 100}m</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Drone Marker */}
              <Marker
                position={[drone.position.lat, drone.position.lon]}
                icon={createDroneIcon(drone.corridorColor, drone.heading)}
              >
                <Popup>
                  <div className="text-white text-sm">
                    <div className="font-bold text-base mb-1">{drone.name}</div>
                    <div className="text-xs space-y-0.5 text-slate-300">
                      <div>Callsign: {drone.callsign}</div>
                      <div>Status: <span className={getStatusColor(drone.status)}>{drone.status.toUpperCase()}</span></div>
                      <div>Battery: {drone.battery.toFixed(0)}%</div>
                      <div>Speed: {drone.speed.toFixed(1)} m/s</div>
                      <div>Heading: {drone.heading.toFixed(0)}°</div>
                      <div>Altitude: {drone.position.alt.toFixed(0)}m</div>
                      <div>Waypoint: {drone.currentWaypointIndex + 1}/{drone.waypoints.length}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* User Selected Mission */}
          {selectedMission && (
            <>
              {/* Mission Corridor Polygon */}
              {showCorridors && missionCorridorPolygon.length > 0 && (
                <Polygon
                  positions={missionCorridorPolygon}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.2,
                    weight: 3,
                    opacity: 0.8,
                  }}
                />
              )}

              {/* Mission Flight Path */}
              {missionWaypoints.length > 1 && (
                <Polyline
                  positions={missionWaypoints.map(wp => [wp.lat, wp.lon])}
                  pathOptions={{
                    color: '#10b981',
                    weight: 4,
                    opacity: 0.9,
                  }}
                />
              )}

              {/* Mission Waypoint Markers */}
              {showWaypoints && missionWaypoints.map((wp, index) => (
                <Marker
                  key={`mission-wp-${index}`}
                  position={[wp.lat, wp.lon]}
                  icon={createWaypointIcon('#10b981')}
                >
                  <Popup>
                    <div className="text-white text-xs">
                      <div className="font-semibold text-green-400">{selectedMission.mission_name}</div>
                      <div>{wp.label || `WP ${index + 1}`}</div>
                      <div className="text-slate-400">Alt: {wp.alt || 100}m</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Mission Drone with Telemetry */}
              <Marker
                position={getMissionDronePosition()}
                icon={createMissionDroneIcon(getMissionDroneHeading())}
              >
                <Popup>
                  <div className="text-white text-sm">
                    <div className="font-bold text-base mb-1 text-green-400">{selectedMission.mission_name}</div>
                    <div className="text-xs space-y-0.5 text-slate-300">
                      {missionDroneTelemetry ? (
                        <>
                          <div>Position: {missionDroneTelemetry.position?.lat.toFixed(5)}, {missionDroneTelemetry.position?.lon.toFixed(5)}</div>
                          <div>Altitude: {missionDroneTelemetry.position?.alt.toFixed(1)}m</div>
                          <div>Battery: {missionDroneTelemetry.battery?.remaining.toFixed(0)}%</div>
                          <div>Voltage: {missionDroneTelemetry.battery?.voltage.toFixed(2)}V</div>
                          <div>GPS Sats: {missionDroneTelemetry.gps?.satellites || 'N/A'}</div>
                          <div>Heading: {missionDroneTelemetry.attitude?.yaw.toFixed(0)}°</div>
                        </>
                      ) : (
                        <div className="text-yellow-400">Waiting for telemetry...</div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default SituationalAwareness;