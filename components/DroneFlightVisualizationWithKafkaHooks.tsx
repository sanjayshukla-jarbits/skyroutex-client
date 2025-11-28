/**
 * DroneFlightVisualization with Kafka Hooks Integration
 * ======================================================
 * 
 * Alternative implementation using the useKafkaTelemetry hook
 * for cleaner code organization and reusability.
 * 
 * This version demonstrates how to integrate the Kafka telemetry
 * hooks into the existing component structure.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft, 
  PlayCircle, 
  StopCircle,
  Wifi,
  WifiOff,
  Database,
  Radio,
  Activity
} from 'lucide-react';
import TelemetryDisplay from '@/components/TelemetryDisplay';

// Import Kafka telemetry hook
import { useKafkaTelemetry, useKafkaStats } from '@/hooks/useKafkaTelemetry';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// TYPES
// ============================================================================

interface Position {
  lat: number;
  lon: number;
  alt: number;
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
  name?: string;
  mission_name?: string;
  waypoints: MissionWaypoint[];
  corridor?: string;
}

interface DroneFlightVisualizationProps {
  selectedMission?: SelectedMission | null;
  onBack?: () => void;
}

interface FlightPathPoint {
  lat: number;
  lon: number;
  timestamp: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const KAFKA_WS_URL = process.env.NEXT_PUBLIC_KAFKA_WS_URL || 'ws://localhost:8002/ws/kafka-telemetry';

// ============================================================================
// HELPERS
// ============================================================================

const getWaypointLongitude = (wp: MissionWaypoint): number | undefined => wp.lng ?? wp.lon;

const isValidCoordinate = (lat?: number, lon?: number): boolean => {
  return lat !== undefined && lon !== undefined && 
         !isNaN(lat) && !isNaN(lon) && 
         lat !== 0 && lon !== 0 &&
         lat >= -90 && lat <= 90 && 
         lon >= -180 && lon <= 180;
};

// ============================================================================
// DRONE ICON
// ============================================================================

const createDroneIcon = (heading: number = 0) => L.divIcon({
  className: 'drone-marker',
  html: `
    <div style="
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      transform: rotate(${heading}deg);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    ">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 12L12 22L20 12L12 2Z" fill="#3b82f6" stroke="#1e40af" stroke-width="1"/>
        <circle cx="12" cy="12" r="3" fill="#1e40af"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// ============================================================================
// MAP CONTROLLER
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
// CONNECTION STATUS BADGE
// ============================================================================

const ConnectionStatusBadge: React.FC<{
  isConnected: boolean;
  source: 'kafka' | 'websocket' | 'simulation' | 'disconnected';
  messageRate: number;
}> = ({ isConnected, source, messageRate }) => {
  const config = {
    kafka: { icon: <Database className="w-4 h-4" />, label: 'Kafka', color: 'text-purple-400' },
    websocket: { icon: <Radio className="w-4 h-4" />, label: 'WebSocket', color: 'text-blue-400' },
    simulation: { icon: <Activity className="w-4 h-4" />, label: 'Simulation', color: 'text-green-400' },
    disconnected: { icon: <WifiOff className="w-4 h-4" />, label: 'Disconnected', color: 'text-red-400' },
  }[source];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 ${config.color}`}>
      {isConnected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
      {messageRate > 0 && <span className="text-xs opacity-75">{messageRate} Hz</span>}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT WITH KAFKA HOOKS
// ============================================================================

const DroneFlightVisualizationWithKafka: React.FC<DroneFlightVisualizationProps> = ({ 
  selectedMission = null,
  onBack 
}) => {
  // ============================================================================
  // KAFKA TELEMETRY HOOK
  // ============================================================================
  
  const {
    telemetry,
    position,
    attitude,
    battery,
    gps,
    velocity,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    subscribeVehicle,
    messageRate,
    lastUpdate,
  } = useKafkaTelemetry({
    autoConnect: true,
    vehicleFilter: selectedMission?.id ? [selectedMission.id] : undefined,
    config: {
      wsUrl: KAFKA_WS_URL,
      topics: ['drone-telemetry', 'drone-status'],
      groupId: 'skyroutex-flight-viz',
    },
    onConnect: () => console.log('✅ Kafka telemetry connected'),
    onDisconnect: () => console.log('🔌 Kafka telemetry disconnected'),
    onError: (err) => console.error('❌ Kafka error:', err),
  });

  const stats = useKafkaStats();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [flightPath, setFlightPath] = useState<FlightPathPoint[]>([]);
  const [simulationMode, setSimulationMode] = useState(false);
  const [telemetrySource, setTelemetrySource] = useState<'kafka' | 'simulation' | 'disconnected'>('disconnected');

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const dronePosition = useMemo((): Position | null => {
    if (!position) return null;
    const lat = position.lat ?? position.latitude ?? 0;
    const lon = position.lon ?? position.lng ?? position.longitude ?? 0;
    const alt = position.alt ?? position.altitude ?? 0;
    
    if (!isValidCoordinate(lat, lon)) return null;
    return { lat, lon, alt };
  }, [position]);

  const mapCenter = useMemo((): [number, number] => {
    if (dronePosition) {
      return [dronePosition.lat, dronePosition.lon];
    }
    if (selectedMission?.waypoints?.[0]) {
      const wp = selectedMission.waypoints[0];
      const lon = getWaypointLongitude(wp);
      if (isValidCoordinate(wp.lat, lon)) {
        return [wp.lat, lon!];
      }
    }
    return [26.8467, 80.9462]; // Default: Lucknow
  }, [dronePosition, selectedMission]);

  const heading = attitude?.yaw ?? 0;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update telemetry source
  useEffect(() => {
    if (simulationMode) {
      setTelemetrySource('simulation');
    } else if (isConnected) {
      setTelemetrySource('kafka');
    } else {
      setTelemetrySource('disconnected');
    }
  }, [isConnected, simulationMode]);

  // Subscribe to vehicle when mission changes
  useEffect(() => {
    if (selectedMission?.id && isConnected) {
      subscribeVehicle(selectedMission.id);
    }
  }, [selectedMission?.id, isConnected, subscribeVehicle]);

  // Update flight path when position changes
  useEffect(() => {
    if (dronePosition) {
      setFlightPath(prev => {
        const newPath = [...prev, {
          lat: dronePosition.lat,
          lon: dronePosition.lon,
          timestamp: Date.now(),
        }];
        return newPath.slice(-500);
      });
    }
  }, [dronePosition]);

  // ============================================================================
  // STATUS OBJECT FOR TELEMETRY DISPLAY
  // ============================================================================

  const status = useMemo(() => ({
    connected: isConnected,
    armed: telemetry?.armed ?? false,
    flying: telemetry?.flying ?? false,
    current_position: dronePosition || { lat: 0, lon: 0, alt: 0 },
    battery_level: battery?.remaining ?? battery?.level ?? 0,
    flight_mode: telemetry?.flight_mode ?? telemetry?.mode ?? 'UNKNOWN',
    mission_active: false,
    mission_current: telemetry?.mission_current ?? 0,
    mission_count: telemetry?.mission_count ?? 0,
  }), [telemetry, dronePosition, battery, isConnected]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
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
          <ConnectionStatusBadge
            isConnected={isConnected}
            source={telemetrySource}
            messageRate={messageRate}
          />

          {!isConnected && !isConnecting && (
            <button
              onClick={connect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Connect
            </button>
          )}

          {isConnected && (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm">
          Connection error: {error.message}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={15} />

            {/* Mission Waypoints */}
            {selectedMission?.waypoints?.map((wp, index) => {
              const lng = getWaypointLongitude(wp);
              if (!isValidCoordinate(wp.lat, lng)) return null;

              return (
                <Marker
                  key={`wp-${index}`}
                  position={[wp.lat, lng!]}
                  icon={L.divIcon({
                    className: 'waypoint-marker',
                    html: `
                      <div style="
                        width: 24px; height: 24px;
                        background: #3b82f6;
                        border: 2px solid white;
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        color: white; font-weight: bold; font-size: 12px;
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
                    <strong>Waypoint {index + 1}</strong><br />
                    Lat: {wp.lat.toFixed(6)}<br />
                    Lon: {lng?.toFixed(6)}<br />
                    Alt: {wp.alt || 0}m
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
            {dronePosition && (
              <Marker
                position={[dronePosition.lat, dronePosition.lon]}
                icon={createDroneIcon(heading)}
              >
                <Popup>
                  <strong>Drone</strong><br />
                  Lat: {dronePosition.lat.toFixed(6)}<br />
                  Lon: {dronePosition.lon.toFixed(6)}<br />
                  Alt: {dronePosition.alt.toFixed(1)}m
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Stats Overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 rounded-lg p-3 z-[1000] text-white text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-400">Messages:</span>
              <span>{stats.messagesReceived}</span>
              <span className="text-slate-400">Rate:</span>
              <span>{stats.messageRate} Hz</span>
              <span className="text-slate-400">Uptime:</span>
              <span>{Math.floor(stats.uptimeSeconds)}s</span>
            </div>
          </div>
        </div>

        {/* Telemetry Panel */}
        <div className="w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto">
          <TelemetryDisplay
            telemetry={{
              position: dronePosition ? {
                lat: dronePosition.lat,
                lon: dronePosition.lon,
                alt: dronePosition.alt,
              } : undefined,
              velocity,
              attitude,
              battery,
              gps: gps ? {
                satellites: gps.satellites ?? gps.num_satellites ?? 0,
                fix_type: gps.fix_type ?? 0,
                hdop: gps.hdop ?? 0,
              } : undefined,
            }}
            status={status}
            wsConnected={isConnected}
            lastUpdate={lastUpdate ?? undefined}
            updateFrequency={messageRate}
            isPulsing={false}
          />
        </div>
      </div>
    </div>
  );
};

export default DroneFlightVisualizationWithKafka;
