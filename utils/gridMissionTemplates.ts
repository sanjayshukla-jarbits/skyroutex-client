/**
 * Grid Mission Templates and Examples
 * Predefined configurations for common mission types
 */

import { GridMissionConfig, ObstacleZone, LatLngPoint } from '../types/gridMission';

// ============================================================================
// Border Surveillance Templates
// ============================================================================

/**
 * India-Nepal Border Surveillance (Lucknow-Kanpur Region)
 */
export const BORDER_SURVEILLANCE_NEPAL: GridMissionConfig = {
  name: 'India-Nepal Border Survey',
  surveyArea: {
    vertices: [
      { lat: 27.4728, lng: 80.3439 },
      { lat: 27.4928, lng: 80.3639 },
      { lat: 27.4928, lng: 80.4239 },
      { lat: 27.4728, lng: 80.4039 },
    ],
    name: 'Northern Border Sector',
    color: '#3b82f6',
  },
  altitude: 80,
  gridSpacing: 50,
  overlap: 0.6,
  gridAngle: 45,
  cameraAngle: 90,
  obstacles: [],
};

/**
 * India-Pakistan Border Surveillance (Western Region)
 */
export const BORDER_SURVEILLANCE_PAKISTAN: GridMissionConfig = {
  name: 'India-Pakistan Border Survey',
  surveyArea: {
    vertices: [
      { lat: 24.8607, lng: 70.6403 },
      { lat: 24.8807, lng: 70.6603 },
      { lat: 24.8807, lng: 70.7203 },
      { lat: 24.8607, lng: 70.7003 },
    ],
    name: 'Western Border Sector',
    color: '#ef4444',
  },
  altitude: 100,
  gridSpacing: 60,
  overlap: 0.5,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [],
};

// ============================================================================
// Urban Area Mapping Templates
// ============================================================================

/**
 * Lucknow City Center Mapping
 */
export const LUCKNOW_CITY_CENTER: GridMissionConfig = {
  name: 'Lucknow City Center Survey',
  surveyArea: {
    vertices: [
      { lat: 26.8467, lng: 80.9362 },
      { lat: 26.8567, lng: 80.9362 },
      { lat: 26.8567, lng: 80.9562 },
      { lat: 26.8467, lng: 80.9562 },
    ],
    name: 'City Center',
    color: '#10b981',
  },
  altitude: 60,
  gridSpacing: 20,
  overlap: 0.8,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [
    {
      id: 'lucknow-airport',
      name: 'Chaudhary Charan Singh Airport',
      type: 'circle',
      enabled: true,
      center: { lat: 26.7606, lng: 80.8893 },
      radius: 5000,
      color: '#ef4444',
      minAltitude: 0,
      maxAltitude: 150,
    },
  ],
};

/**
 * Kanpur Industrial Area Survey
 */
export const KANPUR_INDUSTRIAL: GridMissionConfig = {
  name: 'Kanpur Industrial Zone Survey',
  surveyArea: {
    vertices: [
      { lat: 26.4499, lng: 80.3219 },
      { lat: 26.4599, lng: 80.3219 },
      { lat: 26.4599, lng: 80.3419 },
      { lat: 26.4499, lng: 80.3419 },
    ],
    name: 'Industrial Zone',
    color: '#f59e0b',
  },
  altitude: 50,
  gridSpacing: 25,
  overlap: 0.7,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [],
};

// ============================================================================
// Agricultural Survey Templates
// ============================================================================

/**
 * Agricultural Field Survey
 */
export const AGRICULTURAL_SURVEY: GridMissionConfig = {
  name: 'Agricultural Field Survey',
  surveyArea: {
    vertices: [
      { lat: 26.8000, lng: 80.9000 },
      { lat: 26.8100, lng: 80.9000 },
      { lat: 26.8100, lng: 80.9200 },
      { lat: 26.8000, lng: 80.9200 },
    ],
    name: 'Farm Field',
    color: '#22c55e',
  },
  altitude: 40,
  gridSpacing: 15,
  overlap: 0.75,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [],
};

// ============================================================================
// Infrastructure Inspection Templates
// ============================================================================

/**
 * Highway Corridor Inspection
 */
