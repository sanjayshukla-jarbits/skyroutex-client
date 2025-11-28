/**
 * TelemetryDisplay Component - FIXED VERSION
 * 
 * Changes:
 * 1. Uses wsConnected OR status.connected to determine connection state
 * 2. Better null handling for all telemetry values
 * 3. Proper fallback chain for position, battery, GPS data
 * 4. Fixed NaN handling for altitude and other numeric values
 */

import React, { useEffect, useState, useRef } from 'react';

// ============================================================================
// INTERFACES
// ============================================================================

interface Position {
  lat?: number;
  lon?: number;
  alt?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  relative_alt?: number;
  relative_altitude?: number;
  agl?: number;
}

interface Battery {
  voltage?: number;
  current?: number;
  remaining?: number;
  level?: number;
}

interface GPS {
  satellites?: number;
  num_satellites?: number;
  satellites_visible?: number;
  fix_type?: number;
  hdop?: number;
}

interface Telemetry {
  position?: Position;
  battery?: Battery;
  gps?: GPS;
  flight_mode?: string;
  attitude?: {
    roll?: number;
    pitch?: number;
    yaw?: number;
  };
  velocity?: {
    vx?: number;
    vy?: number;
    vz?: number;
    ground_speed?: number;
    groundspeed?: number;
  };
  // Root level altitude fields
  alt?: number;
  altitude?: number;
  relative_alt?: number;
  relative_altitude?: number;
}

interface Status {
  connected?: boolean;
  armed?: boolean;
  flying?: boolean;
  current_position?: Position;
  battery_level?: number;
  flight_mode?: string;
  mission_active?: boolean;
  mission_current?: number;
  mission_count?: number;
}

interface TelemetryDisplayProps {
  telemetry: Telemetry | null;
  status: Status | null;
  wsConnected: boolean;
  lastUpdate?: number;
  updateFrequency?: number;
  isPulsing?: boolean;
}

// ============================================================================
// HELPER FUNCTION - Safe Number Conversion
// ============================================================================

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// ============================================================================
// COMPONENT
// ============================================================================

