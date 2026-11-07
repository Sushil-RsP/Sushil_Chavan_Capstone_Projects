#!/usr/bin/env python3
"""
Orthanc DICOM Polling and Automated AI Inference Service.

This service continuously polls the configured Orthanc DICOM PACS server for new
incoming studies, downloads instances, parses pixel data, executes DenseNet121
classification and Grad-CAM explainability, and stores results into the database
with an immutable audit log entry.

Usage:
    # Single one-shot pull and infer run:
    python scripts/orthanc_pull_service.py --once

    # Continuous daemon polling every 30 seconds:
    python scripts/orthanc_pull_service.py --interval 30
"""
from __future__ import annotations
import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import AsyncSessionLocal, init_db
from app.dicom_service import sync_new_studies_and_infer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("orthanc_pull_service")


async def run_worker(interval_seconds: int = 30, run_once: bool = False):
    """Run worker loop that checks Orthanc PACS and runs automated inference."""
    logger.info("Initialising database tables...")
    await init_db()
    logger.info("Orthanc Ingestion & Inference Service running (poll interval: %ds)...", interval_seconds)

    while True:
        try:
            async with AsyncSessionLocal() as session:
                count, uids = await sync_new_studies_and_infer(session)
                if count > 0:
                    logger.info("Successfully ingested & inferred %d studies: %s", count, uids)
                else:
                    logger.debug("No new un-inferred studies in Orthanc PACS.")
        except Exception as exc:
            logger.error("Error during Orthanc sync and inference pass: %s", exc)

        if run_once:
            logger.info("Single-pass execution completed. Exiting.")
            break

        await asyncio.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description="Orthanc DICOM Ingestion & Auto-Inference Daemon")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval in seconds (default: 30)")
    parser.add_argument("--once", action="store_true", help="Run once and exit without loop")
    args = parser.parse_args()

    asyncio.run(run_worker(interval_seconds=args.interval, run_once=args.once))


if __name__ == "__main__":
    main()
