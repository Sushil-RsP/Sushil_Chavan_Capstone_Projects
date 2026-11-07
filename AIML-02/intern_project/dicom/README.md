# DICOM Integration & Orthanc PACS Service

> **For education only — not for clinical use.**

This module provides medical imaging ingestion, parsing, photometric normalization, and Orthanc DICOM server integration.

## Capabilities

1. **DICOM Parsing (`parser.py`)**:
   - Safe parsing of DICOM Part 10 streams using `pydicom`.
   - Dynamic dynamic range rescale (`RescaleSlope` and `RescaleIntercept`).
   - Photometric Interpretation correction: `MONOCHROME1` (inverted so radiopaque bone structures appear white) vs `MONOCHROME2`.
   - De-identification tool (`sanitize_dicom_metadata`) to strip Patient Name, Patient ID, Institution, and Date of Birth according to HIPAA Safe Harbor de-identification rules.

2. **Orthanc Client (`orthanc_client.py`)**:
   - Asynchronous HTTP REST queries against Orthanc instances.
   - Querying studies, series, and retrieving raw instance bytes.
   - Local mock mode fallback (`ORTHANC_MOCK_MODE=true`) enabled by default so the application runs seamlessly even if Orthanc is not running.

## Transfer Syntaxes & Compression

| Transfer Syntax UID | Description | Supported by pydicom (native) |
|---------------------|-------------|-------------------------------|
| `1.2.840.10008.1.2` | Implicit VR Little Endian | Yes |
| `1.2.840.10008.1.2.1` | Explicit VR Little Endian | Yes |
| `1.2.840.10008.1.2.2` | Explicit VR Big Endian | Yes |
| `1.2.840.10008.1.2.4.50` | JPEG Baseline (Process 1) | Requires `pylibjpeg` or `imagecodecs` |
| `1.2.840.10008.1.2.4.70` | JPEG Lossless | Requires `pylibjpeg-libjpeg` |
| `1.2.840.10008.1.2.4.90` | JPEG 2000 Lossless | Requires `openjpeg` / `GDCM` |

> [!WARNING]
> Compressed transfer syntaxes (such as JPEG 2000 or JPEG-LS) require native pixel decompression libraries (`openjpeg`, `GDCM`, or `pylibjpeg`). If an unsupported compressed syntax is uploaded, the parser raises a clear format exception recommending uncompressed transfer syntax export.

