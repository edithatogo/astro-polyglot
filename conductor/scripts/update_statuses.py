#!/usr/bin/env python3
"""Update all metadata.json statuses to reflect actual implementation state."""
import json, glob, os

script_dir = os.path.dirname(os.path.abspath(__file__))
tracks_dir = os.path.join(script_dir, '..', 'tracks')

# Tracks that are actually implemented (code exists, tests exist, docs exist)
completed = [
    'repo_init_20260513',
    'conductor_setup_20260513',
    'plugin_scaffold_20260513',
    'core_mdx_generator_20260513',
    'core_router_plugin_20260513',
    'handler_python_20260513',
    'handler_typescript_20260513',
    'handler_rust_20260513',
    'handler_r_20260513',
    'handler_julia_20260513',
    'handler_csharp_20260513',
    'handler_go_20260513',
    'ci_cd_20260513',
    'tests_20260513',
    'self_docs_20260513',
    'sota_contract_review_20260513',
]

# Migration tracks - being executed now by agents
in_progress = [
    'migrate_innovate_20260513',
    'migrate_voiage_20260513',
    'migrate_lifecourse_20260513',
    'migrate_mars_20260513',
]

for f in glob.glob(os.path.join(tracks_dir, '*/metadata.json')):
    with open(f) as fh:
        d = json.load(fh)
    tid = d.get('id', '')
    old_status = d.get('status', 'unknown')
    if tid in completed:
        d['status'] = 'completed'
    elif tid in in_progress:
        d['status'] = 'in_progress'
    if d['status'] != old_status:
        with open(f, 'w') as fh:
            json.dump(d, fh, indent=2)
        print(f'{tid}: {old_status} -> {d["status"]}')
    else:
        print(f'{tid}: unchanged ({old_status})')
