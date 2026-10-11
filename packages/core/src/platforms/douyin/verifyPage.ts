import type { RiskChallenge } from '../../contracts/error'

/**
 * 抖音手动滑块验证页的**渲染**（把 {@link RiskChallenge} 变成一张真人能打开拖动的 HTML）。
 *
 * **只中转不绕过。** 这张页只做一件事：把**官方 TTGCaptcha 滑块**渲染出来，交给**真人用
 * 鼠标拖**。它不含、也永远不会含任何验证码识别 / 缺口检测 / 轨迹模拟 / OCR / headless
 * 自动过验证的代码 —— 真人拖动是唯一的通过方式。这与 `anticrawler/solver.ts` 对滑块恒
 * 返回 `undefined`、`captcha.ts` 只提取不求解是同一条红线的延伸。
 *
 * ## 为什么要这个函数
 *
 * judge 判出 `kind: 'risk'` 后，`parseDouyinCaptcha` 把验证页地址与票据拼进
 * `error.challenge`（{@link RiskChallenge}：`url` / `jsSdkUrl` / `verifyData` / …）。但那是
 * 一份**数据** —— 真人没法「打开一个 JSON 对象」。此前调用方（HTTP 服务、机器人插件）只能
 * 自己拼一张页，各拼各的、还容易把 `verify_data` 拼错。这个纯函数把「数据 → 可拖的页」收敛
 * 成一处实现，库调用方 / express 路由 / web 控制台共用，与 amagi「一处实现、多入口共用」一致。
 *
 * ## 两种模式，按料齐全度自动选默认
 *
 * | 模式 | 用什么料 | 怎么渲染 |
 * | --- | --- | --- |
 * | **自建**（默认，料齐时） | `jsSdkUrl` + `verifyData` | 动态加载官方 SDK → `TTGCaptcha.init({ commonOptions, captchaOptions })` → `render({ verify_data })`，滑块进 `#root` |
 * | **托管**（兜底 / 料不齐时） | `url` | 直接在新标签打开（或 iframe 内嵌）`rmc.bytedance.com/verifycenter/captcha/v2?…` 托管验证页 |
 *
 * 响应头通道的 challenge **只有 `url`**（没有 `jsSdkUrl` / `verifyData`，见 `captcha.ts` 的
 * `challengeFrom`），所以那种 challenge 只能走托管模式；响应体中间页通道三样俱全，默认自建。
 * 页面加载时据此自动选默认模式，用户仍可手动切换。
 *
 * ## 中间页常量不在 `verify_data` 里
 *
 * `init` 的 `commonOptions`（`aid: 339757` / `iid` / `did`）与 `captchaOptions`
 * （`ele: 'root'` / `hideCloseBtn` / `showMode: 'mask'`）是**中间页的宿主常量**，不随会话变、
 * 也不在平台下发的 `verify_data` 里（见 `anticrawler/captcha.ts` 与 `transport.mdx`）。所以它们
 * **写死在本模块**（{@link DOUYIN_VERIFY_PAGE_COMMON_OPTIONS} / {@link DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS}），
 * 可经 {@link DouyinVerifyPageOptions} 覆盖。注意 `commonOptions.aid`（339757，宿主）与
 * `verifyData.aid`（平台下发、实测 0）是**两个不同的 aid**，别混。
 *
 * ## `successCb` 为什么改掉
 *
 * 官方中间页的 `successCb` 是 `location.reload()`（刷新后带新 cookie 重走）。本页不刷新 ——
 * 它要把「验证通过」这个事件**暴露给人与调用方**：切到 ✅ 状态、尽力读并展示 `document.cookie`、
 * 展示成功回调参数，并提示下一步「用**同一份 cookie 重发原请求**」。
 *
 * **闭环未实测，如实标注。** 「真人过完 → 同 cookie 重发 → 服务端放行」这一步仓库至今没有端到端
 * 实测（卡在拿不到登录态真挑战 + 自动化浏览器 `webdriver=true` 过不了滑块，见 `transport.mdx`）。
 * 本页只负责把滑块交给真人过；重发那一步由调用方做，放行按 `fp` 关联是**推断**不是实测结论。
 *
 * **自建模式的滑块跑在跨域 iframe 里。** 实渲确认：loader 的 `render` 对只带 `verify_data`
 * （无 `challenge_code`）的中间页走 `autoRender`，把真滑块画进一个指向 `rmc.bytedance.com` 的
 * **跨域 iframe** —— 真人在 iframe 内拖完，`captchaOptions.successCb` 只在 iframe 内触发，父页收不到。
 * 所以本页在自建模式下额外监听验证中心跨域桥的 `postMessage({type:'success'|'verify'})`，与注入的
 * `successCb` 两条路径取先到者（`onSuccess` 幂等），父页据此也能切 ✅。
 *
 * ## 安全
 *
 * challenge 的字段经 {@link toInlineJson} 注入页面的 `window.__DOUYIN_CHALLENGE__` 全局，`<` / `>` /
 * `&` 转义成 `\uXXXX`，不会被 `</script>` 截断、也不构成 HTML 注入。SDK 由页面脚本**动态注入**
 * （`createElement('script')`，`src = jsSdkUrl`），不写进 HTML 的 `src` 属性，避免属性注入。
 * 页面假设**无 CSP**（内联脚本 + 动态加载外部 SDK）—— 调用方若在自己的服务上设了 CSP，需要为它放宽。
 *
 * @module platforms/douyin/verifyPage
 */

