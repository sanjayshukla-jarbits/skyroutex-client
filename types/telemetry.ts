/**
 * Telemetry Types and Helper Functions
 * For drone telemetry display components
 */

// ============================================================================
// Position Types
// ============================================================================

export interface Position {
  lat: number;
  lon: number;
  alt: number;
}

// ============================================================================
// Telemetry Data Types
// ============================================================================

export interface TelemetryData {
  timestamp?: number;
  position?: Position;
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
    level?: number;
  };
  gps?: {
    satellites?: number;
    num_satellites?: number;
    satellites_visible?: number;
    fix_type: number;
    hdop?: number;
  };
  flight_mode?: string;
}

export interface FullTelemetry extends TelemetryData {
  armed?: boolean;
  mode?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  relative_altitude?: number;
  heading?: number;
  ground_speed?: number;
  air_speed?: number;
  climb_rate?: number;
  battery_voltage?: number;
  battery_current?: number;
  battery_remaining?: number;
  gps_fix?: number;
}

// ============================================================================
// Drone Status Types
// ============================================================================

export interface DroneStatus {
  connected: boolean;
  armed: boolean;
  flying: boolean;
  current_position: Position;
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
}

// ============================================================================
// Flight Path Types
// ============================================================================

export interface FlightPathPoint {
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get battery color based on remaining percentage
 */
export const getBatteryColor = (remaining: number): string => {
  if (remaining > 50) return 'text-green-400';
  if (remaining > 20) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get battery bar color for progress indicators
 */
export const getBatteryBarColor = (remaining: number): string => {
  if (remaining > 50) return 'bg-green-500';
  if (remaining > 20) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Get GPS status color based on satellite count
 */
export const getGPSStatusColor = (satellites: number): string => {
  if (satellites >= 8) return 'text-green-400';
  if (satellites >= 5) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get GPS color (alias for getGPSStatusColor)
 */
export const getGPSColor = getGPSStatusColor;

/**
 * Get GPS fix color based on fix type
 */
export const getGPSFixColor = (fixType: number): string => {
  if (fixType >= 3) return 'text-green-400';
  if (fixType === 2) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get GPS fix type as human-readable string
 */
export const getGPSFixString = (fixType: number): string => {
  if (fixType >= 3) return '3D FIX';
  if (fixType === 2) return '2D FIX';
  return 'NO FIX';
};

/**
 * Get detailed GPS fix type string
 */
export const getGPSFixTypeString = (fixType: number): string => {
  const fixTypes: Record<number, string> = {
    0: 'No GPS',
    1: 'No Fix',
    2: '2D Fix',
    3: '3D Fix',
    4: 'DGPS',
    5: 'RTK Float',
    6: 'RTK Fixed'
  };
  return fixTypes[fixType] ?? `Unknown (${fixType})`;
};

/**
 * Get connection status color
 */
export const getConnectionColor = (connected: boolean): string => {
  return connected ? 'text-green-400' : 'text-red-400';
};

/**
 * Get armed status color
 */
export const getArmedColor = (armed: boolean): string => {
  return armed ? 'text-yellow-400' : 'text-gray-400';
};

/**
 * Get flying status color
 */
export const getFlyingColor = (flying: boolean): string => {
  return flying ? 'text-green-400' : 'text-gray-400';
};

// ============================================================================
// GPS Fix Type Enum
// ============================================================================

export enum GPSFixType {
  NO_GPS = 0,
  NO_FIX = 1,
  FIX_2D = 2,
  FIX_3D = 3,
  DGPS = 4,
  RTK_FLOAT = 5,
  RTK_FIXED = 6
}

// ============================================================================
// Flight Mode Enum
// ============================================================================

export enum FlightMode {
  MANUAL = 'MANUAL',
  HOLD = 'HOLD',
  AUTO = 'AUTO',
  RTL = 'RTL',
  LAND = 'LAND',
  OFFBOARD = 'OFFBOARD',
  GUIDED = 'GUIDED',
  STABILIZED = 'STABILIZED',
  ACRO = 'ACRO',
  ALTCTL = 'ALTCTL',
  POSCTL = 'POSCTL'
}