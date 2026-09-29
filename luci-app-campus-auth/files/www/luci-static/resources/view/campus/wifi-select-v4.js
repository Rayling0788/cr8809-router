'use strict';
'require form';
'require rpc';
'require view';
'require poll';

var scanWifi = rpc.declare({
	object: 'iwinfo',
	method: 'scan',
	params: [ 'device' ],
	expect: { results: [] },
	reject: true,
	nobatch: true
});

var connectWifi = rpc.declare({
	object: 'campus-wifi',
	method: 'connect',
	reject: true,
	params: [ 'ssid', 'radio', 'security', 'key' ]
});

function securityFor(ap) {
	var enc = ap.encryption || { };
	if (enc.enabled === false || Object.keys(enc).length === 0)
		return { value: 'none', label: _('开放网络'), needsKey: false };

	var raw = JSON.stringify(enc).toLowerCase();
	if (/802.?1x|eap/.test(raw))
		return { value: 'unsupported', label: _('企业认证（暂不支持）'), needsKey: false };

	if (/sae/.test(raw)) {
		var mixed = /psk/.test(raw);
		return {
			value: mixed ? 'sae-mixed' : 'sae',
			label: mixed ? 'WPA2/WPA3' : 'WPA3-SAE',
			needsKey: true
		};
	}

	if (/psk/.test(raw)) {
		var versions = Array.isArray(enc.wpa) ? enc.wpa.map(String) : [ String(enc.wpa || '') ];
		var hasWpa = versions.indexOf('1') >= 0;
		var hasWpa2 = versions.indexOf('2') >= 0;
		var mode = hasWpa && hasWpa2 ? 'psk-mixed' : (hasWpa && !hasWpa2 ? 'psk' : 'psk2');
		return { value: mode, label: mode == 'psk' ? 'WPA-PSK' : (mode == 'psk2' ? 'WPA2-PSK' : 'WPA/WPA2-PSK'), needsKey: true };
	}

	return { value: 'unsupported', label: _('加密方式暂不支持'), needsKey: false };
}

var getWifiStatus = rpc.declare({ object: 'campus-wifi', method: 'status', reject: true, nobatch: true });

