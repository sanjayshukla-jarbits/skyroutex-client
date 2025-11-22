import { Target, Package, Sprout, AlertTriangle, Eye, Map as MapIcon, Truck, Activity } from 'lucide-react'
import { Mission, MissionType, Role, Vehicle, Operator } from '@/types'

export const missionsData: Mission[] = [
  {
    id: '#M-2024-001',
    name: 'Border Surveillance Alpha',
    description: 'Northern sector patrol route',
    type: 'Surveillance',
    vehicle: 'UAV-X1-Alpha',
    operator: 'J. Smith',
    status: 'In Flight',
    progress: 65,
    date: 'Nov 5, 2025',
    time: '14:30 UTC',
    created: '2h ago',
    alert: false
  },
  {
    id: '#M-2024-002',
    name: 'Cargo Delivery Route 7',
    description: 'Medical supplies transport',
    type: 'Logistics',
    vehicle: 'UAV-C2-Beta',
    operator: 'M. Chen',
    status: 'Completed',
    progress: 100,
    date: 'Nov 5, 2025',
    time: '11:45 UTC',
    created: '5h ago',
    alert: false
  },
  {
    id: '#M-2024-003',
    name: 'Agricultural Survey Grid-5',
    description: 'Crop health monitoring',
    type: 'Agriculture',
    vehicle: 'UAV-A3-Gamma',
    operator: 'S. Patel',
    status: 'Pending',
    progress: 15,
    date: 'Nov 4, 2025',
    time: '09:00 UTC',
    created: '1d ago',
    alert: false
  },
  {
    id: '#M-2024-004',
    name: 'Emergency Response ER-12',
    description: 'Search and rescue operation',
    type: 'Emergency',
    vehicle: 'UAV-R1-Delta',
    operator: 'A. Johnson',
    status: 'Low Battery',
    progress: 40,
    date: 'Nov 3, 2025',
    time: '16:20 UTC',
    created: '2d ago',
    alert: true
  },
  {
    id: '#M-2024-005',
    name: 'Inspection Route West-3',
    description: 'Infrastructure monitoring',
    type: 'Inspection',
    vehicle: 'UAV-I2-Epsilon',
    operator: 'R. Kumar',
    status: 'Failed',
    progress: 25,
    date: 'Nov 2, 2025',
    time: '08:15 UTC',
    created: '3d ago',
    alert: false
  }
]

export const missionTypes: MissionType[] = [
  { name: 'Surveillance', description: 'Border patrol & monitoring', active: 12, lastUsed: '2h ago', icon: Target, color: 'bg-black' },
  { name: 'Logistics', description: 'Cargo & delivery operations', active: 8, lastUsed: '5h ago', icon: Package, color: 'bg-orange-800' },
  { name: 'Agriculture', description: 'Crop monitoring & spraying', active: 5, lastUsed: '1d ago', icon: Sprout, color: 'bg-green-600' },
  { name: 'Emergency', description: 'Search & rescue operations', active: 3, lastUsed: '2d ago', icon: AlertTriangle, color: 'bg-red-700' },
  { name: 'Regional', description: 'Infrastructure assessment', active: 6, lastUsed: '3d ago', icon: Eye, color: 'bg-purple-600' },
  { name: 'Mapping', description: 'Aerial surveying & 3D modeling', active: 7, lastUsed: '1h ago', icon: MapIcon, color: 'bg-blue-600' },
  { name: 'Delivery', description: 'Point-to-point transport', active: 15, lastUsed: '30min ago', icon: Truck, color: 'bg-black' },
  { name: 'Monitoring', description: 'Environmental tracking', active: 9, lastUsed: '4h ago', icon: Activity, color: 'bg-orange-800' }
]

