"""ETOPO 2022 60s -> terrarium PNG 타일(z0..Z) -> MBTiles. 사용: dem_tiles.py <etopo.nc> <out.mbtiles> <maxzoom>"""
import sys, math, sqlite3, io
import numpy as np, rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_bounds
from PIL import Image
src, out, Z = sys.argv[1], sys.argv[2], int(sys.argv[3])
T = 256
R = 20037508.342789244
n = 2 ** Z * T
with rasterio.open(f'netcdf:{src}:z') as ds:
    dst = np.zeros((n, n), dtype=np.float32)
    reproject(rasterio.band(ds, 1), dst, src_crs='EPSG:4326',
              dst_transform=from_bounds(-R, -R, R, R, n, n), dst_crs='EPSG:3857',
              resampling=Resampling.average)
db = sqlite3.connect(out); c = db.cursor()
c.execute('create table metadata(name text, value text)')
c.execute('create table tiles(zoom_level int, tile_column int, tile_row int, tile_data blob)')
for k, v in {'name': 'etopo2022', 'format': 'png', 'minzoom': '0', 'maxzoom': str(Z),
             'bounds': '-180,-85.0511,180,85.0511', 'type': 'baselayer',
             'attribution': 'ETOPO 2022 (NOAA NCEI, public domain)'}.items():
    c.execute('insert into metadata values (?,?)', (k, v))
arr = dst
for z in range(Z, -1, -1):
    m = 2 ** z
    for y in range(m):
        for x in range(m):
            e = np.round(np.maximum(arr[y*T:(y+1)*T, x*T:(x+1)*T], 0)).astype(np.float64) + 32768.0
            r = np.floor(e / 256); g = np.floor(e % 256); b = np.floor((e - np.floor(e)) * 256)
            img = np.dstack([r, g, b]).clip(0, 255).astype(np.uint8)
            buf = io.BytesIO(); Image.fromarray(img).save(buf, 'PNG', optimize=True)
            c.execute('insert into tiles values (?,?,?,?)', (z, x, m - 1 - y, buf.getvalue()))
    if z:
        arr = arr.reshape(arr.shape[0]//2, 2, arr.shape[1]//2, 2).mean(axis=(1, 3))
db.commit(); db.close(); print('ok', out)
