import React, { useState, useEffect, memo } from 'react';

interface SensorDataCardProps {
  label: string;
  value: string | number; // Assumes value is present if card is rendered
  unit: string;
  lastUpdateTimestamp: string; // Used to trigger re-render and animation for any card when any data updates
}

const SensorDataCard: React.FC<SensorDataCardProps> = memo(({ label, value, unit, lastUpdateTimestamp }) => {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [prevTimestamp, setPrevTimestamp] = useState<string | null>(null);

  // This effect will now trigger highlighting if the global lastUpdateTimestamp changes,
  // indicating some data in the parent liveData object has been updated.
  useEffect(() => {
    if (lastUpdateTimestamp && lastUpdateTimestamp !== prevTimestamp) {
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 1000); // Animation duration, should match CSS
      setPrevTimestamp(lastUpdateTimestamp);
      return () => clearTimeout(timer);
    }
  // Only re-run if lastUpdateTimestamp changes. Value comparison is harder for generic card.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [lastUpdateTimestamp]); 

  return (
    <div className={`p-4 rounded-lg shadow-md bg-white border border-green-200 ${isHighlighted ? 'data-flash' : ''}`}>
      <h3 className="text-sm font-medium text-green-600 truncate">{label}</h3>
      <p className="mt-1 text-3xl font-semibold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString(undefined, {maximumFractionDigits: 2}) : value}
        <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  );
});

export default SensorDataCard;