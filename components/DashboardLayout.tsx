'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from './Sidebar'
import MissionListComponent from './MissionList'
import RoutePlanning from './RoutePlanning'
import { ApiMission } from '@/services/missionService'
import DashboardAnalytics from './DashboardAnalytics'
const SituationalAwareness = dynamic(
  () => import('./SituationalAwareness'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

const DroneFlightVisualization = dynamic(
  () => import('./DroneFlightVisualization'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

const MissionTypes = dynamic(() => import('./MissionTypes'), { ssr: false })
// const DroneFlightVisualization = dynamic(() => import('./DroneFlightVisualization'), { ssr: false })
const LiveMap = dynamic(() => import('./LiveMap'), { ssr: false })
const VehicleLibrary = dynamic(() => import('./VehicleLibrary'), { ssr: false })
const OperatorLibrary = dynamic(() => import('./OperatorLibrary'), { ssr: false })
const UserProfile = dynamic(() => import('./UserProfile'), { ssr: false })
const Settings = dynamic(() => import('./Settings'), { ssr: false })
const Guide = dynamic(() => import('./Guide'), { ssr: false })

export default function DashboardLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedMission, setSelectedMission] = useState<ApiMission | null>(null)
  const [editMode, setEditMode] = useState(false)

  const handlePlanMission = () => {
    setSelectedMission(null)
    setEditMode(false)
    setCurrentPage('plan-mission')
  }

  const handleEditMission = (mission: ApiMission) => {
    setSelectedMission(mission)
    setEditMode(true)
    setCurrentPage('plan-mission')
  }

  const handleViewMission = (mission: ApiMission) => {
    setSelectedMission(mission)
    setEditMode(false)
    setCurrentPage('plan-mission')
  }

  // NEW: Handle visualization of mission on flight monitor
  const handleVisualizeMission = (mission: ApiMission) => {
    setSelectedMission(mission)
    setCurrentPage('flight-monitor')
  }

  const handleMissionSaved = () => {
    setCurrentPage('missions')
    setSelectedMission(null)
    setEditMode(false)
  }

  const handleBackToMissions = () => {
    setCurrentPage('missions')
    setSelectedMission(null)
    setEditMode(false)
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      
      {currentPage === 'dashboard' && <DashboardAnalytics />}

      {currentPage === 'missions' && (
        <MissionListComponent 
          onPageChange={setCurrentPage} 
          onViewMission={handleViewMission}
          onEditMission={handleEditMission}
          onVisualizeMission={handleVisualizeMission}
        />
      )}
      {currentPage === 'plan-mission' && (
        <RoutePlanning 
          selectedMission={selectedMission}
          editMode={editMode}
          onMissionSaved={handleMissionSaved}
          onBackToMissions={handleBackToMissions}
        />
      )}
      {currentPage === 'mission-types' && <MissionTypes onPageChange={setCurrentPage} />}
      {currentPage === 'flight-monitor' && (
        <DroneFlightVisualization 
          selectedMission={selectedMission ? {
            id: selectedMission.id,
            name: selectedMission.mission_name || selectedMission.name || 'Unnamed Mission',
            waypoints: selectedMission.waypoints.map(wp => {
              const wpAny = wp as any;
              
              // Get longitude from either lng or lon property
              const longitude = wpAny.lng ?? wpAny.lon;
              
              // Validate coordinates
              if (!longitude || !wp.lat) {
                console.warn('⚠️ Invalid waypoint detected:', wp);
              }
              
              // Return normalized waypoint with lng property
              return {
                lat: wp.lat,
                lng: longitude,
                alt: wp.alt,
                name: wp.name
              };
            }),
            corridor: selectedMission.corridor_label || selectedMission.corridor_value || selectedMission.corridor,
            distance: selectedMission.total_distance,
            status: selectedMission.status
          } : null}
          onBack={handleBackToMissions}
        />
      )}
      {currentPage === 'awareness' && <SituationalAwareness />}
      {currentPage === 'vehicles' && <VehicleLibrary />}
      {currentPage === 'operators' && <OperatorLibrary />}
      {currentPage === 'profile' && <UserProfile />}
      {currentPage === 'settings' && <Settings />}
      {currentPage === 'guide' && <Guide />}
    </div>
  )
}