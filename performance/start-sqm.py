import sys, pathlib
sys.path.insert(0,'stage')
from ssh_helpers import connect_router,run,put
c=connect_router()
put(c,'/tmp/perf-restore.sh',pathlib.Path('performance/restore-router.sh').read_bytes(),'755')
watch='''#!/bin/sh
trap '' HUP
sleep 15
n=0
while [ -f /tmp/perf-sqm-armed ]; do
 mem=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
 n=$((n+1))
 if [ "$mem" -lt 2500 ] || [ "$n" -gt 30 ]; then
  echo "Automatic rollback: memory=$mem iteration=$n" > /tmp/perf-rollback-reason
  /tmp/perf-restore.sh
  exit
 fi
 sleep 5
done
'''
put(c,'/tmp/perf-watch.sh',watch,'755')
run(c,"uci -q delete mwan3.perf_download; uci -q delete mwan3.perf_wifi; uci commit mwan3; /etc/init.d/mwan3 reload")
run(c,"touch /tmp/perf-sqm-armed; rm -f /tmp/perf-sqm-restored /tmp/perf-rollback-reason; (/tmp/perf-watch.sh) </dev/null >/tmp/perf-watch.log 2>&1 &")
run(c,"uci set firewall.@defaults[0].flow_offloading='0'; uci set firewall.@defaults[0].flow_offloading_hw='0'; uci commit firewall; /etc/init.d/firewall reload")
for section,iface in [('perf_wan','pppoe-wan'),('perf_wifi','phy1-sta0')]:
    opts={'enabled':'1','interface':iface,'download':'55000','upload':'0','qdisc':'cake','script':'piece_of_cake.qos','qdisc_advanced':'1','qdisc_really_really_advanced':'1','iqdisc_opts':'nat dual-dsthost ingress memlimit 1mb','ingress_ecn':'ECN','linklayer':'ethernet','overhead':'44' if section=='perf_wan' else '38','verbosity':'5','debug_logging':'0'}
    run(c,'uci set sqm.'+section+'=queue')
    for key,val in opts.items():run(c,"uci set sqm."+section+'.'+key+"='"+val+"'")
run(c,'uci commit sqm; /etc/init.d/sqm start')
print(run(c,'tc qdisc show; cat /proc/meminfo | head -3'))
c.close()
