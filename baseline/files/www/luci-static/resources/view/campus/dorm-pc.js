'use strict';
'require view';
'require rpc';
'require ui';
var status = rpc.declare({object:'dorm-pc',method:'status',expect:{}});
var wake = rpc.declare({object:'dorm-pc',method:'wake',expect:{}});
return view.extend({
 load:function(){return status();},
 render:function(s){
  var msg=E('p',{},s.online?'电脑有响应':'电脑暂未响应（关机或防火墙均可能导致）');
  var btn=E('button',{'class':'cbi-button cbi-button-apply',click:function(){
   btn.disabled=true;
   return wake().then(function(r){msg.textContent=r.ok?'已发送开机信号，请等待约一分钟后刷新状态。是否启动成功取决于电脑电源和主板设置。':'发送失败';}).catch(function(e){msg.textContent=e.message;}).finally(function(){btn.disabled=false;});
  }},'唤醒宿舍电脑');
  return E('div',{},[E('h2',{},'远程开机与取文件'),E('p',{},'电脑：RAYLING · 192.168.1.212 · 保持网线和电源连接'),msg,btn,
   E('button',{'class':'cbi-button',style:'margin-left:12px',click:function(){return status().then(function(r){msg.textContent=r.online?'电脑有响应':'电脑暂未响应';});}},'刷新状态'),
   E('h3',{},'取文件'),E('p',{},'先连接 WireGuard，再唤醒电脑。文件共享完成配置后，Windows 文件资源管理器地址栏输入：'),
   E('pre',{},'\\\\192.168.1.212\\DormFiles'),E('p',{},'安卓在支持 SMB 的文件管理器中添加服务器 192.168.1.212，共享名 DormFiles，使用专用文件账户登录。')]);
 },handleSaveApply:null,handleSave:null,handleReset:null
});
