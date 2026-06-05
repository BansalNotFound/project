# Train-to-Completion Package

This package gives everything needed to train an offline face recognition + liveness detection system to a working prototype using public recognition datasets and a Hugging Face mobile liveness dataset.[cite:39][cite:40][cite:170]

## Folder structure

```text
train-to-completion/
├── configs/
│   └── train_config.yaml
├── data/
│   ├── recognition/
│   │   ├── iiscifd/
│   │   ├── vggface2/
│   │   ├── casia_webface/
│   │   ├── lfw/
│   │   ├── scface/
│   │   ├── all_faces/
│   │   ├── merged_train/
│   │   ├── merged_val/
│   │   └── merged_test/
│   └── liveness/
│       ├── on_device_face_liveness_detection/
│       ├── extracted_frames/
│       ├── train/
│       ├── val/
│       └── test/
├── docs/
│   └── IMPLEMENTATION.md
├── mobile/
│   ├── assets/
│   ├── src/
│   │   └── App.tsx
│   ├── metro.config.js
│   └── package.json
├── models/
├── scripts/
│   ├── common.py
│   ├── prepare_recognition_dataset.py
│   ├── extract_liveness_frames.py
│   ├── split_liveness_dataset.py
│   ├── train_recognition.py
│   ├── train_liveness.py
│   ├── evaluate_lfw_pairs.py
│   ├── evaluate_models.py
│   ├── export_tflite_recognition.py
│   ├── export_tflite_liveness.py
│   ├── build_face_db.py
│   └── run_all.py
├── requirements.txt
└── README.md
```

## Dataset notes

- **IISCIFD** provides 500x500 grayscale normalized Indian face images and includes metadata plus publication-use caveats for only a subset of faces.[cite:39]
- **VGGFace2** contains 3.31 million images of 9,131 identities, with large variation in pose, age, illumination, ethnicity, and profession, and is split into 8,631 training identities and 500 test identities.[cite:40]
- **CASIA-WebFace** is used as an additional identity-based recognition training dataset.[cite:133]
- **LFW** is used only for verification-style evaluation with `pairs.txt`, not for recognition training.[cite:137][cite:142]
- **SCface** is kept only for robustness or surveillance-style evaluation, not for merged recognition training.[cite:138]
- **UniqueData/on-device-face-liveness-detection** is a video-based mobile face liveness dataset on Hugging Face that includes four video categories: `real`, `mask`, `mask_cut`, and `outline`.[cite:170]
- In this package, liveness is trained as a binary task where `real` maps to `live` and `mask`, `mask_cut`, and `outline` map to `spoof`.[cite:170]

## Quick start

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python scripts/run_all.py
```

## What this trains

1. A face recognition embedding model from merged identity folders built from IISCIFD, VGGFace2, and CASIA-WebFace.[cite:39][cite:40][cite:133]
2. A binary liveness classifier from extracted video frames generated from the Hugging Face on-device liveness dataset.[cite:170]
3. Recognition evaluation on the merged internal test set and separate LFW verification evaluation using `pairs.txt`.[cite:142]
4. INT8 TFLite exports for both recognition and liveness models.[cite:170]
5. A face embedding database for offline authentication.[cite:170]

## Recognition layout

### Training datasets
- `data/recognition/iiscifd/<identity>/*.jpg`
- `data/recognition/vggface2/<identity>/*.jpg`
- `data/recognition/casia_webface/<identity>/*.jpg`

### Evaluation datasets
- `data/recognition/lfw/<identity>/*.jpg`
- `data/recognition/lfw/pairs.txt`
- `data/recognition/scface/...`

Recognition training excludes `lfw` and `scface`, which are reserved for evaluation only.[cite:137][cite:138]

## Liveness layout

Place the Hugging Face on-device dataset here:

```text
data/liveness/on_device_face_liveness_detection/
```

The dataset contains video folders such as:
- `real/`
- `mask/`
- `mask_cut/`
- `outline/` [cite:170]

During preprocessing:
- `real` videos are mapped to `live`
- `mask`, `mask_cut`, and `outline` videos are mapped to `spoof` [cite:170]

Generated folders will look like:

```text
data/liveness/
├── extracted_frames/
│   ├── live/
│   └── spoof/
├── train/
│   ├── live/
│   └── spoof/
├── val/
│   ├── live/
│   └── spoof/
└── test/
    ├── live/
    └── spoof/
```

## Pipeline steps

Running `python scripts/run_all.py` executes:

- `scripts/prepare_recognition_dataset.py`
- `scripts/extract_liveness_frames.py`
- `scripts/split_liveness_dataset.py`
- `scripts/train_recognition.py`
- `scripts/evaluate_lfw_pairs.py`
- `scripts/train_liveness.py`
- `scripts/evaluate_models.py`
- `scripts/export_tflite_recognition.py`
- `scripts/export_tflite_liveness.py`
- `scripts/build_face_db.py`

## Outputs

After training, the main outputs are:

- `models/recognition_embedding.keras`
- `models/liveness_best.keras`
- `models/recognition_int8.tflite`
- `models/liveness_int8.tflite`
- `models/face_db.json`

## Mobile integration

Copy these files into `mobile/assets/`:

- `models/recognition_int8.tflite`
- `models/liveness_int8.tflite`

Then inside `mobile/` run:

- `npm install`
- `npx pod-install`
- `npm run android` or `npm run ios`

## Notes

- `custom_mobile` is not used in recognition training.[cite:39]
- If `casia_webface` is missing, the recognition preparation script skips it safely.[cite:133]
- If `lfw` is missing, remove or comment out `scripts/evaluate_lfw_pairs.py` in `scripts/run_all.py` until the dataset is added.[cite:142]
- Liveness is trained as a **binary classifier** with only two classes: `live` and `spoof`.[cite:170]
- `scripts/train_liveness.py` should therefore use `Dense(2, activation='softmax')` as the final layer.[cite:170]