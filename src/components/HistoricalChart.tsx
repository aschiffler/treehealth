import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type HistoricalDataPoint, SensorType, SENSOR_TYPE_LABELS } from '../types';

interface HistoricalChartProps {
  data: HistoricalDataPoint[];
  selectedSensor: SensorType;
}

// Helper function to format date and time to DD.MM.YY HH:MM:SS
const formatDateToDDMMYYHHMMSS = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "Invalid Date";
  const D = date.getDate().toString().padStart(2, '0');
  const M = (date.getMonth() + 1).toString().padStart(2, '0');
  const YY = date.getFullYear().toString().slice(-2);
  const HH = date.getHours().toString().padStart(2, '0');
  const MM = date.getMinutes().toString().padStart(2, '0');
  const SS = date.getSeconds().toString().padStart(2, '0');
  return `${D}.${M}.${YY} ${HH}:${MM}:${SS}`;
};

const HistoricalChart: React.FC<HistoricalChartProps> = ({ data, selectedSensor }) => {
  const chartData = data.map(point => ({
    timestamp: formatDateToDDMMYYHHMMSS(point.date),
    date: point.date,
    value: point[selectedSensor],
  }));
  const sensorLabel = SENSOR_TYPE_LABELS[selectedSensor];

  // Custom Tooltip
  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded border border-white">
          <p className="text-sm" style={{ color: payload[0].stroke }}>
            {`${sensorLabel}: ${payload[0].value !== undefined && payload[0].value !== null ? Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : 'N/A'}`}
          </p>
          <p className="text-sm text-green-700">{`Time: ${label}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 400 }} className="bg-gray-50 p-4 rounded-md">
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis
            dataKey="timestamp"
            stroke="#063851"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#063851"
            label={{ value: sensorLabel, angle: -90, position: 'insideLeft', fill: '#374151', style: { textAnchor: 'middle' } }}
            domain={['auto', 'auto']}
            allowDecimals={true}
            tickFormatter={tick =>
              typeof tick === 'number'
                ? (Math.abs(tick) < 10 && Math.abs(tick) !== 0
                    ? tick.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
                    : tick.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }))
                : String(tick)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            dot={false}
            type="monotone"
            dataKey="value"
            name={sensorLabel}
            stroke="#063851"
            activeDot={{ r: 8 }}
            strokeWidth={2}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoricalChart;
