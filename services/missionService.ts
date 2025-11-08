// Mission API Service for handling all mission-related HTTP requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Convert camelCase object keys to snake_case for backend API
 */
function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item))
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const snakeCaseObj: any = {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        snakeCaseObj[snakeKey] = toSnakeCase(obj[key])
      }
    }
    
    return snakeCaseObj
  }
  
  return obj
}

export interface ApiMission {
  id: number
  mission_name: string
  mission_type: string | null
  corridor_value: string | null
  corridor_label: string | null
  corridor_color: string | null
  corridor_description: string | null
  total_distance: number | null
  flight_time: number | null
  battery_usage: number | null
  waypoints: any[]
  status: string
  created_at: string
  updated_at: string
  created_by: string | null
  notes: string | null
  vehicle_id: string | null
  operator_id: string | null
}

export interface GetMissionsParams {
  skip?: number
  limit?: number
  status?: string
  search?: string
}

export interface PaginatedResponse {
  total: number
  skip: number
  limit: number
  missions: ApiMission[]
}

class MissionService {
  private baseUrl: string

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/missions`
  }

  /**
   * Get all missions with optional filters and pagination
   */
  async getMissions(params: GetMissionsParams = {}): Promise<PaginatedResponse | any> {
    const { skip = 0, limit = 50, status, search } = params
    
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    if (status) queryParams.append('status', status)
    if (search) queryParams.append('search', search)

    const response = await fetch(`${this.baseUrl}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch missions' }))
      throw new Error(error.detail || 'Failed to fetch missions')
    }

    const data = await response.json()
    
    // Handle different response formats
    // If API returns paginated response: { total, skip, limit, missions }
    if (data && typeof data === 'object' && 'missions' in data) {
      return data
    }
    // If API returns just an array of missions
    else if (Array.isArray(data)) {
      return {
        total: data.length,
        skip: skip,
        limit: limit,
        missions: data
      }
    }
    // Default case
    return data
  }

  /**
   * Get a single mission by ID
   */
  async getMissionById(id: number): Promise<ApiMission> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch mission' }))
      throw new Error(error.detail || 'Failed to fetch mission')
    }

    return response.json()
  }

  /**
   * Create a new mission
   */
  async createMission(missionData: any): Promise<ApiMission> {
    // Transform camelCase to snake_case for backend
    const transformedData = toSnakeCase(missionData)
    
    console.log('Sending to API:', transformedData) // Debug log
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create mission' }))
      throw new Error(error.detail || 'Failed to create mission')
    }

    return response.json()
  }

  /**
   * Update an existing mission
   */
  async updateMission(id: number, missionData: Partial<any>): Promise<ApiMission> {
    // Transform camelCase to snake_case for backend
    const transformedData = toSnakeCase(missionData)
    
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to update mission' }))
      throw new Error(error.detail || 'Failed to update mission')
    }

    return response.json()
  }

  /**
   * Delete a mission
   */
  async deleteMission(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to delete mission' }))
      throw new Error(error.detail || 'Failed to delete mission')
    }
  }

  /**
   * Get mission statistics
   */
  async getMissionStats(): Promise<{
    total: number
    by_status: Record<string, number>
  }> {
    const response = await fetch(`${API_BASE_URL}/api/missions/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch stats' }))
      throw new Error(error.detail || 'Failed to fetch stats')
    }

    return response.json()
  }
}

export const missionService = new MissionService()

// Helper function to transform frontend data to backend format
const transformMissionData = (data: any) => {
  return {
    mission_name: data.missionName || data.mission_name,
    mission_type: data.missionType || data.mission_type,
    corridor_value: data.corridor?.value,
    corridor_label: data.corridor?.label,
    corridor_color: data.corridor?.color,
    corridor_description: data.corridor?.description,
    total_distance: data.missionStats?.totalDistance || data.total_distance,
    flight_time: data.missionStats?.flightTime || data.flight_time,
    battery_usage: data.missionStats?.batteryUsage || data.battery_usage,
    waypoints: data.waypoints,
    status: data.status || 'draft',
    created_by: data.createdBy || data.created_by,
    notes: data.notes || '',
    vehicle_id: data.vehicleId || data.vehicle_id,
    operator_id: data.operatorId || data.operator_id,
  }
}

// Export convenience functions
export const getMissions = (params?: GetMissionsParams) => missionService.getMissions(params)
export const getMissionById = (id: number) => missionService.getMissionById(id)
export const createMission = (data: any) => {
  const transformedData = transformMissionData(data)
  return missionService.createMission(transformedData)
}
export const updateMission = (id: number, data: Partial<any>) => {
  const transformedData = transformMissionData(data)
  return missionService.updateMission(id, transformedData)
}
export const deleteMission = (id: number) => missionService.deleteMission(id)
export const getMissionStats = () => missionService.getMissionStats()