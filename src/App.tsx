import React, { useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { type IClientOptions } from 'mqtt';
import { 
    type AppLiveData, 
    type HistoricalDataPoint, 
    type RawMqttPayload,
    SensorType, 
    ConnectionStatus, 
    SENSOR_TYPE_LABELS,
    type SensorValues
} from './types';
import { 
    MQTT_BROKER_URL_PLACEHOLDER, 
    MQTT_BASE_TOPIC, 
    ALL_SENSOR_TYPES,
    MQTT_USERNAME_PLACEHOLDER,
    MQTT_PASSWORD_PLACEHOLDER,
    INFLUXDB_URL,
    INFLUXDB_TOKEN,
    INFLUXDB_ORG,
    INFLUXDB_BUCKET,
    SENSOR_TYPE_TO_INFLUX_FIELD
} from './constants';
import HistoricalChart from './components/HistoricalChart';
import TreeSensorDiagram from './components/TreeSensorDiagram';
import SensorDataCard from './components/SensorDataCard';

// Helper to parse CSV data from InfluxDB
const parseInfluxCSV = (csvText: string, sensorType: SensorType, sensorMeasurementId: string): HistoricalDataPoint[] => {
  const points: HistoricalDataPoint[] = [];
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) return points; 

  let headerLineIndex = -1;
  for(let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#')) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) return points; 

  const headers = lines[headerLineIndex].split(',');
  const timeIndex = headers.indexOf('_time');
  const valueIndex = headers.indexOf('_value');

  if (timeIndex === -1 || valueIndex === -1) {
    console.error('CSV missing _time or _value columns');
    return points;
  }

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length > Math.max(timeIndex, valueIndex)) {
      const date = new Date(values[timeIndex]);
      const valueStr = values[valueIndex];
      const value = parseFloat(valueStr);

      if (!isNaN(date.getTime()) && !isNaN(value)) {
        const point: HistoricalDataPoint = {
          date: date,
          original_timestamp: date.toISOString(),
          sensor_id: sensorMeasurementId, 
          [sensorType]: value, 
        };
        points.push(point);
      }
    }
  }
  return points;
};

// Helper function to format date and time to DD.MM.YY (short version)
const formatDateToDDMMYY = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  const D = date.getDate().toString().padStart(2, '0');
  const M = (date.getMonth() + 1).toString().padStart(2, '0');
  const YY = date.getFullYear().toString().slice(-2);
  return `${D}.${M}.${YY}`;
};


// Helper function for relative time
const formatRelativeTime = (isoTimestamp: string): string => {
    const now = new Date();
    const pastDate = new Date(isoTimestamp);
    const secondsAgo = Math.round((now.getTime() - pastDate.getTime()) / 1000);

    if (secondsAgo < 60) {
        return "just now";
    }
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
        return `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`;
    }
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
        return `${hoursAgo} hour${hoursAgo === 1 ? '' : 's'} ago`;
    }
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 7) {
        return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
    }
    return `on ${formatDateToDDMMYY(pastDate)}`;
};