const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({
  telemetry,
  status,
  wsConnected,
  lastUpdate,
  updateFrequency = 0,
  isPulsing = false
}) => {
  
  const [updateCount, setUpdateCount] = useState(0);
  const prevTelemetryRef = useRef<Telemetry | null>(null);

  useEffect(() => {
    if (telemetry && telemetry !== prevTelemetryRef.current) {
      setUpdateCount(prev => prev + 1);
      prevTelemetryRef.current = telemetry;
    }
  }, [telemetry]);

  // Use wsConnected OR status.connected for connection state
  const isConnected = wsConnected || status?.connected || false;

  const formatTimeAgo = (timestamp?: number): string => {
    if (!timestamp) return 'N/A';
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

  const getDataFreshnessColor = (timestamp?: number): string => {
    if (!timestamp) return 'text-gray-400';
    const ageMs = Date.now() - timestamp;
    if (ageMs < 1000) return 'text-green-400';
    if (ageMs < 3000) return 'text-yellow-400';
    if (ageMs < 10000) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPositionValue = (field: 'lat' | 'lon' | 'alt'): number => {
    const telemetryPos = telemetry?.position;
    const statusPos = status?.current_position;
    
    if (field === 'lat') {
      return safeNumber(
        telemetryPos?.lat ?? 
        telemetryPos?.latitude ?? 
        statusPos?.lat ?? 
        statusPos?.latitude, 
        0
      );
    } else if (field === 'lon') {
      return safeNumber(
        telemetryPos?.lon ?? 
        telemetryPos?.longitude ?? 
        statusPos?.lon ?? 
        statusPos?.longitude, 
        0
      );
    } else {
      // For altitude, check multiple possible field names
      return safeNumber(
        telemetryPos?.alt ?? 
        telemetryPos?.altitude ?? 
        telemetryPos?.relative_alt ??
        telemetryPos?.relative_altitude ??
        telemetryPos?.agl ??
        telemetry?.alt ??
        telemetry?.altitude ??
        telemetry?.relative_alt ??
        telemetry?.relative_altitude ??
        statusPos?.alt ?? 
        statusPos?.altitude ??
        statusPos?.relative_alt ??
        statusPos?.relative_altitude,
        0
      );
    }
  };

  const getBatteryRemaining = (): number => {
    return safeNumber(
      telemetry?.battery?.remaining ?? 
      telemetry?.battery?.level ?? 
      status?.battery_level,
      0
    );
  };

  const getSatelliteCount = (): number => {
    return safeNumber(
      telemetry?.gps?.satellites ?? 
      telemetry?.gps?.num_satellites ?? 
      telemetry?.gps?.satellites_visible,
      0
    );
  };

  const getGPSFixType = (): number => {
    return safeNumber(telemetry?.gps?.fix_type, 0);
  };

  const getGPSFixString = (fixType: number): string => {
    if (fixType >= 3) return '3D FIX';
    if (fixType === 2) return '2D FIX';
    return 'NO FIX';
  };

  const getBatteryColor = (remaining: number): string => {
    if (remaining > 50) return 'text-green-400';
    if (remaining > 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBatteryBarColor = (remaining: number): string => {
    if (remaining > 50) return 'bg-green-500';
    if (remaining > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGPSColor = (satellites: number): string => {
    if (satellites >= 8) return 'text-green-400';
    if (satellites >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGPSFixColor = (fixType: number): string => {
    return fixType >= 3 ? 'text-green-400' : 'text-yellow-400';
  };

  const getFlightMode = (): string => {
    return telemetry?.flight_mode ?? status?.flight_mode ?? 'UNKNOWN';
  };

  const getGroundSpeed = (): number => {
    const velocity = telemetry?.velocity;
    if (velocity?.ground_speed !== undefined) {
      return safeNumber(velocity.ground_speed, 0);
    }
    if (velocity?.groundspeed !== undefined) {
      return safeNumber(velocity.groundspeed, 0);
    }
    // Calculate from vx, vy if available
    const vx = safeNumber(velocity?.vx, 0);
    const vy = safeNumber(velocity?.vy, 0);
    return Math.sqrt(vx * vx + vy * vy);
  };

  // Get computed values
  const batteryRemaining = getBatteryRemaining();
  const satelliteCount = getSatelliteCount();
  const gpsFixType = getGPSFixType();

  return (
    <div className={`bg-slate-900 text-white h-full ${isPulsing ? 'ring-2 ring-cyan-500/50' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Live Telemetry</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-xs text-gray-500">● WS</span>
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            status?.armed ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}>
            {status?.armed ? '● Armed' : '○ Armed'}
            <span className="ml-1">{status?.armed ? 'YES' : 'NO'}</span>
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            status?.flying ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}>
            {status?.flying ? '● Flying' : '○ Flying'}
            <span className="ml-1">{status?.flying ? 'YES' : 'NO'}</span>
          </span>
          <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-700 text-gray-300">
            ● Mode <span className="ml-1">{getFlightMode()}</span>
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className={getDataFreshnessColor(lastUpdate)}>
            {formatTimeAgo(lastUpdate)}
          </div>
          <div className="flex items-center gap-2">
            {updateFrequency > 0 && (
              <div className="text-cyan-400 font-semibold">
                {updateFrequency} Hz
              </div>
            )}
            <div className="text-gray-500 text-[10px]">
              #{updateCount}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Position */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">POSITION</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">LATITUDE</div>
              <div className="text-white font-mono text-sm">
                {getPositionValue('lat').toFixed(6)} °
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">LONGITUDE</div>
              <div className="text-white font-mono text-sm">
                {getPositionValue('lon').toFixed(6)} °
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">ALTITUDE</div>
              <div className="text-white font-mono text-sm">
                {getPositionValue('alt').toFixed(1)} <span className="text-gray-500">m</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">HEADING</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.attitude?.yaw, 0).toFixed(1)} °
              </div>
            </div>
          </div>
        </div>

        {/* Attitude */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">ATTITUDE</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">ROLL</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.attitude?.roll, 0).toFixed(1)} °
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">PITCH</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.attitude?.pitch, 0).toFixed(1)} °
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">YAW</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.attitude?.yaw, 0).toFixed(1)} °
              </div>
            </div>
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">VELOCITY</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">GROUND SPD</div>
              <div className="text-white font-mono text-sm">
                {getGroundSpeed().toFixed(1)} <span className="text-gray-500">m/s</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">CLIMB</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.velocity?.vz, 0).toFixed(1)} <span className="text-gray-500">m/s</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">VZ</div>
              <div className="text-white font-mono text-sm">
                {safeNumber(telemetry?.velocity?.vz, 0).toFixed(1)} <span className="text-gray-500">m/s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">BATTERY</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-mono text-lg font-bold ${getBatteryColor(batteryRemaining)}`}>
                  {batteryRemaining.toFixed(0)}%
                </span>
                <span className="text-gray-400 text-xs">
                  {safeNumber(telemetry?.battery?.voltage, 0).toFixed(1)}V
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${getBatteryBarColor(batteryRemaining)}`}
                  style={{ width: `${Math.min(batteryRemaining, 100)}%` }}
                />
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {safeNumber(telemetry?.battery?.current, 0).toFixed(1)}A
              </div>
            </div>
          </div>
        </div>

        {/* GPS */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">GPS</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className={`font-mono text-sm font-bold ${getGPSFixColor(gpsFixType)}`}>
                  {getGPSFixString(gpsFixType)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">📡</span>
                <span className={`font-mono text-sm ${getGPSColor(satelliteCount)}`}>
                  {satelliteCount} sats
                </span>
              </div>
            </div>
            <div className="text-gray-400 text-xs">
              HDOP: {safeNumber(telemetry?.gps?.hdop, 0).toFixed(1)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TelemetryDisplay;