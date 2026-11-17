import winston from 'winston';
import 'winston-mongodb';

const getLogsDbUri = (): string => {
  const baseUri = process.env.MONGODB_URI || '';
  if (!baseUri) return '';

  // If a dedicated logs URI is set, use it
  if (process.env.MONGODB_LOGS_URI) {
    return process.env.MONGODB_LOGS_URI;
  }

  // Same Atlas cluster, target database: 'rescuenex_esp32_logs'
  // e.g. mongodb+srv://user:pass@cluster.mongodb.net/rescuenex?retryWrites=true
  if (baseUri.includes('.mongodb.net/')) {
    const [prefix, rest] = baseUri.split('.mongodb.net/');
    const queryParams = rest.includes('?') ? '?' + rest.split('?')[1] : '';
    return `${prefix}.mongodb.net/rescuenex_esp32_logs${queryParams}`;
  }

  return baseUri;
};

const logsUri = getLogsDbUri();

// Transports configuration
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, nodeId, ...meta }) => {
        const idTag = nodeId ? `[${nodeId}] ` : '';
        return `${timestamp} ${level}: ${idTag}${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    )
  })
];

// Add MongoDB transport if Atlas URI is available
if (logsUri) {
  try {
    transports.push(
      new (winston.transports as any).MongoDB({
        db: logsUri,
        collection: 'node_telemetry_logs',
        level: 'info',
        tryReconnect: true,
        options: {
          serverSelectionTimeoutMS: 15000
        },
        metaKey: 'meta',
        capped: false
      })
    );
    console.log('✅ [Winston Logger] ESP32 node logging configured for DB: rescuenex_esp32_logs');
  } catch (err: any) {
    console.warn('⚠️ [Winston Logger] Could not attach winston-mongodb transport:', err.message);
  }
}

export const espLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'esp32-telemetry-ingestion' },
  transports
});

/**
 * Structured helper for logging ESP32 node packets
 */
export const logEspTelemetry = (
  nodeId: string,
  event: 'PACKET_RECEIVED' | 'EVALUATED_SAFE' | 'EVALUATED_WARNING' | 'EVALUATED_CRITICAL' | 'SENSOR_ANOMALY',
  payload: Record<string, any>
) => {
  espLogger.info(`[${nodeId}] ${event}`, {
    nodeId,
    event,
    meta: {
      ...payload,
      timestamp: new Date().toISOString()
    }
  });
};
