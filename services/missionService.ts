// services/missionService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface GetMissionsParams {
  status?: string
  corridor?: string
  mission_type?: string
  created_by?: string
  limit?: number
  offset?: number
}

class MissionService {
  /**
   * Get all missions with optional filters
   */
  async getMissions(params?: GetMissionsParams): Promise<any> {
    const queryParams = new URLSearchParams()
    
    if (params?.status) queryParams.append('status', params.status)
    if (params?.corridor) queryParams.append('corridor', params.corridor)
    if (params?.mission_type) queryParams.append('mission_type', params.mission_type)
    if (params?.created_by) queryParams.append('created_by', params.created_by)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const url = `${API_BASE_URL}/api/missions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch missions' }))
      throw new Error(error.detail || 'Failed to fetch missions')
    }

    return response.json()
  }

  /**
   * Get a single mission by ID
   */
  async getMissionById(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/missions/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Mission not found' }))
      throw new Error(error.detail || 'Mission not found')
    }

    return response.json()
  }

  /**
   * Create a new mission
   */
  async createMission(mission: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mission),
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
  async updateMission(id: number, updates: Partial<any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/missions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
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
    const response = await fetch(`${API_BASE_URL}/api/missions/${id}`, {
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
// ⚠️ FIXED: Keep corridor as nested object, don't flatten it
const transformMissionData = (data: any) => {
  return {
    mission_name: data.missionName || data.mission_name,
    mission_type: data.missionType || data.mission_type,
    // ✅ KEEP CORRIDOR AS NESTED OBJECT - Backend expects this structure
    corridor: data.corridor ? {
      value: data.corridor.value,
      label: data.corridor.label,
      color: data.corridor.color,
      description: data.corridor.description,
    } : null,
    // ✅ KEEP MISSION_STATS AS NESTED OBJECT
    mission_stats: data.mission_stats || data.missionStats ? {
      total_distance: data.mission_stats?.total_distance || data.missionStats?.totalDistance || 0,
      flight_time: data.mission_stats?.flight_time || data.missionStats?.flightTime || 0,
      battery_usage: data.mission_stats?.battery_usage || data.missionStats?.batteryUsage || 0,
    } : null,
    waypoints: data.waypoints || [],
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