export const HIGHWAY_CORRIDOR: GridMissionConfig = {
  name: 'Highway Corridor Inspection',
  surveyArea: {
    vertices: [
      { lat: 26.8467, lng: 80.9462 },
      { lat: 26.8567, lng: 80.9462 },
      { lat: 26.8667, lng: 80.9562 },
      { lat: 26.8567, lng: 80.9562 },
    ],
    name: 'Highway Corridor',
    color: '#6366f1',
  },
  altitude: 50,
  gridSpacing: 30,
  overlap: 0.7,
  gridAngle: 45,
  cameraAngle: 75,
  obstacles: [],
};

/**
 * Railway Track Inspection
 */
export const RAILWAY_INSPECTION: GridMissionConfig = {
  name: 'Railway Track Inspection',
  surveyArea: {
    vertices: [
      { lat: 26.8400, lng: 80.9400 },
      { lat: 26.8500, lng: 80.9400 },
      { lat: 26.8600, lng: 80.9500 },
      { lat: 26.8500, lng: 80.9500 },
    ],
    name: 'Railway Corridor',
    color: '#8b5cf6',
  },
  altitude: 35,
  gridSpacing: 20,
  overlap: 0.8,
  gridAngle: 30,
  cameraAngle: 80,
  obstacles: [],
};

// ============================================================================
// Coastal Surveillance Templates
// ============================================================================

/**
 * Coastal Area Surveillance
 */
export const COASTAL_SURVEILLANCE: GridMissionConfig = {
  name: 'Coastal Area Surveillance',
  surveyArea: {
    vertices: [
      { lat: 8.7284, lng: 77.7596 },
      { lat: 8.7384, lng: 77.7596 },
      { lat: 8.7384, lng: 77.7796 },
      { lat: 8.7284, lng: 77.7796 },
    ],
    name: 'Coastal Zone',
    color: '#14b8a6',
  },
  altitude: 70,
  gridSpacing: 40,
  overlap: 0.6,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [],
};

// ============================================================================
// Emergency Response Templates
// ============================================================================

/**
 * Disaster Assessment Survey
 */
export const DISASTER_ASSESSMENT: GridMissionConfig = {
  name: 'Disaster Assessment Survey',
  surveyArea: {
    vertices: [
      { lat: 26.8467, lng: 80.9462 },
      { lat: 26.8567, lng: 80.9462 },
      { lat: 26.8567, lng: 80.9662 },
      { lat: 26.8467, lng: 80.9662 },
    ],
    name: 'Affected Area',
    color: '#dc2626',
  },
  altitude: 45,
  gridSpacing: 15,
  overlap: 0.85,
  gridAngle: 0,
  cameraAngle: 90,
  obstacles: [],
};

// ============================================================================
// Common Obstacle Presets
// ============================================================================

