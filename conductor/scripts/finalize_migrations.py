#!/usr/bin/env python3
"""Finalize migration tracks as completed."""
import json
import glob
import os

tracks_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tracks')
for f in glob.glob(os.path.join(tracks_dir, '*/metadata.json')):
    with open(f) as fh:
        d = json.load(fh)
    tid = d.get('id', '')
    if tid.startswith('migrate_'):
        d['status'] = 'completed'
        with open(f, 'w') as fh:
            json.dump(d, fh, indent=2)
        print(f'Updated {tid} to completed')
