"""Compare full extracted English source records; text deltas require interpretation."""
import argparse, collections, gzip, json, pathlib
p=argparse.ArgumentParser();p.add_argument('--before',required=True);p.add_argument('--after',required=True);p.add_argument('--errors',required=True);p.add_argument('--out',required=True);a=p.parse_args()
def load(path):
    rows=collections.defaultdict(list)
    with (gzip.open(path,'rt') if path.endswith('.gz') else open(path)) as f:
        for line in f:
            r=json.loads(line)
            if r.get('lang_code')=='en':rows[r['word']].append(r)
    return rows
before,after=load(a.before),load(a.after)
def glosses(rows):return collections.Counter((w,tuple(s.get('glosses',[]))) for w,rs in rows.items() for r in rs for s in r.get('senses',[]) if s.get('glosses'))
def inventory(rows):
    entries=[r for rs in rows.values() for r in rs];senses=[s for r in entries for s in r.get('senses',[])]
    return {'headwords':len(rows),'entries':len(entries),'senses':len(senses)}
bg,ag=glosses(before),glosses(after)
errors=json.load(open(a.errors));tags=[]
for w,rs in after.items():
    for r in rs:
        if any(t.startswith('error') for t in r.get('tags',[])) or any(t.startswith('error') for s in r.get('senses',[]) for t in s.get('tags',[])):tags.append(r)
result={'before':inventory(before),'after':inventory(after),'lostHeadwords':sorted(before.keys()-after.keys()),'addedHeadwords':sorted(after.keys()-before.keys()),'lostGlossOccurrences':sum((bg-ag).values()),'addedGlossOccurrences':sum((ag-bg).values()),'glossChanges':[{'word':w,'oldGlosses':list(g),'count':n,'afterEntries':after[w]} for (w,g),n in (bg-ag).items()],'outputErrorEntries':tags,'diagnostics':{k:len(v) for k,v in errors.items()},'loggedErrors':errors.get('errors',[]),'limitation':'Exact string comparison detects changes, not semantic accuracy. Source revisions and corruption repair can replace old strings. English-only senses remain in raw; product selection is a separate comparison.'}
pathlib.Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('glossChanges','loggedErrors','outputErrorEntries','addedHeadwords')},ensure_ascii=False,indent=2))
