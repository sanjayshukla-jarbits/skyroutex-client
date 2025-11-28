/**
 * DroneFlightVisualization Component with Kafka Telemetry Integration
 * ====================================================================
 * 
 * Real-time drone flight visualization using Kafka-based telemetry updates.
 * Supports both Kafka (via WebSocket proxy) and fallback WebSocket/HTTP polling.
 * 
 * Features:
 * - Real-time position tracking on map
 * - Flight path visualization
 * - Telemetry display (position, attitude, battery, GPS, velocity)
 * - Mission waypoint visualization
 * - Simulation mode support
 * - Auto-reconnection with exponential backoff
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  Upload, 
  PlayCircle, 
  StopCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Database,
  Radio
} from 'lucide-react';
import TelemetryDisplay from '@/components/TelemetryDisplay';

// Import Kafka telemetry hooks (you'll need to add these to your project)
// import { useKafkaTelemetry } from '@/hooks/useKafkaTelemetry';

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

interface Position {
  lat: number;
  lon: number;
  alt: number;
}

interface TelemetryData {
  position?: {
    lat?: number;
    latitude?: number;
    lon?: number;
    longitude?: number;
    alt?: number;
    altitude?: number;
  };
  velocity?: {
    vx: number;
    vy: number;
    vz: number;
    ground_speed?: number;
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
    satellites?: number;
    num_satellites?: number;
    fix_type: number;
    hdop?: number;
  };
  armed?: boolean;
  flying?: boolean;
  flight_mode?: string;
  mode?: string;
  vehicle_id?: string;
  drone_id?: string;
  timestamp?: number;
  mission_current?: number;
  mission_count?: number;
}

interface DroneStatus {
  connected: boolean;
  armed: boolean;
  flying: boolean;
  current_position: Position;
  home_position?: Position;
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
}

interface FlightPath {
  lat: number;
  lon: number;
  alt?: number;
  timestamp: number;
}

interface MissionWaypoint {
  lat: number;
  lng?: number;
  lon?: number;
  alt?: number;
  name?: string;
  label?: string;
}

interface SelectedMission {
  id: string;
  name?: string;
  mission_name?: string;
  waypoints: MissionWaypoint[];
  corridor?: string;
  distance?: number;
  total_distance?: number;
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

// Telemetry source type
type TelemetrySource = 'kafka' | 'websocket' | 'http' | 'simulation' | 'disconnected';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002';
const KAFKA_WS_URL = process.env.NEXT_PUBLIC_KAFKA_WS_URL || 'ws://localhost:8002/ws/kafka-telemetry';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getWaypointLongitude = (wp: MissionWaypoint): number | undefined => {
  return wp.lng ?? wp.lon;
};

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

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

const interpolatePosition = (from: Position, to: Position, progress: number): Position => {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lon: from.lon + (to.lon - from.lon) * progress,
    alt: from.alt + (to.alt - from.alt) * progress,
  };
};

// ============================================================================
// DRONE ICON
// ============================================================================

const createDroneIcon = (heading: number = 0) => {
  return L.divIcon({
    className: 'drone-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading}deg);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 12L12 22L20 12L12 2Z" fill="#3b82f6" stroke="#1e40af" stroke-width="1"/>
          <circle cx="12" cy="12" r="3" fill="#1e40af"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// ============================================================================
// MAP CONTROLLER COMPONENT
// ============================================================================

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  
  return null;
};

// ============================================================================
// TELEMETRY SOURCE INDICATOR
// ============================================================================

const TelemetrySourceIndicator: React.FC<{
  source: TelemetrySource;
  connected: boolean;
  messageRate?: number;
}> = ({ source, connected, messageRate }) => {
  const getSourceInfo = () => {
    switch (source) {
      case 'kafka':
        return { icon: <Database className="w-4 h-4" />, label: 'Kafka', color: 'text-purple-400' };
      case 'websocket':
        return { icon: <Radio className="w-4 h-4" />, label: 'WebSocket', color: 'text-blue-400' };
      case 'http':
        return { icon: <RefreshCw className="w-4 h-4" />, label: 'HTTP Poll', color: 'text-yellow-400' };
      case 'simulation':
        return { icon: <Activity className="w-4 h-4" />, label: 'Simulation', color: 'text-green-400' };
      default:
        return { icon: <WifiOff className="w-4 h-4" />, label: 'Disconnected', color: 'text-red-400' };
    }
  };

  const info = getSourceInfo();

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 ${info.color}`}>
      {connected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
      {info.icon}
      <span className="text-sm font-medium">{info.label}</span>
      {messageRate !== undefined && messageRate > 0 && (
        <span className="text-xs opacity-75">{messageRate} Hz</span>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DroneFlightVisualization: React.FC<DroneFlightVisualizationProps> = ({ 
  selectedMission = null,
  onBack 
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<DroneStatus | null>(null);
  const [flightPath, setFlightPath] = useState<FlightPath[]>([]);
  const [dronePosition, setDronePosition] = useState<Position | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentMissionId, setCurrentMissionId] = useState<string>(selectedMission?.id || '');
  const [takeoffAltitude, setTakeoffAltitude] = useState<number>(10);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const [missionUploaded, setMissionUploaded] = useState<boolean>(false);
  
  // Telemetry source state
  const [telemetrySource, setTelemetrySource] = useState<TelemetrySource>('disconnected');
  const [useKafka, setUseKafka] = useState<boolean>(true); // Enable Kafka by default
  
  // Simulation mode state
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [waypointStatuses, setWaypointStatuses] = useState<WaypointStatus[]>([]);
  const [missionProgress, setMissionProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(10);
  
  // Telemetry statistics
  const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState<number>(0);
  const [telemetryPulse, setTelemetryPulse] = useState<boolean>(false);
  const [updateFrequency, setUpdateFrequency] = useState<number>(0);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const kafkaWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const telemetryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateCountRef = useRef<number>(0);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxReconnectAttempts = 10;

  // Map state
  const getDefaultPosition = useCallback((): [number, number] => {
    if (selectedMission?.waypoints?.[0]) {
      const firstWp = selectedMission.waypoints[0];
      const lng = getWaypointLongitude(firstWp);
      if (isValidCoordinate(firstWp.lat, lng)) {
        return [firstWp.lat, lng!];
      }
    }
    return [26.8467, 80.9462]; // Fallback: Lucknow, India
  }, [selectedMission]);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(getDefaultPosition());
  const [mapZoom, setMapZoom] = useState(selectedMission ? 15 : 18);

  // ============================================================================
  // TELEMETRY UPDATE HANDLER
  // ============================================================================

  const handleTelemetryUpdate = useCallback((data: TelemetryData) => {
    try {
      // Extract position from various formats
      const positionData = data.position || data;
      const position = positionData ? {
        lat: positionData.lat ?? positionData.latitude ?? 0,
        lon: positionData.lon ?? positionData.longitude ?? 0,
        alt: positionData.alt ?? positionData.altitude ?? 0,
      } : null;

      // Update telemetry state
      setTelemetry({
        position: position ? {
          lat: position.lat,
          lon: position.lon,
          alt: position.alt,
        } : undefined,
        velocity: data.velocity,
        attitude: data.attitude,
        battery: data.battery,
        gps: data.gps ? {
          satellites: data.gps.satellites ?? data.gps.num_satellites ?? 0,
          fix_type: data.gps.fix_type ?? 0,
          hdop: data.gps.hdop ?? 0,
        } : undefined,
        armed: data.armed,
        flying: data.flying,
        flight_mode: data.flight_mode ?? data.mode,
        vehicle_id: data.vehicle_id ?? data.drone_id,
      });

      // Update timestamp and pulse effect
      setLastTelemetryUpdate(Date.now());
      setTelemetryPulse(true);
      setTimeout(() => setTelemetryPulse(false), 200);

      // Increment update counter
      updateCountRef.current += 1;

      // Update drone position
      if (position && isValidCoordinate(position.lat, position.lon)) {
        setDronePosition(position);

        // Add to flight path
        setFlightPath(prev => {
          const newPath = [...prev, {
            lat: position.lat,
            lon: position.lon,
            alt: position.alt,
            timestamp: Date.now(),
          }];
          return newPath.slice(-500); // Keep last 500 points
        });

        // Update map center
        setMapCenter([position.lat, position.lon]);
      }

      // Update mission progress
      if (data.mission_current !== undefined && data.mission_count !== undefined) {
        setMissionProgress({
          current: data.mission_current,
          total: data.mission_count,
        });
      }

      // Update status
      setStatus(prev => ({
        connected: true,
        armed: data.armed ?? prev?.armed ?? false,
        flying: data.flying ?? prev?.flying ?? false,
        current_position: position || prev?.current_position || { lat: 0, lon: 0, alt: 0 },
        battery_level: data.battery?.remaining ?? prev?.battery_level ?? 0,
        flight_mode: data.flight_mode ?? data.mode ?? prev?.flight_mode ?? 'UNKNOWN',
        mission_active: prev?.mission_active ?? false,
        mission_current: data.mission_current ?? prev?.mission_current ?? 0,
        mission_count: data.mission_count ?? prev?.mission_count ?? 0,
      }));

    } catch (error) {
      console.error('❌ Error handling telemetry update:', error);
    }
  }, []);

  // ============================================================================
  // KAFKA WEBSOCKET CONNECTION
  // ============================================================================

  const connectKafkaWebSocket = useCallback(() => {
    if (!useKafka || simulationMode) {
      console.log('Kafka disabled or simulation mode active');
      return;
    }

    if (kafkaWsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Kafka WebSocket already connected');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max Kafka reconnection attempts reached, falling back to standard WebSocket');
      setUseKafka(false);
      connectWebSocket();
      return;
    }

    try {
      console.log(`🔌 Connecting to Kafka WebSocket: ${KAFKA_WS_URL}`);
      const ws = new WebSocket(KAFKA_WS_URL);

      ws.onopen = () => {
        console.log('✅ Kafka WebSocket connected');
        setIsConnected(true);
        setTelemetrySource('kafka');
        reconnectAttemptsRef.current = 0;

        // Send configuration
        ws.send(JSON.stringify({
          action: 'configure',
          topics: ['drone-telemetry', 'drone-status'],
          group_id: 'skyroutex-flight-viz',
        }));

        // Subscribe to mission if available
        if (currentMissionId) {
          ws.send(JSON.stringify({
            action: 'subscribe_vehicle',
            vehicle_id: currentMissionId,
          }));
          console.log(`📡 Subscribed to vehicle: ${currentMissionId}`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'telemetry_update':
            case 'telemetry':
              handleTelemetryUpdate(message.data || message);
              break;
            case 'status_update':
              if (message.data) {
                setStatus(prev => ({
                  ...prev,
                  ...message.data,
                  connected: true,
                }));
              }
              break;
            case 'connection_info':
            case 'configured':
            case 'subscribed':
              console.log('🔌 Kafka:', message.type, message);
              break;
            case 'pong':
              // Silent heartbeat response
              break;
            case 'error':
              console.error('❌ Kafka error:', message.message);
              break;
            default:
              console.log('❓ Unknown Kafka message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parsing Kafka message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Kafka WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`🔌 Kafka WebSocket closed (Code: ${event.code})`);
        setIsConnected(false);
        setTelemetrySource('disconnected');
        kafkaWsRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && useKafka) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`🔄 Reconnecting to Kafka in ${delay}ms (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectKafkaWebSocket();
          }, delay);
        } else if (!useKafka) {
          // Fall back to standard WebSocket
          connectWebSocket();
        }
      };

      kafkaWsRef.current = ws;

    } catch (error) {
      console.error('❌ Failed to create Kafka WebSocket:', error);
      setUseKafka(false);
      connectWebSocket();
    }
  }, [useKafka, simulationMode, currentMissionId, handleTelemetryUpdate]);

  // ============================================================================
  // STANDARD WEBSOCKET CONNECTION (FALLBACK)
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    if (simulationMode) {
      console.log('Simulation mode active, skipping WebSocket');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_BASE}/ws/telemetry`);
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setTelemetrySource('websocket');
        reconnectAttemptsRef.current = 0;

        if (currentMissionId) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: currentMissionId,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'telemetry_update':
              handleTelemetryUpdate(message.data || message);
              break;
            case 'connection_info':
              console.log('🔌 Connection info:', message);
              break;
            case 'error':
              console.error('❌ WebSocket error:', message.message);
              break;
            case 'pong':
              break;
            default:
              console.log('❓ Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (Code: ${event.code})`);
        setIsConnected(false);
        setTelemetrySource('disconnected');
        wsRef.current = null;

        // Try to reconnect or fall back to HTTP polling
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached, using HTTP polling');
          startStatusPolling();
        }
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      startStatusPolling();
    }
  }, [simulationMode, currentMissionId, handleTelemetryUpdate]);

  // ============================================================================
  // HTTP POLLING FALLBACK
  // ============================================================================

  const startStatusPolling = useCallback(() => {
    if (telemetryIntervalRef.current || simulationMode) return;

    console.log('📊 Starting HTTP polling fallback');
    setTelemetrySource('http');

    telemetryIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/telemetry`);
        const data = await response.json();
        handleTelemetryUpdate(data);
        setIsConnected(true);
      } catch (error) {
        console.error('Error fetching telemetry via HTTP:', error);
        setIsConnected(false);
      }
    }, 1000);
  }, [simulationMode, handleTelemetryUpdate]);

  const stopStatusPolling = useCallback(() => {
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current);
      telemetryIntervalRef.current = null;
      console.log('🛑 HTTP polling stopped');
    }
  }, []);

  // ============================================================================
  // DISCONNECT ALL
  // ============================================================================

  const disconnectAll = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close Kafka WebSocket
    if (kafkaWsRef.current) {
      kafkaWsRef.current.close();
      kafkaWsRef.current = null;
    }

    // Close standard WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop HTTP polling
    stopStatusPolling();

    setIsConnected(false);
    setTelemetrySource('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [stopStatusPolling]);

  // ============================================================================
  // SIMULATION MODE
  // ============================================================================

  const startSimulation = useCallback(() => {
    if (!selectedMission?.waypoints?.length) {
      console.error('No waypoints for simulation');
      return;
    }

    disconnectAll();
    setSimulationMode(true);
    setSimulationRunning(true);
    setTelemetrySource('simulation');
    setIsConnected(true);

    // Initialize waypoint statuses
    const statuses: WaypointStatus[] = selectedMission.waypoints.map((_, index) => ({
      index,
      status: index === 0 ? 'active' : 'pending',
    }));
    setWaypointStatuses(statuses);
    setCurrentWaypointIndex(0);

    // Get first waypoint
    const firstWp = selectedMission.waypoints[0];
    const startPosition: Position = {
      lat: firstWp.lat,
      lon: getWaypointLongitude(firstWp) || 0,
      alt: firstWp.alt || 50,
    };

    setDronePosition(startPosition);
    setMapCenter([startPosition.lat, startPosition.lon]);

    let currentPos = { ...startPosition };
    let wpIndex = 0;
    const totalWaypoints = selectedMission.waypoints.length;

    simulationIntervalRef.current = setInterval(() => {
      if (wpIndex >= totalWaypoints) {
        stopSimulation();
        return;
      }

      const targetWp = selectedMission.waypoints[wpIndex];
      const target: Position = {
        lat: targetWp.lat,
        lon: getWaypointLongitude(targetWp) || 0,
        alt: targetWp.alt || 50,
      };

      const distance = calculateDistance(currentPos.lat, currentPos.lon, target.lat, target.lon);

      if (distance < 5) {
        // Reached waypoint
        setWaypointStatuses(prev => prev.map((ws, i) => ({
          ...ws,
          status: i < wpIndex + 1 ? 'completed' : i === wpIndex + 1 ? 'active' : 'pending',
        })));
        
        wpIndex++;
        setCurrentWaypointIndex(wpIndex);
        setMissionProgress({ current: wpIndex, total: totalWaypoints });
      } else {
        // Move towards waypoint
        const moveDistance = Math.min(simulatedSpeed * 0.1, distance);
        const progress = moveDistance / distance;
        currentPos = interpolatePosition(currentPos, target, progress);

        const bearing = calculateBearing(currentPos.lat, currentPos.lon, target.lat, target.lon);
        const vx = simulatedSpeed * Math.cos(bearing * Math.PI / 180);
        const vy = simulatedSpeed * Math.sin(bearing * Math.PI / 180);

        handleTelemetryUpdate({
          position: currentPos,
          velocity: { vx, vy, vz: 0 },
          attitude: { roll: 0, pitch: 0, yaw: bearing },
          battery: {
            voltage: 16.8 - (wpIndex / totalWaypoints) * 2,
            current: 15.5,
            remaining: 100 - (wpIndex / totalWaypoints) * 50,
          },
          gps: {
            satellites: 12,
            fix_type: 3,
            hdop: 0.8,
          },
          armed: true,
          flying: true,
          flight_mode: 'AUTO',
          mission_current: wpIndex,
          mission_count: totalWaypoints,
        });
      }
    }, 100);
  }, [selectedMission, simulatedSpeed, handleTelemetryUpdate, disconnectAll]);

  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setSimulationRunning(false);
    setTelemetrySource('disconnected');
    setIsConnected(false);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Connect on mount
  useEffect(() => {
    if (!simulationMode) {
      if (useKafka) {
        connectKafkaWebSocket();
      } else {
        connectWebSocket();
      }
    }

    return () => {
      disconnectAll();
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, []);

  // Update frequency calculator
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

  // Heartbeat ping
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(() => {
        if (kafkaWsRef.current?.readyState === WebSocket.OPEN) {
          kafkaWsRef.current.send(JSON.stringify({ action: 'ping' }));
        } else if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);

      return () => clearInterval(pingInterval);
    }
  }, [isConnected]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 1) return 'Just now';
    if (seconds === 1) return '1 second ago';
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          )}
          <h1 className="text-xl font-bold text-white">
            {selectedMission?.name || selectedMission?.mission_name || 'Flight Visualization'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Telemetry Source Indicator */}
          <TelemetrySourceIndicator
            source={telemetrySource}
            connected={isConnected}
            messageRate={updateFrequency}
          />

          {/* Kafka Toggle */}
          <button
            onClick={() => {
              disconnectAll();
              setUseKafka(!useKafka);
              setTimeout(() => {
                if (!useKafka) {
                  connectKafkaWebSocket();
                } else {
                  connectWebSocket();
                }
              }, 100);
            }}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              useKafka
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {useKafka ? 'Kafka On' : 'Kafka Off'}
          </button>

          {/* Simulation Controls */}
          {selectedMission?.waypoints?.length && (
            <div className="flex items-center gap-2">
              {!simulationRunning ? (
                <button
                  onClick={startSimulation}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>Simulate</span>
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Mission Waypoints */}
            {selectedMission?.waypoints?.map((wp, index) => {
              const lng = getWaypointLongitude(wp);
              if (!isValidCoordinate(wp.lat, lng)) return null;

              const waypointStatus = waypointStatuses.find(ws => ws.index === index);
              const statusColor = waypointStatus?.status === 'completed' 
                ? '#22c55e' 
                : waypointStatus?.status === 'active' 
                  ? '#3b82f6' 
                  : '#6b7280';

              return (
                <Marker
                  key={`wp-${index}`}
                  position={[wp.lat, lng!]}
                  icon={L.divIcon({
                    className: 'waypoint-marker',
                    html: `
                      <div style="
                        width: 24px;
                        height: 24px;
                        background: ${statusColor};
                        border: 2px solid white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      ">
                        ${index + 1}
                      </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                  })}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Waypoint {index + 1}</strong>
                      <br />
                      Lat: {wp.lat.toFixed(6)}
                      <br />
                      Lon: {lng?.toFixed(6)}
                      <br />
                      Alt: {wp.alt || 0}m
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Mission Path */}
            {selectedMission?.waypoints && selectedMission.waypoints.length > 1 && (
              <Polyline
                positions={selectedMission.waypoints
                  .filter(wp => isValidCoordinate(wp.lat, getWaypointLongitude(wp)))
                  .map(wp => [wp.lat, getWaypointLongitude(wp)!])}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}

            {/* Flight Path */}
            {flightPath.length > 1 && (
              <Polyline
                positions={flightPath.map(fp => [fp.lat, fp.lon])}
                color="#22c55e"
                weight={2}
                opacity={0.8}
              />
            )}

            {/* Drone Position */}
            {dronePosition && isValidCoordinate(dronePosition.lat, dronePosition.lon) && (
              <Marker
                position={[dronePosition.lat, dronePosition.lon]}
                icon={createDroneIcon(telemetry?.attitude?.yaw || 0)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Drone Position</strong>
                    <br />
                    Lat: {dronePosition.lat.toFixed(6)}
                    <br />
                    Lon: {dronePosition.lon.toFixed(6)}
                    <br />
                    Alt: {dronePosition.alt.toFixed(1)}m
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Mission Progress Overlay */}
          {simulationRunning && (
            <div className="absolute top-4 left-4 bg-slate-900/90 rounded-lg p-4 z-[1000]">
              <div className="text-white text-sm">
                <div className="font-bold mb-2">Mission Progress</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${missionProgress.total > 0
                          ? (missionProgress.current / missionProgress.total) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                  <span>
                    {missionProgress.current}/{missionProgress.total}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Telemetry Panel */}
        <div className="w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto">
          <TelemetryDisplay
            telemetry={telemetry}
            status={status}
            wsConnected={isConnected}
            lastUpdate={lastTelemetryUpdate}
            updateFrequency={updateFrequency}
            isPulsing={telemetryPulse}
          />
        </div>
      </div>
    </div>
  );
};

export default DroneFlightVisualization;
