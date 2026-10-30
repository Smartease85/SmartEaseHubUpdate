# Authored control artwork

`python3 tools/authored-ux-controls/generate.py` regenerates the190 independently authored controls into this tool directory's `replacements/`, without reading original images. It requires Pillow. Compare the manifest hashes before adopting output. The public runtime uses the files at their existing root-relative paths.

The original reference comparison and private tests are not distributed. Original SHA values in inventory are historical identifiers only, not claims that new pixels came from those images. The separately generated Settings banner is documented in docs/AUTHORED-SETTINGS-BANNER.json. Output emoji, frames, colorful thumbnails, fonts and Clock are separate resources.