/**
 * 中间页 `init` 的宿主 `commonOptions`：`aid` 是**中间页宿主常量 339757**（不是
 * `verifyData.aid`，那个实测是 0），`iid` / `did` 实测都是 `'0'`。出处是滑块中间页
 * （fixture `slider_captcha.html`）里的 `TTGCaptcha.init(options)`，不随会话变，所以写死于此。
 */
export const DOUYIN_VERIFY_PAGE_COMMON_OPTIONS: Record<string, unknown> = { aid: 339757, iid: '0', did: '0' }

/**
 * 中间页 `init` 的 `captchaOptions` 常量：滑块挂到 `#root`、隐藏关闭按钮、遮罩态展示。
 * 同样取自中间页、不随会话变。`successCb` **不在这里** —— 它由页面脚本按本模块的语义注入
 * （见模块注释「successCb 为什么改掉」）。
 */
export const DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS: Record<string, unknown> = { ele: 'root', hideCloseBtn: true, showMode: 'mask' }

/** {@link renderDouyinVerifyPage} 的可选项 */
export interface DouyinVerifyPageOptions {
  /** 页面标题（进 `<title>` 与 `<h1>`，默认「抖音滑块验证」）。会做 HTML 转义 */
  title?: string
  /** 覆盖中间页宿主 `commonOptions`（默认 {@link DOUYIN_VERIFY_PAGE_COMMON_OPTIONS}） */
  commonOptions?: Record<string, unknown>
  /** 覆盖 / 补充 `captchaOptions`（在 {@link DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS} 之上浅合并） */
  captchaOptions?: Record<string, unknown>
}

/** HTML 文本 / 属性转义表 */
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/**
 * 转义进 HTML 文本 / 属性的值（title 等调用方可控字段走它）。
 * @param value - 原始字符串
 * @returns 转义后的字符串
 */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)

/**
 * 把任意值序列化成可**安全内联进 `<script>`** 的 JSON 文本。
 *
 * `JSON.stringify` 的产物里 `<` / `>` / `&` 只可能出现在字符串值内，把它们转成 `\uXXXX`：
 * 浏览器 JSON 解析会原样还原，但 HTML 解析器再也看不到 `</script>` 这种闭合序列，于是
 * 既不会截断脚本、也不构成 HTML 注入。`U+2028` / `U+2029` 一并转义 —— 它们是合法 JSON
 * 却是非法 JS 行终止符，不转义会让内联脚本语法错。
 * @param value - 待内联的值（`undefined` 归一成 `null`）
 * @returns 可直接写进 `<script>` 的 JSON 文本
 */
