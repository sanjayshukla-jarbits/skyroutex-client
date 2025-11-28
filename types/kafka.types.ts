/**
 * Kafka Telemetry Types
 * =====================
 * TypeScript types for JGCS Kafka telemetry streaming
 */

// =============================================================================
// Core Telemetry Types
// =============================================================================

export interface Position {
  lat: number;
  lon: number;
  alt: number;
  relative_alt?: number;
}

export interface Attitude {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface Velocity {
  vx: number;
  vy: number;
  vz: number;
  groundspeed?: number;
  airspeed?: number;
}

export interface Battery {
  voltage: number;
  current: number;
  remaining: number;
  temperature?: number;
}

export interface GPS {
  fix_type: number;
  satellites_visible: number;
  hdop?: number;
  vdop?: number;
  eph?: number;
  epv?: number;
}

// =============================================================================
// Telemetry Data
// =============================================================================

export interface TelemetryData {
  vehicle_id: string;
  system_id?: number;
  component_id?: number;
  position: Position;
  attitude: Attitude;
  velocity: Velocity;
  battery: Battery;
  gps: GPS;
  timestamp: string;
  armed?: boolean;
  flight_mode?: string;
  mission_active?: boolean;
  mission_current?: number;
  mission_count?: number;
}

// =============================================================================
// Vehicle Status
// =============================================================================

export interface VehicleStatus {
  vehicle_id: string;
  connected: boolean;
  armed: boolean;
  flying: boolean;
  current_position: Position;
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
  last_heartbeat?: string;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export type WebSocketMessageType =
  | 'connection_info'
  | 'telemetry_update'
  | 'status_update'
  | 'subscribed'
  | 'unsubscribed'
  | 'pong'
  | 'stats'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  data?: T;
  vehicle_id?: string;
  timestamp?: string;
  topic?: string;
  message?: string;
  client_id?: string;
}

export interface TelemetryMessage extends WebSocketMessage<TelemetryData> {
  type: 'telemetry_update';
}

export interface StatusMessage extends WebSocketMessage<VehicleStatus> {
  type: 'status_update';
}

export interface ConnectionInfoMessage extends WebSocketMessage {
  type: 'connection_info';
  client_id: string;
  kafka_available: boolean;
}

export interface StatsMessage extends WebSocketMessage {
  type: 'stats';
  message_count: number;
  connections: number;
}

// =============================================================================
// Client Actions
// =============================================================================

export type ClientActionType = 
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'get_stats';

export interface ClientAction {
  action: ClientActionType;
  vehicle_id?: string;
  mission_id?: string | number;
}

// =============================================================================
// Kafka Service Configuration
// =============================================================================

export interface KafkaServiceConfig {
  wsUrl: string;
  clientId?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  pingInterval?: number;
}

export const DEFAULT_KAFKA_CONFIG: KafkaServiceConfig = {
  wsUrl: 'ws://localhost:8002/ws/telemetry',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  pingInterval: 30000,
};

// =============================================================================
// Service Events
// =============================================================================

export interface KafkaServiceEvents {
  onConnect?: (info: ConnectionInfoMessage) => void;
  onDisconnect?: (reason?: string) => void;
  onTelemetry?: (data: TelemetryData) => void;
  onStatus?: (status: VehicleStatus) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number) => void;
}

// =============================================================================
// Telemetry Statistics
// =============================================================================

export interface TelemetryStats {
  messageCount: number;
  messagesPerSecond: number;
  lastUpdateTime: Date | null;
  isConnected: boolean;
  vehiclesTracked: string[];
}