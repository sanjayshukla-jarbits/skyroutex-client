'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import DashboardAnalytics from './DashboardAnalytics'
import MissionList from './MissionList'
import MissionTypes from './MissionTypes'
import RoutePlanning from './RoutePlanning'
import LiveMap from './LiveMap'
import RolesPermissions from './RolesPermissions'
import UserProfile from './UserProfile'
import Settings from './Settings'
import Guide from './Guide'
import VehicleLibrary from './VehicleLibrary'
import OperatorLibrary from './OperatorLibrary'
import { ApiMission } from '@/services/missionService'

export default function DashboardLayout() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard')
  const [selectedMission, setSelectedMission] = useState<ApiMission | null>(null)
  const [editMode, setEditMode] = useState(false)

  const handleViewMission = (mission: ApiMission) => {
    console.log('Viewing mission:', mission)
    setSelectedMission(mission)
    setEditMode(false)
    setCurrentPage('plan-mission')
  }

  const handleEditMission = (mission: ApiMission) => {
    console.log('Editing mission:', mission)
    setSelectedMission(mission)
    setEditMode(true)
    setCurrentPage('plan-mission')
  }

  const handleMissionSaved = () => {
    setSelectedMission(null)
    setEditMode(false)
    setCurrentPage('missions')
  }

  const handleBackToMissions = () => {
    setSelectedMission(null)
    setEditMode(false)
    setCurrentPage('missions')
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      {currentPage === 'dashboard' && <DashboardAnalytics />}
      {currentPage === 'missions' && (
        <MissionList 
          onPageChange={setCurrentPage}
          onViewMission={handleViewMission}
          onEditMission={handleEditMission}
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
      {currentPage === 'awareness' && <LiveMap />}
      {currentPage === 'vehicles' && <VehicleLibrary />}
      {currentPage === 'operators' && <OperatorLibrary />}
      {currentPage === 'profile' && <UserProfile />}
      {currentPage === 'settings' && <Settings />}
      {currentPage === 'guide' && <Guide />}
    </div>
  )
}