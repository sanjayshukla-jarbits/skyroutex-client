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
 * - Auto-reconnection with exponential backoff
 * - Esri Satellite Imagery for better terrain visualization
 * - Zoom controls with follow drone mode
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Radio,
  ZoomIn,
  ZoomOut,
  Locate,
  Navigation,
  Maximize2,
  Target,
} from 'lucide-react';
import TelemetryDisplay from '@/components/TelemetryDisplay';
import { createDroneIcon, getDroneStatus } from '@/components/droneIconUtils';

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
    relative_alt?: number;
    relative_altitude?: number;
    agl?: number;
  };
  velocity?: {
    vx: number;
    vy: number;
    vz: number;
    ground_speed?: number;
    groundspeed?: number;
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
    satellites_visible?: number;
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
  alt?: number;
  altitude?: number;
  relative_alt?: number;
  relative_altitude?: number;
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

type TelemetrySource = 'kafka' | 'websocket' | 'http' | 'disconnected';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002';
const KAFKA_WS_URL = process.env.NEXT_PUBLIC_KAFKA_WS_URL || 'ws://localhost:8002/ws/kafka-telemetry';

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const DEFAULT_ZOOM = 15;
const ZOOM_STEP = 1;

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

// ============================================================================
// MAP CONTROLLER COMPONENT
// ============================================================================

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  followDrone: boolean;
  onZoomChange?: (zoom: number) => void;
}

const MapController: React.FC<MapControllerProps> = ({ center, zoom, followDrone, onZoomChange }) => {
  const map = useMap();
  
  useEffect(() => {
    if (followDrone && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, followDrone, map]);

  useEffect(() => {
    const handleZoomEnd = () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    };
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onZoomChange]);
  
  return null;
};

// ============================================================================
// MAP ZOOM CONTROLS COMPONENT
// ============================================================================

interface MapZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitMission: () => void;
  onCenterDrone: () => void;
  followDrone: boolean;
  onToggleFollow: () => void;
  hasDronePosition: boolean;
  hasMission: boolean;
}