return view.extend({
	render: function() {
		var m = new form.Map('campus', _('Wi-Fi 选择与校园认证'), _('分别选择两个频段的上行 Wi-Fi。两条 Wi-Fi 同时启用时，加上有线即为三路上网。'));
		var s = m.section(form.NamedSection, 'main', 'campus', _('连接设置'));
		s.addremove = false;
		var o = s.option(form.Flag, 'enabled', _('自动认证服务'));
		o.default = '1'; o.rmempty = false;
		o = s.option(form.ListValue, 'wifi_count', _('启用的 Wi-Fi 数量'), _('选择 2 即可同时使用两个频段，与有线组成三路。更改此项后点击页面底部“保存并应用”。'));
		o.value('0', _('0 条（仅有线）'));
		o.value('1', _('1 条 Wi-Fi + 有线'));
		o.value('2', _('2 条 Wi-Fi + 有线（三路）'));
		o.default = '2'; o.rmempty = false;
		o = s.option(form.ListValue, 'single_wifi', _('只启用一条时选择'));
		o.value('wwan2', '5 GHz'); o.value('wwan3', '2.4 GHz');
		o.default = 'wwan2'; o.depends('wifi_count', '1');

		var cards = [], busy = false, latest = {};
		function updateControls() { cards.forEach(function(card) { card.updateControls(); }); }
		async function refreshStatus() {
			try {
				latest = await getWifiStatus();
				cards.forEach(function(card) { card.showStatus(latest[card.band]); });
			} catch (e) {
				cards.forEach(function(card) { card.current.textContent = _('状态读取失败，请稍后刷新。'); });
			}
		}
		function makeCard(band, title, device) {
			var items = [], selected = null;
			var badge = E('span', { 'style': 'font-size:14px;margin-left:10px' }, _('读取中'));
			var current = E('div', { 'role': 'status', 'style': 'padding:12px;background:rgba(128,128,128,.08);border-radius:6px;margin-bottom:12px' }, _('正在读取当前连接…'));
			var scan = E('button', { 'type': 'button', 'class': 'cbi-button' }, _('扫描 ') + title);
			var list = E('select', { 'aria-label': title + ' 附近的 Wi-Fi', 'size': '6', 'style': 'width:100%;height:150px;margin:12px 0' });
			var key = E('input', { 'aria-label': title + ' Wi-Fi 密码', 'type': 'password', 'autocomplete': 'new-password', 'maxlength': '64', 'style': 'width:100%;max-width:28em' });
			var details = E('p', {}, _('请先扫描并选择热点。'));
			var connect = E('button', { 'type': 'button', 'class': 'cbi-button cbi-button-action' }, _('连接 ') + title + _(' 所选 Wi-Fi'));
			var message = E('p', { 'role': 'status', 'style': 'margin-top:10px' }, '');
			function update() {
				var next = items[parseInt(list.value, 10)] || null;
				if (next !== selected) key.value = '';
				selected = next;
				scan.disabled = busy;
				list.disabled = busy || !items.length;
				key.disabled = busy || !selected || !selected.security.needsKey;
				connect.disabled = busy || !selected || selected.security.value == 'unsupported';
				details.textContent = !selected ? _('请先扫描并选择热点。') : selected.security.value == 'unsupported' ? _('此热点的认证方式暂不支持。') : selected.security.needsKey ? _('加密方式：') + selected.security.label : _('开放网络，无需 Wi-Fi 密码。');
			}
			list.appendChild(E('option', { 'value': '' }, _('尚未扫描')));
			list.addEventListener('change', update);
			scan.addEventListener('click', async function() {
				if (busy) return;
				busy = true; updateControls(); message.textContent = _('正在扫描…');
				try {
					var result = await scanWifi(device);
					items = (Array.isArray(result) ? result : []).filter(function(ap) { return ap && ap.ssid; }).map(function(ap) {
						return { ssid: String(ap.ssid), signal: ap.signal, security: securityFor(ap) };
					}).sort(function(a, b) { return (Number(b.signal) || -200) - (Number(a.signal) || -200); });
					items = items.filter(function(item, index, all) { return all.findIndex(function(other) { return other.ssid == item.ssid && other.security.value == item.security.value; }) == index; });
					list.replaceChildren();
					items.forEach(function(item, index) {
						list.appendChild(E('option', { 'value': String(index) }, item.ssid + ' · ' + item.security.label + (item.signal != null ? ' · ' + item.signal + ' dBm' : '')));
					});
					var existing = latest[band] || {};
					var index = items.findIndex(function(item) { return item.ssid == (existing.ssid || existing.configured_ssid); });
					if (items.length) list.value = String(index >= 0 ? index : 0);
					else list.appendChild(E('option', { 'value': '' }, _('未发现热点，请重新扫描')));
					message.textContent = _('扫描完成：') + items.length + _(' 个可见热点。');
				} catch (e) { message.textContent = _('扫描失败：') + (e.message || String(e)); }
				finally { busy = false; updateControls(); }
			});
			connect.addEventListener('click', async function() {
				if (busy || !selected || selected.security.value == 'unsupported') return;
				if (selected.security.needsKey && !key.value) { message.textContent = _('请输入 Wi-Fi 密码。'); key.focus(); return; }
				busy = true; updateControls(); message.textContent = _('正在连接，无线网络可能短暂重连…');
				try {
					var result = await connectWifi(selected.ssid, band, selected.security.value, key.value);
					if (!result || result.success !== true) { message.textContent = result && result.message || _('连接设置失败。'); return; }
					key.value = '';
					await refreshStatus();
					message.textContent = _('设置已保存。请查看上方实际连接状态；校园网认证可能需要稍等。');
				} catch (e) { message.textContent = _('未收到路由器确认，请查看上方连接状态后再决定是否重试。'); }
				finally { busy = false; updateControls(); }
			});
			var card = {
				band: band, current: current, updateControls: update,
				showStatus: function(state) {
					if (!state) { current.textContent = _('暂无连接状态'); return; }
					badge.textContent = state.enabled ? _('启用') : _('未启用');
					badge.style.color = state.enabled ? '#26823e' : '#777';
					connect.textContent = state.enabled ? _('连接 ') + title + _(' 所选 Wi-Fi') : _('保存 ') + title + _(' 所选 Wi-Fi（未启用）');
					current.replaceChildren(
						E('strong', {}, state.connected ? _('当前连接：') + state.ssid : _('当前连接：未连接')),
						E('div', { 'style': 'margin-top:6px' }, _('已保存的 Wi-Fi：') + (state.configured_ssid || _('未设置'))),
						E('div', {}, _('IP 地址：') + (state.connected && state.ipv4 ? state.ipv4 : _('暂无')))
					);
				}
			};
			cards.push(card); update();
			return E('section', { 'aria-label': title + ' 上行 Wi-Fi', 'style': 'min-width:0;border:1px solid #aaa5;border-radius:8px;padding:16px' }, [
				E('h3', {}, [title + _(' 上行 Wi-Fi'), badge]), current, scan, list,
				E('label', {}, [ title + _(' Wi-Fi 密码'), E('br'), key ]), details, connect, message
			]);
		}
		o = s.option(form.DummyValue, '_wifi_picker', _('分别选择 Wi-Fi'));
		o.renderWidget = function() {
			cards = [];
			return E('div', {}, [
				E('p', {}, _('热点选择只更改本频段配置；启用几路、启用哪个频段仍由上方设置控制。未启用的频段可以先保存热点。状态每 5 秒更新；连接成功不代表校园认证已通过。')),
				E('div', { 'style': 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px' }, [ makeCard('2g', '2.4 GHz', 'phy0-ap0'), makeCard('5g', '5 GHz', 'phy1-ap0') ])
			]);
		};
		o = s.option(form.ListValue, 'policy', _('默认分流策略'));
		o.value('balanced', _('均衡：三路等权'));
		o.value('wan_priority', _('有线优先：有线权重 3'));
		o.value('wifi_priority', _('Wi-Fi 优先：两条 Wi-Fi 权重 2'));
		o.default = 'balanced'; o.rmempty = false;
		o = s.option(form.Value, 'check_interval', _('自动检查间隔（秒）'));
		o.datatype = 'uinteger'; o.default = '60'; o.rmempty = false;
		return m.render().then(function(node) { poll.add(refreshStatus, 5); refreshStatus(); return node; });
	}
});
