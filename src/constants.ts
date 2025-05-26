import { SensorType } from './types';

// IMPORTANT: Replace with your actual MQTT broker URL
export const MQTT_BROKER_URL_PLACEHOLDER = 'wss://mqtt.thws.education/mqtt';
export const MQTT_USERNAME_PLACEHOLDER = 'trees';
export const MQTT_PASSWORD_PLACEHOLDER = 'trees';
export const MQTT_BASE_TOPIC = 'mapfeed/thws-trees/#'; // Base topic for subscriptions

// InfluxDB Configuration
// IMPORTANT: Verify and update INFLUXDB_URL and INFLUXDB_ORG with your actual InfluxDB details.
export const INFLUXDB_URL = 'https://influx.thws.education/api/v2/query'; // Example: https://us-west-2-1.aws.cloud2.influxdata.com/api/v2/query or http://localhost:8086/api/v2/query
export const INFLUXDB_TOKEN = 'B21VcRoqx3ABoKAMwO_ldsUVMQgxV_KnRxehNmB2LmsII6rN70cbZj29XMXiIPvrsK0CuLTwFp7Kk_tI5IIE7Q==';
export const INFLUXDB_ORG = 'cps-lab'; // Replace with your InfluxDB organization name
export const INFLUXDB_BUCKET = 'lorapub30d'; // As specified in the user's query

// This mapping assumes InfluxDB _field names are identical to SensorType enum values.
// Adjust if your InfluxDB schema uses different field names (e.g., 'temperature' for TEMP_WOOD).
export const SENSOR_TYPE_TO_INFLUX_FIELD: Record<SensorType, string> = {
  [SensorType.RESISTANCE]: 'resistance',
  [SensorType.TEMP_WOOD]: 'temperature',
  [SensorType.SOIL_MOISTURE]: 'soil_moisture',
  [SensorType.TEMP_AIR]: 'temperature_air',
  [SensorType.HUMIDITY_AIR]: 'humidity_air',
  [SensorType.BATTERY]: 'battery'
};


export const ALL_SENSOR_TYPES: SensorType[] = [
  SensorType.RESISTANCE,
  SensorType.TEMP_WOOD,
  SensorType.SOIL_MOISTURE,
  SensorType.TEMP_AIR,
  SensorType.HUMIDITY_AIR,
  SensorType.BATTERY,
];
