"""Generate cafe assets using the user's running local ComfyUI server.

Usage: python generate_comfy.py specs.json [asset_id ...]
Each asset keeps its API prompt, editable UI workflow, and generation record.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = 'http://127.0.0.1:8188'
ROOT = Path(__file__).resolve().parents[1]
COMFY = Path(r'C:\ComfyUI_windows_portable\ComfyUI')


def api(path, data=None):
    payload = None if data is None else json.dumps(data).encode('utf-8')
    req = urllib.request.Request(BASE + path, data=payload,
                                 headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(exc.read().decode('utf-8')) from exc


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def node(kind, **inputs):
    return {'class_type': kind, 'inputs': inputs}


def make_prompt(spec, settings, prefix):
    if 'source' in spec:
        source = Path(spec['source'])
        staged = COMFY / 'input' / 'cafe_buyeo' / source.name
        staged.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, staged)
        graph = {'6': node('LoadImage', image='cafe_buyeo/' + source.name)}
    else:
        graph = {
            '1': node('CheckpointLoaderSimple', ckpt_name=spec.get('model', settings['model'])),
            '2': node('CLIPTextEncode', text=spec['positive'], clip=['1', 1]),
            '3': node('CLIPTextEncode', text=spec.get('negative', settings['negative']), clip=['1', 1]),
            '4': node('EmptyLatentImage', width=spec['width'], height=spec['height'], batch_size=1),
            '5': node('KSampler', seed=spec['seed'], steps=spec.get('steps', settings['steps']),
                      cfg=spec.get('cfg', settings['cfg']), sampler_name=settings['sampler'],
                      scheduler=settings['scheduler'], denoise=1.0, model=['1', 0],
                      positive=['2', 0], negative=['3', 0], latent_image=['4', 0]),
            '6': node('VAEDecode', samples=['5', 0], vae=['1', 2]),
            '7': node('SaveImage', images=['6', 0], filename_prefix=prefix + '_source'),
        }
        if settings.get('architecture') == 'anima':
            graph['1'] = node('UNETLoader', unet_name=spec.get('model', settings['model']), weight_dtype='default')
            graph['10'] = node('CLIPLoader', clip_name='qwen_3_06b_base.safetensors', type='stable_diffusion', device='default')
            graph['11'] = node('VAELoader', vae_name='qwen_image_vae.safetensors')
            graph['2']['inputs']['clip'] = ['10', 0]
            graph['3']['inputs']['clip'] = ['10', 0]
            graph['4']['class_type'] = 'EmptySD3LatentImage'
            graph['6']['inputs']['vae'] = ['11', 0]
    if spec.get('transparent'):
        graph['8'] = node('easy imageRemBg', images=['6', 0], rem_mode='BEN2',
                          image_output='Hide', save_prefix=prefix, torchscript_jit=False,
                          add_background='none', refine_foreground=False)
        graph['9'] = node('SaveImage', images=['8', 0], filename_prefix=prefix + '_rgba')
        if spec.get('clean_alpha'):
            graph['12'] = node('RemapMaskRange', mask=['8', 1], min=-0.25, max=1.0)
            mask_source = ['12', 0]
            for index, region in enumerate(spec.get('protect_regions', [])):
                solid_key = str(15 + index*2)
                merged_key = str(16 + index*2)
                graph[solid_key] = node('SolidMask', value=1.0, width=region['width'], height=region['height'])
                graph[merged_key] = node('MaskComposite', destination=mask_source, source=[solid_key, 0],
                                          x=region['x'], y=region['y'], operation='add')
                mask_source = [merged_key, 0]
            graph['13'] = node('InvertMask', mask=mask_source)
            graph['14'] = node('JoinImageWithAlpha', image=['6', 0], alpha=['13', 0])
            graph['9']['inputs']['images'] = ['14', 0]
    return graph


def make_ui(graph, catalog):
    positions = {'1': [30, 40], '2': [360, 40], '3': [360, 380],
                 '4': [360, 700], '5': [850, 40], '6': [1180, 40],
                 '7': [1510, 40], '8': [1510, 560], '9': [1870, 560],
                 '10': [30, 440], '11': [30, 820], '12': [1870, 980],
                 '13': [2210, 980], '14': [2550, 560]}
    nodes, links, lookup = [], [], {}
    for key, value in graph.items():
        kind, vals = value['class_type'], value['inputs']
        meta = catalog[kind]
        inputs, widgets = [], []
        for group in ('required', 'optional'):
            for name, schema in meta.get('input', {}).get(group, {}).items():
                if name not in vals:
                    continue
                val, tp = vals[name], schema[0]
                if isinstance(val, list) and len(val) == 2 and str(val[0]) in graph:
                    link_id = len(links) + 1
                    links.append([link_id, int(val[0]), val[1], int(key), len(inputs), tp])
                    inputs.append({'name': name, 'type': tp, 'link': link_id})
                else:
                    widgets.append(val)
                    if kind == 'KSampler' and name == 'seed':
                        widgets.append('fixed')
        outputs = [{'name': name, 'type': tp, 'links': [], 'slot_index': index}
                   for index, (name, tp) in enumerate(zip(meta.get('output_name', meta.get('output', [])), meta.get('output', [])))]
        n = {'id': int(key), 'type': kind, 'pos': positions.get(key, [0, 0]),
             'size': [420, 300] if kind == 'CLIPTextEncode' else [310, 370],
             'flags': {}, 'order': len(nodes), 'mode': 0, 'inputs': inputs,
             'outputs': outputs, 'properties': {'Node name for S&R': kind},
             'widgets_values': widgets}
        nodes.append(n)
        lookup[int(key)] = n
    for link in links:
        lookup[link[1]]['outputs'][link[2]]['links'].append(link[0])
    return {'last_node_id': max(map(int, graph)), 'last_link_id': len(links),
            'nodes': nodes, 'links': links, 'groups': [], 'config': {},
            'extra': {'ds': {'scale': 0.65, 'offset': [30, 50]}}, 'version': 0.4}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('specs', type=Path)
    parser.add_argument('ids', nargs='*')
    args = parser.parse_args()
    specs = json.loads(args.specs.read_text(encoding='utf-8'))
    catalog = api('/object_info')
    selected = [s for s in specs['assets'] if not args.ids or s['id'] in args.ids]
    if args.ids and set(args.ids) != {s['id'] for s in selected}:
        raise ValueError('Unknown requested asset id')
    batch = dt.datetime.now().strftime('%Y%m%d_%H%M%S')
    for spec in selected:
        dest = ROOT / spec['output']
        if dest.exists():
            print('SKIP existing ' + str(dest), flush=True)
            continue
        prefix = 'cafe_buyeo/' + batch + '/' + spec['id']
        graph = make_prompt(spec, specs['settings'], prefix)
        ui = make_ui(graph, catalog)
        work = ROOT / 'workflows' / spec['id']
        save_json(work.with_suffix('.api.json'), graph)
        save_json(work.with_suffix('.workflow.json'), ui)
        submitted = api('/prompt', {'prompt': graph, 'client_id': str(uuid.uuid4()),
                                    'extra_data': {'extra_pnginfo': {'workflow': ui}}})
        prompt_id = submitted['prompt_id']
        record = {'asset': spec, 'settings': specs['settings'], 'prompt_id': prompt_id,
                  'submitted_at': dt.datetime.now().isoformat(), 'status': 'submitted'}
        record_path = work.with_suffix('.record.json')
        save_json(record_path, record)
        print('QUEUED ' + spec['id'] + ' ' + prompt_id, flush=True)
        started, last_report = time.monotonic(), time.monotonic()
        while True:
            history = api('/history/' + prompt_id)
            result = history.get(prompt_id)
            if result:
                record['execution_status'] = result.get('status')
                save_json(record_path, record)
                if result.get('status', {}).get('status_str') == 'error':
                    raise RuntimeError(json.dumps(result['status'], ensure_ascii=False))
                output_id = '9' if spec.get('transparent') else '7'
                image_info = result.get('outputs', {}).get(output_id, {}).get('images', [])
                if image_info:
                    item = image_info[0]
                    source = COMFY / item['type'] / item.get('subfolder', '') / item['filename']
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, dest)
                    if spec.get('transparent') and 'source' not in spec:
                        raw = result['outputs']['7']['images'][0]
                        raw_file = COMFY / raw['type'] / raw.get('subfolder', '') / raw['filename']
                        raw_dest = ROOT / 'sources' / (spec['id'] + '.png')
                        raw_dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(raw_file, raw_dest)
                    record.update(status='complete', output=str(dest), elapsed_seconds=round(time.monotonic()-started, 1))
                    save_json(record_path, record)
                    print('SAVED ' + str(dest) + ' ' + str(record['elapsed_seconds']) + 's', flush=True)
                    break
                if result.get('status', {}).get('completed'):
                    raise RuntimeError('Execution completed without expected image: ' + str(result))
            if time.monotonic() - last_report > 30:
                print('RUNNING ' + spec['id'] + ' ' + str(round(time.monotonic()-started)) + 's', flush=True)
                last_report = time.monotonic()
            if time.monotonic() - started > 900:
                raise TimeoutError('Prompt still queued or running: ' + prompt_id)
            time.sleep(3)


if __name__ == '__main__':
    main()
