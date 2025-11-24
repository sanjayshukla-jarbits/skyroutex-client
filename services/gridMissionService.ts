/**
 * Enhanced Grid Mission Service
 * Handles database persistence and drone control API integration
 */

import {
  CreateGridMissionRequest,
  GridMissionResponse,
  GeofenceCreateRequest,
  GeofenceResponse,
  ObstacleZone,
} from '../types/gridMission';

// API Configuration
const MISSION_DB_API = process.env.NEXT_PUBLIC_MISSION_DB_URL || 'http://localhost:7000';
const DRONE_CONTROL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Database Operations (Port 7000 - Mission Database API)
// ============================================================================

/**
 * Save grid mission to database with full mission details
 */
export async function saveGridMissionToDatabase(params: {
  missionName: string;
  waypoints: Array<{
    id: string;
    label: string;
    coords: string;
    alt: string;
    color: string;
    lat: number;
    lon: number;
    altitude: number;
    sequence: number;
  }>;
  stats: {
    totalDistance: number;
    flightTime: number;
    batteryUsage: number;
  };
  coverageArea: number;
  gridSpacing: number;
  altitude: number;
}): Promise<{ success: boolean; missionId?: number; error?: string }> {
  try {
    const payload = {
      mission_name: params.missionName,
      mission_type: 'Grid Survey',
      corridor: {
        value: 'survey',
        label: 'Survey Mission',
        color: '#3b82f6',
        description: 'Grid-based area survey mission'
      },
      mission_stats: {
        total_distance: params.stats.totalDistance,
        flight_time: params.stats.flightTime,
        battery_usage: params.stats.batteryUsage
      },
      waypoints: params.waypoints,
      created_by: 'grid_planner',
      notes: `Grid survey with ${params.waypoints.length} waypoints, ${params.gridSpacing}m spacing, coverage ${params.coverageArea.toFixed(2)} km²`,
      vehicle_id: 'UAV-GRID-001',
      operator_id: 'operator-001',
      status: 'draft'
    };

    console.log('💾 Saving mission to database:', payload);

    const response = await fetch(`${MISSION_DB_API}/api/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save mission');
    }

    const savedMission = await response.json();
    console.log('✅ Mission saved to database:', savedMission);

    return {
      success: true,
      missionId: savedMission.id
    };
  } catch (error) {
    console.error('❌ Error saving mission to database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update mission status in database
 */
export async function updateMissionStatus(
  missionId: number,
  status: 'draft' | 'active' | 'completed' | 'paused' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update mission status');
    }

    const result = await response.json();
    console.log('✅ Mission status updated:', result);

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating mission status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get mission from database
 */
export async function getMissionFromDatabase(missionId: number): Promise<any> {
  try {
    const response = await fetch(`${MISSION_DB_API}/api/missions/${missionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get mission from database');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error getting mission from database:', error);
    throw error;
  }
}

// ============================================================================
// Drone Control API Operations (Port 8000 - Gazebo/PX4 Control)
// ============================================================================

/**
 * Create survey mission on drone control API
 */
export async function createSurveyMissionOnDrone(
  request: CreateGridMissionRequest
): Promise<{ success: boolean; missionId?: string; error?: string }> {
  try {
    console.log('🚀 Creating survey mission on drone control API:', request);

    const response = await fetch(`${DRONE_CONTROL_API}/mission/survey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create survey mission');
    }

    const result = await response.json();
    console.log('✅ Survey mission created on drone:', result);

    return {
      success: true,
      missionId: result.data.mission_id
    };
  } catch (error) {
    console.error('❌ Error creating survey mission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload mission template to PX4
 */
export async function uploadMissionToPX4(missionId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    console.log('📤 Uploading mission to PX4:', missionId);

    const response = await fetch(
      `${DRONE_CONTROL_API}/mission/upload_template/${missionId}`,
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

    const result = await response.json();
    console.log('✅ Mission uploaded to PX4:', result);

    return result;
  } catch (error) {
    console.error('❌ Error uploading mission to PX4:', error);
    throw error;
  }
}

/**
 * Start mission execution
 */
export async function startMissionExecution(): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    console.log('▶️ Starting mission execution...');

    const response = await fetch(`${DRONE_CONTROL_API}/mission/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start mission');
    }

    const result = await response.json();
    console.log('✅ Mission started:', result);

    return result;
  } catch (error) {
    console.error('❌ Error starting mission:', error);
    throw error;
  }
}

/**
 * Pause mission execution
 */
export async function pauseMissionExecution(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('⏸️ Pausing mission...');

    const response = await fetch(`${DRONE_CONTROL_API}/mission/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to pause mission');
    }

    const result = await response.json();
    console.log('✅ Mission paused:', result);

    return result;
  } catch (error) {
    console.error('❌ Error pausing mission:', error);
    throw error;
  }
}

/**
 * Resume mission execution
 */
export async function resumeMissionExecution(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('▶️ Resuming mission...');

    const response = await fetch(`${DRONE_CONTROL_API}/mission/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to resume mission');
    }

    const result = await response.json();
    console.log('✅ Mission resumed:', result);

    return result;
  } catch (error) {
    console.error('❌ Error resuming mission:', error);
    throw error;
  }
}

