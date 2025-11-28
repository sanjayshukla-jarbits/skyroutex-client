/**
 * KafkaTelemetryPanel Component
 * =============================
 * React component for displaying real-time Kafka telemetry data.
 * 
 * Usage:
 *   <KafkaTelemetryPanel vehicleId="vehicle-1" />
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useKafkaTelemetry, useVehicleTelemetry } from '../hooks/useKafkaTelemetry';
import { TelemetryData } from '../types/kafka.types';

// =============================================================================
// Connection Status Badge
// =============================================================================

interface ConnectionBadgeProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ 
  isConnected, 
  isReconnecting 
}) => {
  if (isReconnecting) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
        Reconnecting...
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isConnected 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`}></span>
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  );
};

// =============================================================================
// Telemetry Value Display
// =============================================================================

interface TelemetryValueProps {
  label: string;
  value: string | number | undefined | null;
  unit?: string;
  precision?: number;
}

const TelemetryValue: React.FC<TelemetryValueProps> = ({
  label,
  value,
  unit = '',
  precision = 2,
}) => {
  const displayValue = useMemo(() => {
    if (value === undefined || value === null) return '--';
    if (typeof value === 'number') {
      return value.toFixed(precision);
    }
    return value;
  }, [value, precision]);

  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-mono text-sm">
        {displayValue}
        {unit && <span className="text-gray-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
};

// =============================================================================
// Position Panel
// =============================================================================

interface PositionPanelProps {
  position?: TelemetryData['position'];
}

const PositionPanel: React.FC<PositionPanelProps> = ({ position }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
      📍 Position
    </h4>
    <TelemetryValue label="Latitude" value={position?.lat} unit="°" precision={6} />
    <TelemetryValue label="Longitude" value={position?.lon} unit="°" precision={6} />
    <TelemetryValue label="Altitude" value={position?.alt} unit="m" precision={1} />
  </div>
);

// =============================================================================
// Attitude Panel
// =============================================================================

interface AttitudePanelProps {
  attitude?: TelemetryData['attitude'];
}

const AttitudePanel: React.FC<AttitudePanelProps> = ({ attitude }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
      🧭 Attitude
    </h4>
    <TelemetryValue label="Roll" value={attitude?.roll} unit="°" precision={1} />
    <TelemetryValue label="Pitch" value={attitude?.pitch} unit="°" precision={1} />
    <TelemetryValue label="Yaw" value={attitude?.yaw} unit="°" precision={1} />
  </div>
);

// =============================================================================
// Velocity Panel
// =============================================================================

interface VelocityPanelProps {
  velocity?: TelemetryData['velocity'];
}

const VelocityPanel: React.FC<VelocityPanelProps> = ({ velocity }) => {
  const groundspeed = useMemo(() => {
    if (!velocity) return null;
    return Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2);
  }, [velocity]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        🚀 Velocity
      </h4>
      <TelemetryValue label="Ground Speed" value={groundspeed} unit="m/s" precision={1} />
      <TelemetryValue label="Vertical Speed" value={velocity?.vz} unit="m/s" precision={1} />
      <TelemetryValue label="Vx" value={velocity?.vx} unit="m/s" precision={1} />
      <TelemetryValue label="Vy" value={velocity?.vy} unit="m/s" precision={1} />
    </div>
  );
};

// =============================================================================
// Battery Panel
// =============================================================================

interface BatteryPanelProps {
  battery?: TelemetryData['battery'];
}

const BatteryPanel: React.FC<BatteryPanelProps> = ({ battery }) => {
  const batteryColor = useMemo(() => {
    if (!battery?.remaining) return 'bg-gray-300';
    if (battery.remaining > 50) return 'bg-green-500';
    if (battery.remaining > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [battery?.remaining]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        🔋 Battery
      </h4>
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Remaining</span>
          <span>{battery?.remaining?.toFixed(0) || '--'}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${batteryColor} transition-all`}
            style={{ width: `${battery?.remaining || 0}%` }}
          ></div>
        </div>
      </div>
      <TelemetryValue label="Voltage" value={battery?.voltage} unit="V" precision={2} />
      <TelemetryValue label="Current" value={battery?.current} unit="A" precision={1} />
    </div>
  );
};

// =============================================================================
// GPS Panel
// =============================================================================

interface GPSPanelProps {
  gps?: TelemetryData['gps'];
}

const GPSPanel: React.FC<GPSPanelProps> = ({ gps }) => {
  const fixTypeLabel = useMemo(() => {
    switch (gps?.fix_type) {
      case 0: return 'No Fix';
      case 1: return 'No Fix';
      case 2: return '2D Fix';
      case 3: return '3D Fix';
      case 4: return 'DGPS';
      case 5: return 'RTK Float';
      case 6: return 'RTK Fixed';
      default: return 'Unknown';
    }
  }, [gps?.fix_type]);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        📡 GPS
      </h4>
      <TelemetryValue label="Fix Type" value={fixTypeLabel} />
      <TelemetryValue label="Satellites" value={gps?.satellites_visible} />
      <TelemetryValue label="HDOP" value={gps?.hdop} precision={1} />
    </div>
  );
};

// =============================================================================
// Stats Panel
// =============================================================================

interface StatsPanelProps {
  messageCount: number;
  messagesPerSecond: number;
  lastUpdate: Date | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({
  messageCount,
  messagesPerSecond,
  lastUpdate,
}) => {
  const timeAgo = useMemo(() => {
    if (!lastUpdate) return 'Never';
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 1) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdate]);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
      <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
        📊 Statistics
      </h4>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{messageCount}</div>
          <div className="text-xs text-gray-500">Messages</div>
        </div>
        <div>
          <div className="text-lg font-bold text-cyan-600">{messagesPerSecond}</div>
          <div className="text-xs text-gray-500">Hz</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-600">{timeAgo}</div>
          <div className="text-xs text-gray-500">Last Update</div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main KafkaTelemetryPanel Component
// =============================================================================

export interface KafkaTelemetryPanelProps {
  vehicleId?: string;
  showStats?: boolean;
  className?: string;
}

export const KafkaTelemetryPanel: React.FC<KafkaTelemetryPanelProps> = ({
  vehicleId,
  showStats = true,
  className = '',
}) => {
  const { telemetry, isConnected, isReconnecting, stats, connect, disconnect } = 
    useKafkaTelemetry({ vehicleId });

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">
              {vehicleId ? `Vehicle: ${vehicleId}` : 'Kafka Telemetry'}
            </h3>
            <p className="text-blue-100 text-xs">Real-time drone data</p>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge isConnected={isConnected} isReconnecting={isReconnecting} />
            <button
              onClick={isConnected ? disconnect : connect}
              className={`px-3 py-1 rounded text-xs font-medium ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {telemetry ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PositionPanel position={telemetry.position} />
              <AttitudePanel attitude={telemetry.attitude} />
              <VelocityPanel velocity={telemetry.velocity} />
              <BatteryPanel battery={telemetry.battery} />
            </div>
            <GPSPanel gps={telemetry.gps} />
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {isConnected ? (
              <p>Waiting for telemetry data...</p>
            ) : (
              <p>Connect to receive telemetry</p>
            )}
          </div>
        )}

        {showStats && (
          <StatsPanel
            messageCount={stats.messageCount}
            messagesPerSecond={stats.messagesPerSecond}
            lastUpdate={stats.lastUpdateTime}
          />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Compact Telemetry Display
// =============================================================================

export interface CompactTelemetryProps {
  vehicleId: string;
  className?: string;
}

export const CompactTelemetry: React.FC<CompactTelemetryProps> = ({
  vehicleId,
  className = '',
}) => {
  const { position, attitude, battery, isConnected } = useVehicleTelemetry(vehicleId);

  if (!isConnected) {
    return (
      <div className={`bg-gray-800 rounded-lg p-2 text-center text-gray-500 ${className}`}>
        Disconnected
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{vehicleId}</span>
        <span className={`px-1.5 py-0.5 rounded ${
          battery && battery.remaining > 20 ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {battery?.remaining.toFixed(0)}%
        </span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-300">
        <span>Alt: {position?.alt.toFixed(1)}m</span>
        <span>Yaw: {attitude?.yaw.toFixed(0)}°</span>
        <span>🔋 {battery?.voltage.toFixed(1)}V</span>
      </div>
    </div>
  );
};

export default KafkaTelemetryPanel;