export const COMMON_OBSTACLES: Record<string, ObstacleZone> = {
  AIRPORT_5KM: {
    id: 'airport-5km',
    name: 'Airport Restricted Zone (5km)',
    type: 'circle',
    enabled: true,
    center: { lat: 0, lng: 0 }, // Set based on actual airport
    radius: 5000,
    color: '#ef4444',
    minAltitude: 0,
    maxAltitude: 150,
  },
  
  MILITARY_BASE: {
    id: 'military-base',
    name: 'Military Installation',
    type: 'polygon',
    enabled: true,
    vertices: [],
    color: '#dc2626',
    minAltitude: 0,
    maxAltitude: 200,
  },
  
  POWER_LINES: {
    id: 'power-lines',
    name: 'High Voltage Power Lines',
    type: 'cylinder',
    enabled: true,
    center: { lat: 0, lng: 0 },
    radius: 100,
    color: '#f59e0b',
    minAltitude: 0,
    maxAltitude: 50,
  },
  
  RESIDENTIAL_AREA: {
    id: 'residential',
    name: 'Residential Area',
    type: 'polygon',
    enabled: true,
    vertices: [],
    color: '#fb923c',
    minAltitude: 0,
    maxAltitude: 60,
  },
  
  WATER_BODY: {
    id: 'water-body',
    name: 'Water Body / River',
    type: 'polygon',
    enabled: true,
    vertices: [],
    color: '#0ea5e9',
    minAltitude: 0,
    maxAltitude: 30,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all available templates
 */
export function getAllTemplates(): Record<string, GridMissionConfig> {
  return {
    BORDER_SURVEILLANCE_NEPAL,
    BORDER_SURVEILLANCE_PAKISTAN,
    LUCKNOW_CITY_CENTER,
    KANPUR_INDUSTRIAL,
    AGRICULTURAL_SURVEY,
    HIGHWAY_CORRIDOR,
    RAILWAY_INSPECTION,
    COASTAL_SURVEILLANCE,
    DISASTER_ASSESSMENT,
  };
}

/**
 * Get template by name
 */
export function getTemplate(name: string): GridMissionConfig | undefined {
  const templates = getAllTemplates();
  return templates[name];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): GridMissionConfig[] {
  const templates = getAllTemplates();
  const categoryMap: Record<string, string[]> = {
    border: ['BORDER_SURVEILLANCE_NEPAL', 'BORDER_SURVEILLANCE_PAKISTAN'],
    urban: ['LUCKNOW_CITY_CENTER', 'KANPUR_INDUSTRIAL'],
    agriculture: ['AGRICULTURAL_SURVEY'],
    infrastructure: ['HIGHWAY_CORRIDOR', 'RAILWAY_INSPECTION'],
    coastal: ['COASTAL_SURVEILLANCE'],
    emergency: ['DISASTER_ASSESSMENT'],
  };

  const templateNames = categoryMap[category.toLowerCase()] || [];
  return templateNames.map(name => templates[name]).filter(Boolean);
}

/**
 * Create obstacle from preset with custom location
 */
export function createObstacleFromPreset(
  presetName: string,
  location: LatLngPoint | LatLngPoint[],
  customName?: string
): ObstacleZone | null {
  const preset = COMMON_OBSTACLES[presetName];
  if (!preset) return null;

  const obstacle = { ...preset };
  
  if (customName) {
    obstacle.name = customName;
  }

  if (Array.isArray(location)) {
    obstacle.vertices = location;
  } else {
    obstacle.center = location;
  }

  return obstacle;
}

/**
 * Adjust template for different region
 */
export function adjustTemplateForRegion(
  template: GridMissionConfig,
  centerPoint: LatLngPoint,
  scaleArea: number = 1.0
): GridMissionConfig {
  const adjusted = { ...template };
  
  // Calculate offset from original center
  const originalCenter = {
    lat: template.surveyArea.vertices.reduce((sum, v) => sum + v.lat, 0) / template.surveyArea.vertices.length,
    lng: template.surveyArea.vertices.reduce((sum, v) => sum + v.lng, 0) / template.surveyArea.vertices.length,
  };

  const latOffset = centerPoint.lat - originalCenter.lat;
  const lngOffset = centerPoint.lng - originalCenter.lng;

  // Adjust survey area vertices
  adjusted.surveyArea.vertices = template.surveyArea.vertices.map(v => ({
    lat: v.lat + latOffset,
    lng: v.lng + lngOffset,
  }));

  // Scale if needed
  if (scaleArea !== 1.0) {
    adjusted.surveyArea.vertices = adjusted.surveyArea.vertices.map(v => ({
      lat: centerPoint.lat + (v.lat - centerPoint.lat) * scaleArea,
      lng: centerPoint.lng + (v.lng - centerPoint.lng) * scaleArea,
    }));
  }

  // Adjust obstacles
  adjusted.obstacles = template.obstacles.map(obs => {
    const adjustedObs = { ...obs };
    
    if (adjustedObs.vertices) {
      adjustedObs.vertices = obs.vertices!.map(v => ({
        lat: v.lat + latOffset,
        lng: v.lng + lngOffset,
      }));
    }
    
    if (adjustedObs.center) {
      adjustedObs.center = {
        lat: obs.center!.lat + latOffset,
        lng: obs.center!.lng + lngOffset,
      };
    }
    
    return adjustedObs;
  });

  return adjusted;
}

/**
 * Example usage:
 * 
 * // Load a predefined template
 * const template = getTemplate('LUCKNOW_CITY_CENTER');
 * 
 * // Adjust for different location
 * const adjustedTemplate = adjustTemplateForRegion(
 *   template,
 *   { lat: 28.7041, lng: 77.1025 }, // Delhi
 *   1.5 // Scale 1.5x larger
 * );
 * 
 * // Add common obstacle
 * const airportObstacle = createObstacleFromPreset(
 *   'AIRPORT_5KM',
 *   { lat: 28.5562, lng: 77.1000 },
 *   'Indira Gandhi International Airport'
 * );
 */
