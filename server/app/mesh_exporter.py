import json
from pathlib import Path

import numpy as np


class MeshExporter:
    """Exports the fsaverage5 cortical surface mesh for Three.js rendering."""

    def __init__(self, mesh: str = "fsaverage5"):
        self.mesh = mesh
        self._data: dict | None = None

    def load(self) -> None:
        """Load fsaverage5 mesh from nilearn."""
        from nilearn.datasets import fetch_surf_fsaverage

        fsaverage = fetch_surf_fsaverage(mesh=self.mesh)

        # Load left and right hemisphere meshes
        lh_coords, lh_faces = self._load_mesh_file(fsaverage["pial_left"])
        rh_coords, rh_faces = self._load_mesh_file(fsaverage["pial_right"])

        # Combine hemispheres: offset right hemisphere face indices
        n_lh_vertices = lh_coords.shape[0]
        rh_faces_offset = rh_faces + n_lh_vertices

        vertices = np.vstack([lh_coords, rh_coords])
        faces = np.vstack([lh_faces, rh_faces_offset])

        self._data = {
            "vertices": vertices.tolist(),
            "faces": faces.tolist(),
            "n_vertices": vertices.shape[0],
        }

    def _load_mesh_file(self, filepath: str) -> tuple[np.ndarray, np.ndarray]:
        """Load a FreeSurfer mesh file, handling both .pial and .gii formats."""
        filepath = str(filepath)

        if filepath.endswith(".gii"):
            import nibabel as nib
            gii = nib.load(filepath)
            coords = gii.darrays[0].data
            faces = gii.darrays[1].data
            return coords, faces
        else:
            # FreeSurfer binary format
            from nibabel.freesurfer import read_geometry
            coords, faces = read_geometry(filepath)
            return coords, faces

    def get_mesh_data(self) -> dict:
        """Return the mesh data as a JSON-serializable dict."""
        if self._data is None:
            raise RuntimeError("Mesh not loaded. Call load() first.")
        return self._data

    @property
    def n_vertices(self) -> int:
        if self._data is None:
            return 0
        return self._data["n_vertices"]