const toInlineJson = (value: unknown): string =>
  JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

/** 页面样式（内联，无外部依赖） */
const PAGE_STYLES = `
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:#f2f3f5;color:#1d2129;line-height:1.6}
.wrap{max-width:640px;margin:0 auto;padding:16px 16px 48px}
h1{font-size:21px;text-align:center;margin:16px 0 4px}
.sub{text-align:center;color:#4e5969;font-size:13px;margin:0 0 18px}
.card{background:#fff;border:1px solid #e5e6eb;border-radius:10px;padding:14px 16px;margin-bottom:14px}
.modes label{display:inline-flex;align-items:center;gap:4px;margin-right:16px;font-size:14px;cursor:pointer}
.hint{color:#86909c;font-size:12.5px;margin:8px 0 0}
#dy-status{font-weight:600}
.dy-idle{color:#86909c}.dy-load{color:#ff7d00}.dy-ready{color:#165dff}.dy-ok{color:#00b42a}.dy-fail{color:#f53f3f}
.err{border-color:#fbaca3;background:#fff2f0}
.err p{margin:0 0 8px;color:#7a1f17;font-size:13px;word-break:break-all}
#root{min-height:260px;display:flex;align-items:center;justify-content:center}
iframe{width:100%;height:520px;border:1px solid #e5e6eb;border-radius:8px;background:#fafafa}
.ok{border-color:#aff0b5;background:#e8ffea}
.ok h2{color:#00b42a;margin:0 0 8px;font-size:19px}
.next{background:#fffbe6;border:1px solid #ffe58f;border-radius:8px;padding:12px 14px;font-size:14px;margin-bottom:10px}
button,.btn{padding:9px 18px;font-size:14px;border-radius:8px;border:1px solid transparent;cursor:pointer;background:#165dff;color:#fff;text-decoration:none;display:inline-block}
.btn.sec{background:#f2f3f5;color:#1d2129;border-color:#c9cdd4}
table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}
th,td{border:1px solid #e5e6eb;padding:6px 8px;text-align:left;word-break:break-all;vertical-align:top}
th{background:#f7f8fa;width:34%;font-weight:600}
.muted{color:#86909c;font-size:12.5px}
pre{background:#1d2129;color:#e5e6eb;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;margin:6px 0 0}
`

/**
 * 页面内运行的脚本（纯 vanilla，内联进 `<script>`）。
 *
 * 从 `window.__DOUYIN_CHALLENGE__`（challenge 数据）与 `window.__DOUYIN_PAGE__`
 * （宿主常量 + mock 开关）读料，驱动自建 / 托管两模式。**不含任何自动过验证逻辑** ——
 * `init` / `render` 调的是官方 SDK，滑块由真人拖。注意：本字符串被内联进 `.ts` 的模板
 * 字面量，所以内部**不能出现反引号或 ${}**，字符串一律单引号 + 加号拼接。
 */