export const rolesData: Role[] = [
  {
    name: 'Operator',
    description: 'Field mission execution role',
    color: 'bg-green-500',
    activeUsers: 24,
    permissions: [
      { name: 'View Missions', description: 'Read-only access to mission data', allowed: true },
      { name: 'Execute Missions', description: 'Start, pause, and complete assigned missions', allowed: true },
      { name: 'Create Missions', description: 'Not allowed for this role', allowed: false },
      { name: 'Modify Missions', description: 'Not allowed for this role', allowed: false },
      { name: 'Manage Users', description: 'Not allowed for this role', allowed: false }
    ]
  },
  {
    name: 'Planner',
    description: 'Mission planning and design role',
    color: 'bg-blue-500',
    activeUsers: 12,
    permissions: [
      { name: 'View Missions', description: 'Full read access to all missions', allowed: true },
      { name: 'Create Missions', description: 'Design and plan new missions', allowed: true },
      { name: 'Modify Missions', description: 'Edit existing mission parameters', allowed: true },
      { name: 'Delete Missions', description: 'Not allowed for this role', allowed: false },
      { name: 'Manage Users', description: 'Not allowed for this role', allowed: false }
    ]
  },
  {
    name: 'Commander',
    description: 'Mission oversight and management',
    color: 'bg-yellow-500',
    activeUsers: 5,
    permissions: [
      { name: 'View Missions', description: 'Comprehensive mission oversight', allowed: true },
      { name: 'Create Missions', description: 'Full mission creation capabilities', allowed: true },
      { name: 'Modify Missions', description: 'Modify any mission parameters', allowed: true },
      { name: 'Delete Missions', description: 'Remove missions from system', allowed: true },
      { name: 'Manage Users', description: 'Assign roles and manage operators', allowed: true }
    ]
  },
  {
    name: 'Administrator',
    description: 'Full system access and control',
    color: 'bg-red-500',
    activeUsers: 2,
    permissions: [
      { name: 'All Permissions', description: 'Unrestricted access to all system functions', allowed: true },
      { name: 'System Configuration', description: 'Configure system-wide settings', allowed: true },
      { name: 'Security Management', description: 'Manage encryption and security policies', allowed: true },
      { name: 'Audit Logs', description: 'View and manage comprehensive audit trails', allowed: true },
      { name: 'Role Management', description: 'Create, modify, and delete user roles', allowed: true }
    ]
  }
]

// NEW: VEHICLES DATA
export const vehiclesData: Vehicle[] = [
  {
    id: 'UAV-X1-Alpha',
    name: 'Alpha Guardian',
    model: 'X1-Surveillance',
    type: 'Surveillance',
    status: 'In Flight',
    battery: 65,
    location: 'Northern Sector',
    flightHours: 342,
    lastMission: '2h ago',
    missions: 127
  },
  {
    id: 'UAV-C2-Beta',
    name: 'Beta Transporter',
    model: 'C2-Cargo',
    type: 'Logistics',
    status: 'Active',
    battery: 95,
    location: 'Base Station',
    flightHours: 218,
    lastMission: '5h ago',
    missions: 89
  },
  {
    id: 'UAV-A3-Gamma',
    name: 'Gamma Surveyor',
    model: 'A3-Agriculture',
    type: 'Agriculture',
    status: 'Active',
    battery: 88,
    location: 'Base Station',
    flightHours: 156,
    lastMission: '1d ago',
    missions: 62
  },
  {
    id: 'UAV-R1-Delta',
    name: 'Delta Rescuer',
    model: 'R1-Emergency',
    type: 'Emergency',
    status: 'Maintenance',
    battery: 15,
    location: 'Maintenance Bay',
    flightHours: 298,
    lastMission: '2d ago',
    missions: 104
  },
  {
    id: 'UAV-I2-Epsilon',
    name: 'Epsilon Inspector',
    model: 'I2-Inspection',
    type: 'Inspection',
    status: 'Offline',
    battery: 0,
    location: 'Hangar',
    flightHours: 445,
    lastMission: '3d ago',
    missions: 178
  },
  {
    id: 'UAV-M1-Zeta',
    name: 'Zeta Mapper',
    model: 'M1-Mapping',
    type: 'Mapping',
    status: 'Active',
    battery: 92,
    location: 'Base Station',
    flightHours: 267,
    lastMission: '1h ago',
    missions: 95
  },
  {
    id: 'UAV-D1-Theta',
    name: 'Theta Courier',
    model: 'D1-Delivery',
    type: 'Delivery',
    status: 'In Flight',
    battery: 78,
    location: 'East Route',
    flightHours: 189,
    lastMission: '30min ago',
    missions: 142
  },
  {
    id: 'UAV-E1-Kappa',
    name: 'Kappa Monitor',
    model: 'E1-Environmental',
    type: 'Monitoring',
    status: 'Active',
    battery: 100,
    location: 'Base Station',
    flightHours: 312,
    lastMission: '4h ago',
    missions: 118
  }
]

