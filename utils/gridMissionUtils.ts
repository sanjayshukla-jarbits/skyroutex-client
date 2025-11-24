/**
 * Grid Mission Utilities
 * Algorithms for grid generation, distance calculation, and obstacle detection
 */

import {
  GridMissionConfig,
  GridLine,
  GridWaypoint,
  LatLngPoint,
  ObstacleZone,
  BoundingBox,
  Position,
} from '@/types/gridMission';

// ============================================================================
// Constants
// ============================================================================

const EARTH_RADIUS_KM = 6371;
const AVERAGE_DRONE_SPEED_MS = 10; // 10 m/s typical cruise speed

// ============================================================================
// Geographic Calculations
// ============================================================================

/**
 * Convert meters to degrees latitude
 */
export function metersToDegreesLat(meters: number): number {
  return meters / 111320;
}

/**
 * Convert meters to degrees longitude at given latitude
 */
export function metersToDegreesLon(meters: number, latitude: number): number {
  return meters / (111320 * Math.cos((latitude * Math.PI) / 180));
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * 1000; // Return in meters
}

/**
 * Calculate destination point given distance and bearing
 */
export function calculateDestination(
  lat: number,
  lon: number,
  distance: number,
  bearing: number
): LatLngPoint {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const bearingRad = (bearing * Math.PI) / 180;
  const angularDistance = distance / EARTH_RADIUS_KM / 1000;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLonRad * 180) / Math.PI,
  };
}

// ============================================================================
// Bounding Box
// ============================================================================

/**
 * Calculate bounding box for a set of points
 */
export function calculateBoundingBox(points: LatLngPoint[]): BoundingBox {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  return {
    minLat: Math.min(...points.map((p) => p.lat)),
    maxLat: Math.max(...points.map((p) => p.lat)),
    minLng: Math.min(...points.map((p) => p.lng)),
    maxLng: Math.max(...points.map((p) => p.lng)),
  };
}

// ============================================================================
// Point-in-Polygon
// ============================================================================

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  let inside = false;
  const x = point.lat;
  const y = point.lng;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if point is in any obstacle zone
 */
export function isPointInObstacle(
  point: LatLngPoint,
  obstacles: ObstacleZone[]
): { blocked: boolean; obstacle?: string } {
  for (const obstacle of obstacles) {
    if (!obstacle.enabled) continue;

    if (obstacle.type === 'polygon') {
      if (isPointInPolygon(point, obstacle.vertices)) {
        return { blocked: true, obstacle: obstacle.name };
      }
    } else if (obstacle.type === 'circle' && obstacle.center && obstacle.radius) {
      const distance = calculateDistance(
        point.lat,
        point.lng,
        obstacle.center.lat,
        obstacle.center.lng
      );
      if (distance <= obstacle.radius) {
        return { blocked: true, obstacle: obstacle.name };
      }
    }
  }

  return { blocked: false };
}

// ============================================================================
// Line-Polygon Intersection
// ============================================================================

/**
 * Find intersection points between a line and polygon
 */
export function findLinePolygonIntersections(
  lineStart: LatLngPoint,
  lineEnd: LatLngPoint,
  polygon: LatLngPoint[]
): LatLngPoint[] {
  const intersections: LatLngPoint[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const intersection = getLineIntersection(lineStart, lineEnd, p1, p2);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  return intersections;
}

/**
 * Calculate intersection point of two line segments
 */
function getLineIntersection(
  p1: LatLngPoint,
  p2: LatLngPoint,
  p3: LatLngPoint,
  p4: LatLngPoint
): LatLngPoint | null {
  const x1 = p1.lat;
  const y1 = p1.lng;
  const x2 = p2.lat;
  const y2 = p2.lng;
  const x3 = p3.lat;
  const y3 = p3.lng;
  const x4 = p4.lat;
  const y4 = p4.lng;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      lat: x1 + t * (x2 - x1),
      lng: y1 + t * (y2 - y1),
    };
  }

  return null;
}

// ============================================================================
// Grid Generation
// ============================================================================

/**
 * Generate grid waypoints for survey mission
 */
