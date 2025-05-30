import React from 'react';
import { SensorType, SENSOR_TYPE_LABELS } from '../types';

// Sensor Icon Component
// Added optional x, y for direct SVG positioning if needed, but foreignObject handles it.
const SensorIcon: React.FC<{ color: string, label: string, pulse?: boolean }> = ({ color, label, pulse }) => (
  // The div structure is important for layout within foreignObject
  <div className="flex flex-col items-center justify-center w-full h-full group cursor-pointer" title={label}>
    <svg viewBox="0 0 100 100" className={`w-8 h-8 ${pulse ? 'animate-pulse' : ''}`}>
      <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="8" fill="white" />
      <circle cx="50" cy="50" r="25" fill={color} />
    </svg>
    {/* Tooltip-like label shown on hover, more explicit than just title attr for discoverability */}
    <span className="absolute bottom-full mb-2 w-max text-xs text-center bg-black bg-opacity-70 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
      {label}
    </span>
  </div>
);

// Gauge component for stress value
const StressGauge: React.FC<{ value: number | undefined; scale?: number }> = ({ value, scale = 1 }) => {
  // Clamp value between 0 and 100
  const percent = typeof value === 'number' && !isNaN(value) ? Math.max(0, Math.min(100, value)) : 0;
  let color = '#22c55e'; // green
  if (percent > 80) color = '#ef4444'; // red
  else if (percent > 50) color = '#f59e42'; // orange

  // Arc for gauge (semi-circle)
  const radius = 36 * scale;
  const cx = 40 * scale, cy = 40 * scale;
  const angle = (Math.PI * ((percent + 50) / 100));
  const x = cx - (radius * Math.sin(angle));
  const y = cy + (radius * Math.cos(angle));
  const width = 80 * scale;
  const height = 55 * scale;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background arc */}
      <path d={`M${4 * scale},${40 * scale} A${radius},${radius} 0 0,1 ${76 * scale},${40 * scale}`} fill="none" stroke="#e5e7eb" strokeWidth={8 * scale} />
      {/* Value arc */}
      <path
        d={`M${cx - radius},${cy} A${radius},${radius} 0 0,1 ${x},${y}`}
        fill="none"
        stroke={color}
        strokeWidth={8 * scale}
        strokeLinecap="round"
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={cx - (radius * Math.sin(angle))}
        y2={cy + (radius * Math.cos(angle))}
        stroke={color}
        strokeWidth={3 * scale}
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4 * scale} fill={color} />
      {/* Value text */}
      <text x={cx} y={cy - 10 * scale} textAnchor="middle" fontSize={14 * scale} fill="#374151" fontWeight="bold">
        {typeof value === 'number' && !isNaN(value) ? `${percent.toFixed(0)}%` : 'N/A'}
      </text>
    </svg>
  );
};

const TreeSensorDiagram: React.FC<{ stressValue?: number }> = ({ stressValue }) => {
  // Define sensor icon size for foreignObject, needs to accommodate the icon and potentially label space if it were part of it
  const iconSize = 48; // Increased to give more space for the icon and its internal structure/hover effects

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <h3 className="text-xl font-semibold text-green-700 mb-3 text-center">Stress Level</h3>
      {/* Gauge for Stress */}
      <div className="flex justify-center mb-2">
        <StressGauge value={stressValue} scale={2} />
      </div>
      {/* SVG Tree and Sensors */}
      <svg 
        viewBox="0 0 200 300" 
        className="w-full h-auto aspect-[2/3] object-cover rounded-lg shadow-md bg-green-50"
        aria-labelledby="treeDiagramTitle"
        role="img"
      >
        <title id="treeDiagramTitle">Schematic diagram of a tree with sensor placements</title>
        {/* Tree Trunk */}
        <rect x="80" y="170" width="40" height="130" fill="#A0522D" rx="5" ry="5" aria-label="Tree trunk"/>
        {/* Tree Canopy */}
        <ellipse cx="100" cy="120" rx="80" ry="70" fill="#2E8B57" aria-label="Tree canopy"/>
        <ellipse cx="70" cy="130" rx="50" ry="40" fill="#3CB371" />
        <ellipse cx="130" cy="130" rx="50" ry="40" fill="#3CB371" />
        <ellipse cx="100" cy="80" rx="60" ry="50" fill="#228B22" />
        {/* Soil Sensor - Positioned near the base of the trunk */}
        <foreignObject x={100 - iconSize/2} y={280 - iconSize/2} width={iconSize} height={iconSize}>
          <SensorIcon color="#A0522D" label="Soil Moisture & Temp." pulse />
        </foreignObject>
        {/* Wood Sensor - Positioned on the trunk */}
        <foreignObject x={100 - iconSize/2} y={190 - iconSize/2} width={iconSize} height={iconSize}>
          <SensorIcon color="#8B4513" label="Wood Resistance & Temp." />
        </foreignObject>
        {/* Air Sensor - Positioned in the canopy, slightly to the side */}
        <foreignObject x={150 - iconSize/2} y={100 - iconSize/2} width={iconSize} height={iconSize}>
          <SensorIcon color="#87CEEB" label="Air Temp. & Humidity" />
        </foreignObject>
      </svg>
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-semibold">Hover over the circles to see the measurement</p>
      </div>
    </div>
  );
};

export default TreeSensorDiagram;
