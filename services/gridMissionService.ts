/**
 * Grid Mission API Service
 * Handles all API calls for grid mission creation and management
 */

import {
  CreateGridMissionRequest,
  GridMissionResponse,
  GeofenceCreateRequest,
  GeofenceResponse,
  ObstacleZone,
} from '../types/gridMission';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000';

// ============================================================================
// Grid Mission API
// ============================================================================

/**
 * Create a survey/grid mission on the backend
 */
export async function createGridMission(
  request: CreateGridMissionRequest
): Promise<GridMissionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/mission/survey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create grid mission');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating grid mission:', error);
    throw error;
  }
}

/**
 * Validate grid mission before creation
 */
export async function validateGridMission(waypoints: Array<{
  lat: number;
  lon: number;
  alt: number;
}>): Promise<{
  valid: boolean;
  message: string;
  data?: any;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/mission/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waypoints: waypoints.map(wp => ({
          lat: wp.lat,
          lon: wp.lon,
          alt: wp.alt,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        message: error.detail || 'Validation failed',
      };
    }

    const result = await response.json();
    return {
      valid: result.success,
      message: result.message,
      data: result.data,
    };
  } catch (error) {
    console.error('Error validating grid mission:', error);
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

/**
 * Upload grid mission to drone
 */
export async function uploadGridMission(missionId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/mission/upload_template/${missionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload mission');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading grid mission:', error);
    throw error;
  }
}

/**
 * Get mission template details
 */
export async function getMissionTemplate(missionId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/mission/template/${missionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get mission template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting mission template:', error);
    throw error;
  }
}

/**
 * List all mission templates
 */
export async function listMissionTemplates(): Promise<{
  success: boolean;
  message: string;
  data?: {
    templates: Array<{
      id: string;
      name: string;
      type: string;
      waypoint_count: number;
      created_at: string;
    }>;
  };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/mission/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list mission templates');
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing mission templates:', error);
    throw error;
  }
}

// ============================================================================
// Geofence/Obstacle API
// ============================================================================

/**
 * Create polygon geofence/obstacle
 */
export async function createPolygonGeofence(
  request: GeofenceCreateRequest
): Promise<GeofenceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/polygon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create polygon geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating polygon geofence:', error);
    throw error;
  }
}

/**
 * Create circular geofence/obstacle
 */
export async function createCircleGeofence(
  request: GeofenceCreateRequest
): Promise<GeofenceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/circle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create circle geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating circle geofence:', error);
    throw error;
  }
}

/**
 * Create cylindrical geofence/obstacle
 */
export async function createCylinderGeofence(
  request: GeofenceCreateRequest
): Promise<GeofenceResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/cylinder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create cylinder geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating cylinder geofence:', error);
    throw error;
  }
}

/**
 * List all geofences
 */
export async function listGeofences(): Promise<{
  success: boolean;
  message: string;
  data?: {
    geofences: Array<any>;
  };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to list geofences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing geofences:', error);
    throw error;
  }
}

/**
 * Delete geofence
 */
export async function deleteGeofence(fenceId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/${fenceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting geofence:', error);
    throw error;
  }
}

/**
 * Enable/disable geofence
 */
export async function toggleGeofence(
  fenceId: number,
  enabled: boolean
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/geofence/${fenceId}/enable?enabled=${enabled}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to toggle geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling geofence:', error);
    throw error;
  }
}

/**
 * Check if position violates any geofence
 */
export async function checkGeofenceViolation(
  lat: number,
  lon: number,
  alt: number
): Promise<{
  success: boolean;
  message: string;
  data?: {
    violated: boolean;
  };
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/geofence/check?lat=${lat}&lon=${lon}&alt=${alt}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check geofence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking geofence:', error);
    throw error;
  }
}

/**
 * Clear all geofences
 */
export async function clearAllGeofences(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/geofence/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to clear geofences');
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing geofences:', error);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert obstacles to geofence creation requests
 */
export async function syncObstaclesToBackend(
  obstacles: ObstacleZone[]
): Promise<void> {
  // Clear existing geofences first
  await clearAllGeofences();

  // Create new geofences for each obstacle
  for (const obstacle of obstacles) {
    if (!obstacle.enabled) continue;

    const baseRequest: GeofenceCreateRequest = {
      name: obstacle.name,
      fence_type: 'exclusion',
      shape: obstacle.type,
      enabled: true,
      min_altitude: obstacle.minAltitude,
      max_altitude: obstacle.maxAltitude,
    };

    try {
      if (obstacle.type === 'polygon' && obstacle.vertices) {
        await createPolygonGeofence({
          ...baseRequest,
          vertices: obstacle.vertices.map(v => [v.lat, v.lng]),
        });
      } else if (obstacle.type === 'circle' && obstacle.center && obstacle.radius) {
        await createCircleGeofence({
          ...baseRequest,
          center_lat: obstacle.center.lat,
          center_lon: obstacle.center.lng,
          radius: obstacle.radius,
        });
      } else if (obstacle.type === 'cylinder' && obstacle.center && obstacle.radius) {
        await createCylinderGeofence({
          ...baseRequest,
          center_lat: obstacle.center.lat,
          center_lon: obstacle.center.lng,
          radius: obstacle.radius,
        });
      }
    } catch (error) {
      console.error(`Failed to sync obstacle ${obstacle.name}:`, error);
    }
  }
}
