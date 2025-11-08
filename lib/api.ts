// API Configuration for FastAPI Backend

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const API_ENDPOINTS = {
  missions: '/api/missions',
  missionById: (id: number) => `/api/missions/${id}`,
  missionSearch: '/api/missions/search',
  missionStats: '/api/missions/stats/summary',
  missionsByStatus: '/api/missions/stats/by-status',
  missionsByCorridor: '/api/missions/stats/by-corridor',
}