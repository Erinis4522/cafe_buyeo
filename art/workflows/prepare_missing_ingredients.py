"""Crop and resize the six new ingredients with ComfyUI, then install them.

Pillow only inspects bounds/metadata; all raster transformations use ComfyUI.
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import time

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_comfy import api, make_ui, save_json, ROOT, COMFY
from build_previews import Scene

ITEMS = [
    ('caramel', '캐러멜 소스'), ('hazelnut', '헤이즐넛 시럽'),
    ('strawberry', '딸기 청'), ('matcha', '녹차 가루'),
    ('cinnamon', '시나몬 가루'), ('honey', '꿀'),
]


def submit(scene, outputs):
    ui = make_ui(scene.graph, api('/object_info'))
    for i, item in enumerate(ui['nodes']):
        item['pos'] = [(i % 8) * 360, (i // 8) * 430]
    save_json(ROOT / 'workflows/missing_ingredients_game_ready.api.json', scene.graph)
    save_json(ROOT / 'workflows/missing_ingredients_game_ready.workflow.json', ui)
    queued = api('/prompt', {'prompt': scene.graph,
                            'extra_data': {'extra_pnginfo': {'workflow': ui}}})
    pid = queued['prompt_id']
    deadline = time.monotonic() + 300
    while time.monotonic() < deadline:
        result = api('/history/' + pid).get(pid)
        if result:
            if result.get('status', {}).get('status_str') == 'error':
                raise RuntimeError(result['status'])
            for output_id, dest in outputs.items():
                item = result['outputs'][output_id]['images'][0]
                source = COMFY / item['type'] / item.get('subfolder', '') / item['filename']
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
                print('PREPARED ' + str(dest), flush=True)
            save_json(ROOT / 'workflows/missing_ingredients_game_ready.record.json',
                      {'prompt_id': pid, 'status': 'complete',
                       'outputs': [str(p.relative_to(ROOT)) for p in outputs.values()],
                       'execution_status': result.get('status')})
            return
        time.sleep(2)
    raise TimeoutError(pid)


def main():
    scene = Scene()
    outputs = {}
    previous_copies = {}
    for key, _ in ITEMS:
        previous = ROOT / 'ingredients/game_ready' / (key + '.png')
        previous_copies[key] = previous.read_bytes() if previous.exists() else None
        relative = 'ingredients/' + key + '_v01.png'
        with Image.open(ROOT / relative) as im:
            alpha = im.getchannel('A')
            assert alpha.getextrema() == (0, 255), relative
            box = alpha.point(lambda v: 255 if v > 64 else 0).getbbox()
            left, top, right, bottom = box
            padding = 14
            left, top = max(0, left-padding), max(0, top-padding)
            right, bottom = min(im.width, right+padding), min(im.height, bottom+padding)
        width, height = right-left, bottom-top
        scale = 300 / max(width, height)
        tw, th = round(width*scale), round(height*scale)
        source = scene.load(relative)
        rgb_crop = scene.add('ImageCrop', image=[source, 0], x=left, y=top,
                             width=width, height=height)
        rgb = scene.add('ImageScale', image=[rgb_crop, 0], width=tw, height=th,
                        upscale_method='lanczos', crop='disabled')
        # LoadImage mask is inverse opacity, as expected by JoinImageWithAlpha.
        mask_image = scene.add('MaskToImage', mask=[source, 1])
        mask_crop = scene.add('ImageCrop', image=[mask_image, 0], x=left, y=top,
                              width=width, height=height)
        mask_scaled = scene.add('ImageScale', image=[mask_crop, 0], width=tw,
                                height=th, upscale_method='lanczos', crop='disabled')
        mask = scene.add('ImageToMask', image=[mask_scaled, 0], channel='red')
        rgba = scene.add('JoinImageWithAlpha', image=[rgb, 0], alpha=[mask, 0])
        output = scene.add('SaveImage', images=[rgba, 0],
                           filename_prefix='cafe_buyeo/game_ready/' + key)
        outputs[output] = ROOT / 'ingredients/game_ready' / (key + '.png')
    submit(scene, outputs)

    for key, _ in ITEMS:
        source = ROOT / 'ingredients/game_ready' / (key + '.png')
        with Image.open(source) as im:
            assert im.mode == 'RGBA' and max(im.size) == 300, (key, im.mode, im.size)
            assert im.getchannel('A').getextrema() == (0, 255), key
        dest = ROOT.parent / 'game/assets/ing' / (key + '.png')
        if dest.exists() and dest.read_bytes() not in (source.read_bytes(), previous_copies[key]):
            raise FileExistsError('Will not overwrite different game asset: ' + str(dest))
        shutil.copy2(source, dest)
        print('INSTALLED ' + str(dest), flush=True)

    preview = Scene()
    base = preview.add('EmptyImage', width=1080, height=720, batch_size=1, color=0xF2E6D5)
    for index, (key, _) in enumerate(ITEMS):
        base = preview.layer(base, 'ingredients/game_ready/' + key + '.png',
                             (index % 3)*360+40, (index//3)*360+30, 280, 300)
    preview.render(base, 'new_ingredients_overview')


if __name__ == '__main__':
    main()