const App: React.FC = () => {
  // State declarations
  const [_, setMqttClient] = useState<ReturnType<typeof mqtt.connect> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [liveData, setLiveData] = useState<AppLiveData | null>(null);
  const [relativeLastUpdatedText, setRelativeLastUpdatedText] = useState<string>("Waiting for data...");
  const [influxHistoricalData, setInfluxHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isHistoricalDataLoading, setIsHistoricalDataLoading] = useState<boolean>(false);
  const [historicalDataError, setHistoricalDataError] = useState<string | null>(null);
  const [activeSensorIdForChart, setActiveSensorIdForChart] = useState<string | null>(null);
  const [autoUpdateHistoricalData, setAutoUpdateHistoricalData] = useState<boolean>(true);
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSensorForChart, setSelectedSensorForChart] = useState<SensorType>(SensorType.STRESS);
  const [error, setError] = useState<string | null>(null);
  const [sensorTypeFilters] = useState<Record<string, boolean>>({});

  // MQTT connection and event handling
  useEffect(() => {
    setConnectionStatus(ConnectionStatus.CONNECTING);
    setError(null);
    const options: IClientOptions = {
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };
    if (MQTT_USERNAME_PLACEHOLDER && MQTT_USERNAME_PLACEHOLDER !== ("YOUR_MQTT_USERNAME" as string)) {
      options.username = MQTT_USERNAME_PLACEHOLDER;
    }
    if (MQTT_PASSWORD_PLACEHOLDER && MQTT_PASSWORD_PLACEHOLDER !== ("YOUR_MQTT_PASSWORD" as string)) {
      options.password = MQTT_PASSWORD_PLACEHOLDER;
    }
    const client = mqtt.connect(MQTT_BROKER_URL_PLACEHOLDER, options);
    setMqttClient(client);

    client.on('connect', () => {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setError(null);
      client.subscribe(MQTT_BASE_TOPIC, (err, granted) => {
        if (err) {
          setError(`Failed to subscribe to ${MQTT_BASE_TOPIC}: ${err.message}. This could be a permissions issue on the broker.`);
        } else if (granted && granted.length > 0 && granted[0].qos > 2) {
          setError(`Failed to subscribe to ${MQTT_BASE_TOPIC}: Broker rejected subscription (QoS ${granted[0].qos}).`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const rawPayload = JSON.parse(message.toString()) as RawMqttPayload;
        if (!rawPayload.fields || typeof rawPayload.timestamp !== 'number' || (!rawPayload.name && !topic.split('/')[2])) return;
        const topicParts = topic.split('/');
        const effectiveSensorId = rawPayload.name || (topicParts.length > 2 ? topicParts[2] : 'unknown_sensor');
        const messageTimestamp = new Date(rawPayload.timestamp * 1000);
        setLiveData(prevLiveData => {
          const updatedLiveData: AppLiveData = {
            ...(prevLiveData || {}),
            last_updated_timestamp: messageTimestamp.toISOString(),
            last_updated_sensor_id: effectiveSensorId,
            raw_message_name: rawPayload.name,
          };
          const fields = rawPayload.fields;
          // Add all fields from rawPayload.fields if filter is true for that key
          Object.entries(fields).forEach(([key, value]) => {
            if (sensorTypeFilters[key] !== false) {
              (updatedLiveData as any)[key] = value;
            }
          });
          return updatedLiveData;
        });
      } catch (e) {
        // Ignore parse errors
      }
    });

    client.on('error', (err) => {
      setError(`MQTT Error: ${err.message}.`);
      setConnectionStatus(ConnectionStatus.ERROR);
    });
    client.on('reconnect', () => {
      setConnectionStatus(ConnectionStatus.RECONNECTING);
      setError(null);
    });
    client.on('offline', () => {
      if (connectionStatus !== ConnectionStatus.ERROR) setConnectionStatus(ConnectionStatus.RECONNECTING);
    });
    client.on('close', () => {
      if (connectionStatus !== ConnectionStatus.ERROR && !client.reconnecting) {
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
      }
    });
    return () => {
      client.end(true);
      setMqttClient(null);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
    };
  }, []);

  // Update active sensor for chart when live data changes
  useEffect(() => {
    if (liveData?.last_updated_sensor_id) setActiveSensorIdForChart(liveData.last_updated_sensor_id);
  }, [liveData?.last_updated_sensor_id]);

  // Update relative time display
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (liveData?.last_updated_timestamp) {
      const updateText = () => setRelativeLastUpdatedText(formatRelativeTime(liveData.last_updated_timestamp!));
      updateText();
      intervalId = setInterval(updateText, 30000);
    } else {
      setRelativeLastUpdatedText("Waiting for data...");
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveData?.last_updated_timestamp]);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async (sensorMeasurementId: string, sensorType: SensorType) => {
    if (!sensorMeasurementId) {
      setInfluxHistoricalData([]);
      setHistoricalDataError("No active sensor ID to fetch data for.");
      return;
    }
    const influxField = SENSOR_TYPE_TO_INFLUX_FIELD[sensorType];
    if (!influxField) {
      setInfluxHistoricalData([]);
      setHistoricalDataError(`Configuration error: No InfluxDB field mapping for ${SENSOR_TYPE_LABELS[sensorType]}`);
      return;
    }
    setIsHistoricalDataLoading(true);
    setHistoricalDataError(null);
    const fluxQuery = `
      from(bucket: "${INFLUXDB_BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r["_measurement"] == "${sensorMeasurementId}")
        |> filter(fn: (r) => r["_field"] == "${influxField}")
        |> yield(name: "mean")
    `;
    try {
      const response = await fetch(`${INFLUXDB_URL}?org=${INFLUXDB_ORG}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${INFLUXDB_TOKEN}`,
          'Content-Type': 'application/vnd.flux',
          'Accept': 'application/csv',
        },
        body: fluxQuery,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`InfluxDB query failed: ${response.status} ${response.statusText}. ${errorText}`);
      }
      const csvData = await response.text();
      setInfluxHistoricalData(parseInfluxCSV(csvData, sensorType, sensorMeasurementId));
    } catch (err) {
      setHistoricalDataError(err instanceof Error ? err.message : String(err));
      setInfluxHistoricalData([]);
    } finally {
      setIsHistoricalDataLoading(false);
    }
  }, []);

  // Fetch historical data when sensor or type changes
  useEffect(() => {
    if (activeSensorIdForChart && selectedSensorForChart) {
      fetchHistoricalData(activeSensorIdForChart, selectedSensorForChart);
    } else if (!activeSensorIdForChart) {
      setInfluxHistoricalData([]);
    }
  }, [activeSensorIdForChart, selectedSensorForChart, fetchHistoricalData]);

  // Auto-update historical data
  useEffect(() => {
    if (autoUpdateIntervalRef.current) {
      clearInterval(autoUpdateIntervalRef.current);
      autoUpdateIntervalRef.current = null;
    }
    if (autoUpdateHistoricalData && activeSensorIdForChart && selectedSensorForChart) {
      autoUpdateIntervalRef.current = setInterval(() => {
        fetchHistoricalData(activeSensorIdForChart, selectedSensorForChart);
      }, 5 * 60 * 1000);
    }
    return () => {
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
        autoUpdateIntervalRef.current = null;
      }
    };
  }, [autoUpdateHistoricalData, activeSensorIdForChart, selectedSensorForChart, fetchHistoricalData]);

  // Status helpers
  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'text-green-700';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING: return 'text-yellow-500';
      case ConnectionStatus.DISCONNECTED: return 'text-gray-500';
      case ConnectionStatus.ERROR: return 'text-red-500';
      default: return 'text-gray-500';
    }
  };
  const getDisplayStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case ConnectionStatus.CONNECTED: return 'Connected';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING: return 'Connecting...';
      case ConnectionStatus.DISCONNECTED:
      case ConnectionStatus.ERROR: return 'Disconnected';
      default: return 'Unknown';
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-sky-500 p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white">Tree Health Monitor</h1>
      </header>
      <div className="mb-6 p-4 bg-sky-700 shadow-lg rounded-lg">
        <div className="flex flex-col sm:flex-row items-center">
          <div>
            <span className={`text-xl font-bold ${getStatusColor(connectionStatus)}`}>{getDisplayStatusText(connectionStatus)}</span>
          </div>
          {connectionStatus === ConnectionStatus.CONNECTED && liveData?.raw_message_name && (
            <p className="text-s text-sky-500 mt-1 sm:mt-0 sm:ml-4">Last update:
              <span className='italic font-bold'> {liveData.raw_message_name + " "}</span>
              {liveData?.last_updated_timestamp && (
                <span className="text-s text-sky-500 text-center mb-4" aria-live="polite">
                  received: <span className='italic font-bold'> {relativeLastUpdatedText}</span>
                </span>
              )}
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-500 mt-2 text-center sm:text-left">{error}</p>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 p-4 bg-sky-700 shadow-xl rounded-lg">
          <TreeSensorDiagram stressValue={typeof liveData?.stress === 'number' ? liveData.stress : undefined} />
        </div>
        <div className="lg:col-span-2 p-4 bg-sky-700 shadow-xl rounded-lg">
          {liveData && liveData.last_updated_timestamp ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {ALL_SENSOR_TYPES.map(sensorKey => {
                const value = liveData[sensorKey as keyof SensorValues];
                if (value !== undefined) {
                  return (
                    <div key={sensorKey} className="bg-sky-500 p-4 rounded-lg shadow-md">
                      <span className="block text-base font-semibold text-white mb-1">
                        {SENSOR_TYPE_LABELS[sensorKey]}
                      </span>
                      <SensorDataCard
                        key={sensorKey}
                        label={SENSOR_TYPE_LABELS[sensorKey]}
                        value={value}
                        unit={
                          sensorKey === SensorType.TEMP_WOOD || sensorKey === SensorType.TEMP_AIR ? '°C' :
                          sensorKey === SensorType.SOIL_MOISTURE || sensorKey === SensorType.HUMIDITY_AIR ? '%' :
                          sensorKey === SensorType.RESISTANCE ? 'kΩ' :
                          sensorKey === SensorType.BATTERY ? 'V' :
                          sensorKey === SensorType.STRESS ? '%' : ''
                        }
                        lastUpdateTimestamp={liveData.last_updated_timestamp || new Date().toISOString()}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 pt-4 pb-8">
              {connectionStatus === ConnectionStatus.CONNECTING || connectionStatus === ConnectionStatus.RECONNECTING ? 'Attempting to connect and fetch data...' :
                connectionStatus === ConnectionStatus.CONNECTED ? relativeLastUpdatedText :
                'Disconnected. Waiting for connection to fetch live data.'}
            </p>
          )}
          <div className="pt-4"></div>
          <div className="grid grid-cols-1 gap-4">
            <h2 className="text-2xl font-semibold text-green-700 mb-2 text-center">Historical Data Chart</h2>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <label htmlFor="sensorSelect" className="mr-2 font-medium text-gray-700">Select Measurement:</label>
                <select
                  id="sensorSelect"
                  value={selectedSensorForChart}
                  onChange={e => setSelectedSensorForChart(e.target.value as SensorType)}
                  className="bg-sky-700 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  aria-label="Select sensor type for historical chart"
                >
                  {ALL_SENSOR_TYPES.map(sensor => (
                    <option key={sensor} value={sensor}>{SENSOR_TYPE_LABELS[sensor]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="autoUpdateCheckbox" className="flex items-center font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="autoUpdateCheckbox"
                    checked={autoUpdateHistoricalData}
                    onChange={e => setAutoUpdateHistoricalData(e.target.checked)}
                    className="mr-2 h-4 w-4 bg-sky-700 checked:bg-sky-700 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  Auto-refresh chart (5 min)
                </label>
              </div>
            </div>
            {isHistoricalDataLoading && <p className="text-center text-blue-500 py-8">Loading historical data...</p>}
            {historicalDataError && <p className="text-center text-red-500 py-8">Error: {historicalDataError}</p>}
            {!isHistoricalDataLoading && !historicalDataError && influxHistoricalData.length > 0 && (
              <HistoricalChart data={influxHistoricalData} selectedSensor={selectedSensorForChart} />
            )}
            {!isHistoricalDataLoading && !historicalDataError && influxHistoricalData.length === 0 && activeSensorIdForChart && (
              <p className="text-center text-gray-500 py-8">No historical data available for {SENSOR_TYPE_LABELS[selectedSensorForChart]} from sensor {activeSensorIdForChart} in the last 30 days, or sensor not reporting this type.</p>
            )}
            {!isHistoricalDataLoading && !historicalDataError && influxHistoricalData.length === 0 && !activeSensorIdForChart && (
              <p className="text-center text-gray-500 py-8">Waiting for live sensor data to identify which sensor to query for historical trends.</p>
            )}
          </div>
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>
          <a
            href="https://planbee.ai/lorawan/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 hover:underline"
          >
            plan.bee GmbH | 2025
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
