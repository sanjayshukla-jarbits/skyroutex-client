/**
 * Grid Mission Control Panel
 * Real-time mission monitoring and control interface
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ArrowUp, ArrowDown, Navigation, Battery, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

// API Configuration
const DRONE_CONTROL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const MISSION_DB_API = process.env.NEXT_PUBLIC_MISSION_DB_URL || 'http://localhost:7000';

// ============================================================================
// Types
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
    fix_type: number;
    satellites_visible: number;
    hdop: number;
  };
  flight_mode?: string;
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
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
}

// ============================================================================
// Component Props
// ============================================================================

interface GridMissionControlPanelProps {
  missionId?: string | number;
  onMissionComplete?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

const GridMissionControlPanel: React.FC<GridMissionControlPanelProps> = ({
  missionId,
  onMissionComplete,
}) => {
  // ========================================
  // State Management
  // ========================================

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [droneStatus, setDroneStatus] = useState<DroneStatus | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [missionActive, setMissionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // ========================================
  // WebSocket Connection
  // ========================================

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket already connected');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      toast.error('WebSocket connection failed after multiple attempts');
      return;
    }

    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_BASE}/ws/telemetry`);
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
        toast.success('Real-time telemetry connected');

        if (missionId) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: missionId
          }));
          console.log(`📡 Subscribed to mission: ${missionId}`);
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
                setDroneStatus(message.data);
              }
              break;
            case 'mission_complete':
              setMissionActive(false);
              toast.success('Mission completed!');
              if (onMissionComplete) {
                onMissionComplete();
              }
              break;
            case 'error':
              console.error('❌ WebSocket error:', message.message);
              toast.error(message.message);
              break;
            default:
              console.log('📨 WebSocket message:', message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (Code: ${event.code})`);
        setWsConnected(false);

        if (missionActive && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          setTimeout(connectWebSocket, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Error connecting WebSocket:', error);
      setWsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
      console.log('🔌 WebSocket disconnected');
    }
  };

  const handleTelemetryUpdate = (data: any) => {
    try {
      const positionData = data.position || data.current_position;

      setTelemetry({
        position: positionData ? {
          lat: positionData.lat || positionData.latitude || 0,
          lon: positionData.lon || positionData.lng || positionData.longitude || 0,
          alt: positionData.alt || positionData.altitude || positionData.relative_alt || 0
        } : undefined,
        velocity: data.velocity,
        attitude: data.attitude,
        battery: data.battery,
        gps: data.gps,
        flight_mode: data.flight_mode || data.mode
      });

      if (data.armed !== undefined || data.flying !== undefined) {
        setDroneStatus(prev => ({
          connected: true,
          armed: data.armed ?? prev?.armed ?? false,
          flying: data.flying ?? prev?.flying ?? false,
          current_position: positionData ? {
            lat: positionData.lat || positionData.latitude || 0,
            lon: positionData.lon || positionData.lng || positionData.longitude || 0,
            alt: positionData.alt || positionData.altitude || 0
          } : prev?.current_position ?? { lat: 0, lon: 0, alt: 0 },
          battery_level: data.battery?.remaining ?? data.battery_level ?? prev?.battery_level ?? 0,
          flight_mode: data.flight_mode || data.mode || prev?.flight_mode || 'UNKNOWN',
          mission_active: data.mission_active ?? prev?.mission_active ?? false,
          mission_current: data.mission_current ?? data.current_waypoint ?? prev?.mission_current ?? 0,
          mission_count: data.mission_count ?? data.total_waypoints ?? prev?.mission_count ?? 0
        }));
      }
    } catch (error) {
      console.error('❌ Error processing telemetry:', error);
    }
  };

  // ========================================
  // Mission Control Functions
  // ========================================

  const startMission = async () => {
    try {
      console.log('▶️ Starting mission...');
      toast.loading('Starting mission...');

      const response = await fetch(`${DRONE_CONTROL_API}/mission/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start mission');
      }

      const result = await response.json();
      console.log('✅ Mission started:', result);
      
      setMissionActive(true);
      setIsPaused(false);
      toast.dismiss();
      toast.success('Mission started!');

      // Update database status
      if (missionId) {
        await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'active' }),
        });
      }
    } catch (error) {
      console.error('❌ Error starting mission:', error);
      toast.dismiss();
      toast.error(`Failed to start mission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const pauseMission = async () => {
    try {
      console.log('⏸️ Pausing mission...');

      const response = await fetch(`${DRONE_CONTROL_API}/mission/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to pause mission');
      }

      const result = await response.json();
      console.log('✅ Mission paused:', result);
      
      setIsPaused(true);
      toast.success('Mission paused');

      // Update database status
      if (missionId) {
        await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'paused' }),
        });
      }
    } catch (error) {
      console.error('❌ Error pausing mission:', error);
      toast.error('Failed to pause mission');
    }
  };

  const resumeMission = async () => {
    try {
      console.log('▶️ Resuming mission...');

      const response = await fetch(`${DRONE_CONTROL_API}/mission/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to resume mission');
      }

      const result = await response.json();
      console.log('✅ Mission resumed:', result);
      
      setIsPaused(false);
      toast.success('Mission resumed');

      // Update database status
      if (missionId) {
        await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'active' }),
        });
      }
    } catch (error) {
      console.error('❌ Error resuming mission:', error);
      toast.error('Failed to resume mission');
    }
  };

  const stopMission = async () => {
    try {
      console.log('⏹️ Stopping mission...');

      const response = await fetch(`${DRONE_CONTROL_API}/mission/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to stop mission');
      }

      const result = await response.json();
      console.log('✅ Mission stopped:', result);
      
      setMissionActive(false);
      setIsPaused(false);
      toast.success('Mission stopped');

      // Update database status
      if (missionId) {
        await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'completed' }),
        });
      }
    } catch (error) {
      console.error('❌ Error stopping mission:', error);
      toast.error('Failed to stop mission');
    }
  };

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    if (missionActive) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [missionActive]);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Mission Control</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-slate-400">
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={startMission}
          disabled={missionActive}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium flex items-center justify-center gap-2"
        >
          <Play size={16} />
          Start
        </button>

        <button
          onClick={isPaused ? resumeMission : pauseMission}
          disabled={!missionActive}
          className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium flex items-center justify-center gap-2"
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={stopMission}
          disabled={!missionActive}
          className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium flex items-center justify-center gap-2"
        >
          <Square size={16} />
          Stop
        </button>

        <button
          onClick={connectWebSocket}
          disabled={wsConnected}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium flex items-center justify-center gap-2"
        >
          <Wifi size={16} />
          Connect
        </button>
      </div>

      {/* Telemetry Display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Position */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Navigation size={16} />
            Position
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Latitude:</span>
              <span className="font-mono">{telemetry?.position?.lat.toFixed(6) || '0.000000'}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Longitude:</span>
              <span className="font-mono">{telemetry?.position?.lon.toFixed(6) || '0.000000'}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="font-mono">{telemetry?.position?.alt.toFixed(1) || '0.0'} m</span>
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Battery size={16} />
            Battery
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Voltage:</span>
              <span className="font-mono">{telemetry?.battery?.voltage?.toFixed(2) || '0.00'} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current:</span>
              <span className="font-mono">{telemetry?.battery?.current?.toFixed(2) || '0.00'} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Remaining:</span>
              <span className={`font-mono ${
                (telemetry?.battery?.remaining || 0) < 20 ? 'text-red-400' : 'text-green-400'
              }`}>
                {telemetry?.battery?.remaining?.toFixed(0) || '0'}%
              </span>
            </div>
          </div>
        </div>

        {/* Attitude */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Attitude</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Roll:</span>
              <span className="font-mono">{telemetry?.attitude?.roll?.toFixed(1) || '0.0'}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pitch:</span>
              <span className="font-mono">{telemetry?.attitude?.pitch?.toFixed(1) || '0.0'}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yaw:</span>
              <span className="font-mono">{telemetry?.attitude?.yaw?.toFixed(1) || '0.0'}°</span>
            </div>
          </div>
        </div>

        {/* Mission Progress */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Mission Progress</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={`font-medium ${
                missionActive ? 'text-green-400' : 'text-slate-400'
              }`}>
                {missionActive ? (isPaused ? 'Paused' : 'Active') : 'Idle'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waypoint:</span>
              <span className="font-mono">
                {droneStatus?.mission_current || 0} / {droneStatus?.mission_count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Flight Mode:</span>
              <span className="font-medium">{droneStatus?.flight_mode || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GPS Status */}
      {telemetry?.gps && (
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-slate-400 mb-2">GPS Status</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Fix Type:</span>
              <span className="ml-2 font-mono">{telemetry.gps.fix_type}</span>
            </div>
            <div>
              <span className="text-slate-400">Satellites:</span>
              <span className="ml-2 font-mono">{telemetry.gps.satellites_visible}</span>
            </div>
            <div>
              <span className="text-slate-400">HDOP:</span>
              <span className="ml-2 font-mono">{telemetry.gps.hdop?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GridMissionControlPanel;