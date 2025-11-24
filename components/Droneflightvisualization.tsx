'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Upload, PlayCircle, StopCircle } from 'lucide-react';
import TelemetryDisplay from '@/components/TelemetryDisplay';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TelemetryData {
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
}

interface DroneStatus {
  connected: boolean;
  armed: boolean;
  flying: boolean;
  current_position: {
    lat: number;
    lon: number;
    alt: number;
  };
  home_position: {
    lat: number;
    lon: number;
    alt: number;
  };
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
}

interface FlightPath {
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

interface MissionWaypoint {
  lat: number;
  lng?: number;
  lon?: number;
  alt?: number;
  name?: string;
}

interface SelectedMission {
  id: string;
  name: string;
  waypoints: MissionWaypoint[];
  corridor?: string;
  distance?: number;
  status?: string;
}

interface DroneFlightVisualizationProps {
  selectedMission?: SelectedMission | null;
  onBack?: () => void;
}

interface WaypointStatus {
  index: number;
  status: 'pending' | 'active' | 'completed';
  arrivalTime?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getWaypointLongitude = (wp: MissionWaypoint): number | undefined => {
  return wp.lng ?? wp.lon;
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Calculate bearing between two points
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // Bearing in degrees
};

// Interpolate between two positions
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

// ============================================================================
// VELOCITY VECTOR COMPONENT
// ============================================================================

const VelocityVector: React.FC<{
  position: [number, number];
  velocity: { vx: number; vy: number };
  color?: string;
}> = ({ position, velocity, color = '#22c55e' }) => {
  const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);
  
  if (speed < 0.5) return null; // Don't show for very low speeds
  
  // Calculate end point for velocity vector (scaled for visibility)
  const scale = 0.00005; // Adjust this to change vector length
  const endLat = position[0] + velocity.vy * scale;
  const endLon = position[1] + velocity.vx * scale;
  
