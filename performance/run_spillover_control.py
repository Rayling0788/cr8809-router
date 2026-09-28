"""Matched two-wave reference test using the unchanged weighted policy."""
import subprocess,sys,time,os
env=dict(os.environ,PYTHONIOENCODING='utf-8');label='spillover-static-control'
processes=[]
try:
    processes.append(subprocess.Popen([sys.executable,'performance/measure.py',label,'50'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env))
    processes.append(subprocess.Popen([sys.executable,'performance/download_load.py',label+'-wave1','45','0','8'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env))
    time.sleep(23)
    processes.append(subprocess.Popen([sys.executable,'performance/download_load.py',label+'-wave2','23','0','8'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env))
    print('Both reference waves started',flush=True)
    for p in processes:
        out,err=p.communicate(timeout=65)
        if p.returncode:raise RuntimeError(err.decode(errors='replace'))
finally:
    for p in processes:
        if p.poll() is None:p.terminate();p.communicate(timeout=10)
print('Reference test complete',flush=True)
