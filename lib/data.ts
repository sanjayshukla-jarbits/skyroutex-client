import { Target, Package, Sprout, AlertTriangle, Eye, Map as MapIcon, Truck, Activity } from 'lucide-react'
import { Mission, MissionType, Role } from '@/types'

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
  { name: 'Agriculture', description: 'Crop monitoring & spraying', active: 5, lastUsed: '1d ago', icon: Sprout, color: 'bg-green-700' },
  { name: 'Emergency', description: 'Search & rescue operations', active: 3, lastUsed: '2d ago', icon: AlertTriangle, color: 'bg-red-700' },
  { name: 'Inspection', description: 'Infrastructure assessment', active: 6, lastUsed: '3d ago', icon: Eye, color: 'bg-purple-700' },
  { name: 'Mapping', description: 'Aerial surveying & 3D modeling', active: 7, lastUsed: '1h ago', icon: MapIcon, color: 'bg-blue-700' },
  { name: 'Delivery', description: 'Point-to-point transport', active: 15, lastUsed: '30min ago', icon: Truck, color: 'bg-amber-700' },
  { name: 'Monitoring', description: 'Environmental tracking', active: 9, lastUsed: '4h ago', icon: Activity, color: 'bg-teal-700' }
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