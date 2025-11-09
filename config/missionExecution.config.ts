export const MISSION_EXECUTION_CONFIG = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // WebSocket Configuration
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002/ws/telemetry',
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
    pingInterval: 20000, // 20 seconds
  },

  // Video Configuration
  video: {
    // Add your video stream URL here
    streamUrl: process.env.NEXT_PUBLIC_VIDEO_URL || '',
    defaultQuality: 1, // 1=HD, 2=SD, 3=Low
    enableOverlay: true,
  },

  // Telemetry Update Configuration
  telemetry: {
    updateInterval: 500, // milliseconds
    positionPrecision: 6, // decimal places
    altitudePrecision: 2, // decimal places
  },

  // Alert Configuration
  alerts: {
    maxAlerts: 10, // Maximum alerts to display
    autoHideSuccess: true,
    autoHideDelay: 5000, // 5 seconds
    batteryWarningThreshold: 20, // percentage
    batteryCriticalThreshold: 10, // percentage
  },

  // Mission Control Configuration
  missionControl: {
    defaultTakeoffAltitude: 10, // meters
    minTakeoffAltitude: 5,
    maxTakeoffAltitude: 120,
    commandTimeout: 30000, // 30 seconds
  },

  // Geofence Configuration
  geofence: {
    enableWarnings: true,
    violationCheckInterval: 1000, // milliseconds
  },

  // UI Configuration
  ui: {
    theme: 'dark',
    enableFullscreen: true,
    compassSize: 128, // pixels
    telemetryPanelWidth: 400, // pixels
  },
}

// Export individual configs for easier imports
export const API_CONFIG = MISSION_EXECUTION_CONFIG.api
export const WEBSOCKET_CONFIG = MISSION_EXECUTION_CONFIG.websocket
export const VIDEO_CONFIG = MISSION_EXECUTION_CONFIG.video
export const TELEMETRY_CONFIG = MISSION_EXECUTION_CONFIG.telemetry
export const ALERT_CONFIG = MISSION_EXECUTION_CONFIG.alerts
export const MISSION_CONTROL_CONFIG = MISSION_EXECUTION_CONFIG.missionControl
export const GEOFENCE_CONFIG = MISSION_EXECUTION_CONFIG.geofence
export const UI_CONFIG = MISSION_EXECUTION_CONFIG.ui

// Type definitions
export type MissionExecutionConfig = typeof MISSION_EXECUTION_CONFIG
export type ApiConfig = typeof API_CONFIG
export type WebSocketConfig = typeof WEBSOCKET_CONFIG
export type VideoConfig = typeof VIDEO_CONFIG
export type TelemetryConfig = typeof TELEMETRY_CONFIG
export type AlertConfig = typeof ALERT_CONFIG
export type MissionControlConfig = typeof MISSION_CONTROL_CONFIG
export type GeofenceConfig = typeof GEOFENCE_CONFIG
export type UIConfig = typeof UI_CONFIG