export function generateGridWaypoints(config: GridMissionConfig): {
  gridLines: GridLine[];
  allWaypoints: GridWaypoint[];
} {
  const { surveyArea, altitude, gridSpacing, gridAngle, obstacles } = config;

  // Calculate bounding box
  const bbox = calculateBoundingBox(surveyArea.vertices);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;

  // Convert spacing to degrees
  const latSpacing = metersToDegreesLat(gridSpacing);

  // Generate grid lines
  const gridLines: GridLine[] = [];
  const allWaypoints: GridWaypoint[] = [];
  let waypointSequence = 0;

  // Calculate grid line angle (perpendicular to flight direction)
  const lineAngle = (gridAngle + 90) % 360;

  // Start from minimum latitude
  let currentLat = bbox.minLat;
  let lineIndex = 0;
  let direction: 'forward' | 'backward' = 'forward';

  while (currentLat <= bbox.maxLat) {
    // Calculate line endpoints
    const lineStart = calculateDestination(
      currentLat,
      bbox.minLng,
      5000, // Extend 5km in both directions
      lineAngle
    );
    const lineEnd = calculateDestination(
      currentLat,
      bbox.maxLng,
      5000,
      lineAngle + 180
    );

    // Find intersection points with survey area polygon
    const intersections = findLinePolygonIntersections(
      lineStart,
      lineEnd,
      surveyArea.vertices
    );

    if (intersections.length >= 2) {
      // Create waypoints along this line
      const lineWaypoints: GridWaypoint[] = [];

      // Alternate direction for efficiency (boustrophedon pattern)
      const orderedIntersections =
        direction === 'forward' ? intersections : intersections.reverse();

      const start = orderedIntersections[0];
      const end = orderedIntersections[intersections.length - 1];

      // Generate waypoints along the line
      const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
      const numPoints = Math.max(2, Math.ceil(distance / gridSpacing));

      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const lat = start.lat + t * (end.lat - start.lat);
        const lng = start.lng + t * (end.lng - start.lng);

        const point = { lat, lng };

        // Check if point is inside survey area
        const inArea = isPointInPolygon(point, surveyArea.vertices);

        // Check if point is blocked by obstacles
        const obstacleCheck = isPointInObstacle(point, obstacles);

        const waypoint: GridWaypoint = {
          sequence: waypointSequence++,
          position: {
            lat,
            lon: lng,
            alt: altitude,
          },
          lineIndex,
          isValid: inArea && !obstacleCheck.blocked,
          isBlocked: obstacleCheck.blocked,
          blockingObstacle: obstacleCheck.obstacle,
        };

        lineWaypoints.push(waypoint);
        allWaypoints.push(waypoint);
      }

      gridLines.push({
        lineIndex,
        waypoints: lineWaypoints,
        direction,
      });

      // Alternate direction for next line
      direction = direction === 'forward' ? 'backward' : 'forward';
      lineIndex++;
    }

    // Move to next line
    currentLat += latSpacing;
  }

  return { gridLines, allWaypoints };
}

// ============================================================================
// Statistics Calculations
// ============================================================================

/**
 * Calculate total distance of mission path
 */
export function calculateTotalDistance(waypoints: GridWaypoint[]): number {
  let totalDistance = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1].position;
    const curr = waypoints[i].position;
    totalDistance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
  }

  return totalDistance;
}

/**
 * Estimate flight time based on distance (in minutes)
 */
export function estimateFlightTime(distanceMeters: number): number {
  // Assuming average cruise speed of 10 m/s
  const timeSeconds = distanceMeters / AVERAGE_DRONE_SPEED_MS;
  return timeSeconds / 60; // Convert to minutes
}

/**
 * Estimate battery usage based on flight time
 */
export function estimateBatteryUsage(flightTimeMinutes: number): number {
  // Rough estimate: 1% battery per minute of flight
  // This should be calibrated based on actual drone performance
  const batteryPerMinute = 1.0;
  return Math.min(100, flightTimeMinutes * batteryPerMinute);
}

/**
 * Calculate area of polygon in square kilometers
 */
export function calculatePolygonArea(vertices: LatLngPoint[]): number {
  if (vertices.length < 3) return 0;

  let area = 0;

  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].lat * vertices[j].lng;
    area -= vertices[j].lat * vertices[i].lng;
  }

  area = Math.abs(area) / 2;

  // Convert from square degrees to square kilometers
  // Rough approximation: 1 degree ≈ 111 km at equator
  const kmPerDegree = 111;
  return area * kmPerDegree * kmPerDegree;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate grid mission configuration
 */
export function validateGridConfig(config: GridMissionConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.surveyArea.vertices.length < 3) {
    errors.push('Survey area must have at least 3 points');
  }

  if (config.altitude < 10 || config.altitude > 120) {
    errors.push('Altitude must be between 10 and 120 meters');
  }

  if (config.gridSpacing < 10 || config.gridSpacing > 100) {
    errors.push('Grid spacing must be between 10 and 100 meters');
  }

  if (config.overlap < 0 || config.overlap > 1) {
    errors.push('Overlap must be between 0 and 1');
  }

  if (config.name.trim().length === 0) {
    errors.push('Mission name is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if mission exceeds PX4 waypoint limit
 */
export function checkWaypointLimit(waypointCount: number): {
  valid: boolean;
  warning?: string;
} {
  const PX4_MAX_WAYPOINTS = 256;

  if (waypointCount > PX4_MAX_WAYPOINTS) {
    return {
      valid: false,
      warning: `Mission has ${waypointCount} waypoints, exceeding PX4 limit of ${PX4_MAX_WAYPOINTS}`,
    };
  }

  if (waypointCount > PX4_MAX_WAYPOINTS * 0.9) {
    return {
      valid: true,
      warning: `Mission has ${waypointCount} waypoints, approaching PX4 limit of ${PX4_MAX_WAYPOINTS}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Export All
// ============================================================================

export default {
  metersToDegreesLat,
  metersToDegreesLon,
  calculateDistance,
  calculateDestination,
  calculateBoundingBox,
  isPointInPolygon,
  isPointInObstacle,
  findLinePolygonIntersections,
  generateGridWaypoints,
  calculateTotalDistance,
  estimateFlightTime,
  estimateBatteryUsage,
  calculatePolygonArea,
  validateGridConfig,
  checkWaypointLimit,
};