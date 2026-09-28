"""Read-only router traffic, per-core load and latency sampling."""
import concurrent.futures, json, pathlib, re, sys, time, statistics, os
sys.path.insert(0, 'stage')
from ssh_helpers import connect_router, run
label = sys.argv[1]
seconds = int(sys.argv[2]) if len(sys.argv) > 2 else 35
devices=os.environ.get('PERF_DEVICES','pppoe-wan,phy1-sta0').split(',')
assert all(re.fullmatch(r'[A-Za-z0-9_.-]+',d) for d in devices)
def ping(dev):
    c = connect_router()
    s = run(c, f'ping -I {dev} -c {seconds} -W 2 8.163.113.0', False)
    c.close()
    values = [float(x) for x in re.findall(r'time=([\d.]+)', s)]
    return {'raw': s, 'received': len(values), 'sent': seconds,
      'mean_ms': round(statistics.mean(values), 2) if values else None,
      'p95_ms': sorted(values)[min(len(values)-1, int(len(values)*.95))] if values else None,
      'max_ms': max(values) if values else None}
def samples():
    c = connect_router(); arr=[]
    cmd="head -3 /proc/stat; grep MemAvailable /proc/meminfo; for d in "+' '.join(devices)+"; do for k in rx_bytes tx_bytes; do v=$(cat /sys/class/net/$d/statistics/$k 2>/dev/null); echo ${v:--1}; done; done"
    for i in range(seconds//5+1):
        stamp=time.monotonic(); s=run(c,cmd).splitlines()
        arr.append({'time':stamp,'cpu':[list(map(int,l.split()[1:9])) for l in s[:3]],'available_kib':int(s[3].split()[1]),'bytes':list(map(int,s[4:4+2*len(devices)]))})
        if i<seconds//5: time.sleep(5)
    q=run(c,'tc -s qdisc show 2>/dev/null; cat /proc/sys/net/netfilter/nf_conntrack_count; dmesg | grep -Ei "out of memory|oom-kill|page allocation failure" | tail -3',False)
    c.close(); return arr,q
with concurrent.futures.ThreadPoolExecutor() as ex:
    fs={d:ex.submit(ping,d) for d in devices}; sf=ex.submit(samples)
    latency={d:f.result() for d,f in fs.items()}; arr,q=sf.result()
intervals=[]
pathlib.Path('performance/results',label+'-raw-samples.json').write_text(json.dumps(arr,indent=2))
for a,b in zip(arr,arr[1:]):
    if len(a['bytes'])!=2*len(devices) or len(b['bytes'])!=2*len(devices) or any(i<0 or j<i for i,j in zip(a['bytes'],b['bytes'])):continue
    dt=b['time']-a['time']; loads=[]
    for x,y in zip(a['cpu'],b['cpu']):
        v=[j-i for i,j in zip(x,y)];loads.append(round(100*(sum(v)-v[3]-v[4])/sum(v),2))
    rates=[round((j-i)*8/dt/1e6,3) for i,j in zip(a['bytes'],b['bytes'])]
    intervals.append({'cpu_total_core0_core1':loads,'mbps_wan_rx_tx_wifi_rx_tx':rates[:4],'mbps_by_device':{d:{'rx':rates[2*i],'tx':rates[2*i+1]} for i,d in enumerate(devices)},'available_kib':b['available_kib']})
result={'label':label,'devices':devices,'latency':latency,'intervals':intervals,'qdiscs':q}
pathlib.Path('performance/results').mkdir(parents=True,exist_ok=True)
pathlib.Path('performance/results',label+'.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'label':label,'latency':{k:{a:b for a,b in v.items() if a!='raw'} for k,v in latency.items()},'intervals':intervals},indent=2))
