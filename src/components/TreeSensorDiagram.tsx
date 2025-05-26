
import React from 'react';

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


const TreeSensorDiagram: React.FC = () => {
  // Define sensor icon size for foreignObject, needs to accommodate the icon and potentially label space if it were part of it
  const iconSize = 48; // Increased to give more space for the icon and its internal structure/hover effects

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <h3 className="text-xl font-semibold text-green-700 mb-3 text-center">Sensor Placement</h3>
      
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
        {/* x, y are top-left of foreignObject. Center icon by offsetting x,y by half of iconSize */}
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
