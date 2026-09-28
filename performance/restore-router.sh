#!/bin/sh
/etc/init.d/sqm stop
/etc/init.d/sqm disable
for s in perf_wan perf_wifi; do uci -q delete sqm.$s; done
uci commit sqm
uci -q delete mwan3.perf_download
uci -q delete mwan3.perf_wifi
uci commit mwan3
uci set firewall.@defaults[0].flow_offloading='1'
uci set firewall.@defaults[0].flow_offloading_hw='1'
uci commit firewall
/etc/init.d/firewall reload
/etc/init.d/mwan3 reload
rm -f /tmp/perf-sqm-armed
echo restored > /tmp/perf-sqm-restored
