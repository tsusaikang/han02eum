import pathlib,json,zipfile,html,collections,re,sqlite3
R=pathlib.Path('.');D=R/'public/native-krdict_20260908_012600';O=R/'.local/pilot/native-krdict-build_20260908_012600'
def arr(x):return x if isinstance(x,list) else ([] if x is None else [x])
def vals(x,a):return [str(f.get('val','')).strip() for c in arr(x) for f in arr(c.get('feat')) if f.get('att')==a and str(f.get('val','')).strip()]
def val(x,a):return (vals(x,a) or [''])[0]
def ident(e,s,h):return json.dumps([e,s,h],ensure_ascii=False)
def identity(r):return ident(r['entryId'],r['senseId'],r['headword'])
def ser(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def un(v):return json.loads(v)
db=sqlite3.connect(O/'verification.sqlite');db.executescript('DROP TABLE IF EXISTS old; DROP TABLE IF EXISTS core; DROP TABLE IF EXISTS ent; DROP TABLE IF EXISTS sen; CREATE TABLE old (id PRIMARY KEY,data); CREATE TABLE core(id PRIMARY KEY,data); CREATE TABLE ent(id PRIMARY KEY,data); CREATE TABLE sen(id PRIMARY KEY,data);')
errors=[];stats=collections.Counter();seen_details=set()
for lane in ['korean-source-relations-v1-full','korean-source-relations-v2-recovered','korean-only-references-v1']:
 for p in (R/'public'/lane).glob('shard-*.json'):
  for rs in json.load(open(p))['words'].values():
   for r in rs:db.execute('INSERT INTO old VALUES (?,?)',(identity(r),ser(r)))
for p in D.glob('korean-*.json'):
 for rs in json.load(open(p))['words'].values():
  for r in rs:
   rid=identity(r);old=db.execute('SELECT data FROM old WHERE id=?',(rid,)).fetchone()
   if not old:errors.append(['unexpectedCore',rid]);continue
   old=un(old[0])
   for f in ['id','definitionKo','englishExpression','englishDescription']:
    if old.get(f)!=r.get(f):errors.append(['coreChanged',rid,f])
   db.execute('INSERT INTO core VALUES (?,?)',(rid,ser(r)))
with zipfile.ZipFile(R/'.local/sources/krdict-refresh_20260907_233900/krdict-latest.json.zip') as z:
 for filename in z.namelist():
  if not filename.endswith('.json'):continue
  payload=json.loads(z.read(filename))
  for e in arr(payload['LexicalResource']['Lexicon']['LexicalEntry']):
   stats['entries']+=1;head=html.unescape(val(e.get('Lemma'),'writtenForm'));eid=str(e['val']);ea=[html.unescape(x) for x in vals(e,'annotation')];expected_pron=[]
   for w in arr(e.get('WordForm')):
    sounds=vals(w,'sound')
    for i,pr in enumerate(vals(w,'pronunciation')):expected_pron.append({'pronunciation':html.unescape(pr),'sound':sounds[i] if i<len(sounds) else None})
   stats['entryAnnotations']+=len(ea);stats['pronunciationTexts']+=len(expected_pron)
   db.execute('INSERT INTO ent VALUES (?,?)',(ident(eid,'',head),ser({k:v for k,v in e.items() if k!='Sense'})))
   for s in arr(e.get('Sense')):
    stats['senses']+=1;sid=str(s['val']);rid=ident(eid,sid,head);row=db.execute('SELECT data FROM core WHERE id=?',(rid,)).fetchone()
    if not row:errors.append(['sourceSenseAbsent',rid]);continue
    r=un(row[0]);es=[x for x in arr(s.get('Equivalent')) if val(x,'language')=='영어'];expected_sense={**{k:v for k,v in s.items() if k!='Equivalent'},**({'Equivalent':es} if es else {})}
    ex=[{'type':html.unescape(val(x,'type')),'texts':[html.unescape(t) for t in vals(x,'example')]} for x in arr(s.get('SenseExample'))]
    count=sum(len(x['texts']) for x in ex);stats['exampleTexts']+=count;stats['sensesWithExamples']+=bool(count)
    if r['examplesCount']!=count:errors.append(['examplesCountChanged',rid])
    a=[html.unescape(x) for x in vals(s,'annotation')];stats['senseAnnotations']+=len(a)
    if r['annotations']!=a or r['entryAnnotations']!=ea:errors.append(['annotationsChanged',rid])
    if r['pronunciations']!=expected_pron:errors.append(['pronunciationChanged',rid])
    if r['partOfSpeechKo']!=(val(e,'partOfSpeech') or None):errors.append(['sourcePosChanged',rid])
    stats['sensesWithRelations']+=bool(s.get('SenseRelation'))
    db.execute('INSERT INTO sen VALUES (?,?)',(rid,ser({'sourceSense':expected_sense,'examples':ex,'senseRelations':s.get('SenseRelation',[])})))
  del payload
  db.commit()
for p in D.glob('details-*.json'):
 for entry in json.load(open(p))['entries'].values():
  e=entry['sourceEntry'];head=html.unescape(val(e.get('Lemma'),'writtenForm'));eid=str(e['val']);rid=ident(eid,'',head)
  expected=db.execute('SELECT data FROM ent WHERE id=?',(rid,)).fetchone()
  if not expected or ser(e)!=expected[0]:errors.append(['sourceEntryChanged',rid])
  for sid,s in entry['senses'].items():
   rid=ident(eid,sid,head);expected=db.execute('SELECT data FROM sen WHERE id=?',(rid,)).fetchone()
   if not expected or ser(s)!=expected[0]:errors.append(['sourceSenseOrExamplesRelationsChanged',rid])
   seen_details.add(rid)
regressions={("ma'am",'어머니'):True,('am','어머니'):False,('house','작은댁'):False,('house','작은집'):False,('quot','나무아미타불'):False,('appeal','공소'):False,("mistress' house",'작은댁'):True};observed={x:False for x in regressions}
for p in D.glob('english-*.json'):
 for key,rs in json.load(open(p))['words'].items():
  for r in rs:
   stats['reverseOccurrences']+=1;rid=identity(r);core=db.execute('SELECT data FROM core WHERE id=?',(rid,)).fetchone();core=un(core[0]) if core else {}
   for f in ['id','definitionKo','englishExpression','englishDescription','annotations','entryAnnotations','pronunciations','examplesCount','detailsRef']:
    if r.get(f)!=core.get(f):errors.append(['reverseCoreMismatch',key,rid,f])
   if any(re.search(r'&(?:quot|apos|amp|lt|gt);',str(r.get(f,''))) for f in ['englishExpression','englishDescription']):errors.append(['unexpandedEntity',key,rid])
   for original in r['matchedEnglishExpressions']:
    atomic=re.fullmatch(r"(?:[#*]\s*)?([a-z0-9]+(?:[-'][a-z0-9]+)*'?)[.!?]?",original,re.I)
    normalized=atomic[1].lower() if atomic else original.lower()
    if normalized!=key:errors.append(['reverseExpressionMismatch',key,rid,original])
   if (key,r['headword']) in observed:observed[(key,r['headword'])]=True
for pair,expected in regressions.items():
 if observed[pair]!=expected:errors.append(['regression',*pair])
oldcount=db.execute('SELECT COUNT(*) FROM old').fetchone()[0];corecount=db.execute('SELECT COUNT(*) FROM core').fetchone()[0]
if oldcount!=corecount or len(seen_details)!=corecount:errors.append(['counts',oldcount,corecount,len(seen_details)])
report={'counts':dict(stats),'oldCoreSenses':oldcount,'newCoreSenses':corecount,'detailSenses':len(seen_details),'errors':errors,'errorCount':len(errors),'scope':'All source entries and senses compared with serialized detail source objects; Korean core meanings retain old source fields. Other-language equivalents intentionally remain in unchanged raw archive.'}
(O/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));db.close();raise SystemExit(bool(errors))
