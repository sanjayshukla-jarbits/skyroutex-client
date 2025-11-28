/**
 * Professional Drone Icon for Leaflet Maps
 * =========================================
 * SSR-safe version for Next.js
 * 
 * Usage:
 *   import { createDroneIcon, getDroneStatus } from './droneIconUtils';
 */

'use client';

// ============================================================================
// TYPES
// ============================================================================

export type DroneStyle = 'quadcopter' | 'military' | 'arrow' | 'hexacopter' | 'fixed-wing';
export type DroneStatus = 'disarmed' | 'armed' | 'flying' | 'warning' | 'error' | 'rtl';

interface DroneIconOptions {
  heading?: number;
  status?: DroneStatus;
  style?: DroneStyle;
  size?: number;
  showPulse?: boolean;
}

// ============================================================================
// COLOR SCHEMES BY STATUS
// ============================================================================

const statusColors: Record<DroneStatus, { primary: string; secondary: string; glow: string }> = {
  disarmed: { primary: '#64748b', secondary: '#475569', glow: 'rgba(100, 116, 139, 0.4)' },
  armed: { primary: '#f59e0b', secondary: '#d97706', glow: 'rgba(245, 158, 11, 0.5)' },
  flying: { primary: '#22c55e', secondary: '#16a34a', glow: 'rgba(34, 197, 94, 0.5)' },
  warning: { primary: '#f97316', secondary: '#ea580c', glow: 'rgba(249, 115, 22, 0.5)' },
  error: { primary: '#ef4444', secondary: '#dc2626', glow: 'rgba(239, 68, 68, 0.6)' },
  rtl: { primary: '#8b5cf6', secondary: '#7c3aed', glow: 'rgba(139, 92, 246, 0.5)' },
};

// ============================================================================
// MILITARY/TACTICAL DRONE - Professional UAV look
// ============================================================================

const createMilitarySVG = (colors: { primary: string; secondary: string; glow: string }, showPulse: boolean): string => `
<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="droneShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}" />
      <stop offset="50%" style="stop-color:${colors.secondary}" />
      <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.9" />
    </linearGradient>
    <linearGradient id="canopyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  ${showPulse ? `
  <circle cx="28" cy="28" r="24" fill="none" stroke="${colors.glow}" stroke-width="2" opacity="0.5">
    <animate attributeName="r" values="20;28;20" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  ` : ''}
  
  <g filter="url(#droneShadow)">
    <!-- Main Fuselage -->
    <path d="M28 6 L33 14 L35 28 L33 46 L28 52 L23 46 L21 28 L23 14 Z" 
          fill="url(#bodyGrad)" stroke="${colors.secondary}" stroke-width="1.5"/>
    
    <!-- Main Wings -->
    <path d="M21 26 L4 33 L4 35 L21 30 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="0.75"/>
    <path d="M35 26 L52 33 L52 35 L35 30 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="0.75"/>
    
    <!-- Winglets -->
    <path d="M4 33 L2 30 L4 35 Z" fill="${colors.secondary}"/>
    <path d="M52 33 L54 30 L52 35 Z" fill="${colors.secondary}"/>
    
    <!-- Tail Wings -->
    <path d="M23 44 L14 48 L14 50 L23 46 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="0.5"/>
    <path d="M33 44 L42 48 L42 50 L33 46 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="0.5"/>
    
    <!-- Vertical Stabilizer -->
    <path d="M28 42 L28 52 L26 52 L26.5 44 Z" fill="${colors.secondary}"/>
    <path d="M28 42 L28 52 L30 52 L29.5 44 Z" fill="${colors.secondary}" opacity="0.7"/>
    
    <!-- Sensor Dome / Canopy -->
    <ellipse cx="28" cy="16" rx="4.5" ry="7" fill="url(#canopyGrad)" stroke="#3b82f6" stroke-width="0.75"/>
    
    <!-- Engine Exhaust Glow -->
    <ellipse cx="28" cy="50" rx="2.5" ry="1.5" fill="#f97316" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.25s" repeatCount="indefinite"/>
      <animate attributeName="rx" values="2.5;3;2.5" dur="0.25s" repeatCount="indefinite"/>
    </ellipse>
    
    <!-- Status Beacon -->
    <circle cx="28" cy="10" r="2" fill="${colors.primary}">
      <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
    </circle>
    
    <!-- Navigation Lights -->
    <circle cx="6" cy="34" r="1.5" fill="#ef4444">
      <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="50" cy="34" r="1.5" fill="#22c55e">
      <animate attributeName="opacity" values="1;0.2;1" dur="0.8s" repeatCount="indefinite"/>
    </circle>
    
    <!-- Fuselage Details -->
    <line x1="28" y1="20" x2="28" y2="40" stroke="${colors.secondary}" stroke-width="0.5" opacity="0.5"/>
    <ellipse cx="28" cy="32" rx="2" ry="1" fill="${colors.secondary}" opacity="0.3"/>
  </g>
</svg>
`;

// ============================================================================
// QUADCOPTER DRONE
// ============================================================================

