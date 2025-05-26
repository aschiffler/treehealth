export interface RawMqttFields {
  resistance?: number;
  temperature?: number; // Generic temperature from payload
  soil_moisture?: number; // Assuming it might come with this key
  humidity_air?: number;  // Assuming it might come with this key
  battery?: number;
  payloadB64?: string;
  payload_raw?: number;
  rssi?: number;
  snr?: number;
  trigger?: number;
  whatsapp?: string;
}

export interface RawMqttPayload {
  fields: RawMqttFields;
  name: string; // e.g., "thws-trees-pulse-01" (used as InfluxDB _measurement)
  tags: Record<string, any>; // Tags can have varied value types
  timestamp: number; // Unix timestamp (seconds)
}

// Represents the application's unified view of all possible sensor values.
// Fields are optional as they may come from different sensors at different times.
export interface SensorValues {
  resistance?: number;      // kOhms
  temperature_wood?: number; // Celsius - Specific to wood
  soil_moisture?: number;   // Percentage
  temperature_air?: number; // Celsius - Specific to air
  humidity_air?: number;    // Percentage
  battery?: number;         // Volts
}

// State for live data display, composite of latest values.
export interface AppLiveData extends SensorValues {
  last_updated_timestamp?: string; // ISO string of the latest update to any field
  last_updated_sensor_id?: string; // Effective ID of the sensor that sent the last update (used for InfluxDB _measurement)
  raw_message_name?: string; // Original name from the raw MQTT message, e.g. "thws-trees-pulse-01"
}

// Structure for storing historical data points, now primarily from InfluxDB.
// Each point represents data from a single InfluxDB record for a given sensor type.
export interface HistoricalDataPoint extends Partial<SensorValues> { // Use Partial<SensorValues> as only one sensor type value will be present per point
  original_timestamp: string; // ISO 8601 string from InfluxDB _time
  date: Date;                 // Parsed date object for charting
  sensor_id: string;          // Which sensor this point came from (InfluxDB _measurement)
}

export const SensorType = {
  RESISTANCE: 'resistance',
  TEMP_WOOD: 'temperature_wood', // Changed from 'temperature'
  SOIL_MOISTURE: 'soil_moisture',
  TEMP_AIR: 'temperature_air',
  HUMIDITY_AIR: 'humidity_air',
  BATTERY: 'battery',
} as const;
export type SensorType = typeof SensorType[keyof typeof SensorType];

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  [SensorType.RESISTANCE]: 'Wood Resistance (kΩ)',
  [SensorType.TEMP_WOOD]: 'Wood Temperature (°C)',
  [SensorType.SOIL_MOISTURE]: 'Soil Moisture (%)',
  [SensorType.TEMP_AIR]: 'Air Temperature (°C)',
  [SensorType.HUMIDITY_AIR]: 'Air Humidity (%)',
  [SensorType.BATTERY]: 'Battery (V)',
};

export const ConnectionStatus = {
  DISCONNECTED: 'Disconnected',
  CONNECTING: 'Connecting...',
  CONNECTED: 'Connected',
  ERROR: 'Error',
  RECONNECTING: 'Reconnecting...',
} as const;

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];