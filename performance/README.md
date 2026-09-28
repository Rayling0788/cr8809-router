# Traffic-shaping comparison

Baseline checkpoint: `cebda71`. All tests use the existing network, with background traffic present.
No desktop proxy or DNS setting is changed. Router credentials are supplied through environment
variables to the pre-existing local SSH helper; credentials and raw backups are not tracked.

## Method

- Four concurrent HTTPS downloads of a public Tencent installer, discarded in memory and never executed.
- Test sockets bind the physical Windows Ethernet interface, query DNS through the router, and use source ports 45000–45999.
- Each download runs approximately 35 seconds; router CPU/traffic/memory is sampled every five seconds for 40 seconds.
- Each WAN sends 40 ICMP probes to the user's cloud server. These are latency proxies, not measurements inside a game.
- Baseline: original weighted multi-WAN routing and acceleration.
- Lightweight: only the test download ports route through Wi-Fi, with an application-side cap of 1,500,000 bytes/s per stream (48 Mbps total). This is not a global BT/Quark limiter.
- SQM: original weighted routing; both software/hardware flow-offload settings disabled; CAKE ingress at 55 Mbps on each uplink, NAT-aware destination host fairness, 1 MiB maximum queue memory per interface. Upload shaping disabled because upload capacity has not been measured.
- SQM has a temporary memory/timeout rollback watchdog. Its use is tracked in the deployment notes.

These trials compare practical configurations, not identical-rate queue algorithms. CDN endpoint,
background downloads, connection distribution and Wi-Fi airtime vary between runs. A few dozen
samples cannot establish long-term reliability or a universal performance ceiling. Upload congestion
from BT seeding is not covered by a download-only trial.

`restore-router.sh` removes only experiment configuration, stops SQM, and restores the two offload
flags to their verified pre-test values. It does not restore unrelated settings from a redacted snapshot.
