import os, subprocess, sys, time
label=sys.argv[1];rate=sys.argv[2] if len(sys.argv)>2 else '0'
streams=sys.argv[3] if len(sys.argv)>3 else '4'
env=dict(os.environ,PYTHONIOENCODING='utf-8')
p=subprocess.Popen([sys.executable,'performance/measure.py',label,'40'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
time.sleep(2)
load=subprocess.run([sys.executable,'performance/download_load.py',label,'35',rate,streams],capture_output=True,text=True,env=env,timeout=55)
out,err=p.communicate(timeout=55)
print(load.stdout)
print(out.decode())
if load.returncode or p.returncode:
    print(load.stderr);print(err.decode());sys.exit(1)
