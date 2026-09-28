#!/bin/sh
# TEMPORARY: only test-client TCP source ports; existing connections retain their marks.
trap '' HUP
IPT=iptables
CHAIN=perf_spillover
cleanup() {
 $IPT -w 3 -t mangle -D mwan3_rules -s 192.168.1.212 -p tcp --sport 45000:45999 --dport 443 -m mark --mark 0/0x3f00 -j "$CHAIN" 2>/dev/null
 $IPT -w 3 -t mangle -F "$CHAIN" 2>/dev/null
 $IPT -w 3 -t mangle -X "$CHAIN" 2>/dev/null
 rm -f /tmp/perf-dynamic-active
}
trap cleanup EXIT INT TERM
$IPT -w 3 -t mangle -N "$CHAIN" || exit 1
$IPT -w 3 -t mangle -A "$CHAIN" -j MARK --set-xmark 0x100/0x3f00 || exit 1
$IPT -w 3 -t mangle -I mwan3_rules 1 -s 192.168.1.212 -p tcp --sport 45000:45999 --dport 443 -m mark --mark 0/0x3f00 -j "$CHAIN" || exit 1
touch /tmp/perf-dynamic-active
echo 'seconds,wan_rx_mbps,state,high_seconds,low_seconds'
old=$(cat /sys/class/net/pppoe-wan/statistics/rx_bytes)
state=wan; high=0; low=0; sec=0
while [ "$sec" -lt 110 ] && [ -f /tmp/perf-dynamic-active ]; do
 sleep 2
 now=$(cat /sys/class/net/pppoe-wan/statistics/rx_bytes) || exit 1
 sec=$((sec+2)); rate=$(((now-old)*8/2000000)); old=$now
 if [ "$rate" -ge 80 ]; then high=$((high+2)); else high=0; fi
 if [ "$rate" -lt 60 ]; then low=$((low+2)); else low=0; fi
 if [ "$state" = wan ] && [ "$high" -ge 10 ]; then
  $IPT -w 3 -t mangle -R "$CHAIN" 1 -j MARK --set-xmark 0x300/0x3f00 || exit 1
  state=wifi; high=0; low=0
 elif [ "$state" = wifi ] && [ "$low" -ge 30 ]; then
  $IPT -w 3 -t mangle -R "$CHAIN" 1 -j MARK --set-xmark 0x100/0x3f00 || exit 1
  state=wan; high=0; low=0
 fi
 echo "$sec,$rate,$state,$high,$low"
done
