'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Plane, 
  Radio, 
  Battery, 
  Navigation, 
  Eye,
  MapPin,
  Activity,
  Circle,
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// FIX LEAFLET ICONS
// ============================================================================

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Position {
  lat: number;
  lon: number;
  alt: number;
}

interface DemoWaypoint {
  lat: number;
  lon: number;
  alt: number;
  label?: string;
}

interface DemoDrone {
  id: string;
  name: string;
  callsign: string;
  position: Position;
  waypoints: DemoWaypoint[];
  status: 'active' | 'patrol' | 'rtl' | 'standby';
  battery: number;
  speed: number;
  heading: number;
  corridor: string;
  corridorColor: string;
  mission: string;
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
  simulationMode?: boolean;
  simulationActive?: boolean;
}

interface TelemetryData {
  timestamp?: string;
  position?: {
    lat: number;
    lon: number;
    alt: number;
  };
  velocity?: {
    vx: number;
    vy: number;
    vz: number;
  };
  attitude?: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  battery?: {
    voltage: number;
    current: number;
    remaining: number;
  };
  gps?: {
    satellites: number;
    fix_type: number;
    hdop: number;
  };
  armed?: boolean;
  mode?: string;
  mission_current?: number;
  mission_count?: number;
}

interface FlightPathPoint {
  lat: number;
  lon: number;
  timestamp: number;
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

// ============================================================================
// DEMO DRONES DATA
// ============================================================================

const DEMO_DRONES: DemoDrone[] = [
  {
    id: 'UAV-001',
    name: 'Northern Sentinel',
    callsign: 'SENT-01',
    position: { lat: 28.6139, lon: 77.2090, alt: 100 },
    waypoints: [
      { lat: 28.6139, lon: 77.2090, alt: 100, label: 'Base' },
      { lat: 28.7041, lon: 77.1025, alt: 120, label: 'WP1' },
    ],
    status: 'patrol',
    battery: 85,
    speed: 12,
    heading: 45,
    corridor: 'Border Surveillance',
    corridorColor: '#3b82f6',
    mission: 'Sector Alpha Patrol',
  },
  {
    id: 'UAV-002',
    name: 'Coastal Guardian',
    callsign: 'CGRD-02',
    position: { lat: 19.0760, lon: 72.8777, alt: 150 },
    waypoints: [
      { lat: 19.0760, lon: 72.8777, alt: 150, label: 'Base' },
      { lat: 18.9220, lon: 72.8347, alt: 150, label: 'WP1' },
    ],
    status: 'active',
    battery: 92,
    speed: 15,
    heading: 180,
    corridor: 'Coastal Monitoring',
    corridorColor: '#f97316',
    mission: 'Mumbai Coast Watch',
  },
];

// ============================================================================
// CORRIDOR POLYGON CALCULATOR
// ============================================================================

const createCorridorPolygon = (waypoints: DemoWaypoint[], corridorWidth: number = 0.005): [number, number][] => {
  if (waypoints.length < 2) return [];
  
  const halfWidth = corridorWidth / 2;
  const polygon: [number, number][] = [];
  
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

const SituationalAwareness: React.FC<SituationalAwarenessProps> = ({ 
  selectedMission,
  simulationMode = false,
  simulationActive = false
}) => {
  const [demoDrones] = useState<DemoDrone[]>(DEMO_DRONES);
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);
  
  // Simulation state
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [flightPath, setFlightPath] = useState<FlightPathPoint[]>([]);
  const [dronePosition, setDronePosition] = useState<Position | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [missionProgress, setMissionProgress] = useState({ current: 0, total: 0 });
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 10;
  
  // API Configuration
  const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002';
  const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
  
  // ============================================================================
  // WEBSOCKET TELEMETRY CONNECTION
  // ============================================================================
  
  const connectWebSocket = () => {
    if (!simulationMode || !simulationActive || !selectedMission) {
      console.log('Skipping WebSocket connection - conditions not met');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max WebSocket reconnection attempts reached');
      return;
    }
    
    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_BASE}/ws/telemetry`);
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to mission if available
        if (selectedMission?.id) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: selectedMission.id
          }));
          console.log(`📡 Subscribed to mission: ${selectedMission.id}`);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'telemetry_update':
              handleTelemetryUpdate(message.data);
              break;
            case 'connection_info':
              console.log('Connection info:', message);
              break;
            case 'error':
              console.error('WebSocket error:', message.message);
              break;
            case 'pong':
              // Keep-alive response
              break;
            default:
              console.log('Unknown message type:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (Code: ${event.code})`);
        setWsConnected(false);
        
