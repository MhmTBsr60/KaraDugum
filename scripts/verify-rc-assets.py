#!/usr/bin/env python3
"""Stage web assets from the game entry point and verify their APK/AAB bytes."""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


class GameAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        asset = attrs.get('src') if tag == 'script' else None
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            asset = attrs.get('href')
        if asset:
            url = urlsplit(asset)
            if not url.scheme and not url.netloc:
                self.paths.add(url.path)


def game_assets():
    parser = GameAssets()
    parser.feed((ROOT / 'index.html').read_text())
    paths = parser.paths | {'index.html', 'privacy-policy.html', 'delete-account.html', 'erase-local.js'}
    paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'assets').rglob('*') if p.is_file())
    result = {}
    for name in sorted(paths):
        source = (ROOT / name).resolve()
        if not source.is_relative_to(ROOT) or not source.is_file():
            raise ValueError(f'Invalid or missing game asset {name}')
        result[name] = source
    return result


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--stage', type=Path)
    mode.add_argument('--package', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    assets = game_assets()
    if args.stage:
        for name, source in assets.items():
            destination = args.stage / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
        return
    is_bundle = args.package.suffix == '.aab'
    prefix = 'base/' if is_bundle else ''
    with ZipFile(args.package) as package:
        hashes = {}
        for name, source in assets.items():
            data = package.read(prefix + 'assets/' + name)
            if data != source.read_bytes():
                raise ValueError(f'Package asset differs from candidate source: {name}')
            hashes[name] = hashlib.sha256(data).hexdigest()
        if is_bundle:
            config = json.loads(Path('app/kd-ads.json').read_text())
            dex = b''.join(package.read(name) for name in package.namelist()
                           if re.fullmatch(r'base/dex/classes\d*\.dex', name))
            if config['mode'] != 'live' or not all(config[key].encode() in dex for key in
                     ('rewardedUnitId', 'interstitialUnitId')):
                raise ValueError('Candidate AAB compiled ad mode does not match existing LIVE configuration')
            if any(unit in dex for unit in (b'/5224354917', b'/1033173712')):
                raise ValueError('A sample ad unit was packaged in the LIVE candidate')
    report = {'package': args.package.name, 'sha256': hashlib.sha256(args.package.read_bytes()).hexdigest(),
              'assets': hashes, 'adsMode': 'live' if is_bundle else 'test'}
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(f'PASS: {len(hashes)} byte-matched assets in {args.package.name}')


if __name__ == '__main__':
    main()
