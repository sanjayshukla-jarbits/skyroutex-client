'use client'

import { useState } from 'react'
import LoginPage from '@/components/LoginPage'
import DashboardLayout from '@/components/DashboardLayout'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <DashboardLayout />
}