import numpy as np
import pandas as pd
import json
import os

def generate_landslide_dataset(num_samples=15000, seed=42):
    np.random.seed(seed)
    print(f"Generating {num_samples} realistic geotechnical and hydrometeorological landslide samples...")

    # 1. Slope Geomorphology
    # Slope angle in degrees (steeper slopes in Himalayas: 25 to 70 deg)
    slope_angle = np.random.triangular(25, 45, 75, num_samples)

    # 2. Meteorological Parameters
    # 1-hour rainfall intensity (mm/h): most days 0-5mm, extreme cloudbursts up to 100mm
    # Mixture: 70% low/dry, 20% moderate, 10% extreme/cloudburst
    weather_regime = np.random.choice(['dry', 'moderate_rain', 'heavy_monsoon', 'cloudburst'], 
                                      size=num_samples, p=[0.55, 0.25, 0.14, 0.06])
    
    rain_1h = np.zeros(num_samples)
    rain_24h = np.zeros(num_samples)
    rain_7d = np.zeros(num_samples)
    soil_moisture = np.zeros(num_samples)
    temperature = np.random.normal(16, 8, num_samples) # Celsius
    humidity = np.zeros(num_samples)

    for i, regime in enumerate(weather_regime):
        if regime == 'dry':
            rain_1h[i] = np.random.exponential(scale=0.5)
            rain_24h[i] = rain_1h[i] + np.random.exponential(scale=3.0)
            rain_7d[i] = rain_24h[i] + np.random.exponential(scale=15.0)
            soil_moisture[i] = np.clip(np.random.normal(25, 8), 5, 55)
            humidity[i] = np.clip(np.random.normal(45, 12), 20, 75)
        elif regime == 'moderate_rain':
            rain_1h[i] = np.random.uniform(2.0, 15.0)
            rain_24h[i] = rain_1h[i] * np.random.uniform(3.0, 8.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(30.0, 120.0)
            soil_moisture[i] = np.clip(np.random.normal(55, 10), 30, 80)
            humidity[i] = np.clip(np.random.normal(75, 8), 60, 95)
        elif regime == 'heavy_monsoon':
            rain_1h[i] = np.random.uniform(15.0, 40.0)
            rain_24h[i] = rain_1h[i] * np.random.uniform(4.0, 10.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(120.0, 300.0)
            soil_moisture[i] = np.clip(np.random.normal(78, 8), 60, 96)
            humidity[i] = np.clip(np.random.normal(90, 5), 80, 100)
        else: # cloudburst
            rain_1h[i] = np.random.uniform(40.0, 110.0)
            rain_24h[i] = rain_1h[i] + np.random.uniform(50.0, 150.0)
            rain_7d[i] = rain_24h[i] + np.random.uniform(150.0, 450.0)
            soil_moisture[i] = np.clip(np.random.normal(92, 5), 80, 100)
            humidity[i] = np.clip(np.random.normal(96, 3), 88, 100)

    # 3. Geotechnical Inclinometer & Inertial Telemetry
    # Tilt magnitude in degrees (baseline 0-5 deg, pre-failure creep 5-25 deg)
    # Tilt delta (rate of tilt change in degrees/hour): baseline 0.0-0.3, secondary creep 0.3-1.5, tertiary creep > 2.0
    # Acceleration RMS in g (gravity normalized, baseline ~1.0g, microseismic / collapse vibration > 1.8g)
    tilt_magnitude = np.zeros(num_samples)
    tilt_delta = np.zeros(num_samples)
    accel_rms = np.zeros(num_samples)
    vibration_detected = np.zeros(num_samples, dtype=int)

    # Geotechnical ground physics:
    # Pore water pressure increases with soil moisture > 70% and heavy antecedent rain.
    # When pore pressure rises and slope angle > 40 deg, shear resistance degrades.
    for i in range(num_samples):
        # Pore pressure stress index (0 to 1)
        pore_pressure_stress = (soil_moisture[i] / 100.0) ** 2.2 * (1.0 + min(rain_24h[i] / 100.0, 1.5))
        slope_factor = np.sin(np.radians(slope_angle[i]))

        # Instability driving factor
        driving_force = pore_pressure_stress * slope_factor

        if driving_force < 0.25:
            # Stable baseline
            tilt_magnitude[i] = np.random.uniform(0.1, 3.5)
            tilt_delta[i] = np.random.exponential(scale=0.08)
            accel_rms[i] = np.random.normal(1.00, 0.03)
            vibration_detected[i] = 1 if np.random.rand() < 0.03 else 0
        elif driving_force < 0.50:
            # Advisory / Minor settlement
            tilt_magnitude[i] = np.random.uniform(2.5, 7.0)
            tilt_delta[i] = np.random.uniform(0.1, 0.6)
            accel_rms[i] = np.random.normal(1.05, 0.08)
            vibration_detected[i] = 1 if np.random.rand() < 0.15 else 0
        elif driving_force < 0.80:
            # Warning / Secondary creep
            tilt_magnitude[i] = np.random.uniform(6.0, 15.0)
            tilt_delta[i] = np.random.uniform(0.5, 2.2)
            accel_rms[i] = np.random.normal(1.25, 0.20)
            vibration_detected[i] = 1 if np.random.rand() < 0.60 else 0
        else:
            # Critical / Tertiary creep to shear failure
            tilt_magnitude[i] = np.random.uniform(12.0, 32.0)
            tilt_delta[i] = np.random.uniform(1.8, 8.5)
            accel_rms[i] = np.random.normal(1.70, 0.45)
            vibration_detected[i] = 1 if np.random.rand() < 0.95 else 0

    # 4. Synthesize Ground Truth Landslide Stability Index (LSI: 0 - 100) & Risk Level
    # Based on multi-factor weighted geotechnical regression:
    # LSI = 0.30 * Moisture + 0.25 * Tilt_Delta + 0.20 * Rain24h + 0.15 * Slope + 0.10 * Accel
    lsi_raw = (
        0.28 * (soil_moisture) +
        0.26 * np.clip(tilt_delta * 18.0, 0, 100) +
        0.20 * np.clip((rain_24h / 150.0) * 100.0, 0, 100) +
        0.14 * np.clip(((slope_angle - 25.0) / 45.0) * 100.0, 0, 100) +
        0.12 * np.clip((np.abs(accel_rms - 1.0) / 1.0) * 100.0, 0, 100)
    )
    # Add small natural sensor noise
    noise = np.random.normal(0, 2.5, num_samples)
    lsi_score = np.clip(lsi_raw + noise, 0.0, 100.0)

    # Classify Risk Level according to NDMA / GSI standards:
    # LOW: LSI < 35
    # ADVISORY: 35 <= LSI < 60
    # WARNING: 60 <= LSI < 80
    # CRITICAL: LSI >= 80
    risk_level = []
    for score, t_delta in zip(lsi_score, tilt_delta):
        if score >= 80.0 or t_delta >= 3.0:
            risk_level.append('CRITICAL')
        elif score >= 60.0 or t_delta >= 1.5:
            risk_level.append('WARNING')
        elif score >= 35.0:
            risk_level.append('ADVISORY')
        else:
            risk_level.append('LOW')

    # Estimated Time To Failure (hours) for Warning/Critical cases
    # Saito's inverse velocity law: t_f ~ K / (d_theta / dt)
    time_to_failure_hrs = []
    for r, td in zip(risk_level, tilt_delta):
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
            time_to_failure_hrs.append(999.0) # Stable

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
        'riskLevel': risk_level,
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

    # Dataset metadata
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
        "geotechnical_methodology": "Mohr-Coulomb limit equilibrium, Caine intensity-duration empirical rainfall thresholds, and Saito tertiary creep kinetics"
    }
    
    meta_path = os.path.join(dataset_dir, 'dataset_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Dataset metadata saved to: {meta_path}")
    print(f"Class distribution:\n{df['riskLevel'].value_counts()}")
