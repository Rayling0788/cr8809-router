#!/bin/sh
rm -f /tmp/perf-three-armed
uci set campus.main.wifi_count='1'
uci set campus.main.policy='wan_priority'
uci commit campus
uci set wireless.wwan3_radio0.disabled='1'
uci commit wireless
wifi reload radio0
sleep 5
/etc/init.d/firewall reload
/usr/bin/campus-auth apply
echo restored > /tmp/perf-three-restored
