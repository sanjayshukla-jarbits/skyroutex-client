/**
 * Grid Mission Planner Component
 * Interactive UI for creating grid-based survey missions with obstacle avoidance
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { MapPin, Grid3x3, AlertTriangle, Upload, Save, Trash2, Eye, EyeOff } from 'lucide-react';
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
import {
  createGridMission,
  validateGridMission,
  uploadGridMission,
  syncObstaclesToBackend,
} from '@/services/gridMissionService';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
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
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
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

// ============================================================================
// Component Props
// ============================================================================

interface GridMissionPlannerProps {
  initialCenter?: [number, number];
  onSave?: (mission: GridMissionPlan) => void;
  onUpload?: (missionId: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

const GridMissionPlanner: React.FC<GridMissionPlannerProps> = ({
  initialCenter = [26.8467, 80.9462], // Lucknow default
  onSave,
  onUpload,
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
  const [showGrid, setShowGrid] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<'area' | 'obstacles' | 'grid' | 'preview'>('area');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  // Event Handlers
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

  const saveMission = async () => {
    if (!generatedMission) {
      toast.error('Please generate grid first');
      return;
    }

    setIsSaving(true);
    try {
      // Sync obstacles to backend
      await syncObstaclesToBackend(obstacles);

      // Create mission on backend
      const request = {
        name: missionName,
        polygon: surveyArea.map(p => [p.lat, p.lng] as [number, number]),
        altitude,
        grid_spacing: gridSpacing,
        overlap,
        grid_angle: gridAngle,
        camera_angle: cameraAngle,
      };

      const response = await createGridMission(request);

      if (response.success) {
        toast.success(`Mission saved: ${response.data.mission_id}`);
        if (onSave) {
          onSave(generatedMission);
        }
      } else {
        throw new Error('Failed to save mission');
      }
    } catch (error) {
      console.error('Error saving mission:', error);
      toast.error('Failed to save mission');
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================
  // Render
  // ========================================

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Left Panel - Controls */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <h1 className="text-2xl font-bold text-white mb-2">Grid Mission Planner</h1>
          <p className="text-slate-400 text-sm mb-6">Create survey missions with obstacle avoidance</p>

          {/* Mission Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Mission Name
            </label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6">
            {['area', 'obstacles', 'grid', 'preview'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Area Tab */}
            {activeTab === 'area' && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Survey Area
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Click on the map to define the survey area polygon
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsDrawingArea(!isDrawingArea)}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDrawingArea
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isDrawingArea ? 'Cancel Drawing' : 'Draw Survey Area'}
                    </button>
                    
                    {surveyArea.length > 0 && (
                      <>
                        <button
                          onClick={finishDrawingArea}
                          disabled={surveyArea.length < 3}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Finish Area ({surveyArea.length} points)
                        </button>
                        <button
                          onClick={clearSurveyArea}
                          className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium"
                        >
                          Clear Area
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Obstacles Tab */}
            {activeTab === 'obstacles' && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Obstacles / No-Fly Zones
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <button
                      onClick={() => {
                        setIsDrawingObstacle(!isDrawingObstacle);
                        setCurrentObstacle([]);
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        isDrawingObstacle
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      {isDrawingObstacle ? 'Cancel' : 'Add Obstacle'}
                    </button>
                    
                    {currentObstacle.length > 0 && (
                      <button
                        onClick={finishDrawingObstacle}
                        disabled={currentObstacle.length < 3}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        Finish Obstacle ({currentObstacle.length} points)
                      </button>
                    )}
                  </div>

                  {/* Obstacle List */}
                  <div className="space-y-2">
                    {obstacles.map((obstacle) => (
                      <div
                        key={obstacle.id}
                        className="flex items-center justify-between bg-slate-600 p-3 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleObstacle(obstacle.id)}
                            className="text-slate-300 hover:text-white"
                          >
                            {obstacle.enabled ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`text-sm ${obstacle.enabled ? 'text-white' : 'text-slate-400'}`}>
                            {obstacle.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeObstacle(obstacle.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Grid Parameters Tab */}
            {activeTab === 'grid' && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg space-y-4">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Grid Parameters
                  </h3>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Altitude (m): {altitude}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={altitude}
                      onChange={(e) => setAltitude(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Grid Spacing (m): {gridSpacing}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={gridSpacing}
                      onChange={(e) => setGridSpacing(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Image Overlap: {(overlap * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.9"
                      step="0.1"
                      value={overlap}
                      onChange={(e) => setOverlap(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Grid Angle (°): {gridAngle}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={gridAngle}
                      onChange={(e) => setGridAngle(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={generateGrid}
                    disabled={surveyArea.length < 3 || isGenerating}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Grid'}
                  </button>
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && generatedMission && (
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-4">Mission Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Waypoints:</span>
                      <span className="text-white font-medium">
                        {generatedMission.stats.totalWaypoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valid Waypoints:</span>
                      <span className="text-green-400 font-medium">
                        {generatedMission.stats.validWaypoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Blocked by Obstacles:</span>
                      <span className="text-red-400 font-medium">
                        {generatedMission.stats.obstacleWaypoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Grid Lines:</span>
                      <span className="text-white font-medium">
                        {generatedMission.stats.gridLines}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance:</span>
                      <span className="text-white font-medium">
                        {generatedMission.stats.totalDistance.toFixed(2)} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flight Time:</span>
                      <span className="text-white font-medium">
                        {generatedMission.stats.estimatedFlightTime.toFixed(1)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Battery Usage:</span>
                      <span className="text-white font-medium">
                        {generatedMission.stats.estimatedBatteryUsage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coverage Area:</span>
                      <span className="text-white font-medium">
                        {(generatedMission.stats.coverageArea / 1000000).toFixed(2)} km²
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={saveMission}
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Mission'}
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showGrid"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="showGrid" className="text-slate-300 text-sm">
                    Show Grid Lines
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={initialCenter}
          zoom={13}
          className="h-full w-full"
          onClick={handleMapClick}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          {/* Survey Area Polygon */}
          {surveyArea.length > 0 && (
            <Polygon
              positions={surveyArea.map(p => [p.lat, p.lng])}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 2,
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
                weight: 2,
                dashArray: '5, 5',
              }}
            />
          )}

          {/* Obstacles */}
          {showObstacles && obstacles.map(obstacle => {
            if (!obstacle.enabled) return null;
            
            if (obstacle.type === 'polygon' && obstacle.vertices) {
              return (
                <Polygon
                  key={obstacle.id}
                  positions={obstacle.vertices.map(v => [v.lat, v.lng])}
                  pathOptions={{
                    color: obstacle.color || '#ef4444',
                    fillColor: obstacle.color || '#ef4444',
                    fillOpacity: 0.4,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{obstacle.name}</strong>
                      <br />
                      Type: Exclusion Zone
                    </div>
                  </Popup>
                </Polygon>
              );
            } else if (obstacle.type === 'circle' && obstacle.center && obstacle.radius) {
              return (
                <Circle
                  key={obstacle.id}
                  center={[obstacle.center.lat, obstacle.center.lng]}
                  radius={obstacle.radius}
                  pathOptions={{
                    color: obstacle.color || '#ef4444',
                    fillColor: obstacle.color || '#ef4444',
                    fillOpacity: 0.4,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{obstacle.name}</strong>
                      <br />
                      Radius: {obstacle.radius}m
                    </div>
                  </Popup>
                </Circle>
              );
            }
            return null;
          })}

          {/* Generated Grid */}
          {generatedMission && showGrid && generatedMission.gridLines.map((line, idx) => (
            <Polyline
              key={`grid-line-${idx}`}
              positions={line.waypoints.map(wp => [wp.lat, wp.lng])}
              pathOptions={{
                color: '#22c55e',
                weight: 2,
                opacity: 0.7,
              }}
            />
          ))}

          {/* Waypoint Markers */}
          {generatedMission && generatedMission.allWaypoints.map((wp, idx) => (
            <Marker
              key={`wp-${idx}`}
              position={[wp.lat, wp.lng]}
              icon={
                typeof window !== 'undefined' && (window as any).L
                  ? (window as any).L.divIcon({
                      className: 'waypoint-marker',
                      html: `
                        <div style="
                          background: ${wp.isValid ? '#22c55e' : '#ef4444'};
                          color: white;
                          width: 20px;
                          height: 20px;
                          border-radius: 50%;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 10px;
                          font-weight: bold;
                          border: 2px solid white;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        ">
                          ${wp.sequence + 1}
                        </div>
                      `,
                      iconSize: [20, 20],
                      iconAnchor: [10, 10],
                    })
                  : undefined
              }
            >
              <Popup>
                <div className="text-xs">
                  <strong>WP {wp.sequence + 1}</strong>
                  <br />
                  Alt: {wp.altitude}m
                  <br />
                  Status: {wp.isValid ? 'Valid' : 'Blocked'}
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
