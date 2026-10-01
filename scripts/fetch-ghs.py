"""Vendor the public PubChem GHS pictograms for offline demo use."""
from pathlib import Path
from subprocess import check_output

destination = Path('public/ghs')
destination.mkdir(parents=True, exist_ok=True)
for code in ['GHS02', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09']:
    url = f'https://pubchem.ncbi.nlm.nih.gov/images/ghs/{code}.gif'
    data = check_output(['curl', '-fsSL', '--max-time', '30', url])
    if not data.startswith((b'GIF87a', b'GIF89a')):
        raise RuntimeError(f'Invalid image: {code}')
    (destination / f'{code}.gif').write_bytes(data)
    print(f'{code}: {len(data)} bytes')
