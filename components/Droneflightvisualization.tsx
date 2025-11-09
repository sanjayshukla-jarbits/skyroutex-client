'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TelemetryData {
  position?: {
    lat: number;
    lon: number;
    alt: number;
  };
  velocity?: {
    vx: number;
    vy: number;
    vz: number;
  };
  attitude?: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  battery?: {
    voltage: number;
    current: number;
    remaining: number;
  };
  gps?: {
    satellites: number;
    fix_type: number;
    hdop: number;
  };
}

interface DroneStatus {
  connected: boolean;
  armed: boolean;
  flying: boolean;
  current_position: {
    lat: number;
    lon: number;
    alt: number;
  };
  home_position: {
    lat: number;
    lon: number;
    alt: number;
  };
  battery_level: number;
  flight_mode: string;
  mission_active: boolean;
  mission_current: number;
  mission_count: number;
}

interface FlightPath {
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

// CRITICAL FIX: Accept both lng and lon properties
interface MissionWaypoint {
  lat: number;
  lng?: number;  // Preferred property (used by frontend)
  lon?: number;  // Alternative property (used by backend/database)
  alt?: number;
  name?: string;
}

interface SelectedMission {
  id: string;
  name: string;
  waypoints: MissionWaypoint[];
  corridor?: string;
  distance?: number;
  status?: string;
}

interface DroneFlightVisualizationProps {
  selectedMission?: SelectedMission | null;
  onBack?: () => void;
}

// ============================================================================
// HELPER FUNCTION: Safely get waypoint longitude
// ============================================================================

const getWaypointLongitude = (wp: MissionWaypoint): number | undefined => {
  return wp.lng ?? wp.lon;
};

// ============================================================================
// MAP UPDATE COMPONENT
// ============================================================================

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    // CRITICAL FIX: Validate coordinates before setting
    if (center && center.length === 2 && 
        !isNaN(center[0]) && !isNaN(center[1]) &&
        center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DroneFlightVisualization: React.FC<DroneFlightVisualizationProps> = ({ 
  selectedMission = null,
  onBack 
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<DroneStatus | null>(null);
  const [flightPath, setFlightPath] = useState<FlightPath[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentMissionId, setCurrentMissionId] = useState<string>(
    selectedMission?.id || 'MISSION-001'
  );
  const [takeoffAltitude, setTakeoffAltitude] = useState<number>(10);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  
  const telemetryInterval = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
  
  // CRITICAL FIX: Safe default position calculation
  const getDefaultPosition = (): [number, number] => {
    if (selectedMission?.waypoints?.[0]) {
      const firstWp = selectedMission.waypoints[0];
      const lng = getWaypointLongitude(firstWp);
      
      // Validate coordinates before using
      if (firstWp.lat && lng && 
          !isNaN(firstWp.lat) && !isNaN(lng) &&
          firstWp.lat >= -90 && firstWp.lat <= 90 &&
          lng >= -180 && lng <= 180 &&
          firstWp.lat !== 0 && lng !== 0) {
        return [firstWp.lat, lng];
      }
    }
    // Fallback to Lucknow, India
    return [26.8467, 80.9462];
  };
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(getDefaultPosition());
  const [mapZoom, setMapZoom] = useState(selectedMission ? 15 : 18);

  // Update mission ID and map center when selectedMission changes
  useEffect(() => {
    if (selectedMission?.id) {
      setCurrentMissionId(selectedMission.id);
      
      // Update map center to first valid waypoint
      const newCenter = getDefaultPosition();
      setMapCenter(newCenter);
      
      showToast(`Mission "${selectedMission.name}" loaded`, 'success');
    }
  }, [selectedMission?.id]);

  // ============================================================================
  // CUSTOM ICONS
  // ============================================================================

  const createDroneIcon = (armed: boolean, flying: boolean, yaw: number = 0) => {
    const color = flying ? '#22c55e' : armed ? '#eab308' : '#3b82f6';
    const size = flying ? 40 : 32;
    
    return L.divIcon({
      className: 'custom-drone-icon',
      html: `
        <div style="
          transform: rotate(${yaw}deg);
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Drone body -->
            <circle cx="12" cy="12" r="3" fill="${color}" stroke="white" stroke-width="1"/>
            
            <!-- Propeller arms -->
            <line x1="12" y1="12" x2="6" y2="6" stroke="${color}" stroke-width="2"/>
            <line x1="12" y1="12" x2="18" y2="6" stroke="${color}" stroke-width="2"/>
            <line x1="12" y1="12" x2="6" y2="18" stroke="${color}" stroke-width="2"/>
            <line x1="12" y1="12" x2="18" y2="18" stroke="${color}" stroke-width="2"/>
            
            <!-- Propellers -->
            <circle cx="6" cy="6" r="2.5" fill="${color}" opacity="0.6"/>
            <circle cx="18" cy="6" r="2.5" fill="${color}" opacity="0.6"/>
            <circle cx="6" cy="18" r="2.5" fill="${color}" opacity="0.6"/>
            <circle cx="18" cy="18" r="2.5" fill="${color}" opacity="0.6"/>
            
            <!-- Direction indicator (front) -->
            <path d="M 12 9 L 14 7 L 12 5 L 10 7 Z" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const createHomeIcon = () => {
    return L.divIcon({
      className: 'custom-home-icon',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12L12 3L21 12H19V20H14V15H10V20H5V12H3Z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="10" r="2" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const createWaypointIcon = (index: number, isActive: boolean = false) => {
    const color = isActive ? '#22c55e' : '#3b82f6';
    return L.divIcon({
      className: 'custom-waypoint-icon',
      html: `
        <div style="
          background: ${color};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${index + 1}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // ============================================================================
  // HELPER FUNCTIONS FOR SAFE COORDINATE HANDLING
  // ============================================================================
  
  const isValidCoordinate = (lat: number | undefined, lon: number | undefined): boolean => {
    return (
      lat !== undefined && 
      lon !== undefined && 
      !isNaN(lat) && 
      !isNaN(lon) && 
      lat !== 0 && 
      lon !== 0 &&
      lat >= -90 && 
      lat <= 90 && 
      lon >= -180 && 
      lon <= 180
    );
  };
  
  const getValidPosition = (
    telemetryLat?: number, 
    telemetryLon?: number,
    statusLat?: number,
    statusLon?: number
  ): [number, number] => {
    if (isValidCoordinate(telemetryLat, telemetryLon)) {
      return [telemetryLat!, telemetryLon!];
    }
    if (isValidCoordinate(statusLat, statusLon)) {
      return [statusLat!, statusLon!];
    }
    return getDefaultPosition();
  };
  
  const updateMapCenter = (lat?: number, lon?: number) => {
    if (isValidCoordinate(lat, lon)) {
      setMapCenter([lat!, lon!]);
    }
  };

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchStatus = async () => {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        if (data.success || data.data) {
          const statusData = data.data || data;
          setStatus(statusData);
          setIsConnected(statusData.connected);
          
          // Safely update map center with validation (only if flying)
          if (statusData.current_position && statusData.flying) {
            const { lat, lon } = statusData.current_position;
            if (isValidCoordinate(lat, lon)) {
              setMapCenter([lat, lon]);
            }
          }
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        setIsConnected(false);
    }
  };

  const fetchTelemetry = async () => {
    try {
        const response = await fetch(`${API_BASE}/telemetry`);
        const data = await response.json();
        
        setTelemetry(data);
        
        // Add to flight path and update map only if position is valid
        if (data.position) {
          const { lat, lon, alt } = data.position;
          
          if (isValidCoordinate(lat, lon)) {
            const newPoint: FlightPath = {
              lat,
              lon,
              alt,
              timestamp: Date.now(),
            };
            
            setFlightPath(prev => {
              const updated = [...prev, newPoint];
              return updated.slice(-500);
            });
            
            // Update map center to follow drone (only when flying)
            if (status?.flying) {
              setMapCenter([lat, lon]);
            }
          }
        }
    } catch (error) {
        console.error('Error fetching telemetry:', error);
    }
  };

  const handleCommand = async (
    endpoint: string,
    body: any,
    loadingKey: string,
    successMessage: string
    ) => {
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (response.status === 422) {
        // Validation error - show details
        console.error('Validation error:', data);
        showToast(`Validation failed: ${JSON.stringify(data.detail)}`, 'error');
        return;
        }
        
        if (data.success) {
        showToast(successMessage, 'success');
        
        if (loadingKey === 'arm') {
          console.log('✅ Optimistic update: Setting armed = true');
          setStatus(prev => prev ? { ...prev, armed: true } : null);
        } else if (loadingKey === 'disarm') {
          console.log('✅ Optimistic update: Setting armed = false');
          setStatus(prev => prev ? { ...prev, armed: false } : null);
        } else if (loadingKey === 'takeoff') {
          console.log('✅ Optimistic update: Setting flying = true');
          setStatus(prev => prev ? { ...prev, flying: true, armed: true } : null);
        } else if (loadingKey === 'land') {
          console.log('✅ Optimistic update: Setting flying = false');
          setStatus(prev => prev ? { ...prev, flying: false } : null);
        }
        
        const verifyStatus = async (retries: number = 3) => {
          for (let i = 0; i < retries; i++) {
            await new Promise(resolve => setTimeout(resolve, 300 + (i * 200))); // Incremental delay
            await fetchStatus();
            
            // Log status check
            if (i < retries - 1) {
              console.log(`Status verification attempt ${i + 1}/${retries}`);
            } else {
              console.log('✅ Status verification complete');
            }
          }
        };
        
        // Run verification in background
        verifyStatus();
        } else {
        showToast(data.message || 'Command failed', 'error');
        }
    } catch (error) {
        console.error(`Error executing ${loadingKey}:`, error);
        showToast(`Failed to ${loadingKey}`, 'error');
    } finally {
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleStartMission = () => {
    handleCommand(
      `/api/v1/missions/${currentMissionId}/start`,
      { force_start: false },
      'start',
      'Mission started successfully'
    );
  };

  const handleArm = () => {
    // Add validation
    if (!currentMissionId) {
        showToast('No mission selected. Please load a mission first.', 'error');
        return;
    }
    
    console.log('🔓 ARM button clicked - Mission ID:', currentMissionId);
    
    handleCommand(
        '/api/v1/vehicle/arm',
        { mission_id: String(currentMissionId), force_arm: false },
        'arm',
        '✅ Vehicle armed successfully'
    );
  };

   // Also add to other commands
  const handleDisarm = () => {
    if (!currentMissionId) {
        showToast('No mission selected', 'error');
        return;
    }
    
    console.log('🔒 DISARM button clicked - Mission ID:', currentMissionId);
    
    handleCommand(
        '/api/v1/vehicle/disarm',
        { mission_id: String(currentMissionId) },
        'disarm',
        '✅ Vehicle disarmed successfully'
    );
  };

  const handleTakeoff = () => {
    console.log('🚀 TAKEOFF button clicked - Mission ID:', currentMissionId);
    
    handleCommand(
      '/api/v1/vehicle/takeoff',
      { mission_id: String(currentMissionId), altitude: takeoffAltitude },
      'takeoff',
      `✅ Takeoff initiated to ${takeoffAltitude}m`
    );
  };

  const handleLand = () => {
    console.log('⬇️ LAND button clicked - Mission ID:', currentMissionId);
    
    handleCommand(
      '/api/v1/vehicle/land',
      { mission_id: String(currentMissionId) },
      'land',
      '✅ Landing initiated'
    );
  };

  const handleRTL = () => {
    console.log('🏠 RTL button clicked - Mission ID:', currentMissionId);
    
    handleCommand(
      '/api/v1/vehicle/rtl',
      { mission_id: String(currentMissionId) },
      'rtl',
      '✅ Return to launch initiated'
    );
  };

  const connectToSimulator = async () => {
    try {
        setLoading(prev => ({ ...prev, connect: true }));
        showToast('Connecting to simulator...', 'info');
        
        const response = await fetch(`${API_BASE}/connect`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Connection failed' }));
          throw new Error(errorData.detail || 'Failed to connect');
        }
        
        const data = await response.json();
        
        if (data.success) {
          showToast('✅ Connected to PX4 SITL', 'success');
          setIsConnected(true);
          
          await fetchStatus();
          startTelemetryUpdates();
        } else {
          throw new Error(data.message || 'Connection failed');
        }
    } catch (error: any) {
        console.error('❌ Connection error:', error);
        showToast(
          error.message || 'Failed to connect to simulator. Check if PX4 SITL is running.',
          'error'
        );
        setIsConnected(false);
    } finally {
        setLoading(prev => ({ ...prev, connect: false }));
    }
  };

  const startTelemetryUpdates = () => {
    // Clear any existing interval first
    if (telemetryInterval.current) {
        clearInterval(telemetryInterval.current);
        telemetryInterval.current = null;
    }
    
    // Start new interval
    telemetryInterval.current = setInterval(() => {
        fetchStatus();
        fetchTelemetry();
    }, 1000);
    
    console.log('✅ Telemetry updates started');
  };

  const stopTelemetryUpdates = () => {
    if (telemetryInterval.current) {
        clearInterval(telemetryInterval.current);
        telemetryInterval.current = null;
        console.log('🛑 Telemetry updates stopped');
    }
  };

  // ============================================================================
  // TOAST NOTIFICATION
  // ============================================================================

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    let isMounted = true;
    
    const initializeConnection = async () => {
        if (!isMounted) return;
        
        try {
        setLoading(prev => ({ ...prev, connect: true }));
        showToast('Connecting to simulator...', 'info');
        
        const response = await fetch(`${API_BASE}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
            throw new Error('Failed to connect');
        }
        
        const data = await response.json();
        
        if (data.success && isMounted) {
            showToast('✅ Connected to PX4 SITL', 'success');
            setIsConnected(true);
            
            // Fetch initial status once
            await fetchStatus();
            
            // Start telemetry polling (single interval)
            if (isMounted && !telemetryInterval.current) {
            telemetryInterval.current = setInterval(() => {
                fetchStatus();
                fetchTelemetry();
            }, 1000);
            }
        }
        } catch (error: any) {
        if (isMounted) {
            console.error('❌ Connection error:', error);
            showToast('Failed to connect to simulator', 'error');
            setIsConnected(false);
        }
        } finally {
        if (isMounted) {
            setLoading(prev => ({ ...prev, connect: false }));
        }
        }
    };
    
    initializeConnection();
    
    // Cleanup on unmount
    return () => {
        isMounted = false;
        
        if (telemetryInterval.current) {
        clearInterval(telemetryInterval.current);
        telemetryInterval.current = null;
        }
        if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        }
    };
    }, []); // Run once on mount

    // Effect: Handle selected mission changes
    useEffect(() => {
    if (selectedMission?.id) {
        setCurrentMissionId(selectedMission.id);
        
        // Update map center
        const newCenter = getDefaultPosition();
        setMapCenter(newCenter);
        
        // Show mission loaded notification (separate from connection)
        showToast(`Mission "${selectedMission.name}" loaded`, 'success');
    }
  }, [selectedMission?.id]); // Only when mission ID changes

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const dronePosition: [number, number] = getValidPosition(
    telemetry?.position?.lat,
    telemetry?.position?.lon,
    status?.current_position?.lat,
    status?.current_position?.lon
  );

  const homePosition: [number, number] = getValidPosition(
    undefined,
    undefined,
    status?.home_position?.lat,
    status?.home_position?.lon
  );

  const pathCoordinates: [number, number][] = flightPath
    .filter(point => isValidCoordinate(point.lat, point.lon))
    .map(point => [point.lat, point.lon]);

  // CRITICAL FIX: Filter and validate waypoints before rendering
  const getValidWaypoints = () => {
    if (!selectedMission?.waypoints || selectedMission.waypoints.length === 0) {
      return [];
    }

    return selectedMission.waypoints.filter(wp => {
      const lng = getWaypointLongitude(wp);
      const isValid = isValidCoordinate(wp.lat, lng);
      
      if (!isValid) {
        console.warn('Invalid waypoint detected:', wp);
      }
      
      return isValid;
    });
  };

  const validWaypoints = getValidWaypoints();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full w-full bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Back to Missions"
              >
                <ArrowLeft size={24} className="text-white" />
              </button>
            )}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Mission Monitor</h1>
                {selectedMission && (
                  <p className="text-sm text-gray-400 mt-1">
                    Mission: {selectedMission.name}
                    {selectedMission.corridor && ` • ${selectedMission.corridor}`}
                  </p>
                )}
              </div>
              
              {/* Mission Info in Header */}
              {selectedMission && (
                <div className="flex items-center gap-4 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Mission ID:</span>
                    <span className="text-sm font-mono text-blue-400 font-semibold">{selectedMission.id}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-700"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Waypoints:</span>
                    <span className="text-sm text-white font-semibold">{validWaypoints.length} / {selectedMission.waypoints.length}</span>
                  </div>
                  {selectedMission.distance && (
                    <>
                      <div className="h-4 w-px bg-gray-700"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Distance:</span>
                        <span className="text-sm text-white font-semibold">{selectedMission.distance.toFixed(2)} km</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Manual Connect Button (only if not connected) */}
            {!isConnected && (
              <button
                onClick={connectToSimulator}
                disabled={loading.connect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {loading.connect ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Reconnect'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map Section */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
            
            {/* Flight path */}
            {pathCoordinates.length > 1 && (
              <Polyline
                positions={pathCoordinates}
                color="#22c55e"
                weight={3}
                opacity={0.6}
              />
            )}

            {/* Mission Waypoints - FIXED VERSION */}
            {validWaypoints.length > 0 && (
              <>
                {/* Waypoint Markers */}
                {validWaypoints.map((wp, index) => {
                  const lng = getWaypointLongitude(wp)!; // Safe because filtered
                  
                  return (
                    <Marker
                      key={`wp-${index}`}
                      position={[wp.lat, lng]}
                      icon={createWaypointIcon(index, status?.mission_current === index + 1)}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong>Waypoint {index + 1}</strong>
                          {wp.name && <><br />{wp.name}</>}
                          <br />
                          Lat: {wp.lat.toFixed(6)}
                          <br />
                          Lon: {lng.toFixed(6)}
                          {wp.alt && (
                            <>
                              <br />
                              Alt: {wp.alt} m
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Waypoint Path */}
                <Polyline
                  positions={validWaypoints.map(wp => [wp.lat, getWaypointLongitude(wp)!])}
                  color="#3b82f6"
                  weight={2}
                  opacity={0.7}
                  dashArray="5, 10"
                />
              </>
            )}
            
            {/* Home position */}
            <Marker position={homePosition} icon={createHomeIcon()} />
            
            {/* Drone position */}
            <Marker
              position={dronePosition}
              icon={createDroneIcon(
                status?.armed || false,
                status?.flying || false,
                telemetry?.attitude?.yaw || 0
              )}
            />
          </MapContainer>

          {/* Map overlay - Telemetry display */}
          <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 border border-gray-700 min-w-[300px] z-[1000]">
            <h3 className="text-lg font-semibold text-white mb-3">Live Telemetry</h3>
            
            <div className="space-y-2 text-sm">
                {/* Status Indicators */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Status:</span>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      status?.armed ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {status?.armed ? 'ARMED' : 'DISARMED'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      status?.flying ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {status?.flying ? 'FLYING' : 'LANDED'}
                    </span>
                  </div>
                </div>

                {/* Flight Mode */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Mode:</span>
                  <span className="text-blue-400 font-mono">{status?.flight_mode ?? 'N/A'}</span>
                </div>

                {/* Position */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Position:</span>
                  <div className="text-white font-mono text-xs">
                    <div>
                      Lat: {
                        telemetry?.position?.lat !== undefined 
                        ? telemetry.position.lat.toFixed(6)
                        : status?.current_position?.lat !== undefined
                        ? status.current_position.lat.toFixed(6)
                        : 'N/A'
                      }
                    </div>
                    <div>
                      Lon: {
                        telemetry?.position?.lon !== undefined 
                        ? telemetry.position.lon.toFixed(6)
                        : status?.current_position?.lon !== undefined
                        ? status.current_position.lon.toFixed(6)
                        : 'N/A'
                      }
                    </div>
                    <div>
                      Alt: {
                        (telemetry?.position?.alt !== undefined 
                        ? telemetry.position.alt
                        : status?.current_position?.alt !== undefined
                        ? status.current_position.alt
                        : 0
                        ).toFixed(1)
                      }m
                    </div>
                  </div>
                </div>

                {/* Velocity */}
                {telemetry?.velocity && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-20">Velocity:</span>
                    <div className="text-white font-mono text-xs">
                      <div>X: {(telemetry.velocity.vx ?? 0).toFixed(2)} m/s</div>
                      <div>Y: {(telemetry.velocity.vy ?? 0).toFixed(2)} m/s</div>
                      <div>Z: {(telemetry.velocity.vz ?? 0).toFixed(2)} m/s</div>
                    </div>
                  </div>
                )}

                {/* Attitude */}
                {telemetry?.attitude && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-20">Attitude:</span>
                    <div className="text-white font-mono text-xs">
                      <div>Roll: {((telemetry.attitude.roll ?? 0) * 180 / Math.PI).toFixed(1)}°</div>
                      <div>Pitch: {((telemetry.attitude.pitch ?? 0) * 180 / Math.PI).toFixed(1)}°</div>
                      <div>Yaw: {((telemetry.attitude.yaw ?? 0) * 180 / Math.PI).toFixed(1)}°</div>
                    </div>
                  </div>
                )}

                {/* Battery */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-20">Battery:</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            (telemetry?.battery?.remaining ?? status?.battery_level ?? 0) > 50
                            ? 'bg-green-500'
                            : (telemetry?.battery?.remaining ?? status?.battery_level ?? 0) > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${telemetry?.battery?.remaining ?? status?.battery_level ?? 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-white font-bold min-w-[45px]">
                        {(telemetry?.battery?.remaining ?? status?.battery_level ?? 0).toFixed(0)}%
                      </span>
                    </div>
                    {telemetry?.battery && (
                      <div className="text-xs text-gray-400 mt-1">
                        {(telemetry.battery.voltage ?? 0).toFixed(2)}V / {(telemetry.battery.current ?? 0).toFixed(2)}A
                      </div>
                    )}
                  </div>
                </div>

                {/* GPS */}
                {telemetry?.gps && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-20">GPS:</span>
                    <div className="text-white font-mono text-xs">
                      <div>Sats: {telemetry.gps.satellites ?? 0}</div>
                      <div>Fix: {telemetry.gps.fix_type ?? 0}</div>
                      <div>HDOP: {(telemetry.gps.hdop ?? 0).toFixed(2)}</div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-6">Mission Controls</h2>

          {/* Mission ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Mission ID
            </label>
            <input
              type="text"
              value={currentMissionId}
              onChange={(e) => setCurrentMissionId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter mission ID"
            />
          </div>

          {/* Takeoff Altitude */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Takeoff Altitude (m)
            </label>
            <input
              type="number"
              value={takeoffAltitude}
              onChange={(e) => setTakeoffAltitude(Number(e.target.value))}
              min="1"
              max="100"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mission Control Buttons */}
          <div className="space-y-3">
            {/* Start Mission */}
            <button
              onClick={handleStartMission}
              disabled={!isConnected || loading.start}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.start ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <span>▶️</span>
                  Start Mission
                </>
              )}
            </button>

            {/* Arm */}
            <button
              onClick={handleArm}
              disabled={!isConnected || status?.armed || loading.arm}
              className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.arm ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Arming...
                </>
              ) : (
                <>
                  <span>🔓</span>
                  Arm Vehicle
                </>
              )}
            </button>

            {/* Disarm */}
            <button
              onClick={handleDisarm}
              disabled={!isConnected || !status?.armed || loading.disarm}
              className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.disarm ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Disarming...
                </>
              ) : (
                <>
                  <span>🔒</span>
                  Disarm Vehicle
                </>
              )}
            </button>

            {/* Takeoff */}
            <button
              onClick={handleTakeoff}
              disabled={!isConnected || !status?.armed || status?.flying || loading.takeoff}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.takeoff ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Taking Off...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Takeoff
                </>
              )}
            </button>

            {/* Land */}
            <button
              onClick={handleLand}
              disabled={!isConnected || !status?.flying || loading.land}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.land ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Landing...
                </>
              ) : (
                <>
                  <span>⬇️</span>
                  Land
                </>
              )}
            </button>

            {/* Return to Launch */}
            <button
              onClick={handleRTL}
              disabled={!isConnected || !status?.flying || loading.rtl}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading.rtl ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Returning...
                </>
              ) : (
                <>
                  <span>🏠</span>
                  Return to Launch
                </>
              )}
            </button>
          </div>

          {/* Status Summary */}
          <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-3">System Status</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Connected:</span>
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Armed:</span>
                <span className={status?.armed ? 'text-yellow-400' : 'text-gray-500'}>
                  {status?.armed ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Flying:</span>
                <span className={status?.flying ? 'text-green-400' : 'text-gray-500'}>
                  {status?.flying ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mission Active:</span>
                <span className={status?.mission_active ? 'text-blue-400' : 'text-gray-500'}>
                  {status?.mission_active ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Flight Path Points:</span>
                <span className="text-white">{flightPath.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Altitude</div>
              <div className="text-lg font-bold text-white">
                {(telemetry?.position?.alt || status?.current_position?.alt || 0).toFixed(1)}m
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Battery</div>
              <div className="text-lg font-bold text-white">
                {(telemetry?.battery?.remaining || status?.battery_level || 0).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default DroneFlightVisualization;