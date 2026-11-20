"""Prints a comment stored inside an .aep (used to read diagnostics/logs written by ExtendScript without file-write permission).
Usage: python read_comment.py <file.aep> <START_TAG> <END_TAG>"""
import re, sys
b = open(sys.argv[1], 'rb').read()
start, end = sys.argv[2], sys.argv[3]
for enc in ('utf-8', 'utf-16-le', 'utf-16-be', 'latin-1'):
    t = b.decode(enc, errors='ignore')
    m = re.search(re.escape(start) + r'(.*?)' + re.escape(end), t, re.S)
    if m:
        print('[' + enc + ']')
        print(m.group(1).replace(' || ', '\n'))
        break
else:
    print('not found; file size', len(b))