/**
 * Stop mission execution
 */
export async function stopMissionExecution(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('⏹️ Stopping mission...');

    const response = await fetch(`${DRONE_CONTROL_API}/mission/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to stop mission');
    }

    const result = await response.json();
    console.log('✅ Mission stopped:', result);

    return result;
  } catch (error) {
    console.error('❌ Error stopping mission:', error);
    throw error;
  }
}

// ============================================================================
// Legacy Grid Mission API (keeping for compatibility)
// ============================================================================

/**
 * Create a survey/grid mission on the backend (legacy method)
 */
export async function createGridMission(
  request: CreateGridMissionRequest
): Promise<GridMissionResponse> {
  try {
    const response = await fetch(`${DRONE_CONTROL_API}/mission/survey`, {
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
    const response = await fetch(`${DRONE_CONTROL_API}/mission/validate`, {
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
 * Upload grid mission to drone (legacy method)
 */
export async function uploadGridMission(missionId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    const response = await fetch(
      `${DRONE_CONTROL_API}/mission/upload_template/${missionId}`,
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

// ============================================================================
// Geofence & Obstacle Management
// ============================================================================

/**
 * Sync obstacles to backend as geofences
 */
export async function syncObstaclesToBackend(
  obstacles: ObstacleZone[]
): Promise<void> {
  try {
    console.log('🔄 Syncing obstacles to backend:', obstacles);

    for (const obstacle of obstacles) {
      if (!obstacle.enabled) continue;

      const geofenceRequest: GeofenceCreateRequest = {
        name: obstacle.name,
        type: 'exclusion',
        vertices: obstacle.vertices.map(v => [v.lat, v.lng]),
        min_altitude: obstacle.minAltitude,
        max_altitude: obstacle.maxAltitude,
      };

      const response = await fetch(`${DRONE_CONTROL_API}/geofence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geofenceRequest),
      });

      if (!response.ok) {
        console.error(`Failed to sync obstacle ${obstacle.name}`);
      } else {
        console.log(`✅ Synced obstacle ${obstacle.name}`);
      }
    }
  } catch (error) {
    console.error('Error syncing obstacles:', error);
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
      `${DRONE_CONTROL_API}/mission/template/${missionId}`,
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
  data?: any[];
}> {
  try {
    const response = await fetch(
      `${DRONE_CONTROL_API}/mission/templates`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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
// Telemetry & Status
// ============================================================================

/**
 * Get current drone status
 */
export async function getDroneStatus(): Promise<any> {
  try {
    const response = await fetch(`${DRONE_CONTROL_API}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get drone status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting drone status:', error);
    throw error;
  }
}

/**
 * Get current telemetry
 */
export async function getTelemetry(): Promise<any> {
  try {
    const response = await fetch(`${DRONE_CONTROL_API}/telemetry`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get telemetry');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting telemetry:', error);
    throw error;
  }
}