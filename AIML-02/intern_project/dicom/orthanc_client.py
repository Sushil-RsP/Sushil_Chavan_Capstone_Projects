"""Client for communicating with Orthanc DICOM server via REST API."""
from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)


class OrthancClient:
    """REST Client for Orthanc DICOM server."""

    def __init__(
        self,
        base_url: str = "http://localhost:8042",
        username: str = "orthanc",
        password: str = "orthanc",
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth = (username, password)
        self.timeout = timeout

    async def get_system_status(self) -> Dict[str, Any]:
        """Fetch Orthanc system diagnostics and version info."""
        async with httpx.AsyncClient(auth=self.auth, timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/system")
            resp.raise_for_status()
            return resp.json()

    async def list_studies(self) -> List[str]:
        """Retrieve list of all Study UUIDs stored in Orthanc."""
        async with httpx.AsyncClient(auth=self.auth, timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/studies")
            resp.raise_for_status()
            return resp.json()

    async def get_study_details(self, study_id: str) -> Dict[str, Any]:
        """Fetch metadata for a specific study."""
        async with httpx.AsyncClient(auth=self.auth, timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/studies/{study_id}")
            resp.raise_for_status()
            return resp.json()

    async def list_series_in_study(self, study_id: str) -> List[str]:
        """Fetch all Series UUIDs associated with a study."""
        study = await self.get_study_details(study_id)
        return study.get("Series", [])

    async def get_instance_file(self, instance_id: str) -> bytes:
        """Download raw DICOM file binary for an instance."""
        async with httpx.AsyncClient(auth=self.auth, timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/instances/{instance_id}/file")
            resp.raise_for_status()
            return resp.content

    async def upload_dicom_file(self, file_bytes: bytes) -> Dict[str, Any]:
        """Upload raw DICOM file to Orthanc."""
        async with httpx.AsyncClient(auth=self.auth, timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/instances",
                content=file_bytes,
                headers={"Content-Type": "application/dicom"},
            )
            resp.raise_for_status()
            return resp.json()

