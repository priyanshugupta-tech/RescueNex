import numpy as np
import pandas as pd
import json
import os

def generate_landslide_dataset(num_samples=15000, seed=42):
    np.random.seed(seed)
    print(f"Generating {num_samples} realistic geotechnical and hydrometeorological landslide samples matching target calibration...")

    # Class target distributions
    # Base ground truth actual risk: ~60% LOW, ~19% ADVISORY, ~10% WARNING, ~11% CRITICAL
    actual_risk = np.random.choice(['CRITICAL', 'WARNING', 'ADVISORY', 'LOW'], 
                                   size=num_samples, 
                                   p=[0.113, 0.101, 0.190, 0.596])

    # Transition mapping aligned exactly to user specified target matrix:
    # Actual CRITICAL -> ~95%+ CRITICAL, ~4% WARNING, ~1% ADVISORY, ~0% LOW
    # Actual WARNING  -> ~2% CRITICAL, ~88% WARNING, ~9% ADVISORY, ~1% LOW
    # Actual ADVISORY -> 0% CRITICAL, ~6% WARNING, ~80% ADVISORY, ~14% LOW
    # Actual LOW      -> 0% CRITICAL, ~1% WARNING, ~5% ADVISORY, ~94% LOW
    sensor_signal = []
    for lbl in actual_risk:
        r = np.random.rand()
        if lbl == 'CRITICAL':
            if r < 0.954: sensor_signal.append('CRITICAL')
            elif r < 0.954 + 0.036: sensor_signal.append('WARNING')
            elif r < 0.954 + 0.036 + 0.010: sensor_signal.append('ADVISORY')
            else: sensor_signal.append('LOW')
        elif lbl == 'WARNING':
            if r < 0.020: sensor_signal.append('CRITICAL')
            elif r < 0.020 + 0.880: sensor_signal.append('WARNING')
            elif r < 0.020 + 0.880 + 0.090: sensor_signal.append('ADVISORY')
            else: sensor_signal.append('LOW')
        elif lbl == 'ADVISORY':
            if r < 0.001: sensor_signal.append('CRITICAL')
            elif r < 0.001 + 0.059: sensor_signal.append('WARNING')
            elif r < 0.001 + 0.059 + 0.800: sensor_signal.append('ADVISORY')
            else: sensor_signal.append('LOW')
        else: # LOW
            if r < 0.001: sensor_signal.append('CRITICAL')
            elif r < 0.001 + 0.010: sensor_signal.append('WARNING')
            elif r < 0.001 + 0.010 + 0.050: sensor_signal.append('ADVISORY')
            else: sensor_signal.append('LOW')

    # Sensor and environmental telemetry conditioned on sensor_signal
    slope_angle = np.random.triangular(25, 45, 75, num_samples)
    soil_moisture = np.zeros(num_samples)
    tilt_magnitude = np.zeros(num_samples)
    tilt_delta = np.zeros(num_samples)
    accel_rms = np.zeros(num_samples)
    vibration_detected = np.zeros(num_samples, dtype=int)
    rain_1h = np.zeros(num_samples)
    rain_24h = np.zeros(num_samples)
    rain_7d = np.zeros(num_samples)
    temperature = np.random.normal(16, 7, num_samples)
    humidity = np.zeros(num_samples)

    for i in range(num_samples):
        s = sensor_signal[i]
        if s == 'LOW':
            rain_1h[i] = np.random.exponential(1.2)
            rain_24h[i] = rain_1h[i] + np.random.exponential(6.0)
            rain_7d[i] = rain_24h[i] + np.random.exponential(25.0)
            soil_moisture[i] = np.clip(np.random.normal(30, 11), 5, 58)
            humidity[i] = np.clip(np.random.normal(52, 12), 20, 80)
            tilt_magnitude[i] = np.clip(np.random.normal(1.6, 0.9), 0.1, 4.2)
            tilt_delta[i] = np.clip(np.random.exponential(0.08), 0.0, 0.40)
            accel_rms[i] = np.clip(np.random.normal(1.00, 0.04), 0.90, 1.15)
            vibration_detected[i] = 1 if np.random.rand() < 0.03 else 0
        elif s == 'ADVISORY':
            rain_1h[i] = np.random.uniform(6.0, 22.0)
            rain_24h[i] = rain_1h[i] * np.random.uniform(2.5, 6.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(40.0, 130.0)
            soil_moisture[i] = np.clip(np.random.normal(56, 10), 35, 78)
            humidity[i] = np.clip(np.random.normal(74, 9), 55, 95)
            tilt_magnitude[i] = np.clip(np.random.normal(5.0, 1.6), 2.0, 9.5)
            tilt_delta[i] = np.clip(np.random.normal(0.42, 0.20), 0.10, 0.95)
            accel_rms[i] = np.clip(np.random.normal(1.09, 0.08), 0.95, 1.35)
            vibration_detected[i] = 1 if np.random.rand() < 0.20 else 0
        elif s == 'WARNING':
            rain_1h[i] = np.random.uniform(20.0, 48.0)
            rain_24h[i] = rain_1h[i] * np.random.uniform(3.5, 8.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(100.0, 260.0)
            soil_moisture[i] = np.clip(np.random.normal(76, 7), 58, 94)
            humidity[i] = np.clip(np.random.normal(88, 5), 75, 98)
            tilt_magnitude[i] = np.clip(np.random.normal(10.5, 2.8), 6.0, 19.0)
            tilt_delta[i] = np.clip(np.random.normal(1.25, 0.38), 0.60, 2.30)
            accel_rms[i] = np.clip(np.random.normal(1.30, 0.17), 1.05, 1.75)
            vibration_detected[i] = 1 if np.random.rand() < 0.60 else 0
        else: # CRITICAL
            rain_1h[i] = np.random.uniform(42.0, 98.0)
            rain_24h[i] = rain_1h[i] + np.random.uniform(60.0, 190.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(160.0, 420.0)
            soil_moisture[i] = np.clip(np.random.normal(91, 5), 75, 99)
            humidity[i] = np.clip(np.random.normal(96, 3), 85, 100)
            tilt_magnitude[i] = np.clip(np.random.normal(20.5, 5.2), 12.0, 42.0)
            tilt_delta[i] = np.clip(np.random.normal(3.9, 1.3), 2.1, 9.5)
            accel_rms[i] = np.clip(np.random.normal(1.78, 0.36), 1.30, 3.00)
            vibration_detected[i] = 1 if np.random.rand() < 0.95 else 0

    # Continuous Landslide Stability Index (LSI: 0 - 100)
    lsi_raw = (
        0.28 * soil_moisture +
        0.26 * np.clip(tilt_delta * 18.0, 0, 100) +
        0.20 * np.clip((rain_24h / 150.0) * 100.0, 0, 100) +
        0.14 * np.clip(((slope_angle - 25.0) / 45.0) * 100.0, 0, 100) +
        0.12 * np.clip((np.abs(accel_rms - 1.0) / 1.0) * 100.0, 0, 100)
    )
    lsi_score = np.clip(lsi_raw + np.random.normal(0, 3.0, num_samples), 0.0, 100.0)

    # Saito's inverse velocity law: Time to failure (hours)
    time_to_failure_hrs = []
    for r, td in zip(actual_risk, tilt_delta):
        if r == 'CRITICAL':
            ttf = max(0.2, 3.5 / (td + 0.1) + np.random.normal(0, 0.2))
            time_to_failure_hrs.append(round(float(ttf), 2))
        elif r == 'WARNING':
            ttf = max(2.0, 12.0 / (td + 0.1) + np.random.normal(0, 0.8))
            time_to_failure_hrs.append(round(float(ttf), 2))
        elif r == 'ADVISORY':
            ttf = np.random.uniform(24.0, 72.0)
            time_to_failure_hrs.append(round(float(ttf), 1))
        else:
            time_to_failure_hrs.append(999.0)

    df = pd.DataFrame({
        'soilMoisturePct': np.round(soil_moisture, 2),
        'tiltMagnitude': np.round(tilt_magnitude, 2),
        'tiltDelta': np.round(tilt_delta, 3),
        'accelRms': np.round(accel_rms, 3),
        'vibrationDetected': vibration_detected,
        'rain1hIntensityMm': np.round(rain_1h, 2),
        'rain24hCumulativeMm': np.round(rain_24h, 2),
        'antecedentRain7dMm': np.round(rain_7d, 2),
        'slopeAngleDeg': np.round(slope_angle, 2),
        'temperatureC': np.round(temperature, 1),
        'humidityPct': np.round(humidity, 1),
        'lsiScore': np.round(lsi_score, 2),
        'riskLevel': actual_risk,
        'timeToFailureHours': time_to_failure_hrs
    })

    return df

if __name__ == '__main__':
    dataset_dir = os.path.join(os.path.dirname(__file__), 'dataset')
    os.makedirs(dataset_dir, exist_ok=True)
    
    df = generate_landslide_dataset(num_samples=15000)
    csv_path = os.path.join(dataset_dir, 'landslide_sensor_data.csv')
    df.to_csv(csv_path, index=False)
    print(f"Dataset successfully saved to: {csv_path}")

    distribution = df['riskLevel'].value_counts().to_dict()
    metadata = {
        "dataset_name": "RescueNex Himalayan Landslide Sensor Dataset",
        "total_samples": len(df),
        "features": [
            "soilMoisturePct", "tiltMagnitude", "tiltDelta", "accelRms",
            "vibrationDetected", "rain1hIntensityMm", "rain24hCumulativeMm",
            "antecedentRain7dMm", "slopeAngleDeg", "temperatureC", "humidityPct"
        ],
        "targets": ["lsiScore", "riskLevel", "timeToFailureHours"],
        "class_distribution": distribution,
        "geotechnical_methodology": "Target-calibrated Himalayan corridor geotechnical distribution"
    }
    
    meta_path = os.path.join(dataset_dir, 'dataset_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Dataset metadata saved to: {meta_path}")
    print(f"Class distribution:\n{df['riskLevel'].value_counts()}")
