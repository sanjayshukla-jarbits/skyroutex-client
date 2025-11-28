/**
 * Kafka Telemetry Service
 * =======================
 * WebSocket-based service for consuming Kafka telemetry in React applications.
 * 
 * Since browsers cannot connect directly to Kafka, this service connects to
 * a WebSocket proxy (kafka_ws_proxy.py) that bridges Kafka topics to WebSocket.
 * 
 * Usage:
 *   import kafkaTelemetryService from './services/kafkaTelemetryService';
 *   
 *   // Subscribe to telemetry
 *   kafkaTelemetryService.subscribe({
 *     onTelemetry: (data) => console.log('Telemetry:', data),
 *     onConnect: () => console.log('Connected'),
 *   });
 *   
 *   // Subscribe to specific vehicle
 *   kafkaTelemetryService.subscribeVehicle('vehicle-1');
 */

import {
  TelemetryData,
  VehicleStatus,
  WebSocketMessage,
  ClientAction,
  KafkaServiceConfig,
  KafkaServiceEvents,
  TelemetryStats,
  DEFAULT_KAFKA_CONFIG,
  ConnectionInfoMessage,
} from '../types/kafka.types';

// =============================================================================
// Event Emitter for Multiple Subscribers
// =============================================================================

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// =============================================================================
// Kafka Telemetry Service
// =============================================================================

class KafkaTelemetryService {
  private config: KafkaServiceConfig;
  private ws: WebSocket | null = null;
  private events = new EventEmitter();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private clientId: string;
  private subscribedVehicles: Set<string> = new Set();
  
  // Statistics tracking
  private messageCount = 0;
  private lastMessageTime: Date | null = null;
  private messagesInLastSecond = 0;
  private messageRateInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<KafkaServiceConfig> = {}) {
    this.config = { ...DEFAULT_KAFKA_CONFIG, ...config };
    this.clientId = config.clientId || `jgcs-ui-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to the Kafka WebSocket proxy
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('⚠️ Already connected to Kafka WebSocket');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.warn('⚠️ Connection already in progress');
      return;
    }

    try {
      const url = `${this.config.wsUrl}?client_id=${encodeURIComponent(this.clientId)}`;
      console.log(`🔌 Connecting to Kafka WebSocket: ${url}`);
      
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.events.emit('error', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Kafka WebSocket');
    
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.events.emit('disconnect', 'Manual disconnect');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ===========================================================================
  // Vehicle Subscriptions
  // ===========================================================================

  /**
   * Subscribe to a specific vehicle's telemetry
   */
  subscribeVehicle(vehicleId: string): void {
    this.subscribedVehicles.add(vehicleId);
    
    if (this.isConnected()) {
      this.send({ action: 'subscribe', vehicle_id: vehicleId });
    }
    
    console.log(`📡 Subscribed to vehicle: ${vehicleId}`);
  }

  /**
   * Unsubscribe from a vehicle's telemetry
   */
  unsubscribeVehicle(vehicleId: string): void {
    this.subscribedVehicles.delete(vehicleId);
    
    if (this.isConnected()) {
      this.send({ action: 'unsubscribe', vehicle_id: vehicleId });
    }
    
    console.log(`📡 Unsubscribed from vehicle: ${vehicleId}`);
  }

  /**
   * Get list of subscribed vehicles
   */
  getSubscribedVehicles(): string[] {
    return Array.from(this.subscribedVehicles);
  }

  // ===========================================================================
  // Event Subscription
  // ===========================================================================

  /**
   * Subscribe to service events
   */
  subscribe(events: KafkaServiceEvents): () => void {
    const unsubscribers: (() => void)[] = [];

    if (events.onConnect) {
      unsubscribers.push(this.events.on('connect', events.onConnect));
    }
    if (events.onDisconnect) {
      unsubscribers.push(this.events.on('disconnect', events.onDisconnect));
    }
    if (events.onTelemetry) {
      unsubscribers.push(this.events.on('telemetry', events.onTelemetry));
    }
    if (events.onStatus) {
      unsubscribers.push(this.events.on('status', events.onStatus));
    }
    if (events.onError) {
      unsubscribers.push(this.events.on('error', events.onError));
    }
    if (events.onReconnecting) {
      unsubscribers.push(this.events.on('reconnecting', events.onReconnecting));
    }

    // Auto-connect if not connected
    if (!this.isConnected()) {
      this.connect();
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Add event listener
   */
  on(event: string, callback: EventCallback): () => void {
    return this.events.on(event, callback);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get telemetry statistics
   */
  getStats(): TelemetryStats {
    return {
      messageCount: this.messageCount,
      messagesPerSecond: this.messagesInLastSecond,
      lastUpdateTime: this.lastMessageTime,
      isConnected: this.isConnected(),
      vehiclesTracked: this.getSubscribedVehicles(),
    };
  }

  /**
   * Request stats from server
   */
  requestServerStats(): void {
    this.send({ action: 'get_stats' });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ Kafka WebSocket connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
      this.startMessageRateTracking();
      
      // Re-subscribe to vehicles
      this.subscribedVehicles.forEach(vehicleId => {
        this.send({ action: 'subscribe', vehicle_id: vehicleId });
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('❌ Kafka WebSocket error:', event);
      this.events.emit('error', new Error('WebSocket error'));
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`🔌 Kafka WebSocket closed (Code: ${event.code}, Reason: ${event.reason})`);
      this.clearTimers();
      this.events.emit('disconnect', event.reason || 'Connection closed');
      
      if (this.config.autoReconnect && event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    this.messageCount++;
    this.messagesInLastSecond++;
    this.lastMessageTime = new Date();

    switch (message.type) {
      case 'connection_info':
        console.log('📋 Connection info:', message);
        this.events.emit('connect', message as ConnectionInfoMessage);
        break;

      case 'telemetry_update':
        if (message.data) {
          this.events.emit('telemetry', message.data as TelemetryData);
        }
        break;

      case 'status_update':
        if (message.data) {
          this.events.emit('status', message.data as VehicleStatus);
        }
        break;

      case 'subscribed':
        console.log(`✅ Subscribed to vehicle: ${message.vehicle_id}`);
        break;

      case 'unsubscribed':
        console.log(`✅ Unsubscribed from vehicle: ${message.vehicle_id}`);
        break;

      case 'pong':
        // Keep-alive response, no action needed
        break;

      case 'stats':
        console.log('📊 Server stats:', message);
        break;

      case 'error':
        console.error('❌ Server error:', message.message);
        this.events.emit('error', new Error(message.message || 'Server error'));
        break;

      default:
        console.log('📨 Unknown message type:', message);
    }
  }

  private send(action: ClientAction): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    } else {
      console.warn('⚠️ Cannot send - WebSocket not connected');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error('❌ Max reconnection attempts reached');
      this.events.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      (this.config.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    console.log(`🔄 Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})`);
    this.events.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.send({ action: 'ping' });
    }, this.config.pingInterval || 30000);
  }

  private startMessageRateTracking(): void {
    this.messageRateInterval = setInterval(() => {
      this.messagesInLastSecond = 0;
    }, 1000);
  }

  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.messageRateInterval) {
      clearInterval(this.messageRateInterval);
      this.messageRateInterval = null;
    }
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

// Default instance for simple usage
const kafkaTelemetryService = new KafkaTelemetryService();

export default kafkaTelemetryService;

// Named export for custom configurations
export { KafkaTelemetryService };