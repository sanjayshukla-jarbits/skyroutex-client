import React from 'react';

interface TelemetryDisplayProps {
  telemetry: any;
  status: any;
  wsConnected: boolean;
  lastUpdate?: number;
  updateFrequency?: number;
  isPulsing?: boolean;
}

export const TelemetryDisplay: React.FC<TelemetryDisplayProps> = ({
  telemetry,
  status,
  wsConnected,
  lastUpdate,
  updateFrequency = 0,
  isPulsing = false
}) => {
  
  // Helper function to format time ago
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

  // Helper to get data freshness color
  const getDataFreshnessColor = (timestamp?: number): string => {
    if (!timestamp) return 'text-gray-400';
    const ageMs = Date.now() - timestamp;
    
    if (ageMs < 1000) return 'text-green-400';      // < 1s - Fresh
    if (ageMs < 3000) return 'text-yellow-400';     // < 3s - Acceptable  
    if (ageMs < 10000) return 'text-orange-400';    // < 10s - Stale
    return 'text-red-400';                           // > 10s - Very stale
  };

  return (
    <div className={`absolute top-4 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg border ${
      isPulsing ? 'border-green-500 shadow-lg shadow-green-500/50' : 'border-gray-700'
    } w-[380px] max-h-[calc(100vh-120px)] overflow-y-auto z-[1000] shadow-2xl transition-all duration-200`}>
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Live Telemetry</h3>
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <span className={`text-xs flex items-center gap-1 ${
              status?.connected ? 'text-green-400' : 'text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status?.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></span>
              {status?.connected ? 'Connected' : 'Disconnected'}
            </span>
            {wsConnected && (
              <span className="text-xs text-blue-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                WebSocket
              </span>
            )}
          </div>
        </div>
        
        {/* Real-time Update Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className={getDataFreshnessColor(lastUpdate)}>
            {formatTimeAgo(lastUpdate)}
          </div>
          {updateFrequency > 0 && (
            <div className="text-cyan-400 font-semibold">
              {updateFrequency} Hz
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Data */}
      <div className="p-4 space-y-4">
        
        {/* Flight Status Section */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Flight Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Status:</span>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  status?.armed ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.armed ? 'ARMED' : 'DISARMED'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  status?.flying ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {status?.flying ? 'FLYING' : 'LANDED'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Mode:</span>
              <span className="text-blue-400 font-mono text-sm font-semibold">
                {telemetry?.flight_mode ?? status?.flight_mode ?? 'N/A'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Mission:</span>
              <div className="flex flex-col">
                <span className={`text-xs ${status?.mission_active ? 'text-green-400' : 'text-gray-500'}`}>
                  {status?.mission_active ? 'Active' : 'Inactive'}
                </span>
                {status?.mission_active && (
                  <span className="text-xs text-gray-400">
                    WP: {status?.mission_current}/{status?.mission_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Position Section - CORRECTED FIELD NAMES */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Position</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Latitude:</span>
              <span className="text-white font-mono text-xs">
                {(telemetry?.position?.lat ?? status?.current_position?.lat ?? 0).toFixed(7)}°
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Longitude:</span>
              <span className="text-white font-mono text-xs">
                {(telemetry?.position?.lon ?? status?.current_position?.lon ?? 0).toFixed(7)}°
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Altitude:</span>
              <span className="text-white font-mono text-xs">
                {(telemetry?.position?.alt ?? status?.current_position?.alt ?? 0).toFixed(2)} m
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-16">Rel Alt:</span>
              <span className="text-white font-mono text-xs">
                {(telemetry?.position?.relative_alt ?? telemetry?.position?.alt ?? 0).toFixed(2)} m
              </span>
            </div>
          </div>
        </div>

        {/* Velocity Section - CORRECTED FIELD NAMES */}
        {telemetry?.velocity && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Velocity</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">VX (North):</span>
                <span className="text-white font-mono text-xs">
                  {(telemetry.velocity.vx ?? 0).toFixed(2)} m/s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">VY (East):</span>
                <span className="text-white font-mono text-xs">
                  {(telemetry.velocity.vy ?? 0).toFixed(2)} m/s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">VZ (Down):</span>
                <span className="text-white font-mono text-xs">
                  {(telemetry.velocity.vz ?? 0).toFixed(2)} m/s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">Ground:</span>
                <span className="text-cyan-400 font-mono text-xs font-semibold">
                  {Math.sqrt(
                    Math.pow(telemetry.velocity.vx ?? 0, 2) + 
                    Math.pow(telemetry.velocity.vy ?? 0, 2)
                  ).toFixed(2)} m/s
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Attitude Section */}
        {telemetry?.attitude && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Attitude</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">Roll:</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.abs((telemetry.attitude.roll ?? 0) * 180 / Math.PI) / 90 * 100)}%`,
                        marginLeft: (telemetry.attitude.roll ?? 0) < 0 ? '0' : 'auto'
                      }}
                    />
                  </div>
                  <span className="text-white font-mono text-xs w-14 text-right">
                    {((telemetry.attitude.roll ?? 0) * 180 / Math.PI).toFixed(1)}°
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">Pitch:</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.abs((telemetry.attitude.pitch ?? 0) * 180 / Math.PI) / 90 * 100)}%`,
                        marginLeft: (telemetry.attitude.pitch ?? 0) < 0 ? '0' : 'auto'
                      }}
                    />
                  </div>
                  <span className="text-white font-mono text-xs w-14 text-right">
                    {((telemetry.attitude.pitch ?? 0) * 180 / Math.PI).toFixed(1)}°
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-16">Yaw:</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.abs(((telemetry.attitude.yaw ?? 0) * 180 / Math.PI + 360) % 360) / 360 * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-white font-mono text-xs w-14 text-right">
                    {(((telemetry.attitude.yaw ?? 0) * 180 / Math.PI + 360) % 360).toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Battery Section */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Battery</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (telemetry?.battery?.remaining ?? status?.battery_level ?? 0) > 50
                    ? 'bg-green-500'
                    : (telemetry?.battery?.remaining ?? status?.battery_level ?? 0) > 20
                    ? 'bg-yellow-500'
                    : 'bg-red-500 animate-pulse'
                  }`}
                  style={{ width: `${telemetry?.battery?.remaining ?? status?.battery_level ?? 0}%` }}
                />
              </div>
              <span className="text-white font-bold min-w-[50px] text-right">
                {(telemetry?.battery?.remaining ?? status?.battery_level ?? 0).toFixed(0)}%
              </span>
            </div>
            
            {telemetry?.battery && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Voltage:</span>
                  <span className="text-white font-mono">
                    {(telemetry.battery.voltage ?? 0).toFixed(2)}V
                  </span>
                </div>
                {telemetry.battery.current !== undefined && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Current:</span>
                    <span className="text-white font-mono">
                      {(telemetry.battery.current ?? 0).toFixed(2)}A
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* GPS Section - CORRECTED FIELD NAMES */}
        {(telemetry?.gps || status?.sensors?.gps) && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">GPS</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-20">Satellites:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    (telemetry?.gps?.satellites ?? status?.sensors?.gps?.satellites ?? 0) >= 8
                    ? 'text-green-400'
                    : (telemetry?.gps?.satellites ?? status?.sensors?.gps?.satellites ?? 0) >= 6
                    ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {telemetry?.gps?.satellites ?? status?.sensors?.gps?.satellites ?? 0}
                  </span>
                  <span className="text-gray-500 text-xs">/</span>
                  <span className="text-gray-400 text-xs">
                    {(telemetry?.gps?.satellites ?? status?.sensors?.gps?.satellites ?? 0) >= 8 ? 'Good' : 'Poor'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-20">Fix Type:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  (telemetry?.gps?.fix_type ?? 0) === 3 
                  ? 'bg-green-600 text-white'
                  : (telemetry?.gps?.fix_type ?? 0) === 2
                  ? 'bg-yellow-600 text-white'
                  : 'bg-red-600 text-white'
                }`}>
                  {(telemetry?.gps?.fix_type ?? 0) === 3 ? '3D FIX' : 
                   (telemetry?.gps?.fix_type ?? 0) === 2 ? '2D FIX' : 'NO FIX'}
                </span>
              </div>
              {(telemetry?.gps?.hdop !== undefined || status?.sensors?.gps?.hdop !== undefined) && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20">HDOP:</span>
                  <span className="text-white font-mono text-xs">
                    {(telemetry?.gps?.hdop ?? status?.sensors?.gps?.hdop ?? 0).toFixed(2)}
                  </span>
                </div>
              )}
              {status?.sensors?.gps?.vdop !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20">VDOP:</span>
                  <span className="text-white font-mono text-xs">
                    {(status.sensors.gps.vdop ?? 0).toFixed(2)}
                  </span>
                </div>
              )}
              {status?.sensors?.gps?.status && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20">Status:</span>
                  <span className="text-green-400 text-xs font-semibold">
                    {status.sensors.gps.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Geofence Section */}
        {status?.geofence_violation !== undefined && (
          <div className={`rounded-lg p-3 border ${
            status?.geofence_violation 
            ? 'bg-red-900/30 border-red-600'
            : 'bg-green-900/30 border-green-600'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                status?.geofence_violation ? 'bg-red-500 animate-pulse' : 'bg-green-500'
              }`}></span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">Geofence</h4>
                <span className={`text-xs ${
                  status?.geofence_violation ? 'text-red-300' : 'text-green-300'
                }`}>
                  {status?.geofence_message ?? 'Safe'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Info Section */}
        {status?.vehicle_info && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Vehicle Info</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-20">Type:</span>
                <span className="text-white capitalize">
                  {status.vehicle_info.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-20">Autopilot:</span>
                <span className="text-white">
                  {status.vehicle_info.autopilot}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-20">System ID:</span>
                <span className="text-white font-mono">
                  {status.vehicle_info.system_id}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Camera Section (if available) */}
        {status?.sensors?.camera && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Camera</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-20">Status:</span>
                <span className={`px-2 py-0.5 rounded ${
                  status.sensors.camera.recording 
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-400'
                }`}>
                  {status.sensors.camera.recording ? 'Recording' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-20">Photos:</span>
                <span className="text-white">
                  {status.sensors.camera.photo_count}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TelemetryDisplay;