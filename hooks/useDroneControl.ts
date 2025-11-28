/**
 * useDroneControl Hook
 * Custom React hook for managing drone control state and operations
 * Provides a clean interface for drone connections, commands, and telemetry
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import droneControlService from '@/services/droneControlService';
import { 
  TelemetryData, 
  CommandResponse,
  MissionWaypoint,
  Waypoint 
} from '@/types/types';

interface UseDroneControlOptions {
  autoConnect?: boolean;
  connectionString?: string;
  onConnectionChange?: (connected: boolean) => void;
  onTelemetryUpdate?: (telemetry: TelemetryData) => void;
  onError?: (error: string) => void;
}

interface DroneControlState {
  // Connection
  connected: boolean;
  connecting: boolean;
  
  // Drone status
  armed: boolean;
  mode: string;
  
  // Mission status
  missionUploaded: boolean;
  missionRunning: boolean;
  
  // Telemetry
  telemetry: TelemetryData | null;
  
  // Loading states
  loading: boolean;
  arming: boolean;
  disarming: boolean;
  takingOff: boolean;
  uploadingMission: boolean;
  startingMission: boolean;
  stoppingMission: boolean;
  
  // Error state
  error: string | null;
}

interface DroneControlActions {
  // Connection
  connect: (connectionString?: string) => Promise<void>;
  disconnect: () => void;
  
  // Basic controls
  arm: () => Promise<boolean>;
  disarm: () => Promise<boolean>;
  takeoff: (altitude?: number) => Promise<boolean>;
  land: () => Promise<boolean>;
  returnToLaunch: () => Promise<boolean>;
  
  // Mission controls
  uploadMission: (missionId: string, waypoints: Waypoint[]) => Promise<boolean>;
  startMission: () => Promise<boolean>;
  pauseMission: () => Promise<boolean>;
  resumeMission: () => Promise<boolean>;
  stopMission: () => Promise<boolean>;
  
  // Telemetry
  startTelemetryStream: () => void;
  stopTelemetryStream: () => void;
  
  // Utility
  clearError: () => void;
  resetState: () => void;
}

interface UseDroneControlReturn extends DroneControlState, DroneControlActions {
  // Computed values
  isReady: boolean;
  canArm: boolean;
  canTakeoff: boolean;
  canUploadMission: boolean;
  canStartMission: boolean;
  batteryPercentage: number;
  gpsQuality: 'none' | 'poor' | 'fair' | 'good' | 'excellent';
}

export function useDroneControl(options: UseDroneControlOptions = {}): UseDroneControlReturn {
  const {
    autoConnect = false,
    connectionString,
    onConnectionChange,
    onTelemetryUpdate,
    onError
  } = options;

  // State
  const [state, setState] = useState<DroneControlState>({
    connected: false,
    connecting: false,
    armed: false,
    mode: 'UNKNOWN',
    missionUploaded: false,
    missionRunning: false,
    telemetry: null,
    loading: false,
    arming: false,
    disarming: false,
    takingOff: false,
    uploadingMission: false,
    startingMission: false,
    stoppingMission: false,
    error: null
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);

  // Update state helper
  const updateState = useCallback((updates: Partial<DroneControlState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Error handler
  const handleError = useCallback((error: string) => {
    updateState({ error, loading: false });
    if (onError) {
      onError(error);
    }
  }, [updateState, onError]);

  // Connect to drone
  const connect = useCallback(async (connStr?: string): Promise<void> => {
    updateState({ connecting: true, error: null });
    
    try {
      const response = await droneControlService.connect(connStr || connectionString);
      
      if (response.success) {
        updateState({ 
          connected: true, 
          connecting: false,
          error: null 
        });
        
        if (onConnectionChange) {
          onConnectionChange(true);
        }
        
        // Auto-start telemetry stream
        startTelemetryStream();
      } else {
        handleError('Failed to connect to drone');
        updateState({ connecting: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection error';
      handleError(errorMessage);
      updateState({ connecting: false });
    }
  }, [connectionString, handleError, onConnectionChange, updateState]);

  // Disconnect from drone
  const disconnect = useCallback(() => {
    stopTelemetryStream();
    updateState({ 
      connected: false,
      armed: false,
      missionUploaded: false,
      missionRunning: false,
      telemetry: null
    });
    
    if (onConnectionChange) {
      onConnectionChange(false);
    }
  }, [onConnectionChange, updateState]);

  // Arm drone
  const arm = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ arming: true, error: null });
    
    try {
      const response = await droneControlService.arm();
      
      if (response.success) {
        updateState({ armed: true, arming: false });
        return true;
      } else {
        handleError('Failed to arm drone');
        updateState({ arming: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Arm error';
      handleError(errorMessage);
      updateState({ arming: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Disarm drone
  const disarm = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ disarming: true, error: null });
    
    try {
      const response = await droneControlService.disarm();
      
      if (response.success) {
        updateState({ armed: false, disarming: false });
        return true;
      } else {
        handleError('Failed to disarm drone');
        updateState({ disarming: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disarm error';
      handleError(errorMessage);
      updateState({ disarming: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Takeoff
  const takeoff = useCallback(async (altitude: number = 10): Promise<boolean> => {
    if (!state.connected || !state.armed) {
      handleError('Drone must be connected and armed');
      return false;
    }

    updateState({ takingOff: true, error: null });
    
    try {
      const response = await droneControlService.takeoff(altitude);
      
      if (response.success) {
        updateState({ takingOff: false });
        return true;
      } else {
        handleError('Failed to takeoff');
        updateState({ takingOff: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Takeoff error';
      handleError(errorMessage);
      updateState({ takingOff: false });
      return false;
    }
  }, [state.connected, state.armed, handleError, updateState]);

  // Land
  const land = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ loading: true, error: null });
    
    try {
      const response = await droneControlService.land();
      
      if (response.success) {
        updateState({ loading: false });
        return true;
      } else {
        handleError('Failed to land');
        updateState({ loading: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Land error';
      handleError(errorMessage);
      updateState({ loading: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Return to launch
  const returnToLaunch = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ loading: true, error: null });
    
    try {
      const response = await droneControlService.returnToLaunch();
      
      if (response.success) {
        updateState({ 
          missionRunning: false,
          loading: false 
        });
        return true;
      } else {
        handleError('Failed to return to launch');
        updateState({ loading: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'RTL error';
      handleError(errorMessage);
      updateState({ loading: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Upload mission
  const uploadMission = useCallback(async (
    missionId: string, 
    waypoints: Waypoint[]
  ): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ uploadingMission: true, error: null });
    
    try {
      const formattedWaypoints = droneControlService.formatWaypoints(waypoints);
      const response = await droneControlService.uploadMission(missionId, formattedWaypoints);
      
      if (response.success) {
        updateState({ 
          missionUploaded: true,
          uploadingMission: false 
        });
        return true;
      } else {
        handleError('Failed to upload mission');
        updateState({ uploadingMission: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mission upload error';
      handleError(errorMessage);
      updateState({ uploadingMission: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Start mission
  const startMission = useCallback(async (): Promise<boolean> => {
    if (!state.connected || !state.missionUploaded) {
      handleError('Drone not connected or mission not uploaded');
      return false;
    }

    updateState({ startingMission: true, error: null });
    
    try {
      const response = await droneControlService.startMission();
      
      if (response.success) {
        updateState({ 
          missionRunning: true,
          startingMission: false 
        });
        return true;
      } else {
        handleError('Failed to start mission');
        updateState({ startingMission: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mission start error';
      handleError(errorMessage);
      updateState({ startingMission: false });
      return false;
    }
  }, [state.connected, state.missionUploaded, handleError, updateState]);

  // Pause mission
  const pauseMission = useCallback(async (): Promise<boolean> => {
    if (!state.connected || !state.missionRunning) {
      handleError('No mission running');
      return false;
    }

    updateState({ loading: true, error: null });
    
    try {
      const response = await droneControlService.pauseMission();
      
      if (response.success) {
        updateState({ loading: false });
        return true;
      } else {
        handleError('Failed to pause mission');
        updateState({ loading: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mission pause error';
      handleError(errorMessage);
      updateState({ loading: false });
      return false;
    }
  }, [state.connected, state.missionRunning, handleError, updateState]);

  // Resume mission
  const resumeMission = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ loading: true, error: null });
    
    try {
      const response = await droneControlService.resumeMission();
      
      if (response.success) {
        updateState({ loading: false });
        return true;
      } else {
        handleError('Failed to resume mission');
        updateState({ loading: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mission resume error';
      handleError(errorMessage);
      updateState({ loading: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Stop mission
  const stopMission = useCallback(async (): Promise<boolean> => {
    if (!state.connected) {
      handleError('Drone not connected');
      return false;
    }

    updateState({ stoppingMission: true, error: null });
    
    try {
      const response = await droneControlService.stopMission();
      
      if (response.success) {
        updateState({ 
          missionRunning: false,
          stoppingMission: false 
        });
        return true;
      } else {
        handleError('Failed to stop mission');
        updateState({ stoppingMission: false });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mission stop error';
      handleError(errorMessage);
      updateState({ stoppingMission: false });
      return false;
    }
  }, [state.connected, handleError, updateState]);

  // Start telemetry stream
  const startTelemetryStream = useCallback(() => {
    if (wsRef.current) {
      return; // Already streaming
    }

    wsRef.current = droneControlService.startTelemetryStream({
      onMessage: (data: TelemetryData) => {
        updateState({ 
          telemetry: data,
          armed: data.armed,
          mode: data.mode
        });
        
        if (onTelemetryUpdate) {
          onTelemetryUpdate(data);
        }
      },
      onError: (error: Event) => {
        console.error('Telemetry stream error:', error);
        handleError('Telemetry stream error');
      },
      onClose: () => {
        console.log('Telemetry stream closed');
        wsRef.current = null;
      }
    });
  }, [handleError, onTelemetryUpdate, updateState]);

  // Stop telemetry stream
  const stopTelemetryStream = useCallback(() => {
    if (wsRef.current) {
      droneControlService.stopTelemetryStream();
      wsRef.current = null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Reset state
  const resetState = useCallback(() => {
    stopTelemetryStream();
    setState({
      connected: false,
      connecting: false,
      armed: false,
      mode: 'UNKNOWN',
      missionUploaded: false,
      missionRunning: false,
      telemetry: null,
      loading: false,
      arming: false,
      disarming: false,
      takingOff: false,
      uploadingMission: false,
      startingMission: false,
      stoppingMission: false,
      error: null
    });
  }, [stopTelemetryStream]);

  // Computed values
  const isReady = state.connected && state.telemetry !== null;
  const canArm = state.connected && !state.armed && !state.arming;
  const canTakeoff = state.connected && state.armed && !state.takingOff;
  const canUploadMission = state.connected && !state.uploadingMission;
  const canStartMission = state.connected && state.missionUploaded && !state.missionRunning;
  const batteryPercentage = state.telemetry?.battery_remaining ?? 0;
  
  const gpsQuality = (() => {
    if (!state.telemetry) return 'none';
    const fix = state.telemetry.gps_fix;
    const sats = state.telemetry.satellites_visible;
    
    if (fix < 2) return 'none';
    if (fix === 2) return 'poor';
    if (fix === 3 && sats < 8) return 'fair';
    if (fix === 3 && sats >= 8) return 'good';
    return 'excellent';
  })();

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      stopTelemetryStream();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    arm,
    disarm,
    takeoff,
    land,
    returnToLaunch,
    uploadMission,
    startMission,
    pauseMission,
    resumeMission,
    stopMission,
    startTelemetryStream,
    stopTelemetryStream,
    clearError,
    resetState,
    
    // Computed
    isReady,
    canArm,
    canTakeoff,
    canUploadMission,
    canStartMission,
    batteryPercentage,
    gpsQuality
  };
}

export default useDroneControl;