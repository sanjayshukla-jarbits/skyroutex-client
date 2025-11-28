/**
 * Kafka Telemetry Hooks
 * =====================
 * React hooks for easy integration with Kafka telemetry service.
 * 
 * Usage:
 *   const { telemetry, isConnected } = useKafkaTelemetry();
 *   const { telemetry, subscribe } = useVehicleTelemetry('vehicle-1');
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import kafkaTelemetryService, { KafkaTelemetryService } from '../services/kafkaTelemetryService';
import {
  TelemetryData,
  VehicleStatus,
  TelemetryStats,
  KafkaServiceConfig,
  KafkaServiceEvents,
  ConnectionInfoMessage,
} from '../types/kafka.types';

// =============================================================================
// useKafkaTelemetry - Main telemetry hook
// =============================================================================

export interface UseKafkaTelemetryOptions {
  autoConnect?: boolean;
  vehicleId?: string;
  onError?: (error: Error) => void;
}

export interface UseKafkaTelemetryResult {
  telemetry: TelemetryData | null;
  status: VehicleStatus | null;
  isConnected: boolean;
  isReconnecting: boolean;
  stats: TelemetryStats;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  subscribeVehicle: (vehicleId: string) => void;
  unsubscribeVehicle: (vehicleId: string) => void;
}

export function useKafkaTelemetry(
  options: UseKafkaTelemetryOptions = {}
): UseKafkaTelemetryResult {
  const { autoConnect = true, vehicleId, onError } = options;

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<VehicleStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<TelemetryStats>({
    messageCount: 0,
    messagesPerSecond: 0,
    lastUpdateTime: null,
    isConnected: false,
    vehiclesTracked: [],
  });

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(kafkaTelemetryService.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to telemetry events
  useEffect(() => {
    const events: KafkaServiceEvents = {
      onConnect: (info: ConnectionInfoMessage) => {
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onTelemetry: (data: TelemetryData) => {
        // Filter by vehicle if specified
        if (vehicleId && data.vehicle_id !== vehicleId) {
          return;
        }
        setTelemetry(data);
      },
      onStatus: (statusData: VehicleStatus) => {
        if (vehicleId && statusData.vehicle_id !== vehicleId) {
          return;
        }
        setStatus(statusData);
      },
      onError: (err: Error) => {
        setError(err);
        onError?.(err);
      },
      onReconnecting: () => {
        setIsReconnecting(true);
      },
    };

    const unsubscribe = kafkaTelemetryService.subscribe(events);

    // Auto-connect
    if (autoConnect && !kafkaTelemetryService.isConnected()) {
      kafkaTelemetryService.connect();
    }

    // Subscribe to vehicle if specified
    if (vehicleId) {
      kafkaTelemetryService.subscribeVehicle(vehicleId);
    }

    return () => {
      unsubscribe();
      if (vehicleId) {
        kafkaTelemetryService.unsubscribeVehicle(vehicleId);
      }
    };
  }, [autoConnect, vehicleId, onError]);

  const connect = useCallback(() => {
    kafkaTelemetryService.connect();
  }, []);

  const disconnect = useCallback(() => {
    kafkaTelemetryService.disconnect();
  }, []);

  const subscribeVehicle = useCallback((id: string) => {
    kafkaTelemetryService.subscribeVehicle(id);
  }, []);

  const unsubscribeVehicle = useCallback((id: string) => {
    kafkaTelemetryService.unsubscribeVehicle(id);
  }, []);

  return {
    telemetry,
    status,
    isConnected,
    isReconnecting,
    stats,
    error,
    connect,
    disconnect,
    subscribeVehicle,
    unsubscribeVehicle,
  };
}

// =============================================================================
// useVehicleTelemetry - Vehicle-specific hook
// =============================================================================

export interface UseVehicleTelemetryResult {
  telemetry: TelemetryData | null;
  status: VehicleStatus | null;
  isConnected: boolean;
  position: { lat: number; lon: number; alt: number } | null;
  attitude: { roll: number; pitch: number; yaw: number } | null;
  battery: { voltage: number; remaining: number } | null;
  lastUpdate: Date | null;
}

export function useVehicleTelemetry(vehicleId: string): UseVehicleTelemetryResult {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<VehicleStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const events: KafkaServiceEvents = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onTelemetry: (data: TelemetryData) => {
        if (data.vehicle_id === vehicleId) {
          setTelemetry(data);
          setLastUpdate(new Date());
        }
      },
      onStatus: (data: VehicleStatus) => {
        if (data.vehicle_id === vehicleId) {
          setStatus(data);
        }
      },
    };

    const unsubscribe = kafkaTelemetryService.subscribe(events);
    kafkaTelemetryService.subscribeVehicle(vehicleId);

    return () => {
      unsubscribe();
      kafkaTelemetryService.unsubscribeVehicle(vehicleId);
    };
  }, [vehicleId]);

  const position = useMemo(() => {
    if (!telemetry?.position) return null;
    return {
      lat: telemetry.position.lat,
      lon: telemetry.position.lon,
      alt: telemetry.position.alt,
    };
  }, [telemetry?.position]);

  const attitude = useMemo(() => {
    if (!telemetry?.attitude) return null;
    return {
      roll: telemetry.attitude.roll,
      pitch: telemetry.attitude.pitch,
      yaw: telemetry.attitude.yaw,
    };
  }, [telemetry?.attitude]);

  const battery = useMemo(() => {
    if (!telemetry?.battery) return null;
    return {
      voltage: telemetry.battery.voltage,
      remaining: telemetry.battery.remaining,
    };
  }, [telemetry?.battery]);

  return {
    telemetry,
    status,
    isConnected,
    position,
    attitude,
    battery,
    lastUpdate,
  };
}

// =============================================================================
// useMultiVehicleTelemetry - Multiple vehicles
// =============================================================================

export interface VehicleTelemetryMap {
  [vehicleId: string]: TelemetryData;
}

export interface UseMultiVehicleTelemetryResult {
  vehicles: VehicleTelemetryMap;
  vehicleIds: string[];
  isConnected: boolean;
  subscribeVehicle: (vehicleId: string) => void;
  unsubscribeVehicle: (vehicleId: string) => void;
  getTelemetry: (vehicleId: string) => TelemetryData | undefined;
}

export function useMultiVehicleTelemetry(
  initialVehicleIds: string[] = []
): UseMultiVehicleTelemetryResult {
  const [vehicles, setVehicles] = useState<VehicleTelemetryMap>({});
  const [isConnected, setIsConnected] = useState(false);
  const subscribedRef = useRef<Set<string>>(new Set(initialVehicleIds));

  useEffect(() => {
    const events: KafkaServiceEvents = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onTelemetry: (data: TelemetryData) => {
        if (subscribedRef.current.has(data.vehicle_id)) {
          setVehicles(prev => ({
            ...prev,
            [data.vehicle_id]: data,
          }));
        }
      },
    };

    const unsubscribe = kafkaTelemetryService.subscribe(events);

    // Subscribe to initial vehicles
    initialVehicleIds.forEach(id => {
      kafkaTelemetryService.subscribeVehicle(id);
    });

    return () => {
      unsubscribe();
      subscribedRef.current.forEach(id => {
        kafkaTelemetryService.unsubscribeVehicle(id);
      });
    };
  }, []);

  const subscribeVehicle = useCallback((vehicleId: string) => {
    subscribedRef.current.add(vehicleId);
    kafkaTelemetryService.subscribeVehicle(vehicleId);
  }, []);

  const unsubscribeVehicle = useCallback((vehicleId: string) => {
    subscribedRef.current.delete(vehicleId);
    kafkaTelemetryService.unsubscribeVehicle(vehicleId);
    setVehicles(prev => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  }, []);

  const getTelemetry = useCallback(
    (vehicleId: string) => vehicles[vehicleId],
    [vehicles]
  );

  const vehicleIds = useMemo(() => Object.keys(vehicles), [vehicles]);

  return {
    vehicles,
    vehicleIds,
    isConnected,
    subscribeVehicle,
    unsubscribeVehicle,
    getTelemetry,
  };
}

// =============================================================================
// useTelemetryHistory - Track telemetry history
// =============================================================================

export interface UseTelemetryHistoryResult {
  history: TelemetryData[];
  latest: TelemetryData | null;
  isConnected: boolean;
  clear: () => void;
}

export function useTelemetryHistory(
  vehicleId: string,
  maxHistory: number = 100
): UseTelemetryHistoryResult {
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const events: KafkaServiceEvents = {
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onTelemetry: (data: TelemetryData) => {
        if (data.vehicle_id === vehicleId) {
          setHistory(prev => {
            const next = [...prev, data];
            if (next.length > maxHistory) {
              return next.slice(-maxHistory);
            }
            return next;
          });
        }
      },
    };

    const unsubscribe = kafkaTelemetryService.subscribe(events);
    kafkaTelemetryService.subscribeVehicle(vehicleId);

    return () => {
      unsubscribe();
      kafkaTelemetryService.unsubscribeVehicle(vehicleId);
    };
  }, [vehicleId, maxHistory]);

  const latest = useMemo(() => history[history.length - 1] || null, [history]);

  const clear = useCallback(() => setHistory([]), []);

  return {
    history,
    latest,
    isConnected,
    clear,
  };
}

// =============================================================================
// useKafkaConnection - Connection management only
// =============================================================================

export interface UseKafkaConnectionResult {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
}

export function useKafkaConnection(): UseKafkaConnectionResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const events: KafkaServiceEvents = {
      onConnect: () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        setError(err);
      },
      onReconnecting: (attempt) => {
        setIsReconnecting(true);
        setReconnectAttempt(attempt);
      },
    };

    return kafkaTelemetryService.subscribe(events);
  }, []);

  const connect = useCallback(() => {
    kafkaTelemetryService.connect();
  }, []);

  const disconnect = useCallback(() => {
    kafkaTelemetryService.disconnect();
  }, []);

  return {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    error,
    connect,
    disconnect,
  };
}