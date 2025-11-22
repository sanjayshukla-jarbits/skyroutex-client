/**
 * Grid Mission Page - Next.js App Directory Version
 * Location: app/grid-mission/page.tsx
 */

'use client';

import React from 'react';
import GridMissionPlanner from '@/components/GridMissionPlanner';
import { GridMissionPlan } from '@/types/gridMission';

const GridMissionPage: React.FC = () => {
  const handleSave = (mission: GridMissionPlan) => {
    console.log('Mission saved:', mission);
    // Here you can:
    // 1. Store mission in local state/context
    // 2. Navigate to mission execution view
    // 3. Show success notification
    // 4. Update mission list
  };

  const handleUpload = (missionId: string) => {
    console.log('Mission uploaded:', missionId);
    // Here you can:
    // 1. Navigate to mission execution view
    // 2. Start mission monitoring
    // 3. Show upload status
  };

  return (
    <div className="h-screen">
      <GridMissionPlanner
        initialCenter={[26.8467, 80.9462]} // Lucknow
        onSave={handleSave}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default GridMissionPage;