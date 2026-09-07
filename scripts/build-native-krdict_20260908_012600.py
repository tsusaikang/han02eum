#!/usr/bin/env python3
"""Build Korean/English source-native search and lazy details from the official ZIP.
Raw archive remains untouched. Non-English Equivalent records stay in raw only.
"""
import argparse,collections,hashlib,html,json,pathlib,re,unicodedata,zipfile
VERSION='native-krdict_20260908_012600'
ROOT=pathlib.Path(__file__).resolve().parents[1]
POS={'명사':'noun','대명사':'pronoun','동사':'verb','형용사':'adjective','부사':'adverb','관형사':'determiner','감탄사':'interjection','수사':'numeral','조사':'particle','접사':'affix','의존 명사':'noun','보조 동사':'verb','보조 형용사':'adjective'}
def arr(x):return x if isinstance(x,list) else ([] if x is None else [x])
def vals(x,a):return [str(f.get('val','')).strip() for c in arr(x) for f in arr(c.get('feat')) if f.get('att')==a and str(f.get('val','')).strip()]
def val(x,a):return (vals(x,a) or [''])[0]
def dec(x):return html.unescape(x)
def ko(x):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',x).strip())
def en(x):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',x).strip()).lower()
def digest(x):return hashlib.sha256(x.encode()).hexdigest()
def bucket(kind,key,count):return hashlib.sha256((VERSION+'\0'+kind+'\0'+key).encode()).digest()[0]%count
def expression(x):return None if re.fullmatch(r'\(?no equivalent expression\)?',x.strip(),re.I) else dec(x)
def direct_expressions(x):
 # Entity terminators cannot become alternative separators.
 x=dec(x or '').strip()
 if not x or re.fullmatch(r'\(?no equivalent expression\)?',x,re.I):return []
 result=[]
 for part in x.split(';'):
  part=part.strip()
  # Common presentation marks on a single expression do not change its lookup key.
  atomic=re.fullmatch(r"(?:[#*]\s*)?([a-z0-9]+(?:[-'][a-z0-9]+)*'?)[.!?]?",part,re.I)
  if atomic:
   result.append((en(atomic[1]),part));continue
  # A sentence-like alternative must not suppress other independent alternatives.
  if re.search(r'[.!?:\n\r"“”]',part):continue
  if re.match(r'^(?:a word|a term|an expression|the former term|in law\b)',part,re.I):continue
  candidates=[part]
  alternatives=re.split(r'[,/]',part)
  if len(alternatives)>1 and all(re.fullmatch(r"[a-z0-9]+(?:[-'][a-z0-9]+)*'?",en(value)) for value in alternatives):
   candidates.extend(alternatives)
  for candidate in candidates:
   key=en(candidate)
   if re.fullmatch(r"[a-z0-9]+(?:[-'/][a-z0-9]+)*'?(?:,? [a-z0-9]+(?:[-'/][a-z0-9]+)*'?){0,11}",key):
    original=re.sub(r'\s+',' ',unicodedata.normalize('NFKC',candidate).strip())
    if (key,original) not in result:result.append((key,original))
 return result

