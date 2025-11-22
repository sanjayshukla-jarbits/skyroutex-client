/**
 * Grid Mission Utilities
 * Helper functions for grid generation, obstacle checking, and coordinate math
 */

import {
  LatLngPoint,
  GridWaypoint,
  GridLine,
  ObstacleZone,
  BoundingBox,
  GridParameters,
  GridMissionConfig,
} from '../types/gridMission';

// ============================================================================
// Coordinate Math Utilities
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate new point given start point, distance, and bearing
 * @param lat Starting latitude
 * @param lng Starting longitude
 * @param distance Distance in meters
 * @param bearing Bearing in degrees (0 = North, 90 = East)
 * @returns New point
 */
export function calculateDestination(
  lat: number,
  lng: number,
  distance: number,
  bearing: number
): LatLngPoint {
  const R = 6371000; // Earth radius in meters
  const δ = distance / R; // Angular distance
  const θ = (bearing * Math.PI) / 180; // Bearing in radians

  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (λ2 * 180) / Math.PI,
  };
}

/**
 * Calculate bearing between two points
 * @returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Calculate bounding box for polygon
 */
export function calculateBoundingBox(vertices: LatLngPoint[]): BoundingBox {
  const lats = vertices.map((v) => v.lat);
  const lngs = vertices.map((v) => v.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Convert meters to degrees latitude (approximately)
 */
export function metersToDegreesLat(meters: number): number {
  return meters / 111000; // 1 degree lat ≈ 111km
}

/**
 * Convert meters to degrees longitude at given latitude
 */
export function metersToDegreesLng(meters: number, latitude: number): number {
  return meters / (111000 * Math.cos((latitude * Math.PI) / 180));
}

// ============================================================================
// Point-in-Polygon Utilities
// ============================================================================

/**
 * Check if point is inside polygon using ray casting algorithm
 */
export function isPointInPolygon(
  point: LatLngPoint,
  polygon: LatLngPoint[]
): boolean {
  let inside = false;
  const { lat, lng } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if point is inside circular area
 */
export function isPointInCircle(
  point: LatLngPoint,
  center: LatLngPoint,
  radius: number
): boolean {
  const distance = haversineDistance(point.lat, point.lng, center.lat, center.lng);
  return distance <= radius;
}

/**
 * Check if point is inside any obstacle zone
 */
export function isPointInObstacle(
  point: LatLngPoint,
  altitude: number,
  obstacles: ObstacleZone[]
): boolean {
  for (const obstacle of obstacles) {
    if (!obstacle.enabled) continue;

    // Check altitude constraints
    if (obstacle.minAltitude !== undefined && altitude < obstacle.minAltitude) {
      continue;
    }
    if (obstacle.maxAltitude !== undefined && altitude > obstacle.maxAltitude) {
      continue;
    }

    // Check based on obstacle type
    if (obstacle.type === 'polygon' && obstacle.vertices) {
      if (isPointInPolygon(point, obstacle.vertices)) {
        return true;
      }
    } else if (
      (obstacle.type === 'circle' || obstacle.type === 'cylinder') &&
      obstacle.center &&
      obstacle.radius
    ) {
      if (isPointInCircle(point, obstacle.center, obstacle.radius)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// Grid Generation Functions
// ============================================================================

/**
 * Generate grid waypoints for survey mission
 */
export function generateGridWaypoints(
  config: GridMissionConfig
): { gridLines: GridLine[]; allWaypoints: GridWaypoint[] } {
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

      for (let i = 0; i < orderedIntersections.length; i += 2) {
        if (i + 1 >= orderedIntersections.length) break;

        const start = orderedIntersections[i];
        const end = orderedIntersections[i + 1];

        // Create waypoint at start
        const startValid = !isPointInObstacle(start, altitude, obstacles);
        lineWaypoints.push({
          lat: start.lat,
          lng: start.lng,
          altitude,
          sequence: waypointSequence++,
          isValid: startValid,
          gridLineIndex: lineIndex,
          pointType: 'turn',
        });

        // Create waypoint at end
        const endValid = !isPointInObstacle(end, altitude, obstacles);
        lineWaypoints.push({
          lat: end.lat,
          lng: end.lng,
          altitude,
          sequence: waypointSequence++,
          isValid: endValid,
          gridLineIndex: lineIndex,
          pointType: 'turn',
        });
      }

      if (lineWaypoints.length > 0) {
        gridLines.push({
          startPoint: lineWaypoints[0],
          endPoint: lineWaypoints[lineWaypoints.length - 1],
          waypoints: lineWaypoints,
          lineIndex,
          direction,
        });

        allWaypoints.push(...lineWaypoints);
      }
    }

    currentLat += latSpacing;
    lineIndex++;
    direction = direction === 'forward' ? 'backward' : 'forward';
  }

  return { gridLines, allWaypoints };
}

/**
 * Find intersection points between line and polygon
 * Simplified implementation - finds points where line crosses polygon boundary
 */
function findLinePolygonIntersections(
  lineStart: LatLngPoint,
  lineEnd: LatLngPoint,
  polygon: LatLngPoint[]
): LatLngPoint[] {
  const intersections: LatLngPoint[] = [];

  // Check each polygon edge
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const intersection = lineSegmentIntersection(lineStart, lineEnd, p1, p2);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  // Sort intersections along the line
  intersections.sort((a, b) => {
    const distA = haversineDistance(lineStart.lat, lineStart.lng, a.lat, a.lng);
    const distB = haversineDistance(lineStart.lat, lineStart.lng, b.lat, b.lng);
    return distA - distB;
  });

  return intersections;
}

/**
 * Find intersection point between two line segments
 */
function lineSegmentIntersection(
  line1Start: LatLngPoint,
  line1End: LatLngPoint,
  line2Start: LatLngPoint,
  line2End: LatLngPoint
): LatLngPoint | null {
  const x1 = line1Start.lng;
  const y1 = line1Start.lat;
  const x2 = line1End.lng;
  const y2 = line1End.lat;
  const x3 = line2Start.lng;
  const y3 = line2Start.lat;
  const x4 = line2End.lng;
  const y4 = line2End.lat;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0000001) {
    return null; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      lat: y1 + t * (y2 - y1),
      lng: x1 + t * (x2 - x1),
    };
  }

  return null;
}

// ============================================================================
// Mission Statistics
// ============================================================================

/**
 * Calculate total mission distance
 */
export function calculateTotalDistance(waypoints: GridWaypoint[]): number {
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i];
    const next = waypoints[i + 1];

    totalDistance += haversineDistance(
      current.lat,
      current.lng,
      next.lat,
      next.lng
    );
  }

  return totalDistance;
}

/**
 * Estimate flight time based on distance and speed
 */
export function estimateFlightTime(
  distance: number,
  averageSpeed: number = 10
): number {
  // distance in meters, speed in m/s
  return distance / averageSpeed; // returns seconds
}

/**
 * Estimate battery usage based on flight time
 */
export function estimateBatteryUsage(
  flightTime: number,
  batteryCapacity: number = 5400
): number {
  // Assume 20% battery per 10 minutes of flight
  const batteryPerSecond = 0.2 / 600;
  return Math.min(100, (flightTime * batteryPerSecond * 100));
}

/**
 * Calculate coverage area of polygon
 */
export function calculatePolygonArea(vertices: LatLngPoint[]): number {
  // Using shoelace formula (approximate for small areas)
  let area = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].lng * vertices[j].lat;
    area -= vertices[j].lng * vertices[i].lat;
  }

  area = Math.abs(area) / 2;

  // Convert to square meters (very approximate)
  const avgLat = vertices.reduce((sum, v) => sum + v.lat, 0) / n;
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLng = 111000 * Math.cos((avgLat * Math.PI) / 180);

  return area * metersPerDegreeLat * metersPerDegreeLng;
}
