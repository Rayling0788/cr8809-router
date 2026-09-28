'use strict';
'require view';
'require rpc';
'require poll';

var snapshot = rpc.declare({object: 'campus-dashboard', method: 'snapshot'});
var names = {wan: '有线 WAN', wwan2: '校园 Wi-Fi · 5 GHz', wwan3: '校园 Wi-Fi · 2.4 GHz'};
var colors = {wan: '#2563eb', wwan2: '#059669', wwan3: '#d97706'};
var policies = {balanced: '均衡分流', wan_priority: '有线优先', wifi_priority: 'Wi-Fi 优先'};

function rate(prev, curr, dt, sameBoot) {
  if (!prev || !sameBoot || dt <= 0 || dt > 20 || !prev.valid || !curr.valid ||
      !prev.up || !curr.up || prev.device !== curr.device ||
      Number(curr.uptime) < Number(prev.uptime) ||
      Number(curr.rx) < Number(prev.rx) || Number(curr.tx) < Number(prev.tx)) return null;
  return {rx: (Number(curr.rx) - Number(prev.rx)) * 8 / dt / 1e6,
    tx: (Number(curr.tx) - Number(prev.tx)) * 8 / dt / 1e6};
}
function bytes(n) {
  n = Number(n);
  var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'], i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 2 : 0) + ' ' + units[i];
}
function svgNode(tag, attrs) {
  var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.keys(attrs).forEach(function(k) { n.setAttribute(k, attrs[k]); });
  return n;
}
function chart(samples, key) {
  var svg = svgNode('svg', {viewBox: '0 0 640 170', role: 'img', 'aria-label': key === 'rx' ? '下载速率曲线' : '上传速率曲线', style: 'width:100%;height:170px'});
  var max = 1;
  samples.forEach(function(s) { Object.keys(names).forEach(function(id) { if (s[id]) max = Math.max(max, s[id][key]); }); });
  max = Math.ceil(max * 1.15);
  [0, 0.5, 1].forEach(function(f) {
    var y = 140 - f * 125;
    svg.appendChild(svgNode('line', {x1: 48, x2: 630, y1: y, y2: y, stroke: '#d8dee8'}));
    var label = svgNode('text', {x: 2, y: y + 4, fill: '#64748b', 'font-size': 11});
    label.textContent = (max * f).toFixed(1); svg.appendChild(label);
  });
  var end = samples.length ? samples[samples.length - 1].tick : 0;
  Object.keys(names).forEach(function(id) {
    var path = '', connected = false;
    samples.forEach(function(s) {
      if (!s[id]) { connected = false; return; }
      var x = 48 + Math.max(0, 1 - (end - s.tick) / 300) * 582;
      var y = 140 - s[id][key] / max * 125;
      path += (connected ? ' L ' : ' M ') + x.toFixed(1) + ' ' + y.toFixed(1); connected = true;
    });
    svg.appendChild(svgNode('path', {d: path, stroke: colors[id], fill: 'none', 'stroke-width': 2.5}));
  });
  var caption = svgNode('text', {x: 48, y: 164, fill: '#64748b', 'font-size': 11});
  caption.textContent = '最近 5 分钟 · Mbps'; svg.appendChild(caption);
  return svg;
}
return view.extend({
  load: function() { return snapshot(); },
  render: function(initial) {
    var previous = null, samples = [], root = E('div', {'class': 'campus-dash'});
    var cards = E('div', {'class': 'campus-cards'}), charts = E('div', {'class': 'campus-charts'});
    var summary = E('div', {'class': 'campus-summary'}), notice = E('p', {'role': 'status'});
    root.appendChild(E('style', {}, '.campus-cards,.campus-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.campus-card{background:var(--background-color,#fff);border:1px solid #cbd5e1;border-top:4px solid;padding:18px;border-radius:12px}.campus-card h3{margin:0 0 10px}.campus-rate{font-size:25px;font-weight:700;margin:16px 0 8px}.campus-muted{color:#64748b;font-size:13px}.campus-summary{padding:18px 0;font-size:17px}.campus-chart{border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin-top:16px}.campus-badge{display:inline-block;padding:3px 9px;border-radius:20px;background:#e2e8f0;color:#334155}.campus-legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:16px}'));
    root.appendChild(E('h2', {}, '多线路流量看板'));
    root.appendChild(E('p', {'class': 'campus-muted'}, '每 5 秒更新，速率来自各上行接口的字节计数；曲线从打开页面开始记录。'));
    root.appendChild(notice); root.appendChild(summary); root.appendChild(cards); root.appendChild(charts);
    root.appendChild(E('div', {'class': 'campus-legend'}, Object.keys(names).map(function(id) { return E('span', {style: 'color:' + colors[id]}, '● ' + names[id]); })));
    root.appendChild(E('p', {'class': 'campus-muted'}, '累计流量自对应接口建立或计数重置起统计，含协议开销；不是今日流量。线路探测正常不等同于校园网门户已登录。'));
    root.appendChild(E('a', {href: L.url('admin/network/campus-auth')}, '调整校园 Wi-Fi 数量与分流策略 →'));
    function update(data) {
      if (!data || !Array.isArray(data.lines)) throw new Error('数据格式异常');
      var dt = previous ? Number(data.tick) - Number(previous.tick) : 0;
      var sameBoot = previous && previous.boot_id === data.boot_id;
      if (previous && !sameBoot) samples = [];
      var sample = {tick: Number(data.tick)}, totalRx = 0, totalTx = 0, ready = false;
      cards.replaceChildren();
      data.lines.forEach(function(line) {
        var prev = previous && previous.lines.find(function(p) { return p.id === line.id; });
        var r = rate(prev, line, dt, sameBoot); sample[line.id] = r;
        if (r) { totalRx += r.rx; totalTx += r.tx; ready = true; }
        var status = !line.enabled ? '已停用' : !line.up ? '未连接' : line.tracking === 'online' ? '探测正常' : line.tracking === 'offline' ? '探测未通过' : '接口已连接';
        cards.appendChild(E('section', {'class': 'campus-card', style: 'border-top-color:' + colors[line.id]}, [
          E('h3', {}, names[line.id]), E('span', {'class': 'campus-badge'}, status),
          E('div', {'class': 'campus-rate'}, r ? '↓ ' + r.rx.toFixed(2) + ' Mbps' : '↓ —'),
          E('div', {}, r ? '↑ ' + r.tx.toFixed(2) + ' Mbps' : '↑ —'),
          E('p', {'class': 'campus-muted'}, '下载累计 ' + (line.valid ? bytes(line.rx) : '—') + ' / 上传累计 ' + (line.valid ? bytes(line.tx) : '—')),
          E('div', {'class': 'campus-muted'}, (line.address || '暂无地址') + ' · ' + (line.device || '接口未启动'))
        ]));
      });
      samples.push(sample); samples = samples.filter(function(s) { return sample.tick - s.tick <= 300; }).slice(-65);
      var policy = data.policy || data.requested_policy;
      summary.textContent = (policies[policy] || policy || '策略未知') + ' · 总下载 ' + (ready ? totalRx.toFixed(2) + ' Mbps' : '采样中…') + ' · 总上传 ' + (ready ? totalTx.toFixed(2) + ' Mbps' : '采样中…');
      charts.replaceChildren(E('div', {'class': 'campus-chart'}, [E('h3', {}, '下载速率'), chart(samples, 'rx')]), E('div', {'class': 'campus-chart'}, [E('h3', {}, '上传速率'), chart(samples, 'tx')]));
      notice.textContent = '已更新 ' + new Date().toLocaleTimeString(); notice.style.color = '#64748b'; previous = data;
    }
    update(initial);
    poll.add(function() { return snapshot().then(update).catch(function() { notice.textContent = '暂时无法读取路由器，以上为上次数据；正在重试…'; notice.style.color = '#b45309'; previous = null; }); }, 5);
    return root;
  },
  handleSaveApply: null,
  handleSave: null,
  handleReset: null
});
