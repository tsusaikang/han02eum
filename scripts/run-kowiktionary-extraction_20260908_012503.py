"""Reproduce the corrected source extraction without changing the user's locale.

Install wiktextract ccec6f120efedd84f57fe0f1631e89408e9cb62a with
wikitextprocessor 4deed5191c9e4cb61ee1a4c822e3f6686ae8541b and its Scribunto
d35ca1f8d5fd23f1a9915e497cc00cac238f28c4 submodule, then apply the sibling
kowiktionary-extractor-fixes_20260908_012503.patch to the wiktextract checkout.
All paths are explicit; the XML and earlier outputs are retained.
"""
import argparse, os, pathlib, subprocess, sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--python', default=sys.executable)
parser.add_argument('--engine', required=True)
parser.add_argument('--processor', required=True)
parser.add_argument('--dump', required=True)
parser.add_argument('--db', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--errors', required=True)
parser.add_argument('--processes', type=int, default=4)
args = parser.parse_args()
if pathlib.Path(args.out).exists() or pathlib.Path(args.out + '.tmp').exists():
    parser.error('Use a new output path; existing source results are preserved.')
environment = os.environ.copy()
environment.update(LC_ALL='C', PYTHONCOERCECLOCALE='0', PYTHONUTF8='1',
    PYTHONPATH=os.pathsep.join(str(pathlib.Path(p).resolve() / 'src') for p in [args.engine, args.processor]))
command = [args.python, '-m', 'wiktextract.wiktwords', '--edition', 'ko',
           '--language-code', 'en', '--all', '--num-processes', str(args.processes),
           '--db-path', args.db, '--out', args.out, '--errors', args.errors, args.dump]
raise SystemExit(subprocess.call(command, env=environment))