const CLIENT_SCRIPT = `
'use strict';
(function () {
  var CH = window.__DOUYIN_CHALLENGE__ || {};
  var PG = window.__DOUYIN_PAGE__ || {};
  var IS_MOCK = /[?&]mock=1(&|$)/.test(location.search) || PG.mock === true;
  var SDK_EL = null;
  var _done = false;

  function $(id){ return document.getElementById(id); }
  function showEl(id){ var e=$(id); if(e) e.hidden=false; }
  function hideEl(id){ var e=$(id); if(e) e.hidden=true; }
  function setStatus(t,c){ var e=$('dy-status'); if(e){ e.textContent=t; e.className=c||''; } }
  function fail(msg){ setStatus('\\u274c \\u5931\\u8d25','dy-fail'); var m=$('dy-err-msg'); if(m) m.textContent=msg; showEl('dy-err'); }
  function clearErr(){ hideEl('dy-err'); }

  // 自建料是否齐全：没有 jsSdkUrl/verifyData 时只能走托管
  function canSelf(){ return !!(CH.jsSdkUrl && CH.verifyData); }
  function curMode(){
    var r = document.querySelector('input[name="dy-mode"]:checked');
    if (r) return r.value;
    return canSelf() ? 'self' : 'hosted';
  }

  // ---------- 成功回调：切 ✅ / 读 cookie / 展示参数 ----------
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function onSuccess(result){
    if (_done) return;   // 幂等：successCb 与 iframe postMessage 两条路径只认第一次
    _done = true;
    setStatus('\\u2705 \\u5df2\\u5b8c\\u6210\\u9a8c\\u8bc1','dy-ok');
    clearErr();
    renderCookies();
    var p=$('dy-params');
    if(p){
      var txt = (result===undefined) ? '(\\u672c\\u6b21\\u56de\\u8c03\\u672a\\u5e26\\u53c2\\u6570)' : safeStr(result);
      p.innerHTML = '<div style="font-weight:600;margin:4px 0">successCb \\u53c2\\u6570</div><pre>'+esc(txt)+'</pre>';
    }
    showEl('dy-ok');
    var ok=$('dy-ok'); if(ok&&ok.scrollIntoView) ok.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function safeStr(o){ try{ return JSON.stringify(o,null,2); }catch(e){ return String(o); } }
  function renderCookies(){
    var box=$('dy-cookies'); if(!box) return;
    var raw=document.cookie||'';
    var pairs = raw ? raw.split(';').map(function(s){return s.trim();}).filter(Boolean) : [];
    var map={};
    pairs.forEach(function(p){ var i=p.indexOf('='); var k=i>=0?p.slice(0,i):p; map[k]=i>=0?p.slice(i+1):''; });
    var HOT=['s_v_web_id','ttwid','msToken'];
    function isHot(k){ return HOT.indexOf(k)>=0 || k.indexOf('__ac')===0; }
    var html='<div style="font-weight:600;margin:4px 0">\\u5f53\\u524d\\u9875\\u53ef\\u8bfb\\u7684 cookie</div>';
    if(pairs.length===0){
      html+='<p class="muted">\\u672c\\u9875 document.cookie \\u4e3a\\u7a7a\\uff08\\u5173\\u952e cookie \\u591a\\u662f HttpOnly \\u8bfb\\u4e0d\\u5230\\uff0c\\u6b63\\u5e38\\uff09\\u3002</p>';
    } else {
      html+='<table><tbody>';
      Object.keys(map).forEach(function(k){ html+='<tr><th>'+esc(k)+(isHot(k)?' \\u2605':'')+'</th><td>'+esc(map[k])+'</td></tr>'; });
      html+='</tbody></table>';
    }
    html+='<p class="muted">\\u26a0\\ufe0f \\u5173\\u952e cookie\\uff08s_v_web_id / __ac_* / ttwid / msToken\\uff09\\u591a\\u7531\\u6296\\u97f3\\u57df\\u4e0b\\u53d1\\u4e14\\u5e38\\u4e3a HttpOnly\\uff0cJS \\u8bfb\\u4e0d\\u5230\\u3002\\u4ee5\\u8c03\\u7528\\u65b9\\uff08amagi\\uff09\\u5b9e\\u9645\\u62ff\\u5230\\u7684 Set-Cookie / \\u8bf7\\u6c42\\u5934\\u4e3a\\u51c6\\uff0c\\u7528\\u540c\\u4e00\\u4efd cookie \\u91cd\\u53d1\\u539f\\u8bf7\\u6c42\\u3002</p>';
    box.innerHTML=html;
  }

  // ---------- 自建模式：注入官方 SDK → init → render ----------
  // 监听验证中心跨域 iframe 回传的成功消息（autoRender 下真滑块在 iframe 内，successCb 到不了父页）。
  // 只认一次：桥的 type 有 success / verify 两种措辞，命中其一且带成功语义就切 ✅；onSuccess 自身幂等。
  var _msgBound = false;
  function listenIframeSuccess(){
    if (_msgBound) return; _msgBound = true;
    window.addEventListener('message', function(ev){
      var d = ev && ev.data;
      if (!d) return;
      if (typeof d === 'string'){ try { d = JSON.parse(d); } catch(e){ return; } }
      var type = d.type || (d.message && d.message.type) || (d.data && d.data.type);
      if (type === 'success' || type === 'verifySuccess' || (type === 'verify' && (d.success || (d.data && d.data.result)))){
        onSuccess(d.data || d.message || d);
      }
    }, false);
  }
  function injectSdk(onReady,onFail){
    if (IS_MOCK){ installMock(); onReady(window.TTGCaptcha); return; }
    if (window.TTGCaptcha && typeof window.TTGCaptcha.init==='function'){ onReady(window.TTGCaptcha); return; }
    if (SDK_EL && SDK_EL.parentNode) SDK_EL.parentNode.removeChild(SDK_EL);
    var s=document.createElement('script');
    s.src=CH.jsSdkUrl; s.async=true;
    // SDK 由 createElement 动态注入、src 来自 jsSdkUrl —— 不写进 HTML 属性，避免注入
    s.onload=function(){ waitTTG(onReady,onFail,0); };
    s.onerror=function(){ onFail('SDK \\u811a\\u672c\\u52a0\\u8f7d\\u5931\\u8d25\\uff1a'+CH.jsSdkUrl+'\\uff08\\u68c0\\u67e5\\u7f51\\u7edc / jsSdkUrl / CSP\\uff09'); };
    SDK_EL=s; document.head.appendChild(s);
  }
  function waitTTG(onReady,onFail,n){
    if (window.TTGCaptcha && typeof window.TTGCaptcha.init==='function') onReady(window.TTGCaptcha);
    else if (n>100) onFail('\\u7b49\\u5f85 window.TTGCaptcha \\u5c31\\u7eea\\u8d85\\u65f6\\uff08\\u811a\\u672c\\u5df2\\u52a0\\u8f7d\\u4f46\\u672a\\u6302\\u8f7d TTGCaptcha\\uff09');
    else setTimeout(function(){ waitTTG(onReady,onFail,n+1); },100);
  }
  function renderSelf(ttg){
    var ele = (PG.captchaOptions && PG.captchaOptions.ele) || 'root';
    var root = $(ele) || $('root'); if(root) root.innerHTML='';
    // 官方契约：init({commonOptions,captchaOptions}) 然后 render({verify_data})
    // successCb 由本页注入（见模块注释「successCb 为什么改掉」）
    var capt = {};
    var src = PG.captchaOptions || {};
    for (var k in src){ if(Object.prototype.hasOwnProperty.call(src,k)) capt[k]=src[k]; }
    capt.successCb = function(r){ onSuccess(r); };
    capt.showCb = function(){ setStatus('\\u6ed1\\u5757\\u5df2\\u5c31\\u7eea\\uff0c\\u8bf7\\u62d6\\u52a8','dy-ready'); };
    capt.refreshCb = function(){ setStatus('\\u6ed1\\u5757\\u5df2\\u5237\\u65b0\\uff0c\\u8bf7\\u62d6\\u52a8','dy-ready'); };
    // 自建模式下 SDK 的 autoRender 把真滑块画进一个指向 rmc.bytedance.com 的【跨域 iframe】，
    // 真人在 iframe 里拖完，成功事件只在 iframe 内回调，父页注册的 successCb 收不到。
    // 所以这里补一条 postMessage 监听：验证中心跨域→父窗口的桥会发 {type:'success'/'verify'}，
    // 据此把父页也切到 ✅。listenMessageOnce 幂等，与 successCb 两条路谁先到都只认一次。
    listenIframeSuccess();
    var ret;
    try { ret = ttg.init({ commonOptions: PG.commonOptions||{}, captchaOptions: capt }); }
    catch(e){ fail('TTGCaptcha.init \\u629b\\u9519\\uff1a'+(e&&e.message?e.message:e)); return; }
    if (ret && ret.type==='loadJSSDK'){ fail('TTGCaptcha.init \\u8fd4\\u56de {type:"loadJSSDK"}\\uff1a\\u5b98\\u65b9 SDK \\u8d44\\u6e90\\u672a\\u5c31\\u7eea/\\u52a0\\u8f7d\\u5931\\u8d25\\uff0c\\u8bf7\\u91cd\\u8bd5\\u3002'); return; }
    try { ttg.render({ verify_data: CH.verifyData }); }
    catch(e){ fail('TTGCaptcha.render \\u629b\\u9519\\uff1a'+(e&&e.message?e.message:e)); return; }
    setStatus('\\u6ed1\\u5757\\u5df2\\u5c31\\u7eea\\uff0c\\u8bf7\\u62d6\\u52a8','dy-ready');
  }
  function startSelf(){
    clearErr(); hideEl('dy-ok'); hideEl('dy-hosted'); showEl('dy-self');
    if (!canSelf()){ fail('\\u81ea\\u5efa\\u6a21\\u5f0f\\u9700\\u8981 jsSdkUrl \\u4e0e verifyData\\uff0c\\u5f53\\u524d challenge \\u6ca1\\u6709\\u2014\\u2014\\u8bf7\\u6539\\u7528\\u6258\\u7ba1\\u6a21\\u5f0f\\u3002'); return; }
    setStatus('\\u52a0\\u8f7d SDK \\u4e2d\\u2026','dy-load');
    injectSdk(function(ttg){ renderSelf(ttg); }, function(m){ fail(m); });
  }

  // ---------- 托管模式：打开官方托管验证页（新标签 / iframe） ----------
  function startHosted(){
    clearErr(); hideEl('dy-ok'); hideEl('dy-self'); showEl('dy-hosted');
    if (!CH.url){ fail('\\u6258\\u7ba1\\u6a21\\u5f0f\\u9700\\u8981 challenge.url\\uff0c\\u5f53\\u524d challenge \\u6ca1\\u6709\\u3002'); return; }
    var a=$('dy-open'); if(a) a.href=CH.url;
    if (!IS_MOCK){ var f=$('dy-iframe'); if(f) f.src=CH.url; }
    setStatus('\\u8bf7\\u5728\\u4e0b\\u65b9 iframe \\u6216\\u65b0\\u6807\\u7b7e\\u4e2d\\u5b8c\\u6210\\u6ed1\\u5757','dy-ready');
  }

  function start(){ _done = false; if (curMode()==='hosted') startHosted(); else startSelf(); }

  // ---------- mock：仅自测用的假 TTGCaptcha，真人拖到最右触发 successCb，无任何自动位移 ----------
  function installMock(){
    if (window.TTGCaptcha) return;
    var _capt = null;
    window.TTGCaptcha = {
      init: function(o){ _capt = (o && o.captchaOptions) ? o.captchaOptions : null; return {}; },
      render: function(){
        var cb = _capt && _capt.successCb;
        var root = document.getElementById('root'); if(!root) return;
        root.innerHTML='';
        var box=document.createElement('div'); box.style.cssText='width:100%;max-width:340px;margin:0 auto;user-select:none';
        var track=document.createElement('div'); track.style.cssText='position:relative;height:44px;background:#e8f3ff;border:1px solid #bedaff;border-radius:8px;overflow:hidden';
        var label=document.createElement('div'); label.textContent='\\u5047\\u6ed1\\u5757\\uff1a\\u6309\\u4f4f\\u5411\\u53f3\\u62d6\\u52a8'; label.style.cssText='position:absolute;width:100%;text-align:center;line-height:44px;color:#4e5969;font-size:13px;pointer-events:none';
        var handle=document.createElement('div'); handle.textContent='\\u203a\\u203a'; handle.style.cssText='position:absolute;left:0;top:0;width:44px;height:44px;background:#165dff;border-radius:8px;color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;touch-action:none';
        track.appendChild(label); track.appendChild(handle); box.appendChild(track); root.appendChild(box);
        var dragging=false, startX=0, max=0, done=false;
        function down(e){ if(done) return; dragging=true; startX=(e.clientX!==undefined?e.clientX:e.touches[0].clientX)-handle.offsetLeft; max=track.offsetWidth-handle.offsetWidth; e.preventDefault(); }
        function move(e){ if(!dragging||done) return; var x=(e.clientX!==undefined?e.clientX:e.touches[0].clientX)-startX; if(x<0)x=0; if(x>max)x=max; handle.style.left=x+'px'; if(x>=max-1){ done=true; dragging=false; handle.textContent='\\u2713'; handle.style.background='#00b42a'; label.textContent='\\u2713 \\u5df2\\u5b8c\\u6210(mock)'; if(cb) cb({mock:true,msg:'(mock) \\u771f\\u4eba\\u5df2\\u62d6\\u5230\\u6700\\u53f3'}); } }
        function up(){ dragging=false; }
        handle.addEventListener('pointerdown',down); document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
        handle.addEventListener('touchstart',down); document.addEventListener('touchmove',move); document.addEventListener('touchend',up);
      }
    };
  }

  // ---------- 启动 ----------
  function boot(){
    if (IS_MOCK){ var b=$('dy-mock'); if(b) b.hidden=false; }
    // 默认模式：料齐→自建，否则托管。勾选对应 radio（若存在）
    var def = canSelf() ? 'self' : 'hosted';
    var r = document.querySelector('input[name="dy-mode"][value="'+def+'"]');
    if (r) r.checked = true;
    var rt=$('dy-retry'); if(rt) rt.addEventListener('click', function(){ clearErr(); start(); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="dy-mode"]'), function(x){ x.addEventListener('change', start); });
    start();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`