const MapZoomControls: React.FC<MapZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitMission,
  onCenterDrone,
  followDrone,
  onToggleFollow,
  hasDronePosition,
  hasMission,
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 shadow-lg border border-slate-700">
        <button
          onClick={onZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-2 rounded hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        
        <div className="px-2 py-1 text-center text-xs text-slate-400 font-mono border-y border-slate-700">
          {zoom}x
        </div>
        
        <button
          onClick={onZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-2 rounded hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-1 shadow-lg border border-slate-700">
        <button
          onClick={onToggleFollow}
          disabled={!hasDronePosition}
          className={`p-2 rounded transition-colors ${
            followDrone 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'hover:bg-slate-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={followDrone ? "Stop Following Drone" : "Follow Drone"}
        >
          <Navigation className={`w-5 h-5 ${followDrone ? 'animate-pulse' : ''}`} />
        </button>

        <button
          onClick={onCenterDrone}
          disabled={!hasDronePosition}
          className="p-2 rounded hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Center on Drone"
        >
          <Target className="w-5 h-5" />
        </button>

        <button
          onClick={onFitMission}
          disabled={!hasMission}
          className="p-2 rounded hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Fit Mission in View"
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        <button
          onClick={onResetZoom}
          className="p-2 rounded hover:bg-slate-700 text-white transition-colors"
          title="Reset Zoom"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
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
  const [currentMissionId] = useState<string>(selectedMission?.id || '');
  
  // Telemetry source state
  const [telemetrySource, setTelemetrySource] = useState<TelemetrySource>('disconnected');
  const [useKafka, setUseKafka] = useState<boolean>(true);
  
  // Mission state
  const [waypointStatuses] = useState<WaypointStatus[]>([]);
  const [missionProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  
  // Telemetry statistics
  const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState<number>(0);
  const [telemetryPulse, setTelemetryPulse] = useState<boolean>(false);
  const [updateFrequency, setUpdateFrequency] = useState<number>(0);

  // Map zoom and follow state
  const [followDrone, setFollowDrone] = useState<boolean>(true);
  const mapRef = useRef<L.Map | null>(null);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const kafkaWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const telemetryIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    return [26.8467, 80.9462];
  }, [selectedMission]);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(getDefaultPosition());
  const [mapZoom, setMapZoom] = useState(selectedMission ? 15 : 18);

  // ============================================================================
  // ZOOM CONTROL HANDLERS
  // ============================================================================

  const handleZoomIn = useCallback(() => {
    if (mapRef.current && mapZoom < MAX_ZOOM) {
      const newZoom = Math.min(mapZoom + ZOOM_STEP, MAX_ZOOM);
      mapRef.current.setZoom(newZoom);
      setMapZoom(newZoom);
    }
  }, [mapZoom]);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current && mapZoom > MIN_ZOOM) {
      const newZoom = Math.max(mapZoom - ZOOM_STEP, MIN_ZOOM);
      mapRef.current.setZoom(newZoom);
      setMapZoom(newZoom);
    }
  }, [mapZoom]);

  const handleResetZoom = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(DEFAULT_ZOOM);
      setMapZoom(DEFAULT_ZOOM);
      if (dronePosition) {
        mapRef.current.setView([dronePosition.lat, dronePosition.lon], DEFAULT_ZOOM);
        setMapCenter([dronePosition.lat, dronePosition.lon]);
      }
    }
  }, [dronePosition]);

  const handleCenterDrone = useCallback(() => {
    if (mapRef.current && dronePosition) {
      mapRef.current.setView([dronePosition.lat, dronePosition.lon], mapZoom, { animate: true });
      setMapCenter([dronePosition.lat, dronePosition.lon]);
    }
  }, [dronePosition, mapZoom]);

  const handleFitMission = useCallback(() => {
    if (mapRef.current && selectedMission?.waypoints?.length) {
      const validWaypoints = selectedMission.waypoints.filter(wp => {
        const lng = getWaypointLongitude(wp);
        return isValidCoordinate(wp.lat, lng);
      });

      if (validWaypoints.length > 0) {
        const bounds = L.latLngBounds(
          validWaypoints.map(wp => [wp.lat, getWaypointLongitude(wp)!] as [number, number])
        );
        
        if (dronePosition && isValidCoordinate(dronePosition.lat, dronePosition.lon)) {
          bounds.extend([dronePosition.lat, dronePosition.lon]);
        }

        mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
        setFollowDrone(false);
      }
    }
  }, [selectedMission, dronePosition]);

  const handleToggleFollow = useCallback(() => {
    setFollowDrone(prev => !prev);
    if (!followDrone && dronePosition) {
      if (mapRef.current) {
        mapRef.current.setView([dronePosition.lat, dronePosition.lon], mapZoom, { animate: true });
        setMapCenter([dronePosition.lat, dronePosition.lon]);
      }
    }
  }, [followDrone, dronePosition, mapZoom]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setMapZoom(newZoom);
  }, []);

  // ============================================================================
  // TELEMETRY UPDATE HANDLER
  // ============================================================================

  const handleTelemetryUpdate = useCallback((data: TelemetryData) => {
    try {
      const positionData = data.position || data;
      
      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === undefined || value === null || value === '') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };
      
      const getAltitude = (): number => {
        const altFields = [
          positionData?.alt,
          positionData?.altitude,
          positionData?.relative_alt,
          positionData?.relative_altitude,
          positionData?.agl,
          (data as any)?.alt,
          (data as any)?.altitude,
          (data as any)?.relative_alt,
          (data as any)?.relative_altitude,
        ];
        
        for (const field of altFields) {
          if (field !== undefined && field !== null && field !== '') {
            const num = Number(field);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      };
      
      const position = positionData ? {
        lat: safeNumber(positionData.lat ?? positionData.latitude, 0),
        lon: safeNumber(positionData.lon ?? positionData.longitude, 0),
        alt: getAltitude(),
      } : null;

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

      setLastTelemetryUpdate(Date.now());
      setTelemetryPulse(true);
      setTimeout(() => setTelemetryPulse(false), 200);

      updateCountRef.current += 1;

      if (position && isValidCoordinate(position.lat, position.lon)) {
        setDronePosition(position);

        setFlightPath(prev => {
          const newPath = [...prev, {
            lat: position.lat,
            lon: position.lon,
            alt: position.alt,
            timestamp: Date.now(),
          }];
          return newPath.slice(-500);
        });

        if (followDrone) {
          setMapCenter([position.lat, position.lon]);
        }
      }

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
  }, [followDrone]);

  // ============================================================================
  // KAFKA WEBSOCKET CONNECTION
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);

      ws.onopen = () => {
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
          if (message.type === 'telemetry_update') {
            handleTelemetryUpdate(message.data || message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTelemetrySource('disconnected');
        wsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          startStatusPolling();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      startStatusPolling();
    }
  }, [currentMissionId, handleTelemetryUpdate]);

  const connectKafkaWebSocket = useCallback(() => {
    if (!useKafka) {
      connectWebSocket();
      return;
    }

    if (kafkaWsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setUseKafka(false);
      connectWebSocket();
      return;
    }

    try {
      const ws = new WebSocket(KAFKA_WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        setTelemetrySource('kafka');
        reconnectAttemptsRef.current = 0;

        ws.send(JSON.stringify({
          action: 'configure',
          topics: ['drone-telemetry', 'drone-status'],
          group_id: 'skyroutex-flight-viz',
        }));

        if (currentMissionId) {
          ws.send(JSON.stringify({
            action: 'subscribe_vehicle',
            vehicle_id: currentMissionId,
          }));
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
          }
        } catch (error) {
          console.error('❌ Error parsing Kafka message:', error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTelemetrySource('disconnected');
        kafkaWsRef.current = null;

        if (reconnectAttemptsRef.current < maxReconnectAttempts && useKafka) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectKafkaWebSocket();
          }, delay);
        } else if (!useKafka) {
          connectWebSocket();
        }
      };

      kafkaWsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create Kafka WebSocket:', error);
      setUseKafka(false);
      connectWebSocket();
    }
  }, [useKafka, currentMissionId, handleTelemetryUpdate, connectWebSocket]);

  // ============================================================================
  // HTTP POLLING FALLBACK
  // ============================================================================

  const startStatusPolling = useCallback(() => {
    if (telemetryIntervalRef.current) return;

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
  }, [handleTelemetryUpdate]);

  const stopStatusPolling = useCallback(() => {
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current);
      telemetryIntervalRef.current = null;
    }
  }, []);

  // ============================================================================
  // DISCONNECT ALL
  // ============================================================================

  const disconnectAll = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (kafkaWsRef.current) {
      kafkaWsRef.current.close();
      kafkaWsRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    stopStatusPolling();

    setIsConnected(false);
    setTelemetrySource('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [stopStatusPolling]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (useKafka) {
      connectKafkaWebSocket();
    } else {
      connectWebSocket();
    }

    return () => {
      disconnectAll();
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, []);

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
  // RENDER
  // ============================================================================

  // Add pulse animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
        50% { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
          <TelemetrySourceIndicator
            source={telemetrySource}
            connected={isConnected}
            messageRate={updateFrequency}
          />

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
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=""
              maxZoom={19}
            />
            <MapController 
              center={mapCenter} 
              zoom={mapZoom} 
              followDrone={followDrone}
              onZoomChange={handleZoomChange}
            />

            {/* Mission Waypoints */}
            {selectedMission?.waypoints?.map((wp, index, arr) => {
              const lng = getWaypointLongitude(wp);
              if (!isValidCoordinate(wp.lat, lng)) return null;

              const isStart = index === 0;
              const isEnd = index === arr.length - 1;
              const waypointStatus = waypointStatuses.find(ws => ws.index === index);
              
              // Determine waypoint color: Start=Green, End=Red, Active=Blue, Completed=Green, Default=Gray
              let statusColor = '#6b7280'; // default gray
              let borderColor = 'white';
              let size = 24;
              let label = `${index + 1}`;
              
              if (isStart) {
                statusColor = '#22c55e'; // green
                borderColor = '#15803d';
                size = 32;
                label = 'S';
              } else if (isEnd) {
                statusColor = '#ef4444'; // red
                borderColor = '#b91c1c';
                size = 32;
                label = 'E';
              } else if (waypointStatus?.status === 'completed') {
                statusColor = '#22c55e'; // green
              } else if (waypointStatus?.status === 'active') {
                statusColor = '#3b82f6'; // blue
              }

              return (
                <Marker
                  key={`wp-${index}`}
                  position={[wp.lat, lng!]}
                  icon={L.divIcon({
                    className: 'waypoint-marker',
                    html: `
                      <div style="
                        width: ${size}px;
                        height: ${size}px;
                        background: ${statusColor};
                        border: 3px solid ${borderColor};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: ${isStart || isEnd ? '14px' : '12px'};
                        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                        ${isStart || isEnd ? 'animation: pulse 2s infinite;' : ''}
                      ">
                        ${label}
                      </div>
                      ${isStart ? `
                        <div style="
                          position: absolute;
                          top: -8px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: #22c55e;
                          color: white;
                          font-size: 10px;
                          font-weight: bold;
                          padding: 2px 6px;
                          border-radius: 4px;
                          white-space: nowrap;
                        ">START</div>
                      ` : ''}
                      ${isEnd ? `
                        <div style="
                          position: absolute;
                          top: -8px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: #ef4444;
                          color: white;
                          font-size: 10px;
                          font-weight: bold;
                          padding: 2px 6px;
                          border-radius: 4px;
                          white-space: nowrap;
                        ">END</div>
                      ` : ''}
                    `,
                    iconSize: [size, size + (isStart || isEnd ? 16 : 0)],
                    iconAnchor: [size / 2, size / 2],
                  })}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>
                        {isStart ? '🟢 Start - ' : isEnd ? '🔴 End - ' : ''}
                        Waypoint {index + 1}
                      </strong>
                      <br />
                      Lat: {wp.lat.toFixed(6)}
                      <br />
                      Lon: {lng?.toFixed(6)}
                      <br />
                      Alt: {wp.alt || 0}m
                      {isStart && <><br /><span style={{color: '#22c55e'}}>● Takeoff Point</span></>}
                      {isEnd && <><br /><span style={{color: '#ef4444'}}>● Landing Point</span></>}
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
            {typeof window !== 'undefined' && dronePosition && isValidCoordinate(dronePosition.lat, dronePosition.lon) && (
              <Marker
                position={[dronePosition.lat, dronePosition.lon]}
                icon={createDroneIcon({
                  heading: telemetry?.attitude?.yaw || 0,
                  status: getDroneStatus(
                    status?.armed ?? false,
                    status?.flying ?? false,
                    status?.flight_mode
                  ),
                  style: 'quadcopter',
                  size: 56,
                  showPulse: status?.flying ?? false,
                }) || undefined}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>Drone Position</strong>
                    <br />
                    Lat: {Number(dronePosition.lat).toFixed(6)}
                    <br />
                    Lon: {Number(dronePosition.lon).toFixed(6)}
                    <br />
                    Alt: {Number(dronePosition.alt ?? 0).toFixed(1)}m
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Custom Zoom Controls */}
          <MapZoomControls
            zoom={mapZoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onFitMission={handleFitMission}
            onCenterDrone={handleCenterDrone}
            followDrone={followDrone}
            onToggleFollow={handleToggleFollow}
            hasDronePosition={!!dronePosition && isValidCoordinate(dronePosition.lat, dronePosition.lon)}
            hasMission={!!selectedMission?.waypoints?.length}
          />

          {/* Mission Progress Overlay */}
          {missionProgress.total > 0 && (
            <div className="absolute top-4 left-4 bg-slate-900/90 rounded-lg p-4 z-[1000]">
              <div className="text-white text-sm">
                <div className="font-bold mb-2">Mission Progress</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${(missionProgress.current / missionProgress.total) * 100}%`,
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

          {/* Follow Mode Indicator */}
          {followDrone && dronePosition && (
            <div className="absolute bottom-4 left-4 bg-blue-600/90 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 z-[1000]">
              <Navigation className="w-4 h-4 animate-pulse" />
              Following Drone
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