  return (
    <Polyline
      positions={[position, [endLat, endLon]]}
      color={color}
      weight={3}
      opacity={0.8}
      dashArray="5, 5"
    >
      <Popup>
        <div className="text-xs">
          <strong>Velocity Vector</strong><br />
          Speed: {speed.toFixed(2)} m/s<br />
          Vx: {velocity.vx.toFixed(2)} m/s<br />
          Vy: {velocity.vy.toFixed(2)} m/s
        </div>
      </Popup>
    </Polyline>
  );
};

// ============================================================================
// MAP UPDATE COMPONENT
// ============================================================================

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.length === 2 && 
        !isNaN(center[0]) && !isNaN(center[1]) &&
        center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DroneFlightVisualization: React.FC<DroneFlightVisualizationProps> = ({ 
  selectedMission = null,
  onBack 
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<DroneStatus | null>(null);
  const [flightPath, setFlightPath] = useState<FlightPath[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentMissionId, setCurrentMissionId] = useState<string>(
    selectedMission?.id || '13'
  );
  const [takeoffAltitude, setTakeoffAltitude] = useState<number>(10);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [missionUploaded, setMissionUploaded] = useState<boolean>(false);
  
  // SIMULATION MODE STATE
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [waypointStatuses, setWaypointStatuses] = useState<WaypointStatus[]>([]);
  const [missionProgress, setMissionProgress] = useState<number>(0);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [distanceToNextWaypoint, setDistanceToNextWaypoint] = useState<number>(0);
  const [estimatedTimeToWaypoint, setEstimatedTimeToWaypoint] = useState<number>(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(10); // m/s
  
  const telemetryInterval = useRef<NodeJS.Timeout | null>(null);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
  const MISSION_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const WS_BASE = process.env.NEXT_PUBLIC_DRONE_WS_URL || 'ws://localhost:7000';
  
  // ============================================================================
  // SIMULATION MODE FUNCTIONS
  // ============================================================================

  const initializeWaypointStatuses = () => {
    if (!selectedMission?.waypoints) return;
    
    const statuses: WaypointStatus[] = selectedMission.waypoints.map((_, index) => ({
      index,
      status: 'pending'
    }));
    
    if (statuses.length > 0) {
      statuses[0].status = 'active';
    }
    
    setWaypointStatuses(statuses);
    setCurrentWaypointIndex(0);
    setMissionProgress(0);
  };

  const startSimulation = () => {
    if (!selectedMission?.waypoints || selectedMission.waypoints.length === 0) {
      showToast('No mission waypoints to simulate', 'error');
      return;
    }

    showToast('🚁 Starting real-time simulation with live telemetry...', 'success');
    setSimulationRunning(true);
    initializeWaypointStatuses();
    
    // Initialize simulated status
    const firstWp = selectedMission.waypoints[0];
    const lng = getWaypointLongitude(firstWp)!;
    
    setStatus({
      connected: true,
      armed: true,
      flying: true,
      current_position: {
        lat: firstWp.lat,
        lon: lng,
        alt: firstWp.alt || takeoffAltitude
      },
      home_position: {
        lat: firstWp.lat,
        lon: lng,
        alt: 0
      },
      battery_level: 100,
      flight_mode: 'AUTO.MISSION',
      mission_active: true,
      mission_current: 1,
      mission_count: selectedMission.waypoints.length
    });

    // Start simulation loop
    runSimulation();
  };

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    
    setSimulationRunning(false);
    showToast('⏸️ Simulation stopped', 'info');
  };

  const runSimulation = () => {
    if (!selectedMission?.waypoints) return;

    let currentWpIndex = 0;
    let progress = 0;
    const totalWaypoints = selectedMission.waypoints.length;
    
    // Get starting position
    const startWp = selectedMission.waypoints[0];
    const startLng = getWaypointLongitude(startWp)!;
    let currentPos = {
      lat: startWp.lat,
      lon: startLng,
      alt: startWp.alt || takeoffAltitude
    };

    simulationInterval.current = setInterval(() => {
      if (currentWpIndex >= totalWaypoints) {
        stopSimulation();
        showToast('✅ Simulation mission completed!', 'success');
        return;
      }

      const targetWp = selectedMission.waypoints[currentWpIndex];
      const targetLng = getWaypointLongitude(targetWp)!;
      const target = {
        lat: targetWp.lat,
        lon: targetLng,
        alt: targetWp.alt || takeoffAltitude
      };

      // Calculate distance to target
      const distance = calculateDistance(
        currentPos.lat,
        currentPos.lon,
        target.lat,
        target.lon
      );

      setDistanceToNextWaypoint(distance);
      setEstimatedTimeToWaypoint(distance / simulatedSpeed);

      // Move towards target
      if (distance < 5) {
        // Reached waypoint
        currentPos = target;
        
        // Update waypoint status
        setWaypointStatuses(prev => {
          const updated = [...prev];
          if (updated[currentWpIndex]) {
            updated[currentWpIndex].status = 'completed';
            updated[currentWpIndex].arrivalTime = Date.now();
          }
          if (currentWpIndex + 1 < totalWaypoints && updated[currentWpIndex + 1]) {
            updated[currentWpIndex + 1].status = 'active';
          }
          return updated;
        });

        showToast(`✅ Waypoint ${currentWpIndex + 1} reached!`, 'success');
        
        currentWpIndex++;
        setCurrentWaypointIndex(currentWpIndex);
        setMissionProgress((currentWpIndex / totalWaypoints) * 100);
        
        // Update status
        setStatus(prev => prev ? {
          ...prev,
          mission_current: currentWpIndex + 1,
          current_position: currentPos
        } : null);
        
      } else {
        // Interpolate position
        const moveDistance = Math.min(simulatedSpeed * 0.1, distance); // Move 10% per update
        const moveProgress = moveDistance / distance;
        
        currentPos = interpolatePosition(currentPos, target, moveProgress);
        
        // Calculate bearing for yaw
        const bearing = calculateBearing(
          currentPos.lat,
          currentPos.lon,
          target.lat,
          target.lon
        );

        // Calculate velocity
        const vx = simulatedSpeed * Math.cos((bearing * Math.PI) / 180);
        const vy = simulatedSpeed * Math.sin((bearing * Math.PI) / 180);

        // Update telemetry
        setTelemetry({
          position: currentPos,
          velocity: { vx, vy, vz: 0 },
          attitude: { roll: 0, pitch: 0, yaw: bearing },
          battery: {
            voltage: 16.8 - (currentWpIndex / totalWaypoints) * 2,
            current: 15.5,
            remaining: 100 - (currentWpIndex / totalWaypoints) * 100
          },
          gps: {
            satellites: 12,
            fix_type: 3,
            hdop: 0.8
          }
        });

        // Update status
        setStatus(prev => prev ? {
          ...prev,
          current_position: currentPos,
          battery_level: 100 - (currentWpIndex / totalWaypoints) * 100
        } : null);

        // Add to flight path
        setFlightPath(prev => {
          const newPath = [...prev, {
            ...currentPos,
            timestamp: Date.now()
          }];
          return newPath.slice(-500); // Keep last 500 points
        });

        // Update map center if flying
        setMapCenter([currentPos.lat, currentPos.lon]);
      }
    }, 100); // Update every 100ms for smooth animation
  };

  // ============================================================================
  // WEBSOCKET TELEMETRY CONNECTION
  // ============================================================================

  const connectWebSocket = () => {
    if (simulationMode) {
      console.log('Simulation mode active, skipping WebSocket connection');
      return;
    }

    // Don't reconnect if already connected or if we've exceeded max attempts
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max WebSocket reconnection attempts reached');
      showToast('WebSocket connection failed. Using fallback polling.', 'error');
      startStatusPolling();
      return;
    }

    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_BASE}/ws/telemetry`);
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
        showToast('✅ Real-time telemetry connected', 'success');
        
        if (currentMissionId) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: currentMissionId
          }));
          console.log(`📡 Subscribed to mission: ${currentMissionId}`);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          
          switch (message.type) {
            case 'telemetry_update':
              // ⭐ IMPROVED: Handle both message.data and root-level data
              const telemetryData = message.data || message;
              handleTelemetryUpdate(telemetryData);
              break;
            case 'connection_info':
              console.log('🔌 Connection info:', message);
              break;
            case 'error':
              console.error('❌ WebSocket error:', message.message);
              break;
            case 'pong':
              // Silent - heartbeat response
              break;
            default:
              console.log('❓ Unknown message type:', message.type);
              console.log('Full message:', message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw event data:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket state:', ws.readyState);
        console.error('WebSocket URL:', `${WS_BASE}/ws/telemetry`);
        setWsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (Code: ${event.code})`);
        setWsConnected(false);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached, switching to polling');
          startStatusPolling();
        }
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsConnected(false);
      startStatusPolling();
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

  useEffect(() => {
    if (wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      const pingInterval = setInterval(() => {
        wsRef.current?.send(JSON.stringify({ action: 'ping' }));
      }, 30000);
      
      return () => clearInterval(pingInterval);
    }
  }, [wsConnected]);

  // ============================================================================
  // FALLBACK HTTP POLLING
  // ============================================================================

  const startStatusPolling = () => {
    if (telemetryInterval.current || simulationMode) return;
    
    console.log('📊 Starting HTTP polling fallback');
    telemetryInterval.current = setInterval(() => {
      fetchStatus();
      fetchTelemetryHTTP();
    }, 1000);
  };

  const stopStatusPolling = () => {
    if (telemetryInterval.current) {
      clearInterval(telemetryInterval.current);
      telemetryInterval.current = null;
      console.log('🛑 HTTP polling stopped');
    }
  };

  const fetchTelemetryHTTP = async () => {
    if (simulationMode) return;
    
    try {
      const response = await fetch(`${API_BASE}/telemetry`);
      const data = await response.json();
      handleTelemetryUpdate(data);
    } catch (error) {
      console.error('Error fetching telemetry via HTTP:', error);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const getDefaultPosition = (): [number, number] => {
    if (selectedMission?.waypoints?.[0]) {
      const firstWp = selectedMission.waypoints[0];
      const lng = getWaypointLongitude(firstWp);
      
      if (firstWp.lat && lng && 
          !isNaN(firstWp.lat) && !isNaN(lng) &&
          firstWp.lat >= -90 && firstWp.lat <= 90 &&
          lng >= -180 && lng <= 180 &&
          firstWp.lat !== 0 && lng !== 0) {
        return [firstWp.lat, lng];
      }
    }
    return [26.8467, 80.9462]; // Fallback: Lucknow, India
  };
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(getDefaultPosition());
  const [mapZoom, setMapZoom] = useState(selectedMission ? 15 : 18);

  const isValidCoordinate = (lat: number | undefined, lon: number | undefined): boolean => {
    return (
      lat !== undefined && 
      lon !== undefined && 
      !isNaN(lat) && 
      !isNaN(lon) && 
      lat !== 0 && 
      lon !== 0 &&
      lat >= -90 && 
      lat <= 90 && 
      lon >= -180 && 
      lon <= 180
    );
  };
  
  const getValidPosition = (
    telemetryLat?: number, 
    telemetryLon?: number,
    statusLat?: number,
    statusLon?: number
  ): [number, number] => {
    if (isValidCoordinate(telemetryLat, telemetryLon)) {
      return [telemetryLat!, telemetryLon!];
    }
    if (isValidCoordinate(statusLat, statusLon)) {
      return [statusLat!, statusLon!];
    }
    return getDefaultPosition();
  };

  // ============================================================================
  // API FUNCTIONS (Only for real mode)
  // ============================================================================

  const fetchStatus = async () => {
    if (simulationMode) return;
    
    try {
      const response = await fetch(`${API_BASE}/status`);
      const data = await response.json();
      
      if (data.success || data.data) {
        const statusData = data.data || data;
        setStatus(statusData);
        setIsConnected(statusData.connected);
        
        if (statusData.current_position && statusData.flying) {
          const { lat, lon } = statusData.current_position;
          if (isValidCoordinate(lat, lon)) {
            setMapCenter([lat, lon]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      setIsConnected(false);
    }
  };

  const handleCommand = async (
    endpoint: string,
    body: any,
    loadingKey: string,
    successMessage: string
  ) => {
    if (simulationMode) {
      showToast('Simulation mode active - command not sent to real drone', 'info');
      return;
    }

    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (response.status === 422) {
        console.error('Validation error:', data);
        showToast(`Validation failed: ${JSON.stringify(data.detail)}`, 'error');
        return;
      }
      
      if (data.success) {
        showToast(successMessage, 'success');
        
        // Optimistic updates
        if (loadingKey === 'arm') {
          setStatus(prev => prev ? { ...prev, armed: true } : null);
        } else if (loadingKey === 'disarm') {
          setStatus(prev => prev ? { ...prev, armed: false } : null);
        } else if (loadingKey === 'takeoff') {
          setStatus(prev => prev ? { ...prev, flying: true, armed: true } : null);
        } else if (loadingKey === 'land') {
          setStatus(prev => prev ? { ...prev, flying: false } : null);
        }
        
        setTimeout(async () => {
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 300 + (i * 200)));
            await fetchStatus();
          }
        }, 300);
      } else {
        showToast(data.message || 'Command failed', 'error');
      }
    } catch (error) {
      console.error(`Error executing ${loadingKey}:`, error);
      showToast(`Failed to ${loadingKey}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleUploadMission = async () => {
    if (simulationMode) {
      showToast('Simulation mode - mission uploaded locally', 'success');
      setMissionUploaded(true);
      return;
    }

    if (!currentMissionId) {
      showToast('Please select a mission first', 'error');
      return;
    }

    if (!isConnected) {
      showToast('Please connect to simulator first', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, upload: true }));
    showToast('📤 Uploading mission to PX4 SITL...', 'info');

    try {
      if (!selectedMission?.waypoints || selectedMission.waypoints.length === 0) {
        throw new Error('No waypoints in selected mission');
      }

      console.log(`📤 Uploading mission ${currentMissionId} with ${selectedMission.waypoints.length} waypoints`);

      const waypoints = selectedMission.waypoints.map((wp, index) => {
        const lng = getWaypointLongitude(wp);
        
        if (wp.lat === undefined || wp.lat === null || lng === undefined || lng === null) {
          console.error(`❌ Invalid waypoint ${index}:`, wp);
          throw new Error(`Invalid waypoint at index ${index}: missing lat or lon`);
        }

        const latitude = parseFloat(String(wp.lat));
        const longitude = parseFloat(String(lng));
        
        let altitude = 10;
        if (wp.alt !== null && wp.alt !== undefined && wp.alt !== '') {
          const altNum = parseFloat(String(wp.alt));
          if (!isNaN(altNum)) {
            altitude = altNum;
          }
        }

        if (isNaN(latitude) || isNaN(longitude) || isNaN(altitude)) {
          console.error(`❌ Invalid conversion at waypoint ${index}:`, {
            lat: wp.lat, lng, alt: wp.alt,
            converted: { latitude, longitude, altitude }
          });
          throw new Error(`Invalid coordinate values at waypoint ${index}`);
        }

        return {
          latitude: latitude,
          longitude: longitude,
          altitude: altitude
        };
      });

      const cleanedWaypoints = waypoints.map((wp, idx) => {
        const cleaned = {
          latitude: parseFloat(String(wp.latitude)),
          longitude: parseFloat(String(wp.longitude)),
          altitude: parseFloat(String(wp.altitude))
        };
        
        if (isNaN(cleaned.latitude) || isNaN(cleaned.longitude) || isNaN(cleaned.altitude)) {
          console.error(`Final validation failed for waypoint ${idx}:`, cleaned);
          throw new Error(`Waypoint ${idx} has invalid numeric values after cleaning`);
        }
        
        return cleaned;
      });

      console.log(`✅ Prepared ${cleanedWaypoints.length} waypoints for upload`);

      const payload = {
        mission_id: String(currentMissionId),
        vehicle_id: 'UAV-001',
        waypoints: cleanedWaypoints,
        connection_string: 'udp://127.0.0.1:14540'
      };

      if (payload.connection_string === null || payload.connection_string === undefined) {
        delete (payload as any).connection_string;
      }

      const url = `${API_BASE}/api/v1/missions/upload-to-px4/${currentMissionId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.detail) {
          console.error('❌ Validation Error:', data.detail);
          
          let errorMsg = 'Validation failed:\n';
          if (Array.isArray(data.detail)) {
            data.detail.forEach((err: any) => {
              errorMsg += `- ${err.loc?.join(' -> ')}: ${err.msg}\n`;
            });
          } else {
            errorMsg = data.detail;
          }
          
          showToast(errorMsg, 'error');
          throw new Error(errorMsg);
        }
        
        console.error('❌ Upload failed:', response.status, data);
        throw new Error(data.detail || data.message || `HTTP ${response.status}: Upload failed`);
      }

      if (data.success) {
        const waypointCount = data.waypoint_count || data.data?.waypoint_count || waypoints.length;
        console.log(`✅ Mission uploaded: ${waypointCount} waypoints`);
        showToast(`✅ Mission uploaded! ${waypointCount} waypoints transferred to PX4`, 'success');
        setMissionUploaded(true);
        
        setTimeout(async () => {
          await fetchStatus();
        }, 500);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Error uploading mission:', error);
      showToast(`❌ Upload error: ${error.message || 'Network error'}`, 'error');
      setMissionUploaded(false);
    } finally {
      setLoading(prev => ({ ...prev, upload: false }));
    }
  };

  const handleStartMission = async () => {
    if (simulationMode) {
      startSimulation();
      return;
    }

    if (!missionUploaded) {
      showToast('Please upload mission to PX4 first', 'error');
      return;
    }
    
    setLoading(prev => ({ ...prev, start: true }));
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/missions/${currentMissionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_start: false }),
      });
      
      const data = await response.json();
      
      if (response.status === 400 && data.detail?.includes('already active')) {
        setLoading(prev => ({ ...prev, start: false }));
        
        showConfirmationToast(
          '⚠️ A mission is already active. Stop current mission and start new one?',
          async () => {
            setLoading(prev => ({ ...prev, start: true }));
            showToast('Stopping current mission...', 'info');
            
            try {
              const stopResponse = await fetch(`${API_BASE}/api/v1/missions/${currentMissionId}/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force_stop: true }),
              });
              
              if (stopResponse.ok) {
                showToast('✅ Current mission stopped', 'success');
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                showToast('Starting new mission...', 'info');
                
                const retryResponse = await fetch(`${API_BASE}/api/v1/missions/${currentMissionId}/start`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ force_start: true }),
                });
                
                const retryData = await retryResponse.json();
                
                if (retryData.success) {
                  showToast('✅ New mission started successfully', 'success');
                  
                  setTimeout(async () => {
                    for (let i = 0; i < 3; i++) {
                      await new Promise(resolve => setTimeout(resolve, 300));
                      await fetchStatus();
                    }
                  }, 500);
                } else {
                  throw new Error(retryData.message || 'Failed to start mission after stop');
                }
              } else {
                throw new Error('Failed to stop current mission');
              }
            } catch (stopError: any) {
              showToast(`❌ Failed: ${stopError.message}`, 'error');
            } finally {
              setLoading(prev => ({ ...prev, start: false }));
            }
          },
          () => {
            showToast('Mission start cancelled', 'info');
          }
        );
        
        return;
      } else if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to start mission');
      } else if (data.success) {
        showToast('✅ Mission started successfully', 'success');
      } else {
        throw new Error(data.message || 'Command failed');
      }
    } catch (error: any) {
      console.error('Error starting mission:', error);
      showToast(`❌ Failed to start mission: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, start: false }));
      
      setTimeout(async () => {
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          await fetchStatus();
        }
      }, 500);
    }
  };

  const handleStopMission = async () => {
    if (simulationMode) {
      stopSimulation();
      return;
    }

    if (!currentMissionId) {
      showToast('No mission selected', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, stop: true }));
    showToast('Stopping mission...', 'info');

    try {
      const response = await fetch(`${API_BASE}/api/v1/missions/${currentMissionId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_stop: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to stop mission');
      }

      if (data.success) {
        showToast('✅ Mission stopped successfully', 'success');
        
        setTimeout(async () => {
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchStatus();
          }
        }, 300);
      } else {
        throw new Error(data.message || 'Stop command failed');
      }
    } catch (error: any) {
      console.error('Error stopping mission:', error);
      showToast(`❌ Failed to stop mission: ${error.message}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, stop: false }));
    }
  };

  const [missionStatus, setMissionStatus] = useState<{
    isActive: boolean;
    isReceivingData: boolean;
    lastUpdateTime: Date | null;
    dataFlowRate: number;
    subscriptionStatus: 'idle' | 'subscribing' | 'subscribed' | 'failed';
    errorMessage: string | null;}>({
    isActive: false,
    isReceivingData: false,
    lastUpdateTime: null,
    dataFlowRate: 0,
    subscriptionStatus: 'idle',
    errorMessage: null
  });

  const telemetryCountRef = useRef<number>(0);
  const lastTelemetryTimeRef = useRef<number>(Date.now());
  const dataFlowIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleArm = () => {
    if (!currentMissionId) {
      showToast('No mission selected. Please load a mission first.', 'error');
      return;
    }
    handleCommand(
      '/api/v1/vehicle/arm',
      { mission_id: String(currentMissionId), force_arm: false },
      'arm',
      '✅ Vehicle armed successfully'
    );
  };

  const handleDisarm = () => {
    if (!currentMissionId) {
      showToast('No mission selected', 'error');
      return;
    }
    handleCommand(
      '/api/v1/vehicle/disarm',
      { mission_id: String(currentMissionId) },
      'disarm',
      '✅ Vehicle disarmed successfully'
    );
  };

  const handleTakeoff = () => {
    handleCommand(
      '/api/v1/vehicle/takeoff',
      { mission_id: String(currentMissionId), altitude: takeoffAltitude },
      'takeoff',
      `✅ Takeoff initiated to ${takeoffAltitude}m`
    );
  };

  const handleLand = () => {
    handleCommand(
      '/api/v1/vehicle/land',
      { mission_id: String(currentMissionId) },
      'land',
      '✅ Landing initiated'
    );
  };

  const handleRTL = () => {
    handleCommand(
      '/api/v1/vehicle/rtl',
      { mission_id: String(currentMissionId) },
      'rtl',
      '✅ Return to launch initiated'
    );
  };

  const connectToSimulator = async () => {
    if (simulationMode) {
      showToast('Simulation mode active - no real connection needed', 'info');
      setIsConnected(true);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, connect: true }));
      showToast('Connecting to simulator...', 'info');
      
      const response = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Connection failed' }));
        throw new Error(errorData.detail || 'Failed to connect');
      }
      
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ Connected to PX4 SITL', 'success');
        setIsConnected(true);
        
        await fetchStatus();
        connectWebSocket();
      } else {
        throw new Error(data.message || 'Connection failed');
      }
    } catch (error: any) {
      console.error('❌ Connection error:', error);
      showToast(
        error.message || 'Failed to connect to simulator. Check if PX4 SITL is running.',
        'error'
      );
      setIsConnected(false);
    } finally {
      setLoading(prev => ({ ...prev, connect: false }));
    }
  };

  // ============================================================================
  // TOAST NOTIFICATION
  // ============================================================================

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const showConfirmationToast = (
    message: string, 
    onConfirm: () => void, 
    onCancel: () => void
  ) => {
    const toast = document.createElement('div');
    toast.className = 'toast toast-confirmation';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      background: #f59e0b;
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      min-width: 400px;
      max-width: 500px;
    `;
    
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.5;
    `;
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;
    
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Stop & Start New';
    confirmButton.style.cssText = `
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: background 0.2s;
    `;
    confirmButton.onmouseover = () => confirmButton.style.background = '#dc2626';
    confirmButton.onmouseout = () => confirmButton.style.background = '#ef4444';
    confirmButton.onclick = () => {
      document.body.removeChild(toast);
      onConfirm();
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: background 0.2s;
    `;
    cancelButton.onmouseover = () => cancelButton.style.background = 'rgba(255,255,255,0.3)';
    cancelButton.onmouseout = () => cancelButton.style.background = 'rgba(255,255,255,0.2)';
    cancelButton.onclick = () => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
      onCancel();
    };
    
    buttonsDiv.appendChild(cancelButton);
    buttonsDiv.appendChild(confirmButton);
    
    toast.appendChild(messageDiv);
    toast.appendChild(buttonsDiv);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
        onCancel();
      }
    }, 10000);
  };

  // ============================================================================
  // CUSTOM ICONS - QGC STYLE
  // ============================================================================

  const createDroneIcon = (armed: boolean, flying: boolean, yaw: number = 0) => {
    const color = flying ? '#22c55e' : armed ? '#eab308' : '#3b82f6';
    const size = flying ? 48 : 40;
    const pulseEffect = flying ? 'animation: drone-pulse 2s ease-in-out infinite;' : '';
    
    return L.divIcon({
      className: 'custom-drone-icon',
      html: `
        <div style="
          transform: rotate(${yaw}deg);
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s linear;
          ${pulseEffect}
        ">
          <!-- QGC-Style Aircraft Icon -->
          <svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Shadow/Glow Effect -->
            <defs>
              <filter id="glow-${yaw}">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="bodyGradient-${yaw}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
              </linearGradient>
            </defs>
            
            <!-- Aircraft Body (Fuselage) -->
            <ellipse cx="32" cy="32" rx="6" ry="14" fill="url(#bodyGradient-${yaw})" filter="url(#glow-${yaw})"/>
            
            <!-- Front Arms (Quadcopter) -->
            <line x1="32" y1="32" x2="18" y2="18" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
            <line x1="32" y1="32" x2="46" y2="18" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
            
            <!-- Rear Arms (Quadcopter) -->
            <line x1="32" y1="32" x2="18" y2="46" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
            <line x1="32" y1="32" x2="46" y2="46" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
            
            <!-- Motors/Propellers -->
            <circle cx="18" cy="18" r="5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8">
              ${flying ? '<animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.2s" repeatCount="indefinite"/>' : ''}
            </circle>
            <circle cx="46" cy="18" r="5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8">
              ${flying ? '<animateTransform attributeName="transform" type="rotate" from="0 46 18" to="360 46 18" dur="0.2s" repeatCount="indefinite"/>' : ''}
            </circle>
            <circle cx="18" cy="46" r="5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8">
              ${flying ? '<animateTransform attributeName="transform" type="rotate" from="0 18 46" to="360 18 46" dur="0.2s" repeatCount="indefinite"/>' : ''}
            </circle>
            <circle cx="46" cy="46" r="5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8">
              ${flying ? '<animateTransform attributeName="transform" type="rotate" from="0 46 46" to="360 46 46" dur="0.2s" repeatCount="indefinite"/>' : ''}
            </circle>
            
            <!-- Center Body Highlight -->
            <circle cx="32" cy="32" r="4" fill="white" opacity="0.9"/>
            <circle cx="32" cy="32" r="2.5" fill="${color}"/>
            
            <!-- Direction Indicator (Nose) -->
            <path d="M 32 18 L 34 22 L 32 14 L 30 22 Z" fill="white" stroke="white" stroke-width="0.5"/>
            
            <!-- Status Ring -->
            <circle cx="32" cy="32" r="20" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3" stroke-dasharray="4,4">
              ${flying ? '<animate attributeName="stroke-dashoffset" from="0" to="8" dur="1s" repeatCount="indefinite"/>' : ''}
            </circle>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const createHomeIcon = () => {
    return L.divIcon({
      className: 'custom-home-icon',
      html: `
        <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12L12 3L21 12H19V20H14V15H10V20H5V12H3Z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="10" r="2" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const createWaypointIcon = (index: number, wpStatus: 'pending' | 'active' | 'completed') => {
    const colorMap = {
      pending: '#6b7280',    // Gray
      active: '#3b82f6',     // Blue with pulse
      completed: '#22c55e'   // Green
    };
    
    const color = colorMap[wpStatus];
    const isPulsing = wpStatus === 'active';
    
    return L.divIcon({
      className: 'custom-waypoint-icon',
      html: `
        <div style="
          background: ${color};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ${isPulsing ? 'animation: pulse-icon 2s ease-in-out infinite;' : ''}
          position: relative;
        ">
          ${wpStatus === 'completed' ? '✓' : index + 1}
          ${isPulsing ? `
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${color};
              opacity: 0.5;
              animation: pulse-ring 2s ease-out infinite;
            "></div>
          ` : ''}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    let isMounted = true;
    
    const initializeConnection = async () => {
      if (!isMounted) return;
      
      if (simulationMode) {
        setIsConnected(true);
        showToast('🎮 Simulation mode activated', 'success');
        return;
      }
      
      try {
        setLoading(prev => ({ ...prev, connect: true }));
        showToast('Connecting to simulator...', 'info');
        
        const response = await fetch(`${API_BASE}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error('Failed to connect');
        }
        
        const data = await response.json();
        
        if (data.success && isMounted) {
          showToast('✅ Connected to PX4 SITL', 'success');
          setIsConnected(true);
          
          await fetchStatus();
          
          if (isMounted) {
            connectWebSocket();
          }
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('❌ Connection error:', error);
          showToast('Failed to connect to simulator', 'error');
          setIsConnected(false);
        }
      } finally {
        if (isMounted) {
          setLoading(prev => ({ ...prev, connect: false }));
        }
      }
    };
    
    initializeConnection();
    
    return () => {
      isMounted = false;
      disconnectWebSocket();
      stopStatusPolling();
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [simulationMode]);

  useEffect(() => {
    if (selectedMission?.id) {
      setCurrentMissionId(selectedMission.id);
      setMissionUploaded(false);
      const newCenter = getDefaultPosition();
      setMapCenter(newCenter);
      showToast(`Mission "${selectedMission.name}" loaded`, 'success');
      
      // Initialize waypoint statuses
      initializeWaypointStatuses();
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: 'subscribe',
          mission_id: selectedMission.id
        }));
      }
    }
  }, [selectedMission?.id]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const dronePosition: [number, number] = getValidPosition(
    telemetry?.position?.lat,
    telemetry?.position?.lon,
    status?.current_position?.lat,
    status?.current_position?.lon
  );

  const homePosition: [number, number] = getValidPosition(
    undefined,
    undefined,
    status?.home_position?.lat,
    status?.home_position?.lon
  );

  const pathCoordinates: [number, number][] = flightPath
    .filter(point => isValidCoordinate(point.lat, point.lon))
    .map(point => [point.lat, point.lon]);

  const getValidWaypoints = () => {
    if (!selectedMission?.waypoints || selectedMission.waypoints.length === 0) {
      return [];
    }
    return selectedMission.waypoints.filter(wp => {
      const lng = getWaypointLongitude(wp);
      const isValid = isValidCoordinate(wp.lat, lng);
      if (!isValid) console.warn('Invalid waypoint detected:', wp);
      return isValid;
    });
  };

  const validWaypoints = getValidWaypoints();

  const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState<number>(Date.now());
  const [updateFrequency, setUpdateFrequency] = useState<number>(0);
  const [telemetryPulse, setTelemetryPulse] = useState<boolean>(false);
  const updateCountRef = useRef<number>(0);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTelemetryUpdate = (data: any) => {
    try {
      // ⭐ DEFENSIVE CHECK: Ensure data exists
      if (!data) {
        console.warn('⚠️ Received empty telemetry data');
        return;
      }
      
      console.log('📡 Raw telemetry data:', data);
      
      // Extract position from various possible structures
      const position = data.position || data.current_position || null;
      
      // ⭐ Update telemetry state with fallbacks
      setTelemetry({
        timestamp: data.timestamp || new Date().toISOString(),
        position: position,
        velocity: data.velocity || null,
        attitude: data.attitude || null,
        battery: data.battery || null,
        gps: data.gps || null,
        armed: data.armed ?? null,
        mode: data.mode || null,
        mission_current: data.mission_current ?? null,
        mission_count: data.mission_count ?? null
      });
      
      // ⭐ Update timestamp and pulse effect
      setLastTelemetryUpdate(Date.now());
      setTelemetryPulse(true);
      setTimeout(() => setTelemetryPulse(false), 200);
      
      // ⭐ Increment update counter for frequency calculation
      updateCountRef.current += 1;
      
      // ⭐ Update drone position with comprehensive validation
      if (position) {
        const lat = position.lat ?? position.latitude;
        const lon = position.lon ?? position.longitude;
        const alt = position.alt ?? position.altitude ?? 0;
        
        if (lat !== undefined && lon !== undefined && 
            !isNaN(lat) && !isNaN(lon) &&
            lat !== 0 && lon !== 0 &&
            lat >= -90 && lat <= 90 && 
            lon >= -180 && lon <= 180) {
          
          const newPosition = { lat, lon, alt };
          setDronePosition(newPosition);
          
          // Add to flight path
          setFlightPath(prev => {
            const newPath = [...prev, {
              lat: newPosition.lat,
              lon: newPosition.lon,
              timestamp: Date.now()
            }];
            return newPath.slice(-500); // Keep last 500 points
          });
          
          console.log('✅ Updated position:', newPosition);
        } else {
          console.warn('⚠️ Invalid position coordinates:', { lat, lon, alt });
        }
      } else {
        console.warn('⚠️ Position data missing');
      }
      
      // Update mission progress
      if (data.mission_current !== undefined && data.mission_count !== undefined) {
        setMissionProgress({
          current: data.mission_current,
          total: data.mission_count
        });
        console.log('✅ Mission progress:', data.mission_current, '/', data.mission_count);
      }
      
    } catch (error) {
      console.error('❌ Error handling telemetry update:', error);
      console.error('Problematic data:', data);
    }
  };

  useEffect(() => {
    updateTimerRef.current = setInterval(() => {
      setUpdateFrequency(updateCountRef.current);
      updateCountRef.current = 0;
    }, 1000);
    
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, []);

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 1) return 'Just now';
    if (seconds === 1) return '1 second ago';
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const getDataFreshnessColor = (timestamp: number): string => {
    const ageMs = Date.now() - timestamp;
    
    if (ageMs < 1000) return 'text-green-400';
    if (ageMs < 3000) return 'text-yellow-400';
    if (ageMs < 10000) return 'text-orange-400';
    return 'text-red-400';
  };

  // Format ETA
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full w-full bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Back to Missions"
              >
                <ArrowLeft size={24} className="text-white" />
              </button>
            )}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Mission Monitor</h1>
                {selectedMission && (
                  <p className="text-sm text-gray-400 mt-1">
                    Mission: {selectedMission.name}
                    {selectedMission.corridor && ` • ${selectedMission.corridor}`}
                  </p>
                )}
              </div>
              
              {selectedMission && (
                <div className="flex items-center gap-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Mission ID:</span>
                    <span className="text-sm font-mono text-blue-400 font-semibold">{selectedMission.id}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-700"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Waypoints:</span>
                    <span className="text-sm text-white font-semibold">{validWaypoints.length} / {selectedMission.waypoints.length}</span>
                  </div>
                  {selectedMission.distance && (
                    <>
                      <div className="h-4 w-px bg-gray-700"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Distance:</span>
                        <span className="text-sm text-white font-semibold">{Number(selectedMission.distance).toFixed(2)} km</span>
                      </div>
                    </>
                  )}
                  <div className="h-4 w-px bg-gray-700"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Status:</span>
                    <span className={`text-sm font-semibold ${missionUploaded ? 'text-green-400' : 'text-orange-400'}`}>
                      {missionUploaded ? '✓ Uploaded' : '⚠ Not Uploaded'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Simulation Mode Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-sm text-gray-400">Real-time Simulation:</span>
              <button
                onClick={() => {
                  setSimulationMode(!simulationMode);
                  setIsConnected(!simulationMode);
                  showToast(
                    !simulationMode ? '🎮 Real-time simulation enabled' : '🔌 PX4 SITL mode enabled',
                    'info'
                  );
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  simulationMode ? 'bg-green-500' : 'bg-gray-600'
                }`}
                title={simulationMode ? 'Switch to PX4 SITL mode' : 'Switch to simulation mode with live telemetry'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    simulationMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              {simulationMode && (
                <span className="text-xs text-green-400 font-semibold">ON</span>
              )}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {simulationMode ? 'Live Simulation' : isConnected ? 'PX4 Connected' : 'Disconnected'}
              </span>
            </div>

            {/* WebSocket Status */}
            {!simulationMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <span className="text-sm text-gray-400">
                  {wsConnected ? 'Live Stream' : 'Polling'}
                </span>
              </div>
            )}

            {simulationMode && simulationRunning && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-800/30 rounded-lg border border-green-700">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-green-400 font-semibold">
                  Tracking: 10 Hz
                </span>
              </div>
            )}
            
            {!isConnected && !simulationMode && (
              <button
                onClick={connectToSimulator}
                disabled={loading.connect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {loading.connect ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Reconnect'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mission Progress Bar */}
        {simulationRunning && (
          <div className="mt-4 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 font-semibold">Mission Progress</span>
              <span className="text-sm text-green-400 font-bold">{Number(missionProgress).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300 ease-out"
                style={{ width: `${missionProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>Waypoint: {currentWaypointIndex + 1} / {validWaypoints.length}</span>
              <span>Distance to next: {Number(distanceToNextWaypoint).toFixed(1)}m</span>
              <span>ETA: {formatETA(estimatedTimeToWaypoint)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
            
            {pathCoordinates.length > 1 && (
              <Polyline
                positions={pathCoordinates}
                color="#22c55e"
                weight={3}
                opacity={0.8}
                className="flight-path-trail"
              />
            )}

            {validWaypoints.length > 0 && (
              <>
                {validWaypoints.map((wp, index) => {
                  const lng = getWaypointLongitude(wp)!;
                  const wpStatus = waypointStatuses.find(s => s.index === index);
                  const status = wpStatus?.status || 'pending';
                  
                  return (
                    <Marker
                      key={`wp-${index}`}
                      position={[wp.lat, lng]}
                      icon={createWaypointIcon(index, status)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>Waypoint {index + 1}</strong>
                          {wp.name && <><br />{wp.name}</>}
                          <br />
                          Lat: {Number(wp.lat).toFixed(6)}
                          <br />
                          Lon: {Number(lng).toFixed(6)}
                          {wp.alt && <><br />Alt: {Number(wp.alt).toFixed(1)} m</>}
                          <br />
                          Status: <span className={`font-semibold ${
                            status === 'completed' ? 'text-green-600' : 
                            status === 'active' ? 'text-blue-600' : 
                            'text-gray-600'
                          }`}>
                            {status === 'completed' ? '✅ Completed' : 
                             status === 'active' ? '🧭 Active' : 
                             '○ Pending'}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                <Polyline
                  positions={validWaypoints.map(wp => [wp.lat, getWaypointLongitude(wp)!])}
                  color="#3b82f6"
                  weight={2}
                  opacity={0.7}
                  dashArray="5, 10"
                />
              </>
            )}
            
            <Marker position={homePosition} icon={createHomeIcon()} />
            
            {/* QGC-Style Drone Marker with smooth rotation */}
            <Marker
              position={dronePosition}
              icon={createDroneIcon(
                status?.armed || false,
                status?.flying || false,
                telemetry?.attitude?.yaw || 0
              )}
            >
              <Popup>
                <div className="text-xs">
                  <strong>UAV Position</strong><br />
                  Lat: {dronePosition[0].toFixed(6)}<br />
                  Lon: {dronePosition[1].toFixed(6)}<br />
                  Alt: {(telemetry?.position?.alt || 0).toFixed(1)} m<br />
                  {telemetry?.attitude && (
                    <>
                      Roll: {telemetry.attitude.roll.toFixed(1)}°<br />
                      Pitch: {telemetry.attitude.pitch.toFixed(1)}°<br />
                      Yaw: {telemetry.attitude.yaw.toFixed(1)}°<br />
                    </>
                  )}
                  {telemetry?.velocity && (
                    <>
                      Speed: {Math.sqrt(
                        telemetry.velocity.vx ** 2 + 
                        telemetry.velocity.vy ** 2
                      ).toFixed(2)} m/s
                    </>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Velocity Vector */}
            {telemetry?.velocity && (status?.flying || simulationRunning) && (
              <VelocityVector
                position={dronePosition}
                velocity={telemetry.velocity}
                color="#22c55e"
              />
            )}
          </MapContainer>

          {/* Telemetry Display */}
          <TelemetryDisplay 
            telemetry={telemetry}
            status={status}
            wsConnected={wsConnected || simulationMode}
            lastUpdate={lastTelemetryUpdate}     
            updateFrequency={updateFrequency}     
            isPulsing={telemetryPulse}            
          />
        </div>

        {/* Control Panel */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-6">Mission Controls</h2>

          {simulationMode && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle size={20} className="text-green-400" />
                <span className="text-sm font-semibold text-green-400">Simulation Mode Active</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Test missions with realistic flight simulation. Watch real-time telemetry, waypoint tracking, and mission progress.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">📊 Live Telemetry</span>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">🗺️ Real-time Map</span>
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">🧭 Waypoint Status</span>
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">⚡ Progress Tracking</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Mission ID</label>
            <input
              type="text"
              value={currentMissionId}
              onChange={(e) => setCurrentMissionId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter mission ID"
            />
          </div>

          {simulationMode && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Simulated Speed (m/s)
              </label>
              <input
                type="number"
                value={simulatedSpeed}
                onChange={(e) => setSimulatedSpeed(Number(e.target.value))}
                min="1"
                max="50"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Takeoff Altitude (m)</label>
            <input
              type="number"
              value={takeoffAltitude}
              onChange={(e) => setTakeoffAltitude(Number(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-3">
            {/* Upload Mission Button */}
            <button
              onClick={handleUploadMission}
              disabled={!isConnected || !currentMissionId || loading.upload}
              className={`w-full px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                missionUploaded 
                  ? 'bg-green-600/20 border-2 border-green-500 text-green-400 cursor-default' 
                  : 'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white'
              }`}
            >
              {loading.upload ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : missionUploaded ? (
                <>
                  <span>✓</span>
                  Mission {simulationMode ? 'Loaded' : 'Uploaded to PX4'}
                </>
              ) : (
                <>
                  <Upload size={20} />
                  {simulationMode ? 'Load Mission' : 'Upload Mission to PX4'}
                </>
              )}
            </button>

            <button
              onClick={handleStartMission}
              disabled={!isConnected || !missionUploaded || loading.start || simulationRunning}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.start || simulationRunning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {simulationRunning ? 'Running...' : 'Starting...'}
                </>
              ) : (
                <>
                  <PlayCircle size={20} />
                  Start {simulationMode ? 'Simulation' : 'Mission'}
                </>
              )}
            </button>

            <button
              onClick={handleStopMission}
              disabled={!isConnected || (!status?.mission_active && !simulationRunning) || loading.stop}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.stop ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle size={20} />
                  Stop {simulationMode ? 'Simulation' : 'Mission'}
                </>
              )}
            </button>

            {!simulationMode && (
              <>
                <button
                  onClick={handleArm}
                  disabled={!isConnected || status?.armed || loading.arm}
                  className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading.arm ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Arming...
                    </>
                  ) : (
                    <>
                      <span>🔓</span>
                      Arm Vehicle
                    </>
                  )}
                </button>

                <button
                  onClick={handleDisarm}
                  disabled={!isConnected || !status?.armed || loading.disarm}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading.disarm ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Disarming...
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      Disarm Vehicle
                    </>
                  )}
                </button>

                <button
                  onClick={handleTakeoff}
                  disabled={!isConnected || !status?.armed || status?.flying || loading.takeoff}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading.takeoff ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Taking Off...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Takeoff
                    </>
                  )}
                </button>

                <button
                  onClick={handleLand}
                  disabled={!isConnected || !status?.flying || loading.land}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading.land ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Landing...
                    </>
                  ) : (
                    <>
                      <span>⬇️</span>
                      Land
                    </>
                  )}
                </button>

                <button
                  onClick={handleRTL}
                  disabled={!isConnected || !status?.flying || loading.rtl}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading.rtl ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Returning...
                    </>
                  ) : (
                    <>
                      <span>🏠</span>
                      Return to Launch
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">System Status</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span className={simulationMode ? 'text-green-400' : 'text-blue-400'}>
                  {simulationMode ? '🎮 Real-time Simulation' : '🔌 PX4 SITL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Connected:</span>
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Telemetry:</span>
                <span className={(wsConnected || simulationMode) ? 'text-green-400' : 'text-yellow-400'}>
                  {simulationMode ? '✓ Live Stream (10 Hz)' : wsConnected ? 'WebSocket' : 'HTTP Polling'}
                </span>
              </div>
              {simulationMode && simulationRunning && (
                <>
                  <div className="h-px bg-gray-700 my-2"></div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Real-time Tracking:</span>
                    <span className="text-cyan-400">Active</span>
                  </div>
                  <div className="pl-2 space-y-1 text-[10px] text-gray-500">
                    <div>• Position updates (10 Hz)</div>
                    <div>• Velocity calculations</div>
                    <div>• Attitude orientation</div>
                    <div>• Battery drain simulation</div>
                    <div>• GPS satellite tracking</div>
                  </div>
                </>
              )}
              <div className="h-px bg-gray-700 my-2"></div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mission Uploaded:</span>
                <span className={missionUploaded ? 'text-green-400' : 'text-orange-400'}>
                  {missionUploaded ? 'Yes' : 'No'}
                </span>
              </div>
              {simulationRunning && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Simulation:</span>
                  <span className="text-green-400 animate-pulse">● Running</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Armed:</span>
                <span className={status?.armed ? 'text-yellow-400' : 'text-gray-500'}>
                  {status?.armed ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Flying:</span>
                <span className={status?.flying ? 'text-green-400' : 'text-gray-500'}>
                  {status?.flying ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mission Active:</span>
                <span className={(status?.mission_active || simulationRunning) ? 'text-blue-400' : 'text-gray-500'}>
                  {(status?.mission_active || simulationRunning) ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">PX4 Mission WPs:</span>
                <span className="text-white">{status?.mission_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Flight Path Points:</span>
                <span className="text-white">{flightPath.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Altitude</div>
              <div className="text-lg font-bold text-white">
                {Number(telemetry?.position?.alt || status?.current_position?.alt || 0).toFixed(1)}m
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Battery</div>
              <div className="text-lg font-bold text-white">
                {Number(telemetry?.battery?.remaining || status?.battery_level || 0).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5);
          }
        }

        @keyframes pulse-icon {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes drone-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.6));
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(34, 197, 94, 0.9));
          }
        }
        
        .toast-confirmation {
          animation: slideIn 0.3s ease, pulse 2s ease-in-out infinite;
        }

        .flight-path-trail {
          filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.6));
        }

        .custom-drone-icon {
          transition: all 0.1s linear;
        }

        /* Leaflet marker smooth transitions */
        .leaflet-marker-icon {
          transition: transform 0.1s linear !important;
        }
      `}</style>
    </div>
  );
};

export default DroneFlightVisualization;