// NEW: OPERATORS DATA
export const operatorsData: Operator[] = [
  {
    id: 'EMP-2024-001',
    name: 'J. Smith',
    initials: 'JS',
    role: 'Commander',
    status: 'On Mission',
    email: 'j.smith@jarbits.com',
    phone: '+91 98765 43210',
    location: 'Pune, Maharashtra',
    missions: 127,
    successRate: 98.5,
    flightHours: 342,
    certifications: ['FAA Part 107', 'Advanced UAV Operations', 'Night Flight'],
    lastActive: '2h ago'
  },
  {
    id: 'EMP-2024-002',
    name: 'M. Chen',
    initials: 'MC',
    role: 'Operator',
    status: 'Active',
    email: 'm.chen@jarbits.com',
    phone: '+91 98765 43211',
    location: 'Mumbai, Maharashtra',
    missions: 89,
    successRate: 96.8,
    flightHours: 218,
    certifications: ['FAA Part 107', 'Cargo Operations'],
    lastActive: '5h ago'
  },
  {
    id: 'EMP-2024-003',
    name: 'S. Patel',
    initials: 'SP',
    role: 'Planner',
    status: 'Active',
    email: 's.patel@jarbits.com',
    phone: '+91 98765 43212',
    location: 'Ahmedabad, Gujarat',
    missions: 62,
    successRate: 97.2,
    flightHours: 156,
    certifications: ['FAA Part 107', 'Mission Planning', 'Agricultural Surveying'],
    lastActive: '1d ago'
  },
  {
    id: 'EMP-2024-004',
    name: 'A. Johnson',
    initials: 'AJ',
    role: 'Operator',
    status: 'On Leave',
    email: 'a.johnson@jarbits.com',
    phone: '+91 98765 43213',
    location: 'Bangalore, Karnataka',
    missions: 104,
    successRate: 95.1,
    flightHours: 298,
    certifications: ['FAA Part 107', 'Emergency Response', 'Search & Rescue'],
    lastActive: '2d ago'
  },
  {
    id: 'EMP-2024-005',
    name: 'R. Kumar',
    initials: 'RK',
    role: 'Operator',
    status: 'Offline',
    email: 'r.kumar@jarbits.com',
    phone: '+91 98765 43214',
    location: 'Delhi, NCR',
    missions: 178,
    successRate: 99.2,
    flightHours: 445,
    certifications: ['FAA Part 107', 'Infrastructure Inspection', 'Advanced Imaging'],
    lastActive: '3d ago'
  },
  {
    id: 'EMP-2024-006',
    name: 'L. Williams',
    initials: 'LW',
    role: 'Administrator',
    status: 'Active',
    email: 'l.williams@jarbits.com',
    phone: '+91 98765 43215',
    location: 'Pune, Maharashtra',
    missions: 52,
    successRate: 100,
    flightHours: 167,
    certifications: ['FAA Part 107', 'System Administration', 'Security Management'],
    lastActive: '30min ago'
  },
  {
    id: 'EMP-2024-007',
    name: 'K. Singh',
    initials: 'KS',
    role: 'Planner',
    status: 'Active',
    email: 'k.singh@jarbits.com',
    phone: '+91 98765 43216',
    location: 'Chandigarh, Punjab',
    missions: 95,
    successRate: 97.8,
    flightHours: 267,
    certifications: ['FAA Part 107', 'Route Optimization', '3D Mapping'],
    lastActive: '1h ago'
  },
  {
    id: 'EMP-2024-008',
    name: 'T. Anderson',
    initials: 'TA',
    role: 'Operator',
    status: 'On Mission',
    email: 't.anderson@jarbits.com',
    phone: '+91 98765 43217',
    location: 'Hyderabad, Telangana',
    missions: 142,
    successRate: 98.9,
    flightHours: 389,
    certifications: ['FAA Part 107', 'Delivery Operations', 'Urban Navigation'],
    lastActive: '30min ago'
  }
]