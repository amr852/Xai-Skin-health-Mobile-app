# Pipeline audit & fix log (2026-05-24)

## STEP 1 — Notebook vs mobile/server mismatches found

| Area | Notebook (Kaggle) | Server (before fix) | Status |
|------|-------------------|---------------------|--------|
| Backbone | `effnet_b0`, dropout 0.3 | `effnet_b0`, dropout 0.3 | OK |
| Weights | `primary/benign/malignant_effnet_b0_best.pth` | Same files (MD5 verified vs `Effnetb1/* (2).pth`) | OK |
| val_tf | Resize(224), ToTensor, Normalize(ImageNet) | Same | OK |
| TTA | 4-flip logit average | Same (`INFERENCE_TTA=1`) | OK |
| Primary routing | argmax primary → specialist | Same | OK |
| Class order | benign: akiec,bkl,df,nv,vasc; mal: bcc,mel | Same env defaults | OK |
| Image load | PIL RGB | PIL RGB + EXIF + ICC→sRGB | Fixed (mobile needed EXIF) |
| Classifier input | Full dermoscopy frame | YOLO crop only, pre-resized 224 twice | **Fixed** — raw crop + dual fusion |
| Enhancement | None on val/test | Camera sharpen/brighten fed to classifier via enhanced crop | **Fixed** — classifier uses raw pixels only |
| Grad-CAM | LayerGradCam, features[-1], channel mean, bilinear upsample | pytorch-grad-cam, forced square resize before CAM | **Fixed** — native aspect, bilinear upsample |
| Dual input | Full frame only (HAM10000) | Crop only | **Fixed** — crop + full fusion with adaptive skip |
| Debug | Notebook inline prints | Minimal | **Fixed** — `DEBUG_INFERENCE=1` saves JSON + PNGs |

## STEP 2 — Model paths discovered

Active (only these are loaded):
- `model-server/weights/primary_effnet_b0_best.pth`
- `model-server/weights/benign_effnet_b0_best.pth`
- `model-server/weights/malignant_effnet_b0_best.pth`

Verified identical to user-supplied:
- `C:\Users\admin\Desktop\Effnetb1\primary_effnet_b0_best (2).pth`
- `C:\Users\admin\Desktop\Effnetb1\benign_effnet_b0_best (2).pth`
- `C:\Users\admin\Desktop\Effnetb1\malignant_effnet_b0_best (2).pth`

No `.pth` files referenced in runtime code besides the three above (+ YOLO `best.pt` for detection only).

Legacy docs mention `resnet50_best.pth` — historical only, not loaded.

## STEP 3 — Class collapse root cause

1. **Benign specialist NV prior** — on combined ISIC folder dataset, ~40–49% of predictions collapse to `nv` (112–137/280
   samples) even with correct pipeline. Primary routing ~80% accurate; specialist errors dominate.
2. **Mobile-specific** — phone photos run through YOLO crop + optional enhancement; classifiers previously saw
   enhanced pixels and small crops without full-frame context → repeated `nv`/dominant class.
3. **Dataset mismatch** — notebook 96% is on HAM10000 `test_df` (15% holdout, seed=42). Local
   `combined_skin_dataset` is folder-organized, includes downsampled variants (now filtered), and is **not** the same
   split → expect lower absolute accuracy (~54% single-image, 280 filtered samples).

## STEP 7 — Local ISIC evaluation (filtered)

Command:
```bash
cd model-server
python scripts/eval_isic.py --max-per-class 40
```

Results (`eval_results/summary.json`):
- 7-class accuracy: **53.6%** (280 samples, no downsampled/aug)
- Primary routing: **80.4%**
- Top confusions: mel→nv, df→nv, akiec→bkl, bcc→nv

Dual fusion with center crop hurt dermoscopy frames; **adaptive fusion** now skips fusion when crop ≥72% of frame.

## New env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `USE_DUAL_INFERENCE` | `1` | Crop + full fusion in `/scan-multi` |
| `FUSION_CROP_WEIGHT` | `0.65` | Lesion crop logit weight |
| `FUSION_FULL_WEIGHT` | `0.35` | Full frame logit weight |
| `FUSION_SKIP_WHEN_CROP_COVERS` | `0.72` | Skip fusion for dermoscopy-style frames |
| `INFERENCE_TTA` | `1` | 4-flip TTA (notebook) |
| `INFERENCE_TEMPERATURE` | `1.0` | Softmax temperature |
| `LOW_CONFIDENCE_THRESHOLD` | `0.55` | Surface warning in API |
| `DEBUG_INFERENCE` | `0` | Save debug PNG/JSON per inference |
| `LESION_CROP_PADDING` | `0.12` | YOLO bbox padding |

## Files added/changed

- `services/preprocess.py` — notebook val_tf + EXIF/ICC loader
- `services/lesion_crop.py` — padded bbox + center fallback
- `services/inference_fusion.py` — dual-input fusion + adaptive skip
- `services/classifier.py` — debug logging, dual predict
- `services/explainer.py` — Grad-CAM on native aspect, bilinear upsample
- `routes/scan.py` — raw-pixel classify, dual fusion, no-detection fallback
- `scripts/eval_isic.py` — local ISIC metrics
- `config.py` — fusion/calibration/debug settings

## Recommendations

1. Enable `DEBUG_INFERENCE=1` on Flask when diagnosing mobile scans; inspect `model-server/debug_inference/`.
2. For notebook-parity benchmarking, obtain HAM10000 metadata CSV and evaluate the exact `test_df` (seed=42 split).
3. Reticle/YOLO crops on phone skin photos remain out-of-distribution vs HAM10000 — consider fine-tuning on phone captures or tightening YOLO training data.
4. Production: keep `NORMALIZE_INPUT=1`, `BACKBONE=effnet_b0`, `INFERENCE_TTA=1`.
