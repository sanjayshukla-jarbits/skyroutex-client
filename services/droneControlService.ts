const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Interface definitions for API requests and responses
 */
export interface ApiResponse {
  success: boolean
  message: string
  data?: any
  error?: string
  timestamp: string
}

export interface VehicleArmRequest {
  mission_id: string
  force_arm?: boolean
}

export interface VehicleDisarmRequest {
  mission_id: string
}

export interface TakeoffRequest {
  mission_id: string
  altitude: number
}

export interface LandRequest {
  mission_id: string
}

export interface RTLRequest {
  mission_id: string
}

export interface MissionControlRequest {
  force_start?: boolean
  force_stop?: boolean
}

export interface DroneStatus {
  connected: boolean
  armed: boolean
  flying: boolean
  current_position: {
    lat: number
    lon: number
    alt: number
  }
  home_position: {
    lat: number
    lon: number
    alt: number
  }
  battery_level: number
  flight_mode: string
  mission_active: boolean
  mission_current: number
  mission_count: number
  last_update?: string
  message: string
}

export interface TelemetryData {
  position?: {
    lat: number
    lon: number
    alt: number
  }
  velocity?: {
    vx: number
    vy: number
    vz: number
  }
  attitude?: {
    roll: number
    pitch: number
    yaw: number
  }
  battery?: {
    voltage: number
    current: number
    remaining: number
  }
  gps?: {
    satellites: number
    fix_type: number
    hdop: number
  }
}

/**
 * DroneControlService - Handles all drone control operations
 */
class DroneControlService {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // ============================================================================
  // CONNECTION & STATUS
  // ============================================================================

  /**
   * Get current drone status
   */
  async getStatus(): Promise<DroneStatus> {
    const response = await fetch(`${this.baseUrl}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get status' }))
      throw new Error(error.detail || 'Failed to get status')
    }

    const data = await response.json()
    return data.data || data
  }

  /**
   * Get telemetry data
   */
  async getTelemetry(): Promise<TelemetryData> {
    const response = await fetch(`${this.baseUrl}/telemetry`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get telemetry' }))
      throw new Error(error.detail || 'Failed to get telemetry')
    }

    return response.json()
  }

  /**
   * Connect to simulator
   */
  async connect(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to connect' }))
      throw new Error(error.detail || 'Failed to connect to simulator')
    }

    return response.json()
  }

  // ============================================================================
  // VEHICLE COMMANDS
  // ============================================================================

  /**
   * Arm vehicle motors
   */
  async armVehicle(missionId: string, forceArm: boolean = false): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicle/arm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mission_id: missionId,
        force_arm: forceArm,
      } as VehicleArmRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to arm vehicle' }))
      throw new Error(error.detail || 'Failed to arm vehicle')
    }

    return response.json()
  }

  /**
   * Disarm vehicle motors
   */
  async disarmVehicle(missionId: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicle/disarm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mission_id: missionId,
      } as VehicleDisarmRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to disarm vehicle' }))
      throw new Error(error.detail || 'Failed to disarm vehicle')
    }

    return response.json()
  }

  /**
   * Takeoff to specified altitude
   */
  async takeoff(missionId: string, altitude: number): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicle/takeoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mission_id: missionId,
        altitude: altitude,
      } as TakeoffRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to takeoff' }))
      throw new Error(error.detail || 'Failed to initiate takeoff')
    }

    return response.json()
  }

  /**
   * Land vehicle
   */
  async land(missionId: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicle/land`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mission_id: missionId,
      } as LandRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to land' }))
      throw new Error(error.detail || 'Failed to initiate landing')
    }

    return response.json()
  }

  /**
   * Return to launch
   */
  async returnToLaunch(missionId: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicle/rtl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mission_id: missionId,
      } as RTLRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to RTL' }))
      throw new Error(error.detail || 'Failed to initiate Return to Launch')
    }

    return response.json()
  }

  // ============================================================================
  // MISSION CONTROL
  // ============================================================================

  /**
   * Start mission execution
   */
  async startMission(missionId: string, forceStart: boolean = false): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/missions/${missionId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force_start: forceStart,
      } as MissionControlRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to start mission' }))
      throw new Error(error.detail || 'Failed to start mission')
    }

    return response.json()
  }

  /**
   * Pause mission execution
   */
  async pauseMission(missionId: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/missions/${missionId}/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to pause mission' }))
      throw new Error(error.detail || 'Failed to pause mission')
    }

    return response.json()
  }

  /**
   * Stop mission execution
   */
  async stopMission(missionId: string, forceStop: boolean = false): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/missions/${missionId}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force_stop: forceStop,
      } as MissionControlRequest),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to stop mission' }))
      throw new Error(error.detail || 'Failed to stop mission')
    }

    return response.json()
  }

  /**
   * Get mission status
   */
  async getMissionStatus(missionId: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/missions/${missionId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get mission status' }))
      throw new Error(error.detail || 'Failed to get mission status')
    }

    return response.json()
  }

  // ============================================================================
  // MISSION UPLOAD
  // ============================================================================

  /**
   * Upload mission waypoints to vehicle
   */
  async uploadMission(waypoints: Array<{ lat: number; lon: number; alt: number }>): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/mission/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waypoints: waypoints,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to upload mission' }))
      throw new Error(error.detail || 'Failed to upload mission')
    }

    return response.json()
  }
}

// Export singleton instance
const droneControlService = new DroneControlService()
export default droneControlService