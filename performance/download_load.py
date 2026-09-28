"""Bounded HTTPS load through the physical Ethernet adapter; payload discarded."""
import concurrent.futures, http.client, json, pathlib, socket, ssl, struct, subprocess, sys, time, urllib.parse, urllib.request, threading, random
LABEL=sys.argv[1]; DURATION=int(sys.argv[2]); RATE=float(sys.argv[3]) if len(sys.argv)>3 else 0
STREAMS=int(sys.argv[4]) if len(sys.argv)>4 else 4
END=time.monotonic()+DURATION; START=time.monotonic(); cache={}; lock=threading.Lock()
counts=[0]*STREAMS; throughput_samples=[{'time':START,'bytes':0}]; finished=threading.Event()
def monitor():
    while not finished.wait(1):throughput_samples.append({'time':time.monotonic(),'bytes':sum(counts)})
def resolve(host):
    with lock:
        if host in cache:return cache[host]
        # DNS explicitly queried through the dorm router, avoiding proxy fake-IP responses.
        qid=12345; q=struct.pack('!HHHHHH',qid,0x100,1,0,0,0)+b''.join(bytes([len(x)])+x.encode() for x in host.split('.'))+b'\0'+struct.pack('!HH',1,1)
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.settimeout(4);s.sendto(q,('192.168.1.1',53));data=s.recv(4096);s.close()
        def skip(p):
            while data[p]:
                if data[p]&192==192:return p+2
                p+=data[p]+1
            return p+1
        p=skip(12)+4
        for _ in range(struct.unpack('!H',data[6:8])[0]):
            p=skip(p); typ,cl,ttl,n=struct.unpack('!HHIH',data[p:p+10]);p+=10
            if typ==1 and n==4:cache[host]=socket.inet_ntoa(data[p:p+4]);return cache[host]
            p+=n
        raise RuntimeError('No IPv4 answer for '+host)
class DirectHTTPS(http.client.HTTPSConnection):
    def connect(self):
        s=socket.socket();s.settimeout(5);s.setsockopt(socket.IPPROTO_IP,31,socket.htonl(13))
        for _ in range(20):
            try:s.bind(('192.168.1.212',random.randrange(45000,46000)));break
            except OSError:continue
        s.connect((resolve(self.host),self.port));self.sock=self._context.wrap_socket(s,server_hostname=self.host)
class Handler(urllib.request.HTTPSHandler):
    def https_open(self,req):return self.do_open(DirectHTTPS,req,context=ssl.create_default_context())
def worker(i):
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}),Handler());total=0;errors=[]
    while time.monotonic()<END:
        try:
            with op.open('https://dldir1.qq.com/weixin/Windows/WeChatSetup.exe',timeout=5) as r:
                if r.status!=200:raise RuntimeError('Unexpected status '+str(r.status))
                while time.monotonic()<END:
                    b=r.read(32768)
                    if not b:break
                    total+=len(b)
                    counts[i]=total
                    if RATE:
                        delay=total/RATE-(time.monotonic()-START)
                        if delay>0:time.sleep(min(delay,max(0,END-time.monotonic())))
        except Exception as e:
            errors.append(str(e))
            if len(errors)>=3:break
    return {'bytes':total,'errors':errors}
monitor_thread=threading.Thread(target=monitor);monitor_thread.start()
with concurrent.futures.ThreadPoolExecutor(max_workers=STREAMS) as ex:results=list(ex.map(worker,range(STREAMS)))
finished.set();monitor_thread.join()
out={'label':LABEL,'duration':time.monotonic()-START,'streams':results,'dns':cache}
out['mbps']=sum(r['bytes'] for r in results)*8/out['duration']/1e6
out['throughput_samples']=throughput_samples
out['peak_5s_mbps']=max(((b['bytes']-a['bytes'])*8/(b['time']-a['time'])/1e6 for a,b in zip(throughput_samples,throughput_samples[5:])),default=0)
pathlib.Path('performance/results').mkdir(parents=True,exist_ok=True)
pathlib.Path('performance/results',LABEL+'-download.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
