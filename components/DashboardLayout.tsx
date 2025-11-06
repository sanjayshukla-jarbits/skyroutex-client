'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import MissionList from './MissionList'
import MissionTypes from './MissionTypes'
import RoutePlanning from './RoutePlanning'
import LiveMap from './LiveMap'
import RolesPermissions from './RolesPermissions'
import UserProfile from './UserProfile'
import Settings from './Settings'
import Guide from './Guide'

export default function DashboardLayout() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard')

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      {currentPage === 'dashboard' && <MissionList />}
      {currentPage === 'missions' && <MissionTypes />}
      {currentPage === 'approved' && <RoutePlanning />}
      {currentPage === 'awareness' && <LiveMap />}
      {currentPage === 'operators' && <RolesPermissions />}
      {currentPage === 'vehicles' && <MissionList />}
      {currentPage === 'requested' && <MissionList />}
      {currentPage === 'profile' && <UserProfile />}
      {currentPage === 'settings' && <Settings />}
      {currentPage === 'guide' && <Guide />}
    </div>
  )
}