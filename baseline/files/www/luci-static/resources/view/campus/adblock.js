'use strict';
'require view';
'require rpc';
'require ui';

var getStatus = rpc.declare({object:'adblock-small', method:'status'});
var applySettings = rpc.declare({object:'adblock-small', method:'apply', params:['enabled','allowlist']});
return view.extend({
  load: function() { return getStatus(); },
  render: function(data) {
    var badge = E('p', {style:'font-size:20px;font-weight:bold'});
    var count = E('p');
    var enabled = E('input', {type:'checkbox', id:'adblock-enabled'});
    enabled.checked = data.enabled;
    var allow = E('textarea', {id:'adblock-allow', rows:8, maxlength:8192, style:'width:100%;box-sizing:border-box', placeholder:'例如：ads.example.com'});
    allow.value = data.allowlist || '';
    var message = E('p', {role:'status'});
    function show(d) {
      badge.textContent = d.enabled ? (d.loaded ? '● 去广告已启用' : '● 已配置，服务状态待检查') : '○ 去广告已关闭';
      badge.style.color = d.loaded ? '#059669' : '#64748b';
      count.textContent = '规则来源：AdAway · 原始 ' + d.total + ' 个域名 · 放行后 ' + d.filtered + ' 个拦截域名';
    }
    show(data);
    var save = E('button', {'class':'cbi-button cbi-button-apply', click:ui.createHandlerFn(this, function() {
      save.disabled = true; enabled.disabled = true; allow.disabled = true;
      message.textContent = '正在应用，DNS 服务会短暂重新加载…';
      return applySettings(enabled.checked, allow.value).then(function(r) {
        if (!r.ok) throw new Error(r.error || '应用失败');
        return getStatus();
      }).then(function(d) {
        show(d); enabled.checked = d.enabled; allow.value = d.allowlist || '';
        message.textContent = '已保存并生效。已缓存的解析结果可能需要等待到期或重新连接网络。';
      }).catch(function(e) { message.textContent = '未能确认应用结果：' + e.message + '。请刷新页面核对当前状态。';
      }).finally(function() { save.disabled = false; enabled.disabled = false; allow.disabled = false; });
    })}, '保存并应用');
    return E('div', {}, [
      E('h2', {}, '轻量去广告'),
      E('div', {style:'border:1px solid #cbd5e1;border-radius:12px;padding:18px;margin-bottom:20px'}, [badge, count,
        E('p', {}, '规则快照：2026-09-28 · 不自动更新 · 复用现有 DNS 服务'),
        E('p', {}, 'DNS 缓存上限：' + data.cache + ' 条，本页面不调整缓存和上游 DNS。')]),
      E('p', {}, [E('label', {for:'adblock-enabled'}, [enabled, ' 启用广告与追踪域名过滤'])]),
      E('h3', {}, '误拦域名放行'),
      E('label', {for:'adblock-allow'}, '每行一个完整域名，最多 100 个；不填写 https://、路径或通配符。仅放行完全匹配的域名。'),
      allow,
      E('p', {}, '网站或应用异常时，可先关闭过滤排查；确认误拦后，把对应域名加到这里，再重新开启。'),
      save, message,
      E('p', {style:'color:#64748b'}, '此轻量版本不记录查询日志，也不统计拦截次数。使用代理或自带加密 DNS 的设备可能绕过过滤；不保证去除同域视频广告。')
    ]);
  },
  handleSaveApply:null, handleSave:null, handleReset:null
});
