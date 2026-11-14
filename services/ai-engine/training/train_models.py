import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score, mean_absolute_error, r2_score

FEATURE_COLUMNS = [
    'soilMoisturePct',
    'tiltMagnitude',
    'tiltDelta',
    'accelRms',
    'vibrationDetected',
    'rain1hIntensityMm',
    'rain24hCumulativeMm',
    'antecedentRain7dMm',
    'slopeAngleDeg',
    'temperatureC',
    'humidityPct'
]

def train_and_evaluate():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'dataset', 'landslide_sensor_data.csv')
    weights_dir = os.path.join(base_dir, '..', 'app', 'models', 'weights')
    os.makedirs(weights_dir, exist_ok=True)

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    X = df[FEATURE_COLUMNS]
    y_class = df['riskLevel']
    y_lsi = df['lsiScore']

    # Train-test split (80% train, 20% test)
    X_train, X_test, y_class_train, y_class_test, y_lsi_train, y_lsi_test = train_test_split(
        X, y_class, y_lsi, test_size=0.20, random_state=42, stratify=y_class
    )

    print(f"Training set: {X_train.shape[0]} samples | Testing set: {X_test.shape[0]} samples")

    # 1. Feature Preprocessing (StandardScaler)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 2. Train Risk Classification Model (Gradient Boosting Classifier)
    print("Training Multi-Class Landslide Risk Classifier (GradientBoosting)...")
    classifier = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    classifier.fit(X_train_scaled, y_class_train)

    y_pred_class = classifier.predict(X_test_scaled)
    acc = accuracy_score(y_class_test, y_pred_class)
    f1_macro = f1_score(y_class_test, y_pred_class, average='macro')
    f1_weighted = f1_score(y_class_test, y_pred_class, average='weighted')
    report = classification_report(y_class_test, y_pred_class, output_dict=True)

    print(f"Classification Accuracy: {acc * 100:.2f}% | F1-Macro: {f1_macro:.4f} | F1-Weighted: {f1_weighted:.4f}")

    # 3. Train LSI Regression Model (Gradient Boosting Regressor)
    print("Training Continuous LSI Stability Index Regressor...")
    regressor = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    regressor.fit(X_train_scaled, y_lsi_train)

    y_pred_lsi = regressor.predict(X_test_scaled)
    mae = mean_absolute_error(y_lsi_test, y_pred_lsi)
    r2 = r2_score(y_lsi_test, y_pred_lsi)

    print(f"LSI Regressor MAE: {mae:.2f} points | R² Score: {r2:.4f}")

    # 4. Feature Importances
    feature_importances = dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in classifier.feature_importances_]))
    sorted_features = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)
    print("\nTop Predictive Features:")
    for feat, imp in sorted_features:
        print(f"  - {feat}: {imp * 100:.1f}%")

    # 5. Serialize Artifacts
    scaler_path = os.path.join(weights_dir, 'scaler.joblib')
    classifier_path = os.path.join(weights_dir, 'landslide_classifier.joblib')
    regressor_path = os.path.join(weights_dir, 'landslide_lsi_regressor.joblib')
    metrics_path = os.path.join(weights_dir, 'model_metrics.json')

    joblib.dump(scaler, scaler_path)
    joblib.dump(classifier, classifier_path)
    joblib.dump(regressor, regressor_path)

    metrics = {
        "model_version": "1.0.0",
        "classifier": {
            "algorithm": "GradientBoostingClassifier",
            "accuracy": round(float(acc), 4),
            "f1_macro": round(float(f1_macro), 4),
            "f1_weighted": round(float(f1_weighted), 4),
            "classes": list(classifier.classes_),
            "classification_report": report
        },
        "regressor": {
            "algorithm": "GradientBoostingRegressor",
            "mae": round(float(mae), 4),
            "r2_score": round(float(r2), 4)
        },
        "feature_importances": dict(sorted_features),
        "features": FEATURE_COLUMNS,
        "sample_count": len(df)
    }

    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"\nModel artifacts successfully saved to: {weights_dir}")
    print("Files created:")
    print(f"  - {scaler_path}")
    print(f"  - {classifier_path}")
    print(f"  - {regressor_path}")
    print(f"  - {metrics_path}")

if __name__ == '__main__':
    train_and_evaluate()