        // Auto-reconnect if simulation is still active
        if (simulationActive && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };
      
      wsRef.current = ws;
      
      // Setup ping interval
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
      
      return () => clearInterval(pingInterval);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsConnected(false);
    }
  };
  
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setWsConnected(false);
    reconnectAttemptsRef.current = 0;
  };
  
  // ============================================================================
  // TELEMETRY UPDATE HANDLER
  // ============================================================================
  
  const handleTelemetryUpdate = (data: any) => {
    try {
      // Update telemetry state
      setTelemetry({
        timestamp: data.timestamp,
        position: data.position || data.current_position,
        velocity: data.velocity,
        attitude: data.attitude,
        battery: data.battery,
        gps: data.gps,
        armed: data.armed,
        mode: data.mode,
        mission_current: data.mission_current,
        mission_count: data.mission_count
      });
      
      // Update drone position
      if (data.position || data.current_position) {
        const pos = data.position || data.current_position;
        setDronePosition({
          lat: pos.lat || pos.latitude,
          lon: pos.lon || pos.longitude,
          alt: pos.alt || pos.altitude
        });
        
        // Add to flight path
        setFlightPath(prev => {
          const newPath = [...prev, {
            lat: pos.lat || pos.latitude,
            lon: pos.lon || pos.longitude,
            timestamp: Date.now()
          }];
          return newPath.slice(-500); // Keep last 500 points
        });
      }
      
      // Update mission progress
      if (data.mission_current !== undefined && data.mission_count !== undefined) {
        setMissionProgress({
          current: data.mission_current,
          total: data.mission_count
        });
      }
      
    } catch (error) {
      console.error('Error handling telemetry update:', error);
    }
  };
  
  // ============================================================================
  // AUTOMATIC MISSION UPLOAD AND START
  // ============================================================================
  
  const uploadAndStartMission = async () => {
    if (!simulationMode || !simulationActive || !selectedMission) {
      return;
    }
    
    try {
      console.log('📤 Uploading mission to PX4...');
      
      // Prepare waypoints
      const waypoints = selectedMission.waypoints.map((wp, index) => ({
        lat: wp.lat,
        lon: wp.lng || wp.lon,
        alt: wp.alt || 100,
        sequence: index
      }));
      
      // Upload mission
      const uploadResponse = await fetch(`${API_BASE}/mission/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints })
      });
      
      const uploadData = await uploadResponse.json();
      
      if (uploadData.success) {
        console.log('✅ Mission uploaded successfully');
        
        // Wait a moment for upload to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start mission automatically
        console.log('🚀 Starting mission...');
        const startResponse = await fetch(`${API_BASE}/mission/start`, {
          method: 'POST'
        });
        
        const startData = await startResponse.json();
        
        if (startData.success) {
          console.log('✅ Mission started successfully');
        } else {
          console.error('Failed to start mission:', startData.message);
        }
      } else {
        console.error('Failed to upload mission:', uploadData.message);
      }
      
    } catch (error) {
      console.error('Error uploading/starting mission:', error);
    }
  };
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Auto-connect WebSocket when simulation becomes active
  useEffect(() => {
    if (simulationMode && simulationActive && selectedMission) {
      console.log('🎮 Simulation activated - initializing...');
      
      // Step 1: Upload and start mission
      uploadAndStartMission();
      
      // Step 2: Connect WebSocket after a short delay
      const connectTimer = setTimeout(() => {
        connectWebSocket();
      }, 2000);
      
      return () => {
        clearTimeout(connectTimer);
        disconnectWebSocket();
      };
    } else {
      // Disconnect when simulation stops
      disconnectWebSocket();
      setFlightPath([]);
      setDronePosition(null);
      setTelemetry(null);
    }
  }, [simulationMode, simulationActive, selectedMission]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);
  
  // ============================================================================
  // MAP CENTER CALCULATION
  // ============================================================================
  
  const getMapCenter = (): [number, number] => {
    // If we have a live drone position from simulation, use it
    if (simulationMode && dronePosition) {
      return [dronePosition.lat, dronePosition.lon];
    }
    
    // Otherwise use mission waypoints or demo drones
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

  // Update map center when drone position changes
  useEffect(() => {
    if (simulationMode && dronePosition) {
      setMapCenter([dronePosition.lat, dronePosition.lon]);
    } else if (selectedMission) {
      setMapCenter(getMapCenter());
    }
  }, [selectedMission, dronePosition, simulationMode]);

  // ============================================================================
  // HELPER FUNCTIONS
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
    ? createCorridorPolygon(missionWaypoints, 0.01)
    : [];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative h-full w-full">
      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Esri Satellite Imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        />
        
        {/* Mission Corridor */}
        {selectedMission && showCorridors && missionCorridorPolygon.length > 0 && (
          <Polygon
            positions={missionCorridorPolygon}
            pathOptions={{
              color: selectedMission.corridor?.color || '#3b82f6',
              fillColor: selectedMission.corridor?.color || '#3b82f6',
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-sm">{selectedMission.corridor?.label || 'Mission Corridor'}</div>
                <div className="text-xs text-gray-600 mt-1">{selectedMission.corridor?.description || ''}</div>
              </div>
            </Popup>
          </Polygon>
        )}
        
        {/* Mission Waypoints */}
        {selectedMission && showWaypoints && missionWaypoints.map((waypoint, index) => (
          <Marker
            key={`mission-wp-${index}`}
            position={[waypoint.lat, waypoint.lon]}
            icon={L.divIcon({
              className: 'waypoint-marker',
              html: `
                <div style="
                  background: ${selectedMission.corridor?.color || '#3b82f6'};
                  color: white;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 12px;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                  ${index + 1}
                </div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -15]}>
              <div className="text-xs">
                <strong>{waypoint.label || `WP${index + 1}`}</strong>
                <br />
                Alt: {waypoint.alt}m
              </div>
            </Tooltip>
          </Marker>
        ))}
        
        {/* Mission Flight Path Polyline */}
        {selectedMission && missionWaypoints.length > 1 && (
          <Polyline
            positions={missionWaypoints.map(wp => [wp.lat, wp.lon])}
            pathOptions={{
              color: selectedMission.corridor?.color || '#3b82f6',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
        )}
        
        {/* Simulation Flight Path */}
        {simulationMode && flightPath.length > 1 && (
          <Polyline
            positions={flightPath.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: '#10b981',
              weight: 3,
              opacity: 0.8,
            }}
          />
        )}
        
        {/* Live Drone Position (Simulation) */}
        {simulationMode && dronePosition && (
          <Marker
            position={[dronePosition.lat, dronePosition.lon]}
            icon={createDroneIcon('#10b981', telemetry?.attitude?.yaw || 0)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="font-semibold text-sm mb-2">
                  {selectedMission?.mission_name || 'Live Drone'}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold">{telemetry?.mode || 'UNKNOWN'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Alt:</span>
                    <span>{dronePosition.alt.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Battery:</span>
                    <span>{telemetry?.battery?.remaining?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waypoint:</span>
                    <span>{missionProgress.current} / {missionProgress.total}</span>
                  </div>
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <div className="text-xs">
                <strong>LIVE</strong>
                <br />
                {telemetry?.battery?.remaining?.toFixed(0) || 0}% • {dronePosition.alt.toFixed(0)}m
              </div>
            </Tooltip>
          </Marker>
        )}
        
        {/* Demo Drones (when not in simulation mode) */}
        {!simulationMode && demoDrones.map((drone) => (
          <React.Fragment key={drone.id}>
            {/* Drone Marker */}
            <Marker
              position={[drone.position.lat, drone.position.lon]}
              icon={createDroneIcon(drone.corridorColor, drone.heading)}
              eventHandlers={{
                click: () => setSelectedDrone(selectedDrone === drone.id ? null : drone.id),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{drone.name}</div>
                      <div className="text-xs text-gray-600">{drone.callsign}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeColor(drone.status)}`}>
                      {drone.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Mission:</span>
                      <span className="font-semibold">{drone.mission}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Corridor:</span>
                      <span>{drone.corridor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Altitude:</span>
                      <span>{drone.position.alt}m AGL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Speed:</span>
                      <span>{drone.speed} m/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Battery:</span>
                      <span className={drone.battery > 30 ? 'text-green-600' : 'text-red-600'}>
                        {drone.battery}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Heading:</span>
                      <span>{drone.heading}°</span>
                    </div>
                  </div>
                </div>
              </Popup>
              
              <Tooltip permanent direction="top" offset={[0, -20]}>
                <div className="text-xs">
                  <strong>{drone.callsign}</strong>
                  <br />
                  {drone.battery}% • {drone.position.alt}m
                </div>
              </Tooltip>
            </Marker>
            
            {/* Drone Path */}
            {drone.waypoints.length > 1 && (
              <Polyline
                positions={drone.waypoints.map(wp => [wp.lat, wp.lon])}
                pathOptions={{
                  color: drone.corridorColor,
                  weight: 2,
                  opacity: 0.5,
                  dashArray: '5, 5',
                }}
              />
            )}
            
            {/* Drone Corridor */}
            {showCorridors && drone.waypoints.length > 1 && (
              <Polygon
                positions={createCorridorPolygon(drone.waypoints)}
                pathOptions={{
                  color: drone.corridorColor,
                  fillColor: drone.corridorColor,
                  fillOpacity: 0.1,
                  weight: 1,
                  opacity: 0.3,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
      
      {/* Control Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 space-y-3 min-w-[280px]">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Map Controls</h3>
          {simulationMode && wsConnected && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showCorridors}
              onChange={(e) => setShowCorridors(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600"
            />
            <span>Show Corridors</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showWaypoints}
              onChange={(e) => setShowWaypoints(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600"
            />
            <span>Show Waypoints</span>
          </label>
        </div>
        
        {/* Simulation Status */}
        {simulationMode && (
          <div className="pt-3 border-t border-slate-700 space-y-2">
            <div className="text-xs text-slate-400">
              <div className="flex justify-between mb-1">
                <span>WebSocket:</span>
                <span className={wsConnected ? 'text-green-400' : 'text-red-400'}>
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {telemetry && (
                <>
                  <div className="flex justify-between mb-1">
                    <span>Mode:</span>
                    <span className="text-white">{telemetry.mode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Waypoint:</span>
                    <span className="text-white">
                      {missionProgress.current} / {missionProgress.total}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Battery:</span>
                    <span className={
                      (telemetry.battery?.remaining || 0) > 30 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }>
                      {telemetry.battery?.remaining?.toFixed(0) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GPS Sats:</span>
                    <span className="text-white">
                      {telemetry.gps?.satellites || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
          {simulationMode ? 'Simulation Mode Active' : `${demoDrones.length} Demo Drones Active`}
        </div>
      </div>
    </div>
  );
};

export default SituationalAwareness;