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

export default function DashboardLayout() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard')

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      {currentPage === 'dashboard' && <DashboardAnalytics />}
      {currentPage === 'missions' && <MissionList onPageChange={setCurrentPage} />}
      {currentPage === 'plan-mission' && <RoutePlanning />}
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