/**
 * 把一个抖音风控挑战渲染成**真人能打开拖动**的自包含 HTML 页。
 *
 * 产物是一整张 HTML（内联 CSS + JS，无外部依赖，除了运行时动态加载的官方 TTGCaptcha SDK），
 * 直接 `res.send()` / 写文件 / 塞进 iframe 都行。页面行为见模块注释：自建 / 托管两模式按料齐全度
 * 自动选默认，真人拖完切 ✅ 并提示用同一份 cookie 重发原请求。
 *
 * **只中转不绕过** —— 页面只渲染官方滑块交给真人拖，不含任何识别 / 轨迹 / 自动过验证代码。
 *
 * @example 在 express 里把失败信封的挑战变成一张页
 * ```ts
 * const r = await client.douyin.fetcher.fetchVideoWork({ id })
 * if (!r.success && r.error.challenge) {
 *   res.type('html').send(renderDouyinVerifyPage(r.error.challenge))
 * }
 * ```
 * @param challenge - 失败信封里的 `error.challenge`（{@link RiskChallenge}）
 * @param options - 标题与中间页常量覆盖（{@link DouyinVerifyPageOptions}）
 * @returns 自包含的 HTML 字符串
 */
export const renderDouyinVerifyPage = (challenge: RiskChallenge, options: DouyinVerifyPageOptions = {}): string => {
  const title = escapeHtml(options.title ?? '抖音滑块验证')
  // 页面脚本只认 verifyData / jsSdkUrl / url 三样；其余字段（session / type / result 等）
  // 对渲染无用，不外泄进页面全局
  const challengeData = {
    ...(challenge.url === undefined ? {} : { url: challenge.url }),
    ...(challenge.jsSdkUrl === undefined ? {} : { jsSdkUrl: challenge.jsSdkUrl }),
    ...(challenge.verifyData === undefined ? {} : { verifyData: challenge.verifyData })
  }
  const pageData = {
    commonOptions: options.commonOptions ?? DOUYIN_VERIFY_PAGE_COMMON_OPTIONS,
    captchaOptions: { ...DOUYIN_VERIFY_PAGE_CAPTCHA_OPTIONS, ...(options.captchaOptions ?? {}) }
  }

  return `<!DOCTYPE html>
<!--
  抖音手动滑块验证页（amagi 生成，自包含）
  立场：只中转不绕过。本页只渲染官方 TTGCaptcha 滑块交给真人用鼠标拖动完成，
  不含任何验证码识别 / 缺口检测 / 轨迹模拟 / OCR / headless 自动过验证逻辑。
-->
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<div class="wrap">
  <h1>${title}</h1>
  <p class="sub">请用鼠标拖动完成下方滑块（真人操作 · 仅中转不绕过）</p>

  <div id="dy-mock" class="card" style="background:#fff7e8;border-color:#ffcf8b;color:#7a5000;font-size:13px" hidden>
    ⚠️ 当前为 <b>mock 自测模式</b>：下方为本地假滑块，<b>不连任何真实抖音服务</b>。
  </div>

  <div class="card modes">
    <label><input type="radio" name="dy-mode" value="self"> 自建模式（页面内渲染官方滑块，推荐）</label>
    <label><input type="radio" name="dy-mode" value="hosted"> 托管模式（打开官方验证页兜底）</label>
    <p class="hint">自建模式动态加载官方 SDK 把滑块渲染进本页；料不全或加载不出时切托管模式。</p>
  </div>

  <div class="card">状态：<span id="dy-status" class="dy-idle">未开始</span></div>

  <div class="card err" id="dy-err" hidden>
    <p id="dy-err-msg"></p>
    <button id="dy-retry">重试</button>
  </div>

  <div class="card" id="dy-self" hidden>
    <p class="hint" style="text-align:center">↓ 按住滑块手柄向右拖动完成验证 ↓</p>
    <div id="root"></div>
  </div>

  <div class="card" id="dy-hosted" hidden>
    <p class="hint">在下方 iframe 内拖动完成；若空白（官方页禁止被嵌入），点下面按钮在新标签打开。<br>⚠️ 跨域下本页读不到 iframe 内部状态，完成后请用<b>同一份 cookie 重发原请求</b>。</p>
    <p><a id="dy-open" class="btn" href="#" target="_blank" rel="noreferrer">在新标签打开官方验证页</a></p>
    <iframe id="dy-iframe" title="抖音官方验证页" referrerpolicy="no-referrer"></iframe>
  </div>

  <div class="card ok" id="dy-ok" hidden>
    <h2>✅ 已完成验证</h2>
    <div class="next"><strong>下一步：</strong>回到你的程序，用<strong>同一份 cookie</strong> 重发原请求。<br><span class="muted">（放行按 fp 关联是推断，amagi 不自动重发、不保证服务端放行。）</span></div>
    <div id="dy-cookies"></div>
    <div id="dy-params"></div>
  </div>

  <p class="muted" style="text-align:center;margin-top:20px">本页仅渲染官方滑块供真人手动拖动，不含任何自动识别/过验证逻辑。</p>
</div>
<script>window.__DOUYIN_CHALLENGE__=${toInlineJson(challengeData)};window.__DOUYIN_PAGE__=${toInlineJson(pageData)};</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>`
}
