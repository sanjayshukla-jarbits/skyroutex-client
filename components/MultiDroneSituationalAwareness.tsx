'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Plane, 
  Radio, 
  Battery, 
  Navigation, 
  Eye,
  MapPin,
  Activity,
  Circle,
  AlertTriangle,
  X,
  Target,
  Clock,
  Gauge,
  Wifi,
  WifiOff,
  Play,
  Pause
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// ============================================================================
// FIX LEAFLET ICONS
// ============================================================================

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Position {
  lat: number;
  lon: number;
  alt: number;
}

interface DemoWaypoint {
  lat: number;
  lon: number;
  alt: number;
  label?: string;
}

interface DemoDrone {
  id: string;
  name: string;
  callsign: string;
  type: 'surveillance' | 'campus' | 'highway' | 'regional';
  position: Position;
  waypoints: DemoWaypoint[];
  status: 'active' | 'patrol' | 'rtl' | 'standby';
  battery: number;
  speed: number;
  heading: number;
  corridor: string;
  corridorColor: string;
  mission: string;
}

interface AnimatedDroneState {
  position: Position;
  heading: number;
  currentWaypointIndex: number;
  progress: number;
}

interface SelectedMissionData {
  id: number | string;
  mission_name: string;
  mission_type?: string;
  status?: string;
  corridor_label?: string;
  corridor_value?: string;
  corridor_color?: string;
  total_distance?: number;
  flight_time?: number;
  battery_usage?: number;
  created_at?: string;
  updated_at?: string;
  waypoints: Array<{
    lat: number;
    lon: number;
    lng?: number;
    alt?: number;
    label?: string;
  }>;
}

interface TelemetryData {
  timestamp?: string;
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
  armed?: boolean;
  mode?: string;
  mission_current?: number;
  mission_count?: number;
}

interface FlightPathPoint {
  lat: number;
  lon: number;
  timestamp: number;
}

// ============================================================================
// ANIMATED HELICOPTER ICON FOR MISSION DRONE (WITH SPINNING ROTORS)
// ============================================================================

