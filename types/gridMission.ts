/**
 * Grid Mission Planning Types
 * TypeScript interfaces for planned grid missions with obstacles
 */

// ============================================================================
// Grid Mission Types
// ============================================================================

export interface GridMissionConfig {
  name: string;
  surveyArea: PolygonArea;
  altitude: number;
  gridSpacing: number;
  overlap: number;
  gridAngle: number;
  cameraAngle: number;
  obstacles: ObstacleZone[];
}

export interface PolygonArea {
  vertices: LatLngPoint[];
  name?: string;
  color?: string;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ObstacleZone {
  id: string;
  name: string;
  type: 'polygon' | 'circle' | 'cylinder';
  enabled: boolean;
  color?: string;
  // For polygon obstacles
  vertices?: LatLngPoint[];
  // For circular/cylindrical obstacles
  center?: LatLngPoint;
  radius?: number; // in meters
  // Altitude constraints
  minAltitude?: number;
  maxAltitude?: number;
}

export interface GridWaypoint {
  lat: number;
  lng: number;
  altitude: number;
  sequence: number;
  isValid: boolean; // false if inside obstacle
  gridLineIndex?: number;
  pointType: 'turn' | 'straight' | 'boundary';
}

export interface GridLine {
  startPoint: LatLngPoint;
  endPoint: LatLngPoint;
  waypoints: GridWaypoint[];
  lineIndex: number;
  direction: 'forward' | 'backward';
}

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

export interface GridMissionStats {
  totalWaypoints: number;
  validWaypoints: number;
  obstacleWaypoints: number;
  totalDistance: number;
  estimatedFlightTime: number;
  estimatedBatteryUsage: number;
  gridLines: number;
  coverageArea: number; // in square meters
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateGridMissionRequest {
  name: string;
  polygon: [number, number][]; // [lat, lng] tuples
  altitude: number;
  grid_spacing: number;
  overlap: number;
  grid_angle?: number;
  camera_angle?: number;
  obstacles?: ObstacleZone[];
}

export interface GridMissionResponse {
  success: boolean;
  message: string;
  data: {
    mission_id: string;
    waypoint_count: number;
    waypoints: Array<{
      lat: number;
      lon: number;
      alt: number;
      sequence?: number;
    }>;
    grid_lines?: number;
    coverage_area?: number;
  };
}

export interface GeofenceCreateRequest {
  name: string;
  fence_type: 'inclusion' | 'exclusion';
  shape: 'polygon' | 'circle' | 'cylinder';
  enabled: boolean;
  // For polygon
  vertices?: [number, number][]; // [lat, lng]
  // For circle/cylinder
  center_lat?: number;
  center_lon?: number;
  radius?: number; // meters
  // Altitude constraints
  min_altitude?: number;
  max_altitude?: number;
}

export interface GeofenceResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
  };
}

// ============================================================================
// Visualization Types
// ============================================================================

export interface GridVisualization {
  surveyAreaPolygon: LatLngPoint[];
  gridLines: Array<{
    start: LatLngPoint;
    end: LatLngPoint;
    color: string;
  }>;
  waypoints: Array<{
    position: LatLngPoint;
    sequence: number;
    valid: boolean;
    color: string;
  }>;
  obstacles: Array<{
    id: string;
    shape: 'polygon' | 'circle';
    vertices?: LatLngPoint[];
    center?: LatLngPoint;
    radius?: number;
    color: string;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GridParameters {
  spacing: number; // meters
  angle: number; // degrees from north
  overlap: number; // percentage (0-1)
  altitude: number; // meters
}