def build(source,out,report):
 out.mkdir(parents=True,exist_ok=True)
 if any(out.iterdir()):raise SystemExit('Output directory must be empty; preserve previous builds.')
 core=[{} for _ in range(64)]; reverse=[{} for _ in range(64)]; details=[{} for _ in range(256)]
 stats=collections.Counter(); identities=set(); excluded=[]
 with zipfile.ZipFile(source) as archive:
  for filename in sorted(n for n in archive.namelist() if n.endswith('.json')):
   payload=json.loads(archive.read(filename));entries=arr(payload['LexicalResource']['Lexicon']['LexicalEntry'])
   for entry in entries:
    stats['sourceEntries']+=1
    entry_id=str(entry.get('val','')).strip();headwords=vals(entry.get('Lemma'),'writtenForm')
    if len(headwords)!=1 or not entry_id:raise ValueError('Unaccounted source headword shape')
    headword=dec(headwords[0]);key=ko(headword);posko=val(entry,'partOfSpeech');pos=POS.get(posko,posko) or None
    entry_identity=entry_id+'\0'+key; detail_key=digest(entry_identity);detail_bucket=bucket('details',detail_key,256)
    if detail_key in details[detail_bucket]:raise ValueError('Duplicate source entry identity')
    pronunciation=[]
    for wf in arr(entry.get('WordForm')):
     ps=vals(wf,'pronunciation');sounds=vals(wf,'sound')
     for i,p in enumerate(ps):pronunciation.append({'pronunciation':dec(p),'sound':sounds[i] if i<len(sounds) else None})
    entry_annotations=[dec(s) for s in vals(entry,'annotation')]
    stats['entriesWithPronunciation']+=bool(pronunciation);stats['pronunciationTexts']+=len(pronunciation);stats['entryAnnotations']+=len(entry_annotations)
    detail_entry={'sourceEntry':{k:v for k,v in entry.items() if k!='Sense'},'senses':{}}
    for sense in arr(entry.get('Sense')):
     stats['sourceSenses']+=1;sense_id=str(sense.get('val','')).strip()
     if not sense_id:raise ValueError('Missing source sense ID')
     identity=entry_id+'\0'+sense_id+'\0'+key
     if identity in identities:raise ValueError('Duplicate source sense identity')
     identities.add(identity)
     eng=[e for e in arr(sense.get('Equivalent')) if val(e,'language')=='영어']
     if len(eng)>1:raise ValueError('Multiple English equivalents need explicit handling')
     if not eng:rid='krdict-korean-only:'+entry_id+':'+sense_id+':'+digest(identity)
     elif isinstance(entry.get('Lemma'),dict) and posko:rid='krdict:'+entry_id+':'+sense_id
     else:rid='krdict-v2-recovered:'+entry_id+':'+sense_id+':'+digest(identity)
     examples=[{'type':dec(val(e,'type')),'texts':[dec(s) for s in vals(e,'example')]} for e in arr(sense.get('SenseExample'))]
     annotations=[dec(s) for s in vals(sense,'annotation')]
     count=sum(len(e['texts']) for e in examples);stats['examples']+=count;stats['sensesWithExamples']+=bool(count);stats['senseAnnotations']+=len(annotations);stats['sensesWithAnnotations']+=bool(annotations);stats['sensesWithRelations']+=bool(sense.get('SenseRelation'))
     record={'id':rid,'entryId':entry_id,'senseId':sense_id,'headword':headword,'partOfSpeech':pos,'partOfSpeechKo':posko or None,'definitionKo':dec(val(sense,'definition')),'annotations':annotations,'entryAnnotations':entry_annotations,'pronunciations':pronunciation,'examplesCount':count,'detailsRef':{'entry':detail_key,'senseId':sense_id,'shard':detail_bucket},'hasSourceRelations':bool(sense.get('SenseRelation')),'sourceKind':'korean-english' if eng else 'korean-reference'}
     if not posko:record['entryTypeKo']=val(entry,'lexicalUnit') or None
     if eng:
      record['englishExpression']=expression(val(eng[0],'lemma'));record['englishDescription']=expression(val(eng[0],'definition'));stats['englishSenses']+=1
     else:
      record['variant']=dec(val(entry.get('Lemma'),'variant')) or None;stats['referenceSenses']+=1
     core[bucket('korean',key,64)].setdefault(key,[]).append(record)
     direct=direct_expressions(record.get('englishExpression'))
     if record.get('englishExpression') and not direct:excluded.append({'id':rid,'headword':headword,'expression':record['englishExpression']})
     grouped=collections.defaultdict(list)
     for expression_key,original in direct:grouped[expression_key].append(original)
     for expression_key,originals in grouped.items():reverse[bucket('english',expression_key,64)].setdefault(expression_key,[]).append({**record,'matchedEnglishExpressions':originals});stats['reverseOccurrences']+=1;stats['phraseOccurrences']+=' ' in expression_key
     detail_entry['senses'][sense_id]={'sourceSense':{**{k:v for k,v in sense.items() if k!='Equivalent'},**({'Equivalent':eng} if eng else {})},'examples':examples,'senseRelations':sense.get('SenseRelation',[])}
    details[detail_bucket][detail_key]=detail_entry
 for shards in [core,reverse]:
  for shard in shards:
   for records in shard.values():records.sort(key=lambda r:(int(r['entryId']),int(r['senseId']),r['headword'],r['id']))
 sizes=collections.Counter();maxsize=collections.Counter()
 for kind,shards,payloadkey in [('korean',core,'words'),('english',reverse,'words'),('details',details,'entries')]:
  for i,shard in enumerate(shards):
   data=json.dumps({'version':VERSION,payloadkey:shard},ensure_ascii=False,separators=(',',':'),sort_keys=True).encode();(out/f'{kind}-{i:03d}.json').write_bytes(data);sizes[kind]+=len(data);maxsize[kind]=max(maxsize[kind],len(data))
 stats['koreanKeys']=sum(len(x) for x in core);stats['englishKeys']=sum(len(x) for x in reverse);stats['phraseKeys']=sum(' ' in k for shard in reverse for k in shard);stats['excludedExpressionSenses']=len(excluded)
 manifest={'version':VERSION,'source':{'name':'한국어기초사전','url':'https://krdict.korean.go.kr/dicBatchDownload?seq=214','archiveSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'archiveBytes':source.stat().st_size},'license':{'name':'CC BY-SA 2.0 KR','url':'https://creativecommons.org/licenses/by-sa/2.0/kr/'},'stats':dict(stats),'shardCounts':{'korean':64,'english':64,'details':256},'bytes':dict(sizes),'maxShardBytes':dict(maxsize),'scope':'All source Korean/English senses. Other-language equivalents retained in the unchanged raw archive. Core search and lazy source details preserve source sense boundaries.','reversePolicy':'HTML entities decoded before semicolon alternatives. Commas/slashes stay in whole expressions; additional single-expression alternatives only when all fragments are single expressions. Atomic presentation marks are normalized only in keys. Sentence-like alternatives are excluded independently; up to 12 tokens. No word decomposition or semantic inference.'}
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));report.mkdir(parents=True,exist_ok=True);(report/'excluded-reverse-expressions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2));print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',type=pathlib.Path,default=ROOT/'.local/sources/krdict-refresh_20260907_233900/krdict-latest.json.zip');p.add_argument('--out',type=pathlib.Path,default=ROOT/'public'/VERSION);p.add_argument('--report',type=pathlib.Path,default=ROOT/'.local/pilot/native-krdict-build_20260908_012600');a=p.parse_args();build(a.source,a.out,a.report)
