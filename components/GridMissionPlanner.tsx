/**
 * Enhanced Grid Mission Planner Component
 * Implements database persistence and real-time mission execution
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useMapEvents } from 'react-leaflet';
import toast, { Toaster } from 'react-hot-toast';
import { MapPin, Grid, AlertTriangle, Upload, Save, Trash2, Eye, EyeOff, Play, Square } from 'lucide-react';
import {
  GridMissionConfig,
  ObstacleZone,
  LatLngPoint,
  GridMissionPlan,
  GridMissionStats,
} from '@/types/gridMission';
import {
  generateGridWaypoints,
  calculateTotalDistance,
  estimateFlightTime,
  estimateBatteryUsage,
  calculatePolygonArea,
} from '@/utils/gridMissionUtils';

// Dynamically import map components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-slate-900 text-white">Loading map...</div>
  }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polygon),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
import fixLeafletIcons, { startIcon, endIcon, blueWaypointIcon, droneIcon } from '@/utils/leafletIconFix';

// ============================================================================
// API Configuration
// ============================================================================

const DRONE_CONTROL_API = process.env.NEXT_PUBLIC_DRONE_API_URL || 'http://localhost:7000';
const MISSION_DB_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// Component Props
// ============================================================================

interface GridMissionPlannerProps {
  initialCenter?: [number, number];
  onSave?: (mission: GridMissionPlan) => void;
  onMissionStart?: (missionId: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

const GridMissionPlanner: React.FC<GridMissionPlannerProps> = ({
  initialCenter = [26.8467, 80.9462], // Lucknow default
  onSave,
  onMissionStart,
}) => {
  // ========================================
  // State Management
  // ========================================

  const [missionName, setMissionName] = useState('Grid Survey Mission');
  const [altitude, setAltitude] = useState(50);
  const [gridSpacing, setGridSpacing] = useState(30);
  const [overlap, setOverlap] = useState(0.7);
  const [gridAngle, setGridAngle] = useState(0);
  const [cameraAngle, setCameraAngle] = useState(90);

  // Survey area polygon
  const [surveyArea, setSurveyArea] = useState<LatLngPoint[]>([]);
  const [isDrawingArea, setIsDrawingArea] = useState(false);

  // Obstacles
  const [obstacles, setObstacles] = useState<ObstacleZone[]>([]);
  const [isDrawingObstacle, setIsDrawingObstacle] = useState(false);
  const [currentObstacle, setCurrentObstacle] = useState<LatLngPoint[]>([]);
  const [obstacleType, setObstacleType] = useState<'polygon' | 'circle'>('polygon');

  // Generated mission
  const [generatedMission, setGeneratedMission] = useState<GridMissionPlan | null>(null);
  const [savedMissionId, setSavedMissionId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<'area' | 'obstacles' | 'grid' | 'preview'>('area');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // ========================================
  // Computed Values
  // ========================================

  const config: GridMissionConfig = useMemo(() => ({
    name: missionName,
    surveyArea: {
      vertices: surveyArea,
      name: 'Survey Area',
      color: '#3b82f6',
    },
    altitude,
    gridSpacing,
    overlap,
    gridAngle,
    cameraAngle,
    obstacles,
  }), [missionName, surveyArea, altitude, gridSpacing, overlap, gridAngle, cameraAngle, obstacles]);

  // ========================================
  // Fix Leaflet Icons on Mount - ADD THIS
  // ========================================
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // ========================================
  // Map Interaction Handlers
  // ========================================

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;

    if (isDrawingArea) {
      setSurveyArea(prev => [...prev, { lat, lng }]);
    } else if (isDrawingObstacle) {
      setCurrentObstacle(prev => [...prev, { lat, lng }]);
    }
  };

  const finishDrawingArea = () => {
    if (surveyArea.length < 3) {
      toast.error('Survey area must have at least 3 points');
      return;
    }
    setIsDrawingArea(false);
    toast.success('Survey area defined');
  };

  const clearSurveyArea = () => {
    setSurveyArea([]);
    setGeneratedMission(null);
    toast.info('Survey area cleared');
  };

  const finishDrawingObstacle = () => {
    if (currentObstacle.length < 3) {
      toast.error('Obstacle must have at least 3 points');
      return;
    }

    const newObstacle: ObstacleZone = {
      id: `obstacle-${Date.now()}`,
      name: `Obstacle ${obstacles.length + 1}`,
      type: obstacleType,
      enabled: true,
      vertices: currentObstacle,
      color: '#ef4444',
      minAltitude: 0,
      maxAltitude: altitude + 20,
    };

    setObstacles(prev => [...prev, newObstacle]);
    setCurrentObstacle([]);
    setIsDrawingObstacle(false);
    toast.success('Obstacle added');
  };

  const removeObstacle = (id: string) => {
    setObstacles(prev => prev.filter(obs => obs.id !== id));
    toast.info('Obstacle removed');
  };

  const toggleObstacle = (id: string) => {
    setObstacles(prev =>
      prev.map(obs =>
        obs.id === id ? { ...obs, enabled: !obs.enabled } : obs
      )
    );
  };

  // ========================================
  // Grid Generation
  // ========================================

  const generateGrid = async () => {
    if (surveyArea.length < 3) {
      toast.error('Please define survey area first');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate waypoints
      const { gridLines, allWaypoints } = generateGridWaypoints(config);
      
      const validWaypoints = allWaypoints.filter(wp => wp.isValid);
      const obstacleWaypoints = allWaypoints.filter(wp => !wp.isValid);

      // Calculate statistics
      const totalDistance = calculateTotalDistance(validWaypoints);
      const flightTime = estimateFlightTime(totalDistance);
      const batteryUsage = estimateBatteryUsage(flightTime);
      const coverageArea = calculatePolygonArea(surveyArea);

      const stats: GridMissionStats = {
        totalWaypoints: allWaypoints.length,
        validWaypoints: validWaypoints.length,
        obstacleWaypoints: obstacleWaypoints.length,
        totalDistance: totalDistance / 1000, // km
        estimatedFlightTime: flightTime / 60, // minutes
        estimatedBatteryUsage: batteryUsage,
        gridLines: gridLines.length,
        coverageArea: coverageArea,
      };

      const mission: GridMissionPlan = {
        id: `grid-${Date.now()}`,
        name: missionName,
        config,
        gridLines,
        allWaypoints,
        validWaypoints,
        stats,
        createdAt: new Date().toISOString(),
      };

      setGeneratedMission(mission);
      setActiveTab('preview');
      toast.success('Grid mission generated successfully');
    } catch (error) {
      console.error('Error generating grid:', error);
      toast.error('Failed to generate grid mission');
    } finally {
      setIsGenerating(false);
    }
  };

  // ========================================
  // Database Save Mission
  // ========================================

  const saveMissionToDatabase = async () => {
    if (!generatedMission) {
      toast.error('Please generate grid first');
      return;
    }

    setIsSaving(true);
    try {
      // Format waypoints for database
      const waypoints = generatedMission.validWaypoints.map((wp, index) => ({
        id: `wp-${index}`,
        label: `Waypoint ${index + 1}`,
        coords: `${wp.position.lat.toFixed(6)}° N, ${wp.position.lon.toFixed(6)}° E`,
        alt: `${altitude}m AGL`,
        color: 'bg-blue-500',
        lat: wp.position.lat,
        lon: wp.position.lon
      }));

      // Prepare mission payload
      const missionPayload = {
        mission_name: missionName,
        mission_type: 'Grid Survey',
        corridor: {
          value: 'survey',
          label: 'Survey Mission',
          color: '#3b82f6',
          description: 'Grid-based area survey mission'
        },
        mission_stats: {
          total_distance: generatedMission.stats.totalDistance,
          flight_time: generatedMission.stats.estimatedFlightTime,
          battery_usage: generatedMission.stats.estimatedBatteryUsage
        },
        waypoints: waypoints,
        created_by: 'grid_planner',
        notes: `Grid survey mission with ${generatedMission.stats.validWaypoints} waypoints`,
        vehicle_id: 'UAV-GRID-001',
        operator_id: 'operator-001'
      };

      // POST to Mission Database API
      const response = await fetch(`${MISSION_DB_API}/api/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save mission');
      }

      const savedMission = await response.json();
      setSavedMissionId(savedMission.id.toString());
      toast.success(`✅ Mission saved (ID: ${savedMission.id})`);
      
      return savedMission.id;
    } catch (error) {
      toast.error(`Failed to save: ${error.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================
  // Mission Upload & Start
  // ========================================

  const uploadAndStartMission = async () => {
    if (!generatedMission) {
      toast.error('Please generate grid first');
      return;
    }

    // Save to database first if not already saved
    let missionId = savedMissionId;
    if (!missionId) {
      toast.info('Saving mission to database first...');
      missionId = await saveMissionToDatabase();
      if (!missionId) {
        return; // Save failed
      }
    }

    setIsStarting(true);
    try {
      // Step 1: Create survey mission on Drone Control API (port 8000)
      console.log('🚀 Creating survey mission on drone control API...');
      
      const surveyPayload = {
        name: missionName,
        polygon: surveyArea.map(p => [p.lat, p.lng] as [number, number]),
        altitude: altitude,
        grid_spacing: gridSpacing,
        overlap: overlap,
        camera_angle: cameraAngle
      };

      const surveyResponse = await fetch(`${DRONE_CONTROL_API}/mission/survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyPayload),
      });

      if (!surveyResponse.ok) {
        throw new Error('Failed to create survey mission on drone control API');
      }

      const surveyData = await surveyResponse.json();
      console.log('✅ Survey mission created:', surveyData);
      
      const droneControlMissionId = surveyData.data.mission_id;
      toast.success(`Survey mission created: ${droneControlMissionId}`);

      // Step 2: Upload mission to PX4
      console.log('📤 Uploading mission to PX4...');
      
      const uploadResponse = await fetch(`${DRONE_CONTROL_API}/mission/upload_template/${droneControlMissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload mission to PX4');
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ Mission uploaded to PX4:', uploadData);
      toast.success('Mission uploaded to drone');

      // Step 3: Start mission
      console.log('▶️ Starting mission...');
      
      const startResponse = await fetch(`${DRONE_CONTROL_API}/mission/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start mission');
      }

      const startData = await startResponse.json();
      console.log('✅ Mission started:', startData);
      toast.success('🚁 Mission started! Live telemetry active.');

      // Update mission status in database
      await fetch(`${MISSION_DB_API}/api/missions/${missionId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (onMissionStart) {
        onMissionStart(missionId);
      }

    } catch (error) {
      console.error('❌ Error starting mission:', error);
      toast.error(`Failed to start mission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStarting(false);
    }
  };

  // ========================================
  // Map Click Handler Component
  // ========================================
  
  const MapClickHandler = () => {
    const map = useMapEvents({
      click: (e: any) => {
        handleMapClick(e);
      },
    });
    return null;
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Add Toaster here */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">Grid Mission Planner</h1>
          <p className="text-slate-400 text-sm mb-6">Create survey missions with obstacle avoidance</p>

          {/* Mission Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Mission Name</label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter mission name"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['area', 'obstacles', 'grid', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Area Tab */}
          {activeTab === 'area' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDrawingArea(!isDrawingArea)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium ${
                    isDrawingArea
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <MapPin className="inline mr-2" size={16} />
                  {isDrawingArea ? 'Drawing...' : 'Draw Area'}
                </button>
                {isDrawingArea && (
                  <button
                    onClick={finishDrawingArea}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium"
                  >
                    Finish
                  </button>
                )}
              </div>

              {surveyArea.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">{surveyArea.length} points defined</span>
                    <button
                      onClick={clearSurveyArea}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      <Trash2 size={16} className="inline mr-1" />
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Obstacles Tab */}
          {activeTab === 'obstacles' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDrawingObstacle(!isDrawingObstacle)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium ${
                    isDrawingObstacle
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <AlertTriangle className="inline mr-2" size={16} />
                  {isDrawingObstacle ? 'Drawing...' : 'Add Obstacle'}
                </button>
                {isDrawingObstacle && (
                  <button
                    onClick={finishDrawingObstacle}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium"
                  >
                    Finish
                  </button>
                )}
              </div>

              {obstacles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-400">Obstacles ({obstacles.length})</h3>
                  {obstacles.map(obs => (
                    <div key={obs.id} className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                      <button
                        onClick={() => toggleObstacle(obs.id)}
                        className={`px-2 py-1 rounded text-xs ${
                          obs.enabled ? 'bg-red-600' : 'bg-slate-600'
                        }`}
                      >
                        {obs.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <span className="flex-1 text-sm">{obs.name}</span>
                      <button
                        onClick={() => removeObstacle(obs.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grid Tab */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Altitude (m)</label>
                <input
                  type="number"
                  value={altitude}
                  onChange={(e) => setAltitude(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                  min="10"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Grid Spacing (m)</label>
                <input
                  type="number"
                  value={gridSpacing}
                  onChange={(e) => setGridSpacing(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                  min="10"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Overlap</label>
                <input
                  type="range"
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-full"
                  min="0"
                  max="1"
                  step="0.1"
                />
                <span className="text-sm text-slate-400">{(overlap * 100).toFixed(0)}%</span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Grid Angle (°)</label>
                <input
                  type="number"
                  value={gridAngle}
                  onChange={(e) => setGridAngle(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                  min="0"
                  max="180"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Camera Angle (°)</label>
                <input
                  type="number"
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                  min="0"
                  max="90"
                />
              </div>

              <button
                onClick={generateGrid}
                disabled={isGenerating || surveyArea.length < 3}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium"
              >
                <Grid className="inline mr-2" size={16} />
                {isGenerating ? 'Generating...' : 'Generate Grid'}
              </button>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && generatedMission && (
            <div className="space-y-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Mission Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Waypoints:</span>
                    <span className="text-green-400 font-medium">{generatedMission.stats.totalWaypoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valid Waypoints:</span>
                    <span className="text-green-400 font-medium">{generatedMission.stats.validWaypoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Blocked by Obstacles:</span>
                    <span className="text-red-400 font-medium">{generatedMission.stats.obstacleWaypoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grid Lines:</span>
                    <span className="font-medium">{generatedMission.stats.gridLines}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <span className="font-medium">{generatedMission.stats.totalDistance.toFixed(2)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flight Time:</span>
                    <span className="font-medium">{generatedMission.stats.estimatedFlightTime.toFixed(1)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Battery Usage:</span>
                    <span className={`font-medium ${
                      generatedMission.stats.estimatedBatteryUsage > 90 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {generatedMission.stats.estimatedBatteryUsage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coverage Area:</span>
                    <span className="font-medium">{generatedMission.stats.coverageArea.toFixed(2)} km²</span>
                  </div>
                </div>
              </div>

              <button
                onClick={saveMissionToDatabase}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium"
              >
                <Save className="inline mr-2" size={16} />
                {isSaving ? 'Saving...' : savedMissionId ? 'Mission Saved ✓' : 'Save Mission'}
              </button>

              {/* <button
                onClick={uploadAndStartMission}
                disabled={isStarting}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md font-medium"
              >
                <Play className="inline mr-2" size={16} />
                {isStarting ? 'Starting...' : 'Upload & Start Mission'}
              </button> */}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showGrid" className="text-sm">Show Grid Lines</label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={initialCenter}
          zoom={13}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
          />

          <MapClickHandler />

          {/* Survey Area */}
          {surveyArea.length > 0 && (
            <Polygon
              positions={surveyArea.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: '#3b82f6', 
                fillColor: '#3b82f6', 
                fillOpacity: 0.2 
              }}
            />
          )}

          {/* Current drawing obstacle */}
          {currentObstacle.length > 0 && (
            <Polygon
              positions={currentObstacle.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: '#ef4444', 
                fillColor: '#ef4444', 
                fillOpacity: 0.3,
                dashArray: '5, 10'
              }}
            />
          )}

          {/* Saved obstacles */}
          {obstacles.filter(obs => obs.enabled).map(obs => (
            <Polygon
              key={obs.id}
              positions={obs.vertices.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: obs.color, 
                fillColor: obs.color, 
                fillOpacity: 0.4 
              }}
            >
              <Popup>{obs.name}</Popup>
            </Polygon>
          ))}

          {/* Generated grid lines */}
          {generatedMission && showGrid && generatedMission.gridLines.map((line, idx) => (
            <Polyline
              key={`line-${idx}`}
              positions={line.waypoints.map(wp => [wp.position.lat, wp.position.lon])}
              pathOptions={{ 
                color: '#22c55e', 
                weight: 2,
                opacity: 0.6
              }}
            />
          ))}

          {/* Generated waypoints */}
          {generatedMission && generatedMission.validWaypoints.map((wp, idx) => (
            <Marker
              key={`wp-${idx}`}
              position={[wp.position.lat, wp.position.lon]}
            >
              <Popup>
                <div className="text-xs">
                  <strong>Waypoint {wp.sequence}</strong><br />
                  Line: {wp.lineIndex}<br />
                  Alt: {altitude}m
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default GridMissionPlanner;