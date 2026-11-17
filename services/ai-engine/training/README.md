# RescueNex Landslide AI Model Evaluation & Benchmark Report

This document records the official evaluation metrics, dataset partition, confusion matrix, and feature importances for the RescueNex Multi-Class Geotechnical Landslide Early Warning Model (`GradientBoostingClassifier` & `GradientBoostingRegressor`).

---

## 1. Dataset Partition & Stratified Split

* **Total Dataset Size**: 15,000 samples (`landslide_sensor_data.csv`)
* **Split Ratio**: 80% Training / 20% Testing (Stratified Split with `random_state=42`)
* **Training Set**: 12,000 samples
* **Testing Set**: 3,000 samples

### Class-Wise Sample Distribution

| Risk Level | Train Samples (80%) | Test Samples (20%) | Total Samples (100%) | Proportion |
| :--- | :---: | :---: | :---: | :---: |
| **LOW** | 7,110 | 1,778 | 8,888 | 59.25% |
| **ADVISORY** | 2,274 | 568 | 2,842 | 18.95% |
| **CRITICAL** | 1,382 | 346 | 1,728 | 11.52% |
| **WARNING** | 1,234 | 308 | 1,542 | 10.28% |
| **TOTAL** | **12,000** | **3,000** | **15,000** | **100.00%** |

---

## 2. Overall Model Accuracy & Key Metrics

* **Multi-Class Classification Accuracy**: **89.77%** (2,693 / 3,000 correct predictions)
* **Macro F1-Score**: **0.8689** (86.89%)
* **Weighted F1-Score**: **0.8982** (89.82%)
* **Continuous LSI Regressor ($R^2$)**: **0.9796** (97.96% variance explained)
* **Continuous LSI Mean Absolute Error (MAE)**: **2.51 points** (on 0–100 scale)

$$\text{Overall Accuracy} = \frac{\sum \text{Diagonal (TP)}}{\text{Total Test Set}} = \frac{321 + 268 + 435 + 1669}{3000} = \frac{2693}{3000} = \mathbf{89.77\%}$$

---

## 3. Confusion Matrix ($N = 3,000$ Test Samples)

### Raw Counts Matrix

```
                            PREDICTED CLASS
             ┌──────────┬──────────┬──────────┬──────────┬─────────┐
             │ CRITICAL │ WARNING  │ ADVISORY │   LOW    │  TOTAL  │
  ┌──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
A │ CRITICAL │   321    │    18    │    7     │    0     │   346   │
C ├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
T │ WARNING  │    7     │   268    │    30    │    3     │   308   │
U ├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
A │ ADVISORY │    9     │    39    │   435    │    85    │   568   │
L ├──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤
  │ LOW      │    2     │    18    │    89    │   1669   │  1778   │
  └──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘
    TOTAL    │   339    │   343    │   561    │   1757   │  3000   │
```

### Row Percentage Matrix (Actual $\downarrow$ vs Predicted $\rightarrow$)

| Actual $\downarrow$ / Pred $\rightarrow$ | CRITICAL | WARNING | ADVISORY | LOW | Target Calibration Match |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CRITICAL** | **92.77%** | **5.20%** | **2.02%** | **0.00%** | Target: ~95% / ~4% / ~1% / ~0% |
| **WARNING** | **2.27%** | **87.01%** | **9.74%** | **0.97%** | Target: ~2% / ~88% / ~9% / ~1% |
| **ADVISORY** | **1.58%** | **6.87%** | **76.58%** | **14.96%** | Target: 0% / ~6% / ~80% / ~14% |
| **LOW** | **0.11%** | **1.01%** | **5.01%** | **93.87%** | Target: 0% / ~1% / ~5% / ~94% |

---

## 4. One-vs-Rest (OvR) Classification Breakdown

| Class | True Positive ($TP$) | True Negative ($TN$) | False Positive ($FP$) | False Negative ($FN$) | Precision | Recall / Sensitivity | Class Accuracy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CRITICAL** | **321** | **2,636** | **18** | **25** | **94.69%** | **92.77%** | **98.57%** |
| **WARNING** | **268** | **2,617** | **75** | **40** | **78.13%** | **87.01%** | **96.17%** |
| **ADVISORY** | **435** | **2,306** | **126** | **133** | **77.54%** | **76.58%** | **91.37%** |
| **LOW** | **1,669** | **1,134** | **88** | **109** | **94.99%** | **93.87%** | **93.43%** |

### Detailed Metric Definitions:
* **$TP$ (True Positive)**: Sahi class identify hui (Diagonal element).
* **$FP$ (False Positive)**: Model ne yeh class predict ki, jabki actual mein doosri thi.
* **$FN$ (False Negative)**: Actual mein yeh class thi, lekin model miss kar gaya.
* **$TN$ (True Negative)**: Total ($3000$) minus $(TP + FP + FN)$.

---

## 5. Classification Report (Scikit-Learn Standard)

```text
               precision    recall  f1-score   support

    CRITICAL       0.95      0.93      0.94       346
     WARNING       0.78      0.87      0.82       308
    ADVISORY       0.78      0.77      0.77       568
         LOW       0.95      0.94      0.94      1778

    accuracy                           0.90      3000
   macro avg       0.86      0.88      0.87      3000
weighted avg       0.90      0.90      0.90      3000
```

---

## 6. Sensor Feature Importances

| Feature Name | Description | Importance (%) |
| :--- | :--- | :---: |
| `rain1hIntensityMm` | Cloudburst & extreme downpour rate | **42.6%** |
| `tiltDelta` | Slope angular velocity (tertiary creep rate) | **29.4%** |
| `antecedentRain7dMm` | 7-day cumulative saturation & water table buildup | **20.4%** |
| `soilMoisturePct` | Volumetric soil moisture content | **1.4%** |
| `tiltMagnitude` | Cumulative slope deflection magnitude | **1.4%** |
| `rain24hCumulativeMm` | 24-hour total rainfall accumulation | **1.2%** |
| `slopeAngleDeg` | Terrain gradient (slope steepness) | **0.9%** |
| `temperatureC` | Ambient mountain slope temperature | **0.9%** |
| `accelRms` | Micro-seismic inertial acceleration RMS | **0.9%** |
| `humidityPct` | Relative atmospheric humidity | **0.8%** |
| `vibrationDetected` | High-frequency acoustic slip detection flag | **0.1%** |

---

## 7. Model Artifacts & Location

All serialized weights and dataset assets are stored inside the project structure:

* **Training Dataset**: [landslide_sensor_data.csv](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/training/dataset/landslide_sensor_data.csv)
* **Dataset Metadata**: [dataset_metadata.json](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/training/dataset/dataset_metadata.json)
* **Classifier Model**: [landslide_classifier.joblib](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/app/models/weights/landslide_classifier.joblib)
* **Regressor Model**: [landslide_lsi_regressor.joblib](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/app/models/weights/landslide_lsi_regressor.joblib)
* **Feature Scaler**: [scaler.joblib](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/app/models/weights/scaler.joblib)
* **Evaluation JSON**: [model_metrics.json](file:///c:/Users/windows@priyanshu18/RescueNex/services/ai-engine/app/models/weights/model_metrics.json)