const createAnimatedHelicopterIcon = (color: string, heading: number = 0, size: number = 48, isLive: boolean = false) => {
  // Animation class for spinning rotors
  const rotorAnimation = isLive ? 'animate-spin' : '';
  
  const helicopterSVG = `
    <div style="width: ${size}px; height: ${size}px; position: relative; transform: rotate(${heading}deg);">
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Main Rotor (Top) - Animated when live -->
        <g class="${rotorAnimation}" style="transform-origin: 24px 12px; ${isLive ? 'animation: spin 0.3s linear infinite;' : ''}">
          <ellipse cx="24" cy="12" rx="18" ry="3" fill="${color}" opacity="0.5"/>
          <line x1="6" y1="12" x2="42" y2="12" stroke="${color}" stroke-width="2.5" opacity="0.8"/>
          <line x1="24" y1="0" x2="24" y2="24" stroke="${color}" stroke-width="2" opacity="0.6"/>
        </g>
        
        <!-- Rotor Hub -->
        <circle cx="24" cy="12" r="3.5" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="24" cy="12" r="1.5" fill="white"/>
        
        <!-- Rotor Mast -->
        <rect x="22.5" y="12" width="3" height="8" fill="${color}" stroke="white" stroke-width="1"/>
        
        <!-- Main Body (Fuselage) -->
        <ellipse cx="24" cy="26" rx="9" ry="11" fill="${color}" stroke="white" stroke-width="2.5"/>
        
        <!-- Cockpit Window -->
        <ellipse cx="24" cy="22" rx="6" ry="5" fill="white" opacity="0.9" stroke="${color}" stroke-width="1.5"/>
        <ellipse cx="24" cy="22" rx="4" ry="3" fill="${isLive ? '#22c55e' : color}" opacity="0.4"/>
        
        <!-- Glass Reflection -->
        <ellipse cx="22" cy="20" rx="2" ry="1.5" fill="white" opacity="0.6"/>
        
        <!-- Tail Boom -->
        <path d="M 32 26 L 44 26.5 Q 46 26.5 46 28 L 46 28 Q 46 29.5 44 29.5 L 32 30" 
              fill="${color}" stroke="white" stroke-width="2"/>
        
        <!-- Tail Rotor - Animated when live -->
        <g style="transform-origin: 45px 28px; ${isLive ? 'animation: spin 0.2s linear infinite;' : ''}">
          <circle cx="45" cy="28" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <line x1="45" y1="24" x2="45" y2="32" stroke="white" stroke-width="1.5" opacity="0.9"/>
          <line x1="41" y1="28" x2="49" y2="28" stroke="white" stroke-width="1.5" opacity="0.9"/>
        </g>
        
        <!-- Landing Skids -->
        <path d="M 16 34 Q 16 38 18 39 L 30 39 Q 32 38 32 34" 
              stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <line x1="18" y1="32" x2="18" y2="39" stroke="${color}" stroke-width="2.5"/>
        <line x1="30" y1="32" x2="30" y2="39" stroke="${color}" stroke-width="2.5"/>
        
        <!-- Skid Cross Bars -->
        <line x1="18" y1="36" x2="30" y2="36" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
        
        <!-- Side Windows -->
        <ellipse cx="19" cy="26" rx="2.5" ry="3.5" fill="white" opacity="0.5"/>
        <ellipse cx="29" cy="26" rx="2.5" ry="3.5" fill="white" opacity="0.5"/>
        
        <!-- Body Details -->
        <line x1="24" y1="30" x2="24" y2="34" stroke="white" stroke-width="1" opacity="0.4"/>
        
        <!-- Direction Indicator (nose) -->
        <circle cx="24" cy="18" r="2.5" fill="white" stroke="${color}" stroke-width="1"/>
        
        ${isLive ? `
          <!-- Live Indicator Lights -->
          <circle cx="20" cy="24" r="1.5" fill="#22c55e" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle cx="28" cy="24" r="1.5" fill="#22c55e" opacity="0.9">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Shadow effect -->
        <ellipse cx="24" cy="40" rx="12" ry="2.5" fill="black" opacity="0.25"/>
      </svg>
      
      ${isLive ? `
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'helicopter-marker',
    html: helicopterSVG,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// ============================================================================
// STATIC HELICOPTER ICON (NO ANIMATION)
// ============================================================================

const createHelicopterIcon = (color: string, heading: number = 0, size: number = 48) => {
  return createAnimatedHelicopterIcon(color, heading, size, false);
};

// ============================================================================
// CUSTOM DRONE ICONS - DIFFERENT SHAPES FOR EACH TYPE
// ============================================================================

const createDroneIcon = (type: 'surveillance' | 'campus' | 'highway' | 'regional', color: string, heading: number = 0) => {
  const icons = {
    // Type 1: Quadcopter (X-shape) - For Surveillance
    surveillance: `
      <div style="width: 36px; height: 36px; position: relative; transform: rotate(${heading}deg);">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Main body -->
          <circle cx="18" cy="18" r="7" fill="${color}" stroke="white" stroke-width="2.5"/>
          <!-- Arms (X pattern) -->
          <line x1="7" y1="7" x2="29" y2="29" stroke="${color}" stroke-width="3"/>
          <line x1="29" y1="7" x2="7" y2="29" stroke="${color}" stroke-width="3"/>
          <!-- Propellers -->
          <circle cx="7" cy="7" r="5" fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="29" cy="7" r="5" fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="7" cy="29" r="5" fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
          <circle cx="29" cy="29" r="5" fill="${color}" stroke="white" stroke-width="2" opacity="0.8"/>
          <!-- Direction indicator -->
          <circle cx="18" cy="13" r="2.5" fill="white"/>
        </svg>
      </div>
    `,
    
    // Type 2: Hexacopter (Star-shape) - For Campus
    campus: `
      <div style="width: 36px; height: 36px; position: relative; transform: rotate(${heading}deg);">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Main body -->
          <circle cx="18" cy="18" r="6" fill="${color}" stroke="white" stroke-width="2.5"/>
          <!-- 6 Arms (Hexagon pattern) -->
          <line x1="18" y1="18" x2="18" y2="6" stroke="${color}" stroke-width="2.5"/>
          <line x1="18" y1="18" x2="28" y2="11" stroke="${color}" stroke-width="2.5"/>
          <line x1="18" y1="18" x2="28" y2="25" stroke="${color}" stroke-width="2.5"/>
          <line x1="18" y1="18" x2="18" y2="30" stroke="${color}" stroke-width="2.5"/>
          <line x1="18" y1="18" x2="8" y2="25" stroke="${color}" stroke-width="2.5"/>
          <line x1="18" y1="18" x2="8" y2="11" stroke="${color}" stroke-width="2.5"/>
          <!-- 6 Propellers -->
          <circle cx="18" cy="6" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="28" cy="11" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="28" cy="25" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="18" cy="30" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="8" cy="25" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="8" cy="11" r="4" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <!-- Direction indicator -->
          <circle cx="18" cy="12" r="2" fill="white"/>
        </svg>
      </div>
    `,
    
    // Type 3: Fixed-Wing (Airplane-shape) - For Highway
    highway: `
      <div style="width: 36px; height: 36px; position: relative; transform: rotate(${heading}deg);">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Fuselage -->
          <ellipse cx="18" cy="18" rx="4" ry="10" fill="${color}" stroke="white" stroke-width="2"/>
          <!-- Wings -->
          <rect x="6" y="15" width="24" height="6" rx="3" fill="${color}" stroke="white" stroke-width="2"/>
          <!-- Tail -->
          <path d="M 18 25 L 15 32 L 21 32 Z" fill="${color}" stroke="white" stroke-width="2"/>
          <!-- Cockpit -->
          <circle cx="18" cy="12" r="3" fill="white" stroke="${color}" stroke-width="1.5"/>
          <!-- Direction indicator -->
          <circle cx="18" cy="8" r="2" fill="white"/>
        </svg>
      </div>
    `,
    
    // Type 4: Octocopter (Plus-shape) - For Regional
    regional: `
      <div style="width: 36px; height: 36px; position: relative; transform: rotate(${heading}deg);">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Main body -->
          <circle cx="18" cy="18" r="6" fill="${color}" stroke="white" stroke-width="2.5"/>
          <!-- 8 Arms (Plus + X pattern) -->
          <line x1="18" y1="6" x2="18" y2="12" stroke="${color}" stroke-width="3"/>
          <line x1="27" y1="9" x2="23" y2="13" stroke="${color}" stroke-width="3"/>
          <line x1="30" y1="18" x2="24" y2="18" stroke="${color}" stroke-width="3"/>
          <line x1="27" y1="27" x2="23" y2="23" stroke="${color}" stroke-width="3"/>
          <line x1="18" y1="30" x2="18" y2="24" stroke="${color}" stroke-width="3"/>
          <line x1="9" y1="27" x2="13" y2="23" stroke="${color}" stroke-width="3"/>
          <line x1="6" y1="18" x2="12" y2="18" stroke="${color}" stroke-width="3"/>
          <line x1="9" y1="9" x2="13" y2="13" stroke="${color}" stroke-width="3"/>
          <!-- 8 Propellers -->
          <circle cx="18" cy="6" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="27" cy="9" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="30" cy="18" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="27" cy="27" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="18" cy="30" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="9" cy="27" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="6" cy="18" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <circle cx="9" cy="9" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.8"/>
          <!-- Direction indicator -->
          <circle cx="18" cy="12" r="2" fill="white"/>
        </svg>
      </div>
    `
  };

  return L.divIcon({
    className: 'drone-marker',
    html: icons[type],
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// ============================================================================
// DEMO DRONES DATA - UPDATED LOCATIONS IN LUCKNOW-KANPUR REGION
// ============================================================================

const DEMO_DRONES: DemoDrone[] = [
  {
    id: 'UAV-001',
    name: 'Lucknow Central Patrol',
    callsign: 'LKO-01',
    type: 'surveillance',
    position: { lat: 26.9000, lon: 81.0300, alt: 100 },
    waypoints: [
      { lat: 26.8650, lon: 80.9800, alt: 110, label: 'Aminabad' },
      { lat: 26.8850, lon: 81.0100, alt: 120, label: 'Alambagh' },
      { lat: 26.9000, lon: 81.0300, alt: 100, label: 'Gomti Nagar Ext' },
    ],
    status: 'patrol',
    battery: 85,
    speed: 20,
    heading: 45,
    corridor: 'City Surveillance',
    corridorColor: '#647590ff',
    mission: 'Lucknow Urban Patrol',
  },
  {
    id: 'UAV-002',
    name: 'Eastern Surveillance',
    callsign: 'EST-04',
    type: 'surveillance',
    position: { lat: 26.8500, lon: 81.8000, alt: 180 },
    waypoints: [
      { lat: 26.8500, lon: 81.8000, alt: 180, label: 'Faizabad Border' },
      { lat: 26.9500, lon: 81.5000, alt: 180, label: 'Sector Alpha' },
      { lat: 27.0800, lon: 81.2000, alt: 180, label: 'Barabanki East' },
    ],
    status: 'patrol',
    battery: 83,
    speed: 20,
    heading: 270,
    corridor: 'Eastern Border',
    corridorColor: '#6eb423ff',
    mission: 'Eastern Border Patrol',
  },
  {
    id: 'UAV-003',
    name: 'Regional Patrol North',
    callsign: 'REG-06',
    type: 'regional',
    position: { lat: 26.9500, lon: 80.7000, alt: 150 },
    waypoints: [
      { lat: 26.8300, lon: 80.9400, alt: 150, label: 'Lucknow' },
      { lat: 26.9500, lon: 80.7000, alt: 150, label: 'Malihabad' },
      { lat: 27.1500, lon: 80.4000, alt: 155, label: 'Sandila' },
      { lat: 27.3968, lon: 80.1250, alt: 150, label: 'Hardoi' },
    ],
    status: 'patrol',
    battery: 79,
    speed: 20,
    heading: 180,
    corridor: 'Regional Surveillance',
    corridorColor: '#8b5cf6',
    mission: 'North UP Patrol',
  },
  {
    id: 'UAV-004',
    name: 'Border Monitor East',
    callsign: 'BRD-07',
    type: 'highway',
    position: { lat: 26.7500, lon: 81.2000, alt: 180 },
    waypoints: [
      { lat: 26.7500, lon: 81.2000, alt: 180, label: 'East Border' },
      { lat: 26.8000, lon: 81.3000, alt: 185, label: 'Barabanki' },
      { lat: 26.8500, lon: 81.1500, alt: 180, label: 'Sector 12' },
      { lat: 26.8467, lon: 80.9462, alt: 180, label: 'Lucknow' },
    ],
    status: 'patrol',
    battery: 83,
    speed: 20,
    heading: 90,
    corridor: 'Border Surveillance',
    corridorColor: '#eab308',
    mission: 'Eastern Border Patrol',
  }
];

// ============================================================================
// STRAIGHT CORRIDOR POLYGON CALCULATOR (NO BLENDING)
// ============================================================================

const createCorridorPolygon = (waypoints: DemoWaypoint[], corridorWidth: number = 0.015): [number, number][] => {
  if (waypoints.length < 2) return [];
  
  const halfWidth = corridorWidth / 2;
  const allPoints: [number, number][] = [];
  
  // Create rectangular corridor segments for each waypoint pair
  for (let i = 0; i < waypoints.length - 1; i++) {
    const current = waypoints[i];
    const next = waypoints[i + 1];
    
    // Calculate perpendicular offset for this segment
    const dx = next.lon - current.lon;
    const dy = next.lat - current.lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;
    
    // Create 4 corners of the rectangle for this segment
    const p1: [number, number] = [current.lat + offsetY, current.lon + offsetX];    // Start left
    const p2: [number, number] = [next.lat + offsetY, next.lon + offsetX];          // End left
    const p3: [number, number] = [next.lat - offsetY, next.lon - offsetX];          // End right
    const p4: [number, number] = [current.lat - offsetY, current.lon - offsetX];    // Start right
    
    // Add this segment's polygon (as a separate shape)
    if (i > 0) {
      // For segments after the first, add a small gap or just start fresh
      allPoints.push(p1);
    } else {
      allPoints.push(p1);
    }
    
    allPoints.push(p2);
  }
  
  // Complete the polygon by adding the right side points in reverse
  for (let i = waypoints.length - 2; i >= 0; i--) {
    const current = waypoints[i];
    const next = waypoints[i + 1];
    
    const dx = next.lon - current.lon;
    const dy = next.lat - current.lat;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;
    
    const p3: [number, number] = [next.lat - offsetY, next.lon - offsetX];
    const p4: [number, number] = [current.lat - offsetY, current.lon - offsetX];
    
    allPoints.push(p3);
    if (i === 0) {
      allPoints.push(p4);
    }
  }
  
  return allPoints;
};

// ============================================================================
// MAP CENTER UPDATER
// ============================================================================

const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

// ============================================================================
// ANIMATION HELPER FUNCTIONS
// ============================================================================

const calculateHeading = (from: Position, to: Position): number => {
  const dLon = to.lon - from.lon;
  const dLat = to.lat - from.lat;
  const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  return (angle + 360) % 360;
};

const interpolatePosition = (
  from: DemoWaypoint,
  to: DemoWaypoint,
  progress: number
): Position => {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lon: from.lon + (to.lon - from.lon) * progress,
    alt: from.alt + (to.alt - from.alt) * progress,
  };
};

const calculateDistance = (from: DemoWaypoint, to: DemoWaypoint): number => {
  const dLat = to.lat - from.lat;
  const dLon = to.lon - from.lon;
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MultiDroneAwareness: React.FC = () => {
  const searchParams = useSearchParams();
  
  // State - ALL HOOKS MUST BE AT THE TOP OF THE COMPONENT
  const [demoDrones] = useState<DemoDrone[]>(DEMO_DRONES);
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);
  const [showMissionPanel, setShowMissionPanel] = useState<boolean>(true);
  const [showDemoDrones, setShowDemoDrones] = useState<boolean>(true);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [animatedDrones, setAnimatedDrones] = useState<Map<string, AnimatedDroneState>>(new Map());
  
  // Mission state
  const [selectedMission, setSelectedMission] = useState<SelectedMissionData | null>(null);
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  
  // ⭐ NEW: Dummy Mission Drone Animation State
  const [showDummyMissionDrone, setShowDummyMissionDrone] = useState<boolean>(true);
  const [dummyMissionDroneState, setDummyMissionDroneState] = useState<AnimatedDroneState | null>(null);
  
  // Simulation state
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [flightPath, setFlightPath] = useState<FlightPathPoint[]>([]);
  const [dronePosition, setDronePosition] = useState<Position | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [missionProgress, setMissionProgress] = useState({ current: 0, total: 0 });
  
  // Helicopter animation state
  const [helicopterHeading, setHelicopterHeading] = useState<number>(0);
  
  // Map center
  const [mapCenter] = useState<[number, number]>(() => {
    const avgLat = DEMO_DRONES.reduce((sum, drone) => sum + drone.position.lat, 0) / DEMO_DRONES.length;
    const avgLon = DEMO_DRONES.reduce((sum, drone) => sum + drone.position.lon, 0) / DEMO_DRONES.length;
    return [avgLat, avgLon];
  });
  const [mapZoom] = useState<number>(9);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 10;
  
  // Animation ref
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  
  // ⭐ NEW: Dummy Mission Drone Animation ref
  const dummyDroneAnimationFrameRef = useRef<number | null>(null);
  const dummyDroneLastUpdateRef = useRef<number>(Date.now());
  
  // Previous position ref for heading calculation
  const prevPositionRef = useRef<Position | null>(null);
  
  // API Configuration
  const WS_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'ws://localhost:8002';
  const API_BASE = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
  
  // ============================================================================
  // INITIALIZE ANIMATED DRONE STATES
  // ============================================================================
  
  useEffect(() => {
    const initialStates = new Map<string, AnimatedDroneState>();
    demoDrones.forEach(drone => {
      if (drone.waypoints.length > 0) {
        initialStates.set(drone.id, {
          position: { ...drone.waypoints[0] },
          heading: drone.heading,
          currentWaypointIndex: 0,
          progress: 0,
        });
      }
    });
    setAnimatedDrones(initialStates);
  }, [demoDrones]);
  
  // ============================================================================
  // ⭐ NEW: INITIALIZE DUMMY MISSION DRONE STATE
  // ============================================================================
  
  // ⭐ IMPROVED: Initialize dummy drone state properly
  useEffect(() => {
    if (selectedMission && selectedMission.waypoints.length > 0 && !simulationActive) {
      // Ensure waypoints are properly formatted
      const missionWaypoints = selectedMission.waypoints.map(wp => ({
        lat: wp.lat,
        lon: wp.lng ?? wp.lon,
        alt: wp.alt ?? 100,
        label: wp.label
      }));
      
      if (missionWaypoints.length > 0) {
        // Calculate initial heading from first two waypoints if available
        let initialHeading = 0;
        if (missionWaypoints.length > 1) {
          initialHeading = calculateHeading(missionWaypoints[0], missionWaypoints[1]);
        }
        
        setDummyMissionDroneState({
          position: { ...missionWaypoints[0] },
          heading: initialHeading,
          currentWaypointIndex: 0,
          progress: 0,
        });
        
        // Ensure the dummy drone is visible by default
        setShowDummyMissionDrone(true);
        
        console.log('✅ Dummy mission drone initialized:', {
          position: missionWaypoints[0],
          heading: initialHeading,
          totalWaypoints: missionWaypoints.length
        });
      }
    } else {
      setDummyMissionDroneState(null);
    }
  }, [selectedMission, simulationActive]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================
  
  useEffect(() => {
    if (!isAnimating) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;
      
      setAnimatedDrones(prevStates => {
        const newStates = new Map(prevStates);
        
        demoDrones.forEach(drone => {
          const state = newStates.get(drone.id);
          if (!state || drone.waypoints.length < 2) return;
          
          const currentWp = drone.waypoints[state.currentWaypointIndex];
          const nextWpIndex = (state.currentWaypointIndex + 1) % drone.waypoints.length;
          const nextWp = drone.waypoints[nextWpIndex];
          
          const distance = calculateDistance(currentWp, nextWp);
          const speedInDegreesPerSecond = (drone.speed / 111000);
          const progressIncrement = (speedInDegreesPerSecond * deltaTime) / distance;
          
          let newProgress = state.progress + progressIncrement;
          let newWaypointIndex = state.currentWaypointIndex;
          
          if (newProgress >= 1.0) {
            newProgress = 0;
            newWaypointIndex = nextWpIndex;
          }
          
          const from = drone.waypoints[newWaypointIndex];
          const toIndex = (newWaypointIndex + 1) % drone.waypoints.length;
          const to = drone.waypoints[toIndex];
          
          const newPosition = interpolatePosition(from, to, newProgress);
          const newHeading = calculateHeading(from, to);
          
          newStates.set(drone.id, {
            position: newPosition,
            heading: newHeading,
            currentWaypointIndex: newWaypointIndex,
            progress: newProgress,
          });
        });
        
        return newStates;
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    lastUpdateRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, demoDrones]);
  
  // ============================================================================
  // ⭐ NEW: DUMMY MISSION DRONE ANIMATION LOOP
  // ============================================================================
  
  useEffect(() => {
    if (!isAnimating || !showDummyMissionDrone || !dummyMissionDroneState || simulationActive) {
      if (dummyDroneAnimationFrameRef.current) {
        cancelAnimationFrame(dummyDroneAnimationFrameRef.current);
        dummyDroneAnimationFrameRef.current = null;
      }
      return;
    }
    
    const missionWaypoints = getMissionWaypoints();
    if (missionWaypoints.length < 2) return;
    
    const animateDummyDrone = () => {
      const now = Date.now();
      const deltaTime = (now - dummyDroneLastUpdateRef.current) / 1000;
      dummyDroneLastUpdateRef.current = now;
      
      setDummyMissionDroneState(prevState => {
        if (!prevState) return null;
        
        const currentWp = missionWaypoints[prevState.currentWaypointIndex];
        const nextWpIndex = (prevState.currentWaypointIndex + 1) % missionWaypoints.length;
        const nextWp = missionWaypoints[nextWpIndex];
        
        const distance = calculateDistance(currentWp, nextWp);
        // Mission drone speed: 25 m/s
        const speedInDegreesPerSecond = (25 / 111000);
        const progressIncrement = (speedInDegreesPerSecond * deltaTime) / distance;
        
        let newProgress = prevState.progress + progressIncrement;
        let newWaypointIndex = prevState.currentWaypointIndex;
        
        if (newProgress >= 1.0) {
          newProgress = 0;
          newWaypointIndex = nextWpIndex;
        }
        
        const from = missionWaypoints[newWaypointIndex];
        const toIndex = (newWaypointIndex + 1) % missionWaypoints.length;
        const to = missionWaypoints[toIndex];
        
        const newPosition = interpolatePosition(from, to, newProgress);
        const newHeading = calculateHeading(from, to);
        
        return {
          position: newPosition,
          heading: newHeading,
          currentWaypointIndex: newWaypointIndex,
          progress: newProgress,
        };
      });
      
      dummyDroneAnimationFrameRef.current = requestAnimationFrame(animateDummyDrone);
    };
    
    dummyDroneLastUpdateRef.current = Date.now();
    dummyDroneAnimationFrameRef.current = requestAnimationFrame(animateDummyDrone);
    
    return () => {
      if (dummyDroneAnimationFrameRef.current) {
        cancelAnimationFrame(dummyDroneAnimationFrameRef.current);
      }
    };
  }, [isAnimating, showDummyMissionDrone, dummyMissionDroneState, simulationActive, selectedMission]);
  
  // ============================================================================
  // UPDATE HELICOPTER HEADING FROM TELEMETRY
  // ============================================================================
  
  useEffect(() => {
    if (dronePosition && prevPositionRef.current) {
      const heading = calculateHeading(prevPositionRef.current, dronePosition);
      setHelicopterHeading(heading);
    }
    
    if (dronePosition) {
      prevPositionRef.current = { ...dronePosition };
    }
  }, [dronePosition]);
  
  // ============================================================================
  // LOAD MISSION FROM SESSION STORAGE
  // ============================================================================
  
  useEffect(() => {
    const missionId = searchParams?.get('missionId');
    const mode = searchParams?.get('mode');
    
    console.log('URL Params:', { missionId, mode });
    
    if (mode === 'simulate') {
      setSimulationMode(true);
    }
    
    try {
      const storedMission = sessionStorage.getItem('selectedMission');
      
      if (storedMission) {
        const mission = JSON.parse(storedMission);
        console.log('📦 Loaded mission from sessionStorage:', mission);
        
        setSelectedMission(mission);
        setShowMissionPanel(true);
        
        // ⭐ ENSURE DUMMY DRONE IS ENABLED BY DEFAULT
        if (mode !== 'simulate') {
          setShowDummyMissionDrone(true);
          console.log('✅ Dummy drone enabled by default for mission preview');
        }
        
        if (mode === 'simulate') {
          setSimulationActive(true);
        }
      } else {
        console.log('⚠️ No mission found in sessionStorage');
      }
    } catch (error) {
      console.error('Error loading mission from sessionStorage:', error);
    }
  }, [searchParams]);
  
  // ============================================================================
  // WEBSOCKET TELEMETRY CONNECTION
  // ============================================================================
  
  const connectWebSocket = () => {
    if (!simulationMode || !simulationActive || !selectedMission) {
      console.log('Skipping WebSocket connection - conditions not met');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ Max WebSocket reconnection attempts reached');
      return;
    }
    
    try {
      console.log(`🔌 Connecting to WebSocket: ${WS_BASE}/ws/telemetry`);
      const ws = new WebSocket(`${WS_BASE}/ws/telemetry`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setWsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        if (selectedMission?.id) {
          ws.send(JSON.stringify({
            action: 'subscribe',
            mission_id: selectedMission.id
          }));
          console.log(`📡 Subscribed to mission: ${selectedMission.id}`);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          
          switch (message.type) {
            case 'telemetry_update':
              // ⭐ IMPROVED: Handle both message.data and root-level data
              const telemetryData = message.data || message;
              handleTelemetryUpdate(telemetryData);
              break;
            case 'connection_info':
              console.log('🔌 Connection info:', message);
              break;
            case 'error':
              console.error('❌ WebSocket error:', message.message);
              break;
            case 'pong':
              // Silent - heartbeat response
              break;
            default:
              console.log('❓ Unknown message type:', message.type);
              console.log('Full message:', message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('Raw event data:', event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('WebSocket state:', ws.readyState);
        console.error('WebSocket URL:', `${WS_BASE}/ws/telemetry`);
        setWsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (Code: ${event.code})`);
        setWsConnected(false);
        
        if (simulationActive && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };
      
      wsRef.current = ws;
      
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
      
      return () => clearInterval(pingInterval);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsConnected(false);
    }
  };
  
  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setWsConnected(false);
    reconnectAttemptsRef.current = 0;
  };
  
  // ============================================================================
  // TELEMETRY UPDATE HANDLER
  // ============================================================================
  const handleTelemetryUpdate = (data: any) => {
    try {
      // ⭐ DEFENSIVE CHECK: Ensure data exists
      if (!data) {
        console.warn('⚠️ Received empty telemetry data');
        return;
      }
      
      console.log('📡 Raw telemetry data:', data);
      
      // Extract position from various possible structures
      const position = data.position || data.current_position || null;
      
      // ⭐ IMPROVED: Only update telemetry if we have valid data
      setTelemetry({
        timestamp: data.timestamp || new Date().toISOString(),
        position: position,
        velocity: data.velocity || null,
        attitude: data.attitude || null,
        battery: data.battery || null,
        gps: data.gps || null,
        armed: data.armed ?? null,
        mode: data.mode || null,
        mission_current: data.mission_current ?? null,
        mission_count: data.mission_count ?? null
      });
      
      // ⭐ IMPROVED: Update drone position with better null checking
      if (position && (position.lat || position.latitude) && (position.lon || position.longitude)) {
        const newPosition = {
          lat: position.lat ?? position.latitude,
          lon: position.lon ?? position.longitude,
          alt: position.alt ?? position.altitude ?? 0
        };
        
        setDronePosition(newPosition);
        
        // Add to flight path
        setFlightPath(prev => {
          const newPath = [...prev, {
            lat: newPosition.lat,
            lon: newPosition.lon,
            timestamp: Date.now()
          }];
          return newPath.slice(-500);
        });
        
        console.log('✅ Updated position:', newPosition);
      } else {
        console.warn('⚠️ Position data incomplete:', position);
      }
      
      // Update mission progress
      if (data.mission_current !== undefined && data.mission_count !== undefined) {
        setMissionProgress({
          current: data.mission_current,
          total: data.mission_count
        });
        console.log('✅ Mission progress:', data.mission_current, '/', data.mission_count);
      }
      
    } catch (error) {
      console.error('❌ Error handling telemetry update:', error);
      console.error('Problematic data:', data);
    }
  };
  
  // ============================================================================
  // AUTOMATIC MISSION UPLOAD AND START
  // ============================================================================
  
  const uploadAndStartMission = async () => {
    if (!simulationMode || !simulationActive || !selectedMission) {
      return;
    }
    
    try {
      console.log('📤 Uploading mission to PX4...');
      
      const waypoints = selectedMission.waypoints.map((wp, index) => ({
        lat: wp.lat,
        lon: wp.lng || wp.lon,
        alt: wp.alt || 100
      }));
      
      const uploadResponse = await fetch(`${API_BASE}/mission/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints })
      });
      
      const uploadData = await uploadResponse.json();
      
      if (uploadData.success) {
        console.log('✅ Mission uploaded successfully');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🚀 Starting mission...');
        const startResponse = await fetch(`${API_BASE}/mission/start`, {
          method: 'POST'
        });
        
        const startData = await startResponse.json();
        
        if (startData.success) {
          console.log('✅ Mission started successfully');
        } else {
          console.error('Failed to start mission:', startData.message);
        }
      } else {
        console.error('Failed to upload mission:', uploadData.message);
      }
      
    } catch (error) {
      console.error('Error uploading/starting mission:', error);
    }
  };
  
  // ============================================================================
  // SIMULATION CONTROL FUNCTIONS
  // ============================================================================
  
  const handleStartSimulation = () => {
    if (selectedMission) {
      setSimulationMode(true);
      setSimulationActive(true);
      console.log('🎮 Starting simulation...');
    }
  };
  
  const handleStopSimulation = () => {
    setSimulationActive(false);
    disconnectWebSocket();
    setFlightPath([]);
    setDronePosition(null);
    setTelemetry(null);
    setHelicopterHeading(0);
    prevPositionRef.current = null;
    console.log('⏹️ Simulation stopped');
  };
  
  const handleClearMission = () => {
    setSelectedMission(null);
    setSimulationMode(false);
    setSimulationActive(false);
    setShowMissionPanel(false);
    sessionStorage.removeItem('selectedMission');
    disconnectWebSocket();
    setFlightPath([]);
    setDronePosition(null);
    setTelemetry(null);
    setHelicopterHeading(0);
    prevPositionRef.current = null;
    setDummyMissionDroneState(null);
  };
  
  // ============================================================================
  // ANIMATION CONTROL FUNCTIONS
  // ============================================================================
  
  const handleToggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };
  
  // ⭐ NEW: Toggle Dummy Mission Drone
  const handleToggleDummyDrone = () => {
    setShowDummyMissionDrone(!showDummyMissionDrone);
  };
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (simulationMode && simulationActive && selectedMission) {
      console.log('🎮 Simulation activated - initializing...');
      
      uploadAndStartMission();
      
      const connectTimer = setTimeout(() => {
        connectWebSocket();
      }, 2000);
      
      return () => {
        clearTimeout(connectTimer);
        disconnectWebSocket();
      };
    } else {
      disconnectWebSocket();
    }
  }, [simulationMode, simulationActive, selectedMission]);
  
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: 'text-green-400',
      patrol: 'text-blue-400',
      rtl: 'text-yellow-400',
      standby: 'text-gray-400',
    };
    return statusColors[status] || 'text-gray-400';
  };

  const getStatusBadgeColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-600',
      patrol: 'bg-blue-600',
      rtl: 'bg-yellow-600',
      standby: 'bg-gray-600',
    };
    return statusColors[status] || 'bg-gray-600';
  };

  const getMissionWaypoints = (): DemoWaypoint[] => {
    if (!selectedMission?.waypoints) return [];
    
    return selectedMission.waypoints.map(wp => ({
      lat: wp.lat,
      lon: wp.lng ?? wp.lon,
      alt: wp.alt ?? 100,
      label: wp.label
    }));
  };

  const getCorridorColor = (): string => {
    if (selectedMission?.corridor_color) {
      const colorMap: Record<string, string> = {
        blue: '#3b82f6',
        green: '#10b981',
        orange: '#f97316',
        purple: '#a855f7',
        red: '#ef4444',
        yellow: '#eab308',
        cyan: '#06b6d4',
        pink: '#ec4899',
      };
      return colorMap[selectedMission.corridor_color.toLowerCase()] || '#10b981';
    }
    return '#10b981';
  };

  const missionWaypoints = getMissionWaypoints();
  const missionCorridorPolygon = missionWaypoints.length > 1 
    ? createCorridorPolygon(missionWaypoints, 0.015)
    : [];

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getMissionDroneType = (): 'surveillance' | 'campus' | 'highway' | 'regional' => {
    if (!selectedMission) return 'surveillance';
    
    const corridorValue = selectedMission.corridor_value?.toLowerCase() || '';
    const missionType = selectedMission.mission_type?.toLowerCase() || '';
    
    if (corridorValue.includes('highway') || corridorValue.includes('expressway') || missionType.includes('highway')) {
      return 'highway';
    } else if (corridorValue.includes('campus') || corridorValue.includes('university') || missionType.includes('campus')) {
      return 'campus';
    } else if (corridorValue.includes('regional') || corridorValue.includes('border') || missionType.includes('regional')) {
      return 'regional';
    }
    return 'surveillance';
  };
  
  // Calculate ground speed from telemetry
  const getGroundSpeed = (): number => {
    if (!telemetry?.velocity) return 0;
    return Math.sqrt(
      Math.pow(telemetry.velocity.vx, 2) + 
      Math.pow(telemetry.velocity.vy, 2)
    );
  };
  
  // ⭐ NEW: Get dummy drone battery (simulated)
  const getDummyDroneBattery = (): number => {
    if (!dummyMissionDroneState) return 100;
    // Simulate battery drain based on progress through mission
    const totalWaypoints = missionWaypoints.length;
    const progress = dummyMissionDroneState.currentWaypointIndex / totalWaypoints;
    return Math.max(100 - (progress * 15), 85); // Drains from 100% to 85%
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative h-full w-full bg-slate-900">
      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <MapCenterUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Esri Satellite Imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        />
        
        {/* DEMO DRONES CORRIDORS */}
        {showDemoDrones && showCorridors && demoDrones.map((drone) => (
          drone.waypoints.length > 1 && (
            <Polygon
              key={`${drone.id}-corridor`}
              positions={createCorridorPolygon(drone.waypoints, 0.02)}
              pathOptions={{
                color: drone.corridorColor,
                fillColor: drone.corridorColor,
                fillOpacity: 0.15,
                weight: 2,
                opacity: 0.5,
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-semibold text-sm">{drone.corridor}</div>
                  <div className="text-xs text-gray-600">{drone.name}</div>
                </div>
              </Popup>
            </Polygon>
          )
        ))}
        
        {/* DEMO DRONES PATHS */}
        {showDemoDrones && demoDrones.map((drone) => (
          drone.waypoints.length > 1 && (
            <Polyline
              key={`${drone.id}-path`}
              positions={drone.waypoints.map(wp => [wp.lat, wp.lon])}
              pathOptions={{
                color: drone.corridorColor,
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 5',
              }}
            />
          )
        ))}
        
        {/* DEMO DRONES WAYPOINTS */}
        {showDemoDrones && showWaypoints && demoDrones.map((drone) => (
          drone.waypoints.map((wp, index) => (
            <Marker
              key={`${drone.id}-wp-${index}`}
              position={[wp.lat, wp.lon]}
              icon={L.divIcon({
                className: 'waypoint-marker',
                html: `
                  <div style="
                    background: ${drone.corridorColor};
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 11px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  ">
                    ${index + 1}
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            >
              <Tooltip direction="top" offset={[0, -15]}>
                <div className="text-xs">
                  <strong>{wp.label || `WP${index + 1}`}</strong>
                </div>
              </Tooltip>
            </Marker>
          ))
        ))}
        
        {/* DEMO DRONES MARKERS (ANIMATED OR STATIC) */}
        {showDemoDrones && demoDrones.map((drone) => {
          const animatedState = animatedDrones.get(drone.id);
          const position = isAnimating && animatedState
            ? animatedState.position
            : drone.position;
          const heading = isAnimating && animatedState
            ? animatedState.heading
            : drone.heading;
          
          return (
            <Marker
              key={drone.id}
              position={[position.lat, position.lon]}
              icon={createDroneIcon(drone.type, drone.corridorColor, heading)}
              eventHandlers={{
                click: () => setSelectedDrone(selectedDrone === drone.id ? null : drone.id),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[220px]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-base">{drone.name}</div>
                      <div className="text-xs text-gray-600">{drone.callsign}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-semibold ${getStatusBadgeColor(drone.status)}`}>
                      {drone.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Type:</span>
                      <span className="font-semibold capitalize">{drone.type}</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Mission:</span>
                      <span className="font-semibold text-right">{drone.mission}</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Corridor:</span>
                      <span className="font-semibold">{drone.corridor}</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Altitude:</span>
                      <span className="font-semibold">{position.alt.toFixed(0)}m AGL</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Speed:</span>
                      <span className="font-semibold">{drone.speed} m/s</span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Battery:</span>
                      <span className={`font-semibold ${drone.battery > 30 ? 'text-green-600' : 'text-red-600'}`}>
                        {drone.battery}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Heading:</span>
                      <span className="font-semibold">{heading.toFixed(0)}°</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* SELECTED MISSION CORRIDOR - STRAIGHT SEGMENTS */}
        {selectedMission && showCorridors && missionWaypoints.length > 1 && (
          <>
            {missionWaypoints.slice(0, -1).map((wp, index) => {
              const nextWp = missionWaypoints[index + 1];
              const halfWidth = 0.007; // Corridor half-width in degrees
              
              // Calculate perpendicular offset
              const dx = nextWp.lon - wp.lon;
              const dy = nextWp.lat - wp.lat;
              const length = Math.sqrt(dx * dx + dy * dy);
              const offsetX = (-dy / length) * halfWidth;
              const offsetY = (dx / length) * halfWidth;
              
              // Create rectangle for this segment
              const segmentPolygon: [number, number][] = [
                [wp.lat + offsetY, wp.lon + offsetX],      // Start left
                [nextWp.lat + offsetY, nextWp.lon + offsetX],  // End left
                [nextWp.lat - offsetY, nextWp.lon - offsetX],  // End right
                [wp.lat - offsetY, wp.lon - offsetX],      // Start right
              ];
              
              return (
                <Polygon
                  key={`corridor-segment-${index}`}
                  positions={segmentPolygon}
                  pathOptions={{
                    color: getCorridorColor(),
                    fillColor: getCorridorColor(),
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                />
              );
            })}
          </>
        )}
        
        {/* SELECTED MISSION WAYPOINTS */}
        {selectedMission && showWaypoints && missionWaypoints.map((waypoint, index) => (
          <Marker
            key={`mission-wp-${index}`}
            position={[waypoint.lat, waypoint.lon]}
            icon={L.divIcon({
              className: 'waypoint-marker',
              html: `
                <div style="
                  background: ${getCorridorColor()};
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
                  box-shadow: 0 3px 6px rgba(0,0,0,0.5);
                ">
                  ${index + 1}
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
            zIndexOffset={1000}
          >
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <div className="text-xs font-semibold">
                <strong>{waypoint.label || `WP${index + 1}`}</strong>
                <br />
                Alt: {waypoint.alt}m
              </div>
            </Tooltip>
          </Marker>
        ))}
        
        {/* SELECTED MISSION FLIGHT PATH */}
        {selectedMission && missionWaypoints.length > 1 && (
          <Polyline
            positions={missionWaypoints.map(wp => [wp.lat, wp.lon])}
            pathOptions={{
              color: getCorridorColor(),
              weight: 4,
              opacity: 0.9,
              dashArray: '10, 10',
            }}
          />
        )}
        
        {/* ⭐ NEW: DUMMY MISSION DRONE (ANIMATED) */}
        {selectedMission && !simulationActive && showDummyMissionDrone && dummyMissionDroneState && isAnimating && (
          <Marker
            position={[dummyMissionDroneState.position.lat, dummyMissionDroneState.position.lon]}
            icon={createAnimatedHelicopterIcon(getCorridorColor(), dummyMissionDroneState.heading, 52, true)}
            zIndexOffset={1800}
          >
            <Popup>
              <div className="p-3 min-w-[240px]">
                <div className="font-semibold text-sm mb-2 flex items-center space-x-2">
                  <span>🚁</span>
                  <span>{selectedMission.mission_name}</span>
                </div>
                <span className="px-2 py-1 text-xs rounded font-semibold bg-blue-600 text-white">
                  PREVIEW MODE
                </span>
                <div className="space-y-2 text-xs mt-3">
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="font-semibold text-blue-600">Simulated Flight</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Altitude:</span>
                    <span className="font-semibold">{dummyMissionDroneState.position.alt.toFixed(0)}m AGL</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Speed:</span>
                    <span className="font-semibold">25 m/s</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Heading:</span>
                    <span className="font-semibold">{dummyMissionDroneState.heading.toFixed(0)}°</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Battery:</span>
                    <span className="font-semibold text-green-600">{getDummyDroneBattery().toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Waypoint:</span>
                    <span className="font-semibold">
                      {dummyMissionDroneState.currentWaypointIndex + 1} / {missionWaypoints.length}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 italic">
                    This is a preview simulation. Start real simulation for live telemetry.
                  </p>
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -32]}>
              <div className="text-xs font-bold bg-white px-3 py-2 rounded-lg shadow-xl border-2" style={{ borderColor: getCorridorColor() }}>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getCorridorColor() }}></div>
                  <strong style={{ color: getCorridorColor() }}>🚁 PREVIEW</strong>
                </div>
                <div className="text-gray-700 mt-1">
                  {getDummyDroneBattery().toFixed(0)}% • {dummyMissionDroneState.position.alt.toFixed(0)}m • 25 m/s
                </div>
              </div>
            </Tooltip>
          </Marker>
        )}
        
        {/* SIMULATION FLIGHT PATH */}
        {simulationMode && flightPath.length > 1 && (
          <Polyline
            positions={flightPath.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: '#22c55e',
              weight: 3,
              opacity: 1,
            }}
          />
        )}
        
        {/* LIVE ANIMATED HELICOPTER POSITION (SIMULATION) */}
        {simulationMode && dronePosition && (
          <Marker
            position={[dronePosition.lat, dronePosition.lon]}
            icon={createAnimatedHelicopterIcon('#22c55e', helicopterHeading, 54, true)}
            zIndexOffset={2000}
          >
            <Popup>
              <div className="p-3 min-w-[240px]">
                <div className="font-semibold text-sm mb-2 flex items-center space-x-2">
                  <span>{selectedMission?.mission_name || 'Live Helicopter'}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between bg-green-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="font-semibold text-green-600">{telemetry?.mode || 'UNKNOWN'}</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Altitude:</span>
                    <span className="font-semibold">{dronePosition.alt.toFixed(1)}m AGL</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Ground Speed:</span>
                    <span className="font-semibold">{getGroundSpeed().toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Heading:</span>
                    <span className="font-semibold">{helicopterHeading.toFixed(0)}°</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Battery:</span>
                    <span className={`font-semibold ${(telemetry?.battery?.remaining || 0) > 30 ? 'text-green-600' : 'text-red-600'}`}>
                      {telemetry?.battery?.remaining?.toFixed(0) || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">GPS Sats:</span>
                    <span className="font-semibold">{telemetry?.gps?.satellites || 0}</span>
                  </div>
                  <div className="flex justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-600 font-medium">Waypoint:</span>
                    <span className="font-semibold">{missionProgress.current} / {missionProgress.total}</span>
                  </div>
                  {telemetry?.armed !== undefined && (
                    <div className="flex justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-600 font-medium">Armed:</span>
                      <span className={`font-semibold ${telemetry.armed ? 'text-red-600' : 'text-gray-600'}`}>
                        {telemetry.armed ? 'YES' : 'NO'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="top" offset={[0, -32]}>
              <div className="text-xs font-bold bg-white px-3 py-2 rounded-lg shadow-xl border-2 border-green-500">
                <div className="text-gray-700 mt-1">
                 Alt: {dronePosition.alt.toFixed(0)}m
                </div>
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
      
      {/* Selected Mission Info Panel */}
      {selectedMission && showMissionPanel && (
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl w-96">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <Target className="text-green-400" size={20} />
              <h3 className="text-white font-semibold">Selected Mission</h3>
            </div>
            <button
              onClick={() => setShowMissionPanel(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Mission Info */}
          <div className="p-4 space-y-4">
            {/* Mission Name & Status */}
            <div>
              <h4 className="text-lg font-bold text-white mb-1">
                {selectedMission.mission_name}
              </h4>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                {selectedMission.mission_type && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    {selectedMission.mission_type}
                  </span>
                )}
                {selectedMission.status && (
                  <span className={`px-2 py-1 text-xs rounded ${getStatusBadgeColor(selectedMission.status)}`}>
                    {selectedMission.status.toUpperCase()}
                  </span>
                )}
                {!simulationActive && showDummyMissionDrone && isAnimating && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded animate-pulse">
                    PREVIEW
                  </span>
                )}
                {!simulationActive && !isAnimating && (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                    STANDBY
                  </span>
                )}
              </div>
            </div>
            
            {/* Corridor Info */}
            {selectedMission.corridor_label && (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCorridorColor() }}
                />
                <div>
                  <div className="text-white font-medium text-sm">
                    {selectedMission.corridor_label}
                  </div>
                  {selectedMission.corridor_value && (
                    <div className="text-slate-400 text-xs capitalize">
                      {selectedMission.corridor_value}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Mission Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">Distance</div>
                <div className="text-white font-semibold">
                  {selectedMission.total_distance?.toFixed(2) || 'N/A'} km
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">Duration</div>
                <div className="text-white font-semibold">
                  {selectedMission.flight_time?.toFixed(1) || 'N/A'} min
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">Battery</div>
                <div className="text-white font-semibold">
                  {selectedMission.battery_usage?.toFixed(1) || 'N/A'}%
                </div>
              </div>
            </div>
            
            {/* Waypoints Count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Waypoints:</span>
              <span className="text-white font-medium">
                {selectedMission.waypoints?.length || 0}
              </span>
            </div>
            
            {/* Created Date */}
            {selectedMission.created_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Created:</span>
                <span className="text-white">
                  {formatDate(selectedMission.created_at)}
                </span>
              </div>
            )}
            
            {/* Simulation Controls */}
            <div className="pt-3 border-t border-slate-700 space-y-2">
              {!simulationActive ? (
                <>
                  <button
                    onClick={handleStartSimulation}
                    className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                  >
                    <Plane size={18} />
                    <span>Start Real Simulation</span>
                  </button>
                  
                  {/* ⭐ NEW: Toggle Dummy Drone Button */}
                  <button
                    onClick={handleToggleDummyDrone}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      showDummyMissionDrone 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {showDummyMissionDrone ? <Pause size={16} /> : <Play size={16} />}
                    <span>{showDummyMissionDrone ? 'Hide' : 'Show'} Preview Drone</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStopSimulation}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors font-medium"
                >
                  {/* <AlertTriangle size={18} />
                  <span>Stop Simulation</span> */}
                </button>
              )}
              
              {/* <button
                onClick={handleClearMission}
                className="w-full flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <X size={16} />
                <span>Clear Mission</span>
              </button> */}
            </div>
            
            {/* Live Telemetry */}
            {simulationActive && (
              <div className="pt-3 border-t border-slate-700 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm font-medium">Live Telemetry</span>
                  {wsConnected ? (
                    <div className="flex items-center space-x-1">
                      <Wifi size={14} className="text-green-400" />
                      <span className="text-xs text-green-400">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <WifiOff size={14} className="text-red-400" />
                      <span className="text-xs text-red-400">Disconnected</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Map Controls Panel */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 space-y-3 min-w-[280px]">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Map Controls</h3>
          <div className="flex items-center space-x-2">
            {simulationMode && simulationActive && wsConnected && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
            {!simulationActive && showDummyMissionDrone && isAnimating && selectedMission && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-400">Preview</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Legend with Icons */}
        <div className="pt-3 border-t border-slate-700 space-y-2">
          <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
            <span>Active Aircraft:</span>
            {isAnimating && (
              <span className="text-green-400 flex items-center space-x-1">
                <Activity size={12} className="animate-pulse" />
                <span>Animating</span>
              </span>
            )}
          </div>
          
          {/* Mission Helicopter (if selected) */}
          {selectedMission && (
            <div className="flex items-center justify-between text-xs bg-slate-800 p-2 rounded border border-purple-500/30">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getCorridorColor() }}
                />
                <div>
                  <div className="text-slate-300 font-medium flex items-center space-x-1">
                    <span>{selectedMission.mission_name}</span>
                  </div>
                  <div className="text-slate-500 text-[10px]">{selectedMission.corridor_label}</div>
                </div>
              </div>
              <span className={simulationActive ? "text-green-400" : showDummyMissionDrone && isAnimating ? "text-blue-400" : "text-yellow-400"}>
                {simulationActive ? "LIVE" : showDummyMissionDrone && isAnimating ? "PREVIEW" : "STANDBY"}
              </span>
            </div>
          )}
          
          {/* Demo Drones */}
          {demoDrones.slice(0, 5).map((drone) => (
            <div key={drone.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: drone.corridorColor }}
                />
                <div>
                  <div className="text-slate-300 font-medium">{drone.name}</div>
                  <div className="text-slate-500 text-[10px] capitalize">{drone.type}</div>
                </div>
              </div>
              <span className="text-slate-500">{drone.battery}%</span>
            </div>
          ))}
          
          {demoDrones.length > 5 && (
            <div className="text-xs text-slate-500 italic">
              +{demoDrones.length - 5} more drones...
            </div>
          )}
        </div>
        
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
          {selectedMission 
            ? `🚁 Mission${showDummyMissionDrone && !simulationActive ? ' (Preview)' : ''} + ${demoDrones.length} Demo Drones` 
            : `${demoDrones.length} Demo Drones • Lucknow-Kanpur Region`
          }
        </div>
      </div>
    </div>
  );
};

export default MultiDroneAwareness;