const createQuadcopterSVG = (colors: { primary: string; secondary: string; glow: string }, showPulse: boolean): string => `
<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="quadShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
    <linearGradient id="quadBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}" />
      <stop offset="100%" style="stop-color:${colors.secondary}" />
    </linearGradient>
  </defs>
  
  ${showPulse ? `
  <circle cx="26" cy="26" r="22" fill="none" stroke="${colors.glow}" stroke-width="2" opacity="0.6">
    <animate attributeName="r" values="18;26;18" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  ` : ''}
  
  <g filter="url(#quadShadow)">
    <!-- Arms -->
    <line x1="26" y1="26" x2="10" y2="10" stroke="${colors.secondary}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="42" y2="10" stroke="${colors.secondary}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="10" y2="42" stroke="${colors.secondary}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="42" y2="42" stroke="${colors.secondary}" stroke-width="3.5" stroke-linecap="round"/>
    
    <!-- Rotors -->
    <g>
      <ellipse cx="10" cy="10" rx="7" ry="2.5" fill="${colors.primary}" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="0.12s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="10" cy="10" r="2.5" fill="${colors.secondary}"/>
      
      <ellipse cx="42" cy="10" rx="7" ry="2.5" fill="${colors.primary}" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="360 42 10" to="0 42 10" dur="0.12s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="42" cy="10" r="2.5" fill="${colors.secondary}"/>
      
      <ellipse cx="10" cy="42" rx="7" ry="2.5" fill="${colors.primary}" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="360 10 42" to="0 10 42" dur="0.12s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="10" cy="42" r="2.5" fill="${colors.secondary}"/>
      
      <ellipse cx="42" cy="42" rx="7" ry="2.5" fill="${colors.primary}" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="0 42 42" to="360 42 42" dur="0.12s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="42" cy="42" r="2.5" fill="${colors.secondary}"/>
    </g>
    
    <!-- Body -->
    <circle cx="26" cy="26" r="9" fill="url(#quadBody)" stroke="${colors.secondary}" stroke-width="1.5"/>
    <circle cx="26" cy="26" r="4" fill="white" opacity="0.8"/>
    
    <!-- Direction Arrow -->
    <polygon points="26,14 22,22 30,22" fill="white" stroke="${colors.secondary}" stroke-width="0.75"/>
  </g>
</svg>
`;

// ============================================================================
// ARROW STYLE - Simple & Clean
// ============================================================================

const createArrowSVG = (colors: { primary: string; secondary: string; glow: string }, showPulse: boolean): string => `
<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="arrowShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}" />
      <stop offset="100%" style="stop-color:${colors.secondary}" />
    </linearGradient>
    <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  ${showPulse ? `
  <circle cx="22" cy="22" r="18" fill="none" stroke="${colors.glow}" stroke-width="2">
    <animate attributeName="r" values="15;22;15" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  ` : ''}
  
  <g filter="url(#arrowShadow)">
    <!-- Main Arrow -->
    <path d="M22 4 L8 36 L22 28 L36 36 Z" 
          fill="url(#arrowGrad)" 
          stroke="${colors.secondary}" 
          stroke-width="2"
          stroke-linejoin="round"
          filter="url(#arrowGlow)"/>
    
    <!-- Inner Detail -->
    <path d="M22 12 L14 30 L22 24 L30 30 Z" fill="${colors.secondary}" opacity="0.3"/>
    
    <!-- Center -->
    <circle cx="22" cy="22" r="3" fill="white"/>
  </g>
</svg>
`;

// ============================================================================
// HELPER: Get status from telemetry
// ============================================================================

export const getDroneStatus = (armed: boolean, flying: boolean, flightMode?: string): DroneStatus => {
  if (!armed) return 'disarmed';
  
  const mode = flightMode?.toUpperCase() || '';
  if (mode === 'RTL' || mode === 'RETURN' || mode.includes('RETURN')) return 'rtl';
  if (mode === 'LAND' || mode.includes('LAND')) return 'warning';
  if (flying) return 'flying';
  
  return 'armed';
};

// ============================================================================
// MAIN FACTORY FUNCTION - SSR SAFE
// ============================================================================

export const createDroneIcon = (options: DroneIconOptions = {}): L.DivIcon | null => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  // Dynamic import of Leaflet only on client side
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const L = require('leaflet');

  const {
    heading = 0,
    status = 'flying',
    style = 'military',
    size = 56,
    showPulse = true,
  } = options;

  const colors = statusColors[status];
  
  let svg: string;
  let baseSize: number;
  
  switch (style) {
    case 'quadcopter':
      svg = createQuadcopterSVG(colors, showPulse);
      baseSize = 52;
      break;
    case 'arrow':
      svg = createArrowSVG(colors, showPulse);
      baseSize = 44;
      break;
    case 'military':
    default:
      svg = createMilitarySVG(colors, showPulse);
      baseSize = 56;
      break;
  }

  const scale = size / baseSize;

  return L.divIcon({
    className: 'professional-drone-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${heading}deg);
        transform-origin: center center;
        transition: transform 0.3s ease-out;
      ">
        <div style="transform: scale(${scale}); transform-origin: center center;">
          ${svg}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export default createDroneIcon;