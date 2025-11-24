/**
 * Grid Mission Types and Interfaces
 * Complete type definitions for grid mission planning
 */

// ============================================================================
// Basic Types
// ============================================================================

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface Position {
  lat: number;
  lon: number;
  alt: number;
}

// ============================================================================
// Grid Mission Configuration
// ============================================================================

export interface SurveyArea {
  vertices: LatLngPoint[];
  name: string;
  color: string;
}

export interface ObstacleZone {
  id: string;
  name: string;
  type: 'polygon' | 'circle';
  enabled: boolean;
  vertices: LatLngPoint[];
  center?: LatLngPoint;
  radius?: number;
  color: string;
  minAltitude: number;
  maxAltitude: number;
}

export interface GridMissionConfig {
  name: string;
  surveyArea: SurveyArea;
  altitude: number;
  gridSpacing: number;
  overlap: number;
  gridAngle: number;
  cameraAngle: number;
  obstacles: ObstacleZone[];
}

// ============================================================================
// Waypoints
// ============================================================================

export interface GridWaypoint {
  sequence: number;
  position: Position;
  lineIndex: number;
  isValid: boolean;
  isBlocked?: boolean;
  blockingObstacle?: string;
}

export interface GridLine {
  lineIndex: number;
  waypoints: GridWaypoint[];
  direction: 'forward' | 'backward';
}

// ============================================================================
// Mission Statistics
// ============================================================================

export interface GridMissionStats {
  totalWaypoints: number;
  validWaypoints: number;
  obstacleWaypoints: number;
  totalDistance: number;
  estimatedFlightTime: number;
  estimatedBatteryUsage: number;
  gridLines: number;
  coverageArea: number;
}

// ============================================================================
// Complete Mission Plan
// ============================================================================

export interface GridMissionPlan {
  id: string;
  name: string;
  config: GridMissionConfig;
  gridLines: GridLine[];
  allWaypoints: GridWaypoint[];
  validWaypoints: GridWaypoint[];
  stats: GridMissionStats;
  createdAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateGridMissionRequest {
  name: string;
  polygon: [number, number][];
  altitude: number;
  grid_spacing: number;
  overlap: number;
  grid_angle?: number;
  camera_angle?: number;
}

export interface GridMissionResponse {
  success: boolean;
  message: string;
  data?: {
    mission_id: string;
    waypoint_count: number;
    waypoints?: any[];
  };
}

export interface GeofenceCreateRequest {
  name: string;
  type: 'inclusion' | 'exclusion';
  vertices: [number, number][];
  min_altitude?: number;
  max_altitude?: number;
}

export interface GeofenceResponse {
  success: boolean;
  message: string;
  data?: {
    geofence_id: string;
  };
}

// ============================================================================
// Database Mission Types
// ============================================================================

export interface MissionWaypoint {
  id: string;
  label: string;
  coords: string;
  alt: string;
  color: string;
  lat: number;
  lon: number;
  altitude: number;
  sequence: number;
}

export interface MissionStats {
  total_distance: number;
  flight_time: number;
  battery_usage: number;
}

export interface MissionCorridor {
  value: string;
  label: string;
  color: string;
  description: string;
}

export interface DatabaseMission {
  mission_name: string;
  mission_type: string;
  corridor: MissionCorridor;
  mission_stats: MissionStats;
  waypoints: MissionWaypoint[];
  created_by: string;
  notes: string;
  vehicle_id: string;
  operator_id: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
}

// ============================================================================
// Telemetry Types
// ============================================================================

export interface TelemetryData {
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

export interface DroneStatus {
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
// WebSocket Message Types
// ============================================================================

export interface WebSocketMessage {
  type: 'telemetry_update' | 'status_update' | 'mission_complete' | 'error' | 'connection_info' | 'pong';
  timestamp?: string;
  data?: any;
  message?: string;
}

export interface WebSocketSubscribeMessage {
  action: 'subscribe' | 'unsubscribe';
  mission_id?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MissionStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GridGenerationOptions {
  surveyArea: LatLngPoint[];
  altitude: number;
  gridSpacing: number;
  overlap: number;
  gridAngle: number;
  obstacles: ObstacleZone[];
}