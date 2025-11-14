// services/telemetryService.ts
// Real-time telemetry service for connecting to UAV via WebSocket

export interface TelemetryData {
  timestamp: number
  vehicle_id: string
  position: {
    lat: number
    lon: number
    alt: number
    relative_alt: number
  }
  velocity: {
    vx: number
    vy: number
    vz: number
    ground_speed: number
  }
  attitude: {
    roll: number
    pitch: number
    yaw: number
  }
  battery: {
    voltage: number
    current: number
    remaining: number
    level: number
  }
  gps: {
    satellites: number
    fix_type: number
    hdop: number
    eph: number
    epv: number
  }
  status: {
    armed: boolean
    mode: string
    system_status: string
  }
  mission?: {
    current_waypoint: number
    total_waypoints: number
    distance_to_waypoint: number
  }
}

export interface TelemetrySubscription {
  onData: (data: TelemetryData) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

class TelemetryService {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private subscribers: Set<TelemetrySubscription> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private isConnecting = false
  private wsUrl: string

  constructor() {
    // Use environment variable or default to localhost
    this.wsUrl = process.env.NEXT_PUBLIC_DRONE_WS_URL || 'ws://localhost:8002/ws/telemetry'
  }

  /**
   * Connect to the telemetry WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('Already connected or connecting')
      return
    }

    this.isConnecting = true
    console.log('Connecting to telemetry service:', this.wsUrl)

    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        console.log('✅ Telemetry WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        
        // Notify all subscribers of connection
        this.subscribers.forEach(sub => {
          if (sub.onConnect) sub.onConnect()
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data: TelemetryData = JSON.parse(event.data)
          
          // Notify all subscribers of new data
          this.subscribers.forEach(sub => {
            sub.onData(data)
          })
        } catch (error) {
          console.error('Error parsing telemetry data:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ Telemetry WebSocket error:', error)
        this.isConnecting = false
        
        // Notify all subscribers of error
        this.subscribers.forEach(sub => {
          if (sub.onError) sub.onError(new Error('WebSocket connection error'))
        })
      }

      this.ws.onclose = (event) => {
        console.log('🔌 Telemetry WebSocket closed:', event.code, event.reason)
        this.isConnecting = false
        this.ws = null
        
        // Notify all subscribers of disconnection
        this.subscribers.forEach(sub => {
          if (sub.onDisconnect) sub.onDisconnect()
        })

        // Attempt to reconnect if there are active subscribers
        if (this.subscribers.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Subscribe to telemetry updates
   */
  subscribe(subscription: TelemetrySubscription): () => void {
    this.subscribers.add(subscription)
    
    // Auto-connect if not connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscription)
      
      // Disconnect if no more subscribers
      if (this.subscribers.size === 0) {
        this.disconnect()
      }
    }
  }

  /**
   * Send a command to the drone
   */
  sendCommand(command: string, params?: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'command',
        command,
        params,
        timestamp: Date.now()
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('Cannot send command: WebSocket not connected')
    }
  }

  /**
   * Request telemetry for a specific vehicle
   */
  requestVehicleTelemetry(vehicleId: string): void {
    this.sendCommand('subscribe_vehicle', { vehicle_id: vehicleId })
  }

  /**
   * Stop telemetry for a specific vehicle
   */
  stopVehicleTelemetry(vehicleId: string): void {
    this.sendCommand('unsubscribe_vehicle', { vehicle_id: vehicleId })
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.reconnectAttempts = 0
    this.subscribers.clear()
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get number of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size
  }
}

// Singleton instance
const telemetryService = new TelemetryService()

export default telemetryService

// Export helper hook for React components
export function useTelemetrySubscription(
  onData: (data: TelemetryData) => void,
  onConnect?: () => void,
  onDisconnect?: () => void,
  onError?: (error: Error) => void
): { isConnected: boolean; disconnect: () => void } {
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const subscription: TelemetrySubscription = {
      onData,
      onConnect: () => {
        setIsConnected(true)
        if (onConnect) onConnect()
      },
      onDisconnect: () => {
        setIsConnected(false)
        if (onDisconnect) onDisconnect()
      },
      onError
    }

    const unsubscribe = telemetryService.subscribe(subscription)

    return () => {
      unsubscribe()
    }
  }, [onData, onConnect, onDisconnect, onError])

  return {
    isConnected,
    disconnect: () => telemetryService.disconnect()
  }
}

// React import (add this at the top of the file in actual implementation)
import React from 'react'