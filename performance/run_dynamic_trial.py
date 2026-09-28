import subprocess,sys,os,time,json,pathlib,re
from ssh_helpers import connect_router,run,put
label=sys.argv[1] if len(sys.argv)>1 else 'dynamic-spillover'
env=dict(os.environ,PYTHONIOENCODING='utf-8')
c=connect_router();put(c,'/tmp/perf-dynamic-test.sh',pathlib.Path('performance/dynamic-test.sh').read_bytes(),'755')
assert not run(c,'iptables -t mangle -S perf_spillover',False).strip()
run(c,"(/tmp/perf-dynamic-test.sh) </dev/null >/tmp/perf-dynamic.log 2>&1 &")
time.sleep(1)
assert run(c,'test -f /tmp/perf-dynamic-active && echo active').strip()=='active'
print('Dynamic trial active',flush=True)
proc=[];snapshots=[];start=time.monotonic()
try:
    measure=subprocess.Popen([sys.executable,'performance/measure.py',label,'85'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env);proc.append(measure)
    first=subprocess.Popen([sys.executable,'performance/download_load.py',label+'-wave1','45','0','8'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env);proc.append(first)
    second=None
    while time.monotonic()-start<83:
        elapsed=time.monotonic()-start
        if elapsed>=23 and second is None:
            second=subprocess.Popen([sys.executable,'performance/download_load.py',label+'-wave2','23','0','8'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env);proc.append(second)
            print('Second wave of new connections started',flush=True)
        if int(elapsed)//10>=len(snapshots):
            raw=run(c,'cat /proc/net/nf_conntrack')
            lines=[]
            for l in raw.splitlines():
                m=re.search(r'src=192\.168\.1\.212 dst=[\d.]+ sport=(\d+) dport=443',l)
                if m and 45000<=int(m[1])<46000:lines.append(l)
            log=run(c,'tail -2 /tmp/perf-dynamic.log')
            snapshots.append({'seconds':round(elapsed,1),'connections':lines,'controller':log})
            print(round(elapsed,1),log.strip().splitlines()[-1],flush=True)
        time.sleep(1)
    for p in proc:
        out,err=p.communicate(timeout=15)
        if p.returncode:raise RuntimeError(err.decode(errors='replace'))
finally:
    for p in proc:
        if p.poll() is None:p.terminate();p.communicate(timeout=10)
    run(c,'rm -f /tmp/perf-dynamic-active')
    time.sleep(3)
    log=run(c,'cat /tmp/perf-dynamic.log')
    cleanup=run(c,'iptables -t mangle -S perf_spillover',False)
    pathlib.Path('performance/results',label+'-controller.json').write_text(json.dumps({'log':log,'snapshots':snapshots,'cleanup_output':cleanup},indent=2))
    c.close()
    assert not cleanup.strip(), 'Temporary chain still present'
print('Dynamic test completed and temporary rules removed',flush=True)
