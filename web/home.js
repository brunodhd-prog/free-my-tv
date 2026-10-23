/*
 * The home screen for web-app TVs (LG webOS, Samsung Tizen), with the Android app's design and behavior (HomeView):
 *  - top: the tabs (For You, Movies, Shows, Apps); weather, clock and icon-only glass buttons (Live TV, HDMI Inputs,
 *    Settings) at the right;
 *  - a featured title (the focused card, or the first row's first five in turn) over a full-screen photo; rows of 16:9
 *    cards below the shelf, scrolled sideways per row and up as a page;
 *  - the glass shelf with the apps; ↓ goes to the content rows (or the drawer when there are none); the top's input button opens the drawer;
 *  - a night look from sunset to sunrise; a screensaver after a few idle minutes.
 * The remote's arrows, OK and Back move the focus; a pointer (LG's Magic Remote) focuses what it points at.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function sym(name, parent, size) {
    var s = el('span', 'sym', parent);
    s.style.webkitMaskImage = 'url(symbols/' + name + '.png)';
    s.style.maskImage = 'url(symbols/' + name + '.png)';
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    return s;
  }

  function coin(i, parent) {
    var c = window.COINS && window.COINS[i];
    if (!c) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    for (var k = 0; k < c.length; k++) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', c[k]);
      p.setAttribute('fill-rule', 'evenodd');
      svg.appendChild(p);
    }
    parent.appendChild(svg);
  }

  function hasClass(e, c) { return (' ' + e.className + ' ').indexOf(' ' + c + ' ') >= 0; }
  function setClass(e, c, on) {
    if (!e) return;
    if (on && !hasClass(e, c)) e.className = (e.className + ' ' + c).replace(/^\s+/, '');
    else if (!on && hasClass(e, c)) e.className = (' ' + e.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  var stage = $('stage'), body = document.body;

  /** The 1920 × 1080 stage fills the window (on the TV it already is 1920 × 1080). */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.webkitTransform = stage.style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }

  // MARK: - Apps on the shelf

  /** Shelf apps in this order when installed, like the Android app: key, LG app id, name on the TV, brand gradient. */
  var SHELF = [
    ['netflix', /^netflix$/, /netflix/i, ['#0A0A0A', '#000000']],
    ['youtube', /youtube/, /^youtube$/i, ['#1C1C1E', '#09090A']],
    ['prime', /^amazon$/, /prime video|amazon/i, ['#2AA8FF', '#0A68D4']],
    ['disney', /disney/, /disney/i, ['#173584', '#08143F']],
    ['max', /hbo|wbd/, /^(hbo )?max$|hbo max/i, ['#5C30E8', '#221684']],
    ['appletv', /appletv|apple\.tv/, /apple tv/i, ['#1C1C1E', '#000000']],
    ['hulu', /^hulu/, /hulu/i, ['#1CE783', '#0B8F4E']],
    ['paramount', /paramount|cbs/, /paramount/i, ['#0064FF', '#002A86']],
    ['peacock', /peacock/, /peacock/i, ['#1C1C1E', '#000000']],
    ['nfl', /nfl/, /^nfl/i, ['#013369', '#00163D']],
    ['globoplay', /globoplay/, /globoplay/i, ['#FF8A1F', '#FF2D5A']],
    ['spotify', /spotify/, /spotify/i, ['#1DB954', '#0F7A36']]
  ];

  function shelfKey(app) {
    for (var i = 0; i < SHELF.length; i++) if (SHELF[i][1].test(app.id) || SHELF[i][2].test(app.title)) return SHELF[i];
    return null;
  }

  function darken(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#161618';
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * f) + ',' + Math.round(g * f) + ',' + Math.round(b * f) + ')';
  }

  /** A name that fits the tile on one line (the font shrinks for long names). */
  function wordFit(title, width, max) {
    return Math.max(18, Math.min(max, Math.floor(width * 0.8 / (Math.max(4, title.length) * 0.56))));
  }

  /** An app's face: its own icon on its brand color (or its name, when the icon can't be read). */
  function face(app, box, wordSize) {
    var k = shelfKey(app);
    var top = k ? k[3][0] : app.color ? darken(app.color, 0.92) : '#2A2A2E';
    var bottom = k ? k[3][1] : app.color ? darken(app.color, 0.62) : '#161618';
    box.style.background = '-webkit-linear-gradient(top, ' + top + ', ' + bottom + ')';
    box.style.background = 'linear-gradient(' + top + ', ' + bottom + ')';
    var word = el('div', 'word', box, app.title);
    if (wordSize) word.style.fontSize = wordSize + 'px';
    if (app.icon) {
      var img = el('img', '', box);
      word.style.visibility = 'hidden';
      img.onerror = function () { img.parentNode.removeChild(img); word.style.visibility = ''; };
      img.src = app.icon;
    }
  }

  var apps = [], shelf = [], others = [], inputs = [];

  function pickShelf() {
    var chosen = Prefs.shelf(), out = [];
    if (chosen) {
      for (var i = 0; i < chosen.length; i++) {
        for (var j = 0; j < apps.length; j++) if (apps[j].id === chosen[i]) out.push(apps[j]);
      }
    } else {
      for (var s = 0; s < SHELF.length; s++) {
        for (var a = 0; a < apps.length; a++) {
          if ((SHELF[s][1].test(apps[a].id) || SHELF[s][2].test(apps[a].title)) && out.indexOf(apps[a]) < 0) { out.push(apps[a]); break; }
        }
      }
      for (var r = 0; r < apps.length; r++) if (out.indexOf(apps[r]) < 0) out.push(apps[r]);
    }
    shelf = out;
    others = apps.filter(function (x) { return shelf.indexOf(x) < 0; });
  }

  // MARK: - Focus

  var Z = {TOP: 'top', ROWS: 'rows', SHELF: 'shelf', DRAWER: 'drawer', APPS: 'apps', SETTINGS: 'settings', EDIT: 'edit'};
  var st = {zone: Z.SHELF, top: 0, tab: 0, r: 0, col: 0, shelf: 0, shelfPos: 0, drawer: 0, grid: 0, row: 0, edit: 0};

  function sheetOpen() { return st.zone === Z.APPS || st.zone === Z.SETTINGS || st.zone === Z.EDIT; }

  function updateFocus() {
    var i, list;
    list = $('tabs').children;
    for (i = 0; i < list.length; i++) {
      setClass(list[i], 'on', i === st.tab);
      setClass(list[i], 'focus', st.zone === Z.TOP && st.top === i);
    }
    if ($('ptitle') && tabNames[st.tab] && $('ptitle').textContent !== tabNames[st.tab]) $('ptitle').textContent = tabNames[st.tab];
    list = $('buttons').children;
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.TOP && st.top === 4 + i);
    setClass($('quotes'), 'hide', st.zone === Z.TOP && st.top >= 4);
    paintRows();
    scrollShelf();
    list = $('tiles').children;
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.SHELF && list[i].k === st.shelfPos);
    list = drawerNodes();
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.DRAWER && st.drawer === i);
    list = document.querySelectorAll('#apps .cell');
    for (i = 0; i < list.length; i++) setClass(list[i], 'focus', st.zone === Z.APPS && st.grid === i);
    var rows = Math.max(1, Math.ceil(others.length / 5)), r = Math.floor(st.grid / 5), first = Math.max(0, Math.min(rows - 3, r - 1));
    $('apps').lastChild.style.webkitTransform = $('apps').lastChild.style.transform = 'translateY(' + (-first * 239) + 'px)';
    focusRows($('settings'), st.row, st.zone === Z.SETTINGS);
    focusRows($('shelfedit'), st.edit, st.zone === Z.EDIT);
    setClass(body, 'drawer-open', st.zone === Z.DRAWER);
    fpsSync(st.zone === Z.DRAWER);
  }

  function focusRows(sheet, index, on) {
    var rows = sheet.querySelectorAll('.row');
    for (var i = 0; i < rows.length; i++) setClass(rows[i], 'focus', on && i === index);
    var holder = sheet.querySelector('.rows');
    if (!holder) return;
    var visible = 7, first = Math.max(0, Math.min(rows.length - visible, index - 3));
    holder.style.webkitTransform = holder.style.transform = 'translateY(' + (-first * 78) + 'px)';
  }

  function nearest(nodes, x) {
    var best = 0, bestD = 1e9;
    for (var i = 0; i < nodes.length; i++) {
      var r = nodes[i].getBoundingClientRect(), d = Math.abs((r.left + r.right) / 2 - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function centerX(node) {
    if (!node) return 960;
    var r = node.getBoundingClientRect();
    return (r.left + r.right) / 2;
  }

  // MARK: - Top: title, tabs, buttons, quotes

  var TAB_KIND = [null, 'movie', 'tv', null];

  var tabNames = [];

  function renderTop() {
    var tabs = $('tabs');
    tabs.innerHTML = '';
    if (!$('ptitle')) el('div', '', $('top')).id = 'ptitle';
    var names = tabNames = [tr('Para você', 'For You', 'Para ti'), tr('Filmes', 'Movies', 'Películas'), tr('Séries', 'Shows', 'Series'), tr('Apps', 'Apps', 'Apps')];
    for (var i = 0; i < 4; i++) {
      var t = el('button', 'tab', tabs, names[i]);
      hover(t, Z.TOP, i);
    }
    $('shelflabel').textContent = tr('Seus apps', 'Your apps', 'Tus apps');
    var buttons = $('buttons');
    buttons.innerHTML = '';
    var defs = [['live_tv', tr('TV aberta', 'Live TV', 'TV en vivo')], ['hdmi', tr('Entradas HDMI', 'HDMI Inputs', 'Entradas HDMI')],
      ['settings', tr('Ajustes', 'Settings', 'Ajustes')]];
    for (var b = 0; b < 3; b++) {
      var r = el('button', 'round' + (b === 2 ? ' last' : ''), buttons);
      r.style.left = (1596 + 88 * b) + 'px';
      sym(defs[b][0], r);
      el('div', 'tip', r, defs[b][1]);
      hover(r, Z.TOP, 4 + b);
    }
  }

  function renderQuotes() {
    var q = $('quotes'), coins = Data.activeCoins();
    q.innerHTML = '';
    for (var i = 0; i < coins.length; i++) {
      var item = el('span', 'q', q);
      coin(coins[i], item);
      el('span', '', item, Data.compact(Data.prices[coins[i]]));
    }
  }

  // MARK: - Hero: the featured title

  var heroList = [], heroIdx = 0, heroId = null, heroUrl = '', heroFront = 0, heroTimer = 0, heroWasRows = false;

  function showHero(item) {
    if (!item || item.kind + ':' + item.id === heroId) return;
    heroId = item.kind + ':' + item.id;
    var t = $('htext');
    t.firstChild.textContent = item.title || '';
    var parts = [];
    if (item.year) parts.push(String(item.year));
    var rate = parseFloat(item.rating);
    if (rate > 0) parts.push((Math.round(rate * 10) / 10) + '★');
    if (item.service) parts.push(item.service);
    t.children[1].textContent = parts.join(' · ');
    t.children[2].textContent = item.overview || '';
    var url = item.backdrop ? Data.image(item.backdrop, 'w1280') : '';
    heroUrl = url;
    if (!url) return;
    var im = new Image();
    im.onload = function () {
      if (heroUrl !== url) return;
      var layers = document.querySelectorAll('#hero .himg'), back = layers[1 - heroFront];
      back.style.backgroundImage = 'url("' + url + '")';
      setClass(back, 'on', true);
      setClass(layers[heroFront], 'on', false);
      heroFront = 1 - heroFront;
    };
    im.src = url;
  }

  function heroSchedule() {
    clearTimeout(heroTimer);
    heroTimer = setTimeout(function () {
      heroTimer = 0;
      if (st.zone === Z.ROWS || !heroList.length) return;
      heroIdx = (heroIdx + 1) % heroList.length;
      showHero(heroList[heroIdx]);
      heroSchedule();
    }, 8000);
  }

  /** The focused card features itself and the rotation pauses; leaving the rows, it turns again 8 s later. */
  function heroFocus(on) {
    if (on) {
      clearTimeout(heroTimer);
      heroTimer = 0;
      heroWasRows = true;
      showHero(view[st.r] && view[st.r].items[st.col]);
      return;
    }
    if (heroWasRows) { heroWasRows = false; clearTimeout(heroTimer); heroTimer = 0; }
    showHero(heroList[heroIdx]);
    if (!heroTimer && heroList.length > 1) heroSchedule();
  }

  // MARK: - Rows of content

  // Layout numbers that depend on the style (Spotlight or Panels); setStyleGeo() sets them.
  var ROW0 = 880, ROW_H = 300, STEP = 384, CL = 80, PANELS = false;
  var view = [], rowEls = [], rowF = [], rowSig = '', focusNode = null;

  /** The rows of the selected tab: Movies and Shows keep only their kind of item. */
  function viewRows() {
    var all = (Data.rows ? Data.rows() : null) || [], kind = TAB_KIND[st.tab], out = [];
    for (var i = 0; i < all.length; i++) {
      var row = all[i], items = row && row.items;
      if (!items) continue;
      if (kind) items = items.filter(function (x) { return x.kind === kind; });
      if (items.length) out.push({id: row.id, title: row.title, items: items});
    }
    return out;
  }

  function renderRows(force) {
    var next = viewRows(), sig = st.tab + '|', i;
    for (i = 0; i < next.length; i++) sig += next[i].id + ':' + next[i].items.length + ':' + next[i].items[0].id + ';';
    setClass(body, 'gtv', next.length > 0);
    setClass(body, 'no-rows', !next.length);
    if (sig === rowSig && !force) return;
    rowSig = sig;
    view = next;
    var holder = $('rows');
    holder.innerHTML = '';
    rowEls = [];
    rowF = [];
    for (i = 0; i < view.length; i++) {
      var d = el('div', 'row16', holder);
      d.style.top = (i * ROW_H) + 'px';
      el('div', 'rlabel', d, view[i].title);
      d.strip = el('div', 'strip', el('div', 'rclip', d));
      d.built = {};
      rowEls.push(d);
      rowF.push(0);
    }
    st.r = Math.min(st.r, Math.max(0, view.length - 1));
    st.col = view.length ? Math.min(st.col, view[st.r].items.length - 1) : 0;
    if (!view.length && st.zone === Z.ROWS) st.zone = shelf.length ? Z.SHELF : Z.TOP;
    heroList = view.length ? view[0].items.slice(0, 5) : [];
    heroIdx = 0;
    heroId = null;
    updateFocus();
  }

  /** Cards only for the rows near the focus, and in each row only the ones near the window (images load when they appear). */
  function syncRow(r) {
    var d = rowEls[r], items = view[r].items, n = items.length, f = rowF[r], i, key;
    var inRows = st.zone === Z.ROWS;
    if (inRows ? Math.abs(r - st.r) > 1 : r !== 0) {
      if (d.any) { d.strip.innerHTML = ''; d.built = {}; d.any = false; }
      return;
    }
    if (inRows && r === st.r) {
      if (st.col < f) f = st.col;
      else if (st.col > f + 3) f = st.col - 3;
      rowF[r] = f;
    }
    d.strip.style.webkitTransform = d.strip.style.transform = 'translateX(' + (-f * STEP) + 'px)';
    var lo = Math.max(0, f - 3), hi = Math.min(n - 1, f + 7);
    for (key in d.built) {
      if (d.built.hasOwnProperty(key) && (+key < lo || +key > hi)) { d.strip.removeChild(d.built[key]); delete d.built[key]; }
    }
    for (i = lo; i <= hi; i++) {
      if (d.built[i]) continue;
      var it = items[i], c = el('div', 'rcard', d.strip), img = el('div', 'rimg', c);
      c.style.left = (i * STEP) + 'px';
      if (it.backdrop) img.style.backgroundImage = 'url("' + Data.image(it.backdrop, 'w342') + '")';
      el('div', 'rname', c, it.title);
      c.r = r;
      c.c = i;
      hover(c, Z.ROWS, 0);
      d.built[i] = c;
      d.any = true;
    }
  }

  /** Moves the page and the focus ring; only transforms and classes change. */
  function paintRows() {
    var on = view.length > 0 && st.zone === Z.ROWS, r;
    for (r = 0; r < rowEls.length; r++) {
      syncRow(r);
      setClass(rowEls[r], 'past', on && r < st.r);
    }
    if (focusNode) { setClass(focusNode, 'focus', false); focusNode = null; }
    if (on && rowEls[st.r].built[st.col]) { focusNode = rowEls[st.r].built[st.col]; setClass(focusNode, 'focus', true); }
    var y = on ? (PANELS ? 548 - (ROW0 + st.r * ROW_H) : 760 - (ROW0 + 54 + st.r * ROW_H)) : 0;
    $('page').style.webkitTransform = $('page').style.transform = y ? 'translateY(' + y + 'px)' : '';
    setClass($('shelflabel'), 'gone', on);
    setClass($('platter'), 'gone', on);
    if (SH.clip) setClass(SH.clip, 'gone', on);
    heroFocus(on);
  }

  /** A card's center, and the card of row r nearest to a stage x. */
  function cardX(r, c) { return CL + (c - rowF[r]) * STEP + 180; }
  function cardNear(r, sx) {
    var f = rowF[r], n = view[r].items.length;
    return Math.max(f, Math.min(n - 1, f + 4, f + Math.round((sx - CL - 180) / STEP)));
  }
  function stageX(x) { var r = stage.getBoundingClientRect(); return (x - r.left) * 1920 / r.width; }
  function screenX(sx) { var r = stage.getBoundingClientRect(); return r.left + sx * r.width / 1920; }

  function renderClock() {
    var d = new Date(), c = $('clock');
    c.firstChild.textContent = Data.time(d.getTime());
    try {
      c.lastChild.textContent = d.toLocaleDateString(I18N.locale(), {weekday: 'long', day: 'numeric', month: 'long'});
    } catch (e) {
      c.lastChild.textContent = d.toDateString();
    }
    renderMini();
  }

  /** The small weather and clock in the top bar. */
  function renderMini() {
    var m = $('mini'), w = Data.weather, wx = m.firstChild;
    m.lastChild.textContent = Data.time(Date.now());
    wx.innerHTML = '';
    if (w && Prefs.weather() !== false) {
      try { sym(Data.symbol(w.code, w.isDay), wx); } catch (e) {}
      wx.appendChild(document.createTextNode(Data.degrees(w.temp)));
    }
  }

  // MARK: - Shelf

  // The shelf has no limit: fixed-size tiles in a strip that slides inside the fixed glass; only the tiles near the view have a face.
  var SH = {tw: 126 * 16 / 9, th: 126, gap: 48, pad: 40, left: 40, view: 1760, ty: 40, pl: 40, pw: 1840, shift: 0, clip: null, pool: {}, win: 7};

  function shelfStep() { return SH.tw + SH.gap; }

  function mod(a, n) { return ((a % n) + n) % n; }

  /** Everything fits in the glass: the tiles stay still and centered. Otherwise the strip is endless. */
  function shelfFits() {
    var n = shelf.length;
    return n * shelfStep() - SH.gap <= SH.view;
  }

  /** Where the strip sits (translateX in the clip) with slot k in focus: centered, and endless when it doesn't all fit. */
  function shelfShiftFor(k) {
    var n = shelf.length;
    if (shelfFits()) return SH.pad + (SH.view - (n * SH.tw + Math.max(0, n - 1) * SH.gap)) / 2;
    return SH.pad + SH.view / 2 - (k * shelfStep() + SH.tw / 2);
  }

  /** Slot k's center on the screen, as it will be once the strip has settled (the real rect lags during the slide). */
  function shelfCenterX(k) {
    var r = stage.getBoundingClientRect();
    return r.left + (SH.left + SH.shift + k * shelfStep() + SH.tw / 2) * r.width / 1920;
  }

  /** The visible slot (its k) whose settled center is nearest to a screen x. */
  function nearestShelf(x) {
    var r = stage.getBoundingClientRect(), sx = (x - r.left) * 1920 / r.width;
    var k = Math.round((sx - SH.left - SH.shift - SH.tw / 2) / shelfStep());
    return shelfFits() ? Math.max(0, Math.min(shelf.length - 1, k)) : k;
  }

  function fillTile(t) {
    var app = shelf[mod(t.k, shelf.length)];
    t.style.left = (t.k * shelfStep()) + 'px';
    if (t.app === app) return;
    t.app = app;
    t.innerHTML = '';
    face(app, t, wordFit(app.title, SH.tw, 30));
  }

  function newTile() {
    var t = el('div', 'tile', $('tiles'));
    t.style.top = SH.ty + 'px';
    t.style.width = SH.tw + 'px';
    t.style.height = SH.th + 'px';
    hover(t, Z.SHELF, 0);
    return t;
  }

  /** Moves the strip to st.shelfPos and keeps only the slots around it (nodes are reused). */
  function scrollShelf() {
    var n = shelf.length;
    if (!n) return;
    var tiles = $('tiles'), fits = shelfFits(), i, t, k;
    if (fits) st.shelfPos = Math.max(0, Math.min(n - 1, mod(st.shelfPos, n)));
    var renorm = !fits && Math.abs(st.shelfPos) > 10000;
    if (renorm) {
      var delta = st.shelfPos - mod(st.shelfPos, n);
      st.shelfPos -= delta;
      SH.pool = {};
      for (i = 0; i < tiles.children.length; i++) {
        t = tiles.children[i];
        t.k -= delta;
        SH.pool[t.k] = t;
      }
      tiles.style.webkitTransition = tiles.style.transition = 'none';
    }
    st.shelf = mod(st.shelfPos, n);
    SH.shift = shelfShiftFor(st.shelfPos);
    tiles.style.webkitTransform = tiles.style.transform = 'translateX(' + SH.shift + 'px)';
    var lo = fits ? 0 : st.shelfPos - SH.win, hi = fits ? n - 1 : st.shelfPos + SH.win, free = [];
    for (i = tiles.children.length - 1; i >= 0; i--) {
      t = tiles.children[i];
      if (t.k < lo || t.k > hi) { delete SH.pool[t.k]; free.push(t); }
    }
    for (k = lo; k <= hi; k++) {
      t = SH.pool[k];
      if (!t) { t = free.pop() || newTile(); t.k = k; SH.pool[k] = t; }
      fillTile(t);
    }
    while (free.length) tiles.removeChild(free.pop());
    if (renorm) {
      void tiles.offsetWidth;
      tiles.style.webkitTransition = tiles.style.transition = '';
    }
  }

  function renderShelf() {
    var n = shelf.length;
    var platter = $('platter');
    platter.style.display = n ? '' : 'none';
    platter.style.left = SH.pl + 'px';
    platter.style.width = SH.pw + 'px';
    var tiles = $('tiles');
    if (!SH.clip) {
      SH.clip = document.createElement('div');
      SH.clip.id = 'shelfclip';
      tiles.parentNode.insertBefore(SH.clip, tiles);
      SH.clip.appendChild(tiles);
    }
    SH.clip.style.display = n ? '' : 'none';
    tiles.innerHTML = '';
    SH.pool = {};
    SH.win = Math.ceil(SH.view / shelfStep() / 2) + 3;
    st.shelfPos = Math.min(st.shelf, Math.max(0, n - 1));
    // first paint without sliding in from the old place
    tiles.style.webkitTransition = tiles.style.transition = 'none';
    scrollShelf();
    void tiles.offsetWidth;
    tiles.style.webkitTransition = tiles.style.transition = '';
  }

  // MARK: - Drawer

  var drawerItems = [], drawerInputs = 0;

  function renderDrawer() {
    var d = $('drawer');
    d.innerHTML = '';
    drawerItems = [];
    for (var i = 0; i < inputs.length; i++) {
      var x = inputs[i];
      drawerItems.push({label: x.label || tr('TV aberta', 'Live TV', 'TV en vivo'), symbol: x.symbol, off: !x.connected, run: launcher(x.id, x.label)});
    }
    drawerInputs = drawerItems.length;
    drawerItems.push({label: tr('Todos os Apps', 'All Apps', 'Todas las apps'), symbol: 'apps', run: openApps});
    drawerItems.push({label: tr('Ajustes do Início', 'Home Settings', 'Ajustes de inicio'), symbol: 'settings', run: openSettings});
    drawerItems.push({label: tr('Ajustes da TV', 'TV Settings', 'Ajustes del TV'), symbol: 'tv_settings', run: tvSettings});
    var n = drawerItems.length, gap = 18, groupGap = 56, groups = drawerInputs > 0 && drawerInputs < n ? 2 : 1;
    var tw = Math.min(230, (1760 - Math.max(0, n - groups) * gap - (groups - 1) * groupGap) / Math.max(1, n));
    var xPos = 80;
    for (var k = 0; k < n; k++) {
      if (k === drawerInputs && k > 0) {
        xPos += groupGap - gap;
        el('div', 'row-title', d, tr('Atalhos', 'Shortcuts', 'Accesos directos')).style.left = (xPos + 4) + 'px';
      }
      if (k === 0 && drawerInputs) el('div', 'row-title', d, tr('Entradas', 'Inputs', 'Entradas')).style.left = '84px';
      var item = drawerItems[k], key = el('div', 'key glass' + (item.off ? ' off' : ''), d);
      key.style.left = xPos + 'px';
      key.style.width = tw + 'px';
      sym(item.symbol, key);
      el('div', 'label', key, item.label);
      hover(key, Z.DRAWER, k);
      xPos += tw + gap;
    }
    drawerItems.push({label: tr('Sistema', 'System', 'Sistema'), panel: true, run: runSpeed});
    renderPanels();
    updateFocus();
  }

  /** The drawer's focusable things in order: the keys, then the System card. */
  function drawerNodes() {
    return document.querySelectorAll('#drawer .key, #drawer .syscard');
  }

  function renderPanels() {
    var d = $('drawer');
    var old = d.querySelectorAll('.panel');
    for (var o = 0; o < old.length; o++) d.removeChild(old[o]);
    var wx = Prefs.weather(), coins = Data.activeCoins(), qt = coins.length > 0;
    var sysW = 420, end = 1840 - sysW - 16, split = 80 + (end - 80) * 0.55;
    if (wx) {
      var w = el('div', 'panel glass', d);
      w.id = 'weather';
      w.style.left = '80px';
      w.style.width = ((qt ? split - 16 : end) - 80) + 'px';
      renderWeather(w);
    }
    if (qt) {
      var q = el('div', 'panel glass', d);
      q.id = 'prices';
      var left = wx ? split + 16 : 80;
      q.style.left = left + 'px';
      q.style.width = (end - left) + 'px';
      renderPrices(q, coins);
    }
    var sc = el('div', 'panel glass syscard', d);
    sc.id = 'system';
    sc.style.left = (1840 - sysW) + 'px';
    sc.style.width = sysW + 'px';
    hover(sc, Z.DRAWER, drawerItems.length - 1);
    renderSystem(sc);
  }

  // MARK: - System card: speed test, interface smoothness, network

  var SPEED_KEY = 'fmt.speed.v1';
  var sys = {running: false, live: '', last: null, error: false, net: undefined, fps: 0, nodes: null};
  try { sys.last = JSON.parse(localStorage.getItem(SPEED_KEY)); } catch (e) { sys.last = null; }
  if (!sys.last || typeof sys.last.down !== 'number') sys.last = null;

  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }

  function renderSystem(card) {
    el('div', 'head', card, tr('Sistema', 'System', 'Sistema'));
    sys.nodes = {
      net: el('div', 'snet', card),
      main: el('div', 'smain', card),
      sub: el('div', 'ssub', card),
      fps: el('div', 'sfps', card)
    };
    sysPaint();
    TV.network(function (n) { sys.net = n; sysPaint(); });
  }

  function sysPaint() {
    var n = sys.nodes;
    if (!n || !n.main.parentNode) return;
    var net = sys.net, main = '', sub = '';
    n.net.textContent = net && net.type ? (net.type === 'wired' ? tr('Cabo', 'Wired', 'Cable') : 'Wi-Fi') + (net.ip ? ' \u00B7 ' + net.ip : '') : '';
    if (sys.running) {
      main = tr('Testando\u2026', 'Testing\u2026', 'Probando\u2026') + (sys.live ? ' ' + sys.live : '');
    } else if (sys.error) {
      main = tr('N\u00E3o foi poss\u00EDvel medir (sem internet ou bloqueado)', 'Could not measure (no internet or blocked)', 'No se pudo medir (sin internet o bloqueado)');
      n.main.className = 'smain err';
    } else if (sys.last) {
      main = '\u2193 ' + Math.round(sys.last.down) + ' Mbps' + (sys.last.ping != null ? ' \u00B7 ping ' + Math.round(sys.last.ping) + ' ms' : '');
      sub = tr('Medido \u00E0s ', 'Measured at ', 'Medido a las ') + Data.time(sys.last.at);
    } else {
      main = tr('Aperte OK para medir a velocidade', 'Press OK to test your speed', 'Pulsa OK para medir la velocidad');
      n.main.className = 'smain hint';
    }
    if (!sys.error && !(!sys.running && !sys.last)) n.main.className = 'smain';
    if (n.main.textContent !== main) n.main.textContent = main;
    n.sub.textContent = sub;
    n.fps.textContent = sys.fps ? tr('Fluidez da interface: ', 'Interface smoothness: ', 'Fluidez de la interfaz: ') + sys.fps + ' fps' : '';
  }

  function median(a) {
    a.sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function mbps(bytes, ms) { return ms > 0 ? bytes * 8 / (ms / 1000) / 1e6 : 0; }

  function runSpeed() {
    if (sys.running) return;
    sys.running = true;
    sys.error = false;
    sys.live = '';
    sysPaint();
    var fail = function () {
      sys.running = false;
      sys.error = true;
      sysPaint();
    };
    var pings = [], n = 0;
    var one = function () {
      var x = new XMLHttpRequest(), t0 = now(), over = false;
      var next = function (ok) {
        if (over) return;
        over = true;
        if (ok) pings.push(now() - t0);
        n++;
        if (n < 5) one();
        else if (!pings.length) fail();
        else download(median(pings));
      };
      try {
        x.open('GET', 'https://speed.cloudflare.com/__down?bytes=0&r=' + new Date().getTime() + n, true);
        x.timeout = 5000;
        x.onload = function () { next(x.status >= 200 && x.status < 300); };
        x.onerror = x.ontimeout = x.onabort = function () { next(false); };
        x.send();
      } catch (e) { next(false); }
    };
    var download = function (ping) {
      var x = new XMLHttpRequest(), t0 = now(), done = false, baseT = -1, baseB = 0, lastB = 0, lastT = 0, timer = 0;
      var speed = function () {
        if (baseT >= 0 && lastT > baseT) return mbps(lastB - baseB, lastT - baseT);
        return mbps(lastB, lastT);
      };
      var finish = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        var v = speed();
        if (!(v > 0)) { fail(); return; }
        sys.last = {down: v, ping: ping, at: new Date().getTime()};
        try { localStorage.setItem(SPEED_KEY, JSON.stringify(sys.last)); } catch (e) {}
        sys.running = false;
        sysPaint();
      };
      var bad = function () { if (lastB > 0) finish(); else if (!done) { done = true; clearTimeout(timer); fail(); } };
      try {
        x.open('GET', 'https://speed.cloudflare.com/__down?bytes=25000000', true);
        x.responseType = 'arraybuffer';
        x.onprogress = function (e) {
          if (done) return;
          lastB = e.loaded;
          lastT = now() - t0;
          if (baseT < 0 && lastT >= 1000) { baseT = lastT; baseB = lastB; }
          var v = speed();
          sys.live = v > 0 ? (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + ' Mbps' : '';
          sysPaint();
        };
        x.onload = function () { if (!lastB && x.response && x.response.byteLength) { lastB = x.response.byteLength; lastT = now() - t0; } finish(); };
        x.onerror = x.ontimeout = x.onabort = bad;
        timer = setTimeout(function () { bad(); try { x.abort(); } catch (e) {} }, 8000);
        x.send();
      } catch (e) { bad(); }
    };
    one();
  }

  // Interface smoothness: frames per second over the last second, only while the drawer is open.
  var fpsRaf = 0, fpsFrames = 0, fpsStart = 0;
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
  var caf = window.cancelAnimationFrame || window.webkitCancelAnimationFrame;

  function fpsTick(t) {
    fpsRaf = raf(fpsTick);
    fpsFrames++;
    var dt = t - fpsStart;
    if (dt >= 1000) {
      var f = Math.round(fpsFrames * 1000 / dt);
      fpsFrames = 0;
      fpsStart = t;
      if (f !== sys.fps) { sys.fps = f; sysPaint(); }
    }
  }

  function fpsSync(on) {
    if (on && !fpsRaf && raf) {
      fpsFrames = 0;
      fpsStart = now();
      fpsRaf = raf(function (t) { fpsStart = t; fpsRaf = raf(fpsTick); });
    } else if (!on && fpsRaf) {
      if (caf) caf(fpsRaf);
      fpsRaf = 0;
    }
  }

  function renderWeather(card) {
    el('div', 'head', card, Data.city || tr('Clima', 'Weather', 'Clima'));
    var w = Data.weather;
    if (!w) {
      el('div', 'cond', card, tr('Sem dados do clima agora.', 'No weather data right now.', 'No hay datos del clima ahora.')).style.top = '96px';
      return;
    }
    var now = el('div', 'now', card);
    sym(Data.symbol(w.code, w.isDay), now);
    el('span', 'temp', now, Data.degrees(w.temp));
    el('div', 'cond', card, Data.condition(w.code, w.isDay));
    el('div', 'range', card, I18N.lang === 'ru' ? 'Макс. ' + Data.degrees(w.max) + '   Мин. ' + Data.degrees(w.min) : tr('Máx. ' + Data.degrees(w.max) + '   Mín. ' + Data.degrees(w.min), 'H:' + Data.degrees(w.max) + '   L:' + Data.degrees(w.min),
        'Máx. ' + Data.degrees(w.max) + '   Mín. ' + Data.degrees(w.min)));
    el('div', 'split', card);
    var hours = el('div', 'hours', card), width = parseFloat(card.style.width) - 30 - 422, hn = Math.max(1, Math.min(6, Math.floor(width / 62))), hw = width / hn;
    for (var i = 0; i < w.hours.length && i < hn; i++) {
      var h = el('div', 'hour', hours), x = w.hours[i];
      h.style.left = (hw * i) + 'px';
      h.style.width = hw + 'px';
      el('div', 't', h, Data.hour(x.at));
      sym(Data.symbol(x.code, x.day), h);
      el('div', 'd', h, Data.degrees(x.temp));
    }
    var sun = el('div', 'sun', card);
    if (w.sunrise) { var a = el('span', '', sun); sym('sunrise', a); a.appendChild(document.createTextNode(tr('Nascer ', 'Sunrise ', 'Amanecer ') + Data.time(w.sunrise))); }
    if (w.sunset) { var b = el('span', '', sun); sym('sunset', b); b.appendChild(document.createTextNode(tr('Pôr do sol ', 'Sunset ', 'Atardecer ') + Data.time(w.sunset))); }
  }

  function renderPrices(card, coins) {
    el('div', 'head', card, tr('Cotações', 'Crypto', 'Cripto'));
    var stale = Data.staleness(Data.pricesAt, 5 * 60000);
    el('div', 'side', card, stale || tr('variação em 24 h', '24h change', 'variación en 24 h'));
    for (var j = 0; j < coins.length; j++) {
      var i = coins[j], row = el('div', 'coin', card);
      row.style.top = (86 + 52 * j) + 'px';
      coin(i, row);
      el('span', 'n', row, Data.coinName(i));
      el('span', 'p', row, Data.money(Data.prices[i]));
      var ch = Data.changes[i];
      if (!isNaN(ch)) el('span', 'c ' + (ch >= 0 ? 'up' : 'down'), row, Data.change(ch));
    }
  }

  function openDrawer() {
    if (!drawerItems.length) return;
    st.zone = Z.DRAWER;
    st.drawer = Math.min(drawerItems.length - 1, nearest(document.querySelectorAll('#drawer .key'), shelfCenterX(st.shelfPos)));
    TV.network(function (n) { sys.net = n; sysPaint(); });
    updateFocus();
  }

  function closeDrawer() {
    var keys = drawerNodes();
    st.zone = Z.SHELF;
    if (shelf.length) st.shelfPos = nearestShelf(centerX(keys[st.drawer]));
    updateFocus();
  }

  // MARK: - All Apps

  function renderApps() {
    var sheet = $('apps');
    sheet.firstChild.textContent = tr('Todos os Apps', 'All Apps', 'Todas las apps');
    var grid = sheet.lastChild;
    grid.innerHTML = '';
    for (var i = 0; i < others.length; i++) {
      var r = Math.floor(i / 5), c = i % 5, cell = el('div', 'cell', grid);
      cell.style.left = (130 + c * 340) + 'px';
      cell.style.top = (196 + r * 239) + 'px';
      face(others[i], el('div', 'face', cell), wordFit(others[i].title, 300, 34));
      el('div', 'label', cell, others[i].title);
      hover(cell, Z.APPS, i);
    }
  }

  function openApps() {
    renderApps();
    st.zone = Z.APPS;
    st.grid = 0;
    setClass($('apps'), 'open', true);
    updateFocus();
  }

  function closeSheets() {
    setClass($('apps'), 'open', false);
    setClass($('settings'), 'open', false);
    setClass($('shelfedit'), 'open', false);
    st.zone = Z.SHELF;
    updateFocus();
  }

  // MARK: - Style: Spotlight (hero) or Panels

  /** Sets the style class and the pixel numbers that the scrolling code reads. */
  function setStyleGeo() {
    PANELS = Prefs.style() === 'panels';
    setClass(body, 'style-panels', PANELS);
    ROW0 = PANELS ? 836 : 880;
    ROW_H = PANELS ? 337 : 300;
    CL = PANELS ? 104 : 80;
    SH.left = PANELS ? 92 : 40;
    SH.pad = PANELS ? 12 : 40;
    SH.view = PANELS ? 1712 : 1760;
    SH.ty = PANELS ? 25 : 40;
    SH.pl = PANELS ? 80 : 40;
    SH.pw = PANELS ? 1760 : 1840;
  }

  function applyStyle() {
    setStyleGeo();
    rowSig = '';
    renderRows(true);
    renderShelf();
    updateFocus();
  }

  var STYLE_NAMES = {
    hero: function () { return tr('Destaque', 'Spotlight', 'Destacado'); },
    panels: function () { return tr('Painéis', 'Panels', 'Paneles'); }
  };

  // MARK: - Home Settings

  var THEME_NAMES = {
    dark: function () { return tr('Escuro', 'Dark', 'Oscuro'); },
    oled: function () { return tr('Preto OLED', 'OLED black', 'Negro OLED'); },
    light: function () { return tr('Claro', 'Light', 'Claro'); }
  };
  var ACCENTS = ['blue', 'green', 'purple', 'orange', 'pink', 'red', 'white'];
  var ACCENT_NAMES = {
    blue: function () { return tr('Azul', 'Blue', 'Azul'); },
    green: function () { return tr('Verde', 'Green', 'Verde'); },
    purple: function () { return tr('Roxo', 'Purple', 'Morado'); },
    orange: function () { return tr('Laranja', 'Orange', 'Naranja'); },
    pink: function () { return tr('Rosa', 'Pink', 'Rosa'); },
    red: function () { return tr('Vermelho', 'Red', 'Rojo'); },
    white: function () { return tr('Branco', 'White', 'Blanco'); }
  };

  function settingRows() {
    var lang = Prefs.language(), unit = Prefs.temperature(), theme = Prefs.theme(), accent = Prefs.accent(), style = Prefs.style();
    var auto = tr('Automático', 'Automatic', 'Automático'), on = tr('Ligado', 'On', 'Activado'), off = tr('Desligado', 'Off', 'Desactivado');
    var rows = [
      {label: tr('Idioma', 'Language', 'Idioma'), value: lang === 'ru' ? 'Русский' : lang === 'de' ? 'Deutsch' : lang === 'pt' ? 'Português' : lang === 'en' ? 'English' : lang === 'es' ? 'Español' : auto,
        step: function (d) { cycle('language', ['auto', 'de', 'en', 'es', 'pt', 'ru'], lang, d); I18N.set(Prefs.language()); renderAll(); }},
      {label: tr('Temperatura', 'Temperature', 'Temperatura'), value: unit === 'C' ? '°C' : unit === 'F' ? '°F' : auto,
        step: function (d) { cycle('temperature', ['auto', 'C', 'F'], unit, d); renderPanels(); }},
      {label: tr('Estilo', 'Style', 'Estilo'), value: (STYLE_NAMES[style] || STYLE_NAMES.hero)(),
        step: function (d) { cycle('style', ['hero', 'panels'], style, d); applyStyle(); }},
      {label: tr('Tema', 'Theme', 'Tema'), value: THEME_NAMES[theme] ? THEME_NAMES[theme]() : auto,
        step: function (d) { cycle('theme', ['auto', 'dark', 'oled', 'light'], theme, d); checkNight(); }},
      {label: tr('Cor de destaque', 'Accent color', 'Color de acento'), value: ACCENT_NAMES[accent] ? ACCENT_NAMES[accent]() : ACCENT_NAMES.blue(),
        step: function (d) { cycle('accent', ACCENTS, accent, d); applyAccent(); }},
      {label: tr('Widget do clima', 'Weather widget', 'Widget del clima'), toggle: Prefs.weather(),
        step: function () { Prefs.set('weather', !Prefs.weather()); renderPanels(); }},
      {label: tr('Widget de cotações', 'Quotes widget', 'Widget de cotizaciones'), toggle: Prefs.quotes(),
        step: function () { Prefs.set('quotes', !Prefs.quotes()); Data.settingsChanged(); }}
    ];
    var names = ['Bitcoin', 'Ethereum', 'Solana', tr('Dólar', 'Dollar', 'Dólar')];
    var count = Data.currency === 'BRL' ? 4 : 3;
    for (var i = 0; i < count; i++) {
      (function (i) {
        rows.push({label: names[i], toggle: Prefs.quotes() && Prefs.coin(i), dim: !Prefs.quotes(),
          step: function () { if (Prefs.quotes()) { Prefs.setCoin(i, !Prefs.coin(i)); Data.settingsChanged(); } }});
      })(i);
    }
    rows.push({label: tr('Prateleira', 'Shelf', 'Estante'), value: '›', step: function (d) { if (d >= 0) openShelfEdit(); }});
    rows.push({label: tr('Ajustes da TV', 'TV Settings', 'Ajustes del TV'), value: '›', step: function (d) { if (d >= 0) tvSettings(); }});
    return rows;
  }

  function cycle(name, values, current, d) {
    var i = values.indexOf(current);
    Prefs.set(name, values[(i + (d || 1) + values.length) % values.length]);
  }

  var rowsNow = [];

  function renderSettings() {
    var box = $('settings').firstChild;
    box.innerHTML = '';
    var title = el('div', 'title', box);
    sym('settings', title);
    title.appendChild(document.createTextNode(tr('Ajustes do Início', 'Home Settings', 'Ajustes de inicio')));
    var list = el('div', 'list', box), holder = el('div', 'rows', list);
    rowsNow = settingRows();
    list.style.height = Math.min(rowsNow.length, 7) * 78 + 'px';
    for (var i = 0; i < rowsNow.length; i++) {
      var r = rowsNow[i], row = el('div', 'row' + (r.dim ? ' dim' : ''), holder, r.label);
      if (r.toggle !== undefined) setClass(el('div', 'toggle', row), 'on', r.toggle);
      else {
        var v = el('span', 'value', row);
        if (r.value === '›') v.textContent = '›';
        else { el('span', 'chev', v, '‹'); v.appendChild(document.createTextNode(r.value)); el('span', 'chev', v, '›'); }
      }
      hover(row, Z.SETTINGS, i);
    }
    el('div', 'hint', box, tr('OK ou as setas mudam o valor.', 'OK or the arrows change the value.', 'OK o las flechas cambian el valor.'));
    updateFocus();
  }

  function openSettings() {
    st.zone = Z.SETTINGS;
    st.row = 0;
    renderSettings();
    setClass($('settings'), 'open', true);
    updateFocus();
  }

  // MARK: - Shelf editor: which apps, in what order

  function ordinal(n) {
    if (I18N.lang === 'ru') return n + '-е';
    if (I18N.lang === 'de') return n + '.';
    if (I18N.lang !== 'en') return n + 'º';
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function editList() {
    var ids = shelf.map(function (a) { return a.id; });
    return {ids: ids, rows: apps.slice().sort(function (a, b) {
      var ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1;
    })};
  }

  function renderShelfEdit() {
    var box = $('shelfedit').firstChild, e = editList();
    box.innerHTML = '';
    var title = el('div', 'title', box);
    sym('apps', title);
    title.appendChild(document.createTextNode(tr('Prateleira', 'Shelf', 'Estante')));
    var list = el('div', 'list', box), holder = el('div', 'rows', list);
    list.style.height = Math.min(e.rows.length, 7) * 78 + 'px';
    for (var i = 0; i < e.rows.length; i++) {
      var a = e.rows[i], at = e.ids.indexOf(a.id), row = el('div', 'row', holder, a.title);
      el('span', 'value', row, at >= 0 ? tr('Na prateleira · ', 'On · ', 'En el estante · ') + ordinal(at + 1) : tr('Fora', 'Off', 'Fuera'));
      hover(row, Z.EDIT, i);
    }
    el('div', 'hint', box, tr('OK põe ou tira · ← → mudam a ordem', 'OK adds or removes · ← → change the order', 'OK pone o quita · ← → cambian el orden'));
    updateFocus();
  }

  function openShelfEdit() {
    setClass($('settings'), 'open', false);
    st.zone = Z.EDIT;
    st.edit = 0;
    renderShelfEdit();
    setClass($('shelfedit'), 'open', true);
    updateFocus();
  }

  function editShelf(dx) {
    var e = editList(), app = e.rows[st.edit];
    if (!app) return;
    var ids = e.ids.slice(), at = ids.indexOf(app.id);
    if (dx === 0) {
      if (at >= 0) ids.splice(at, 1);
      else ids.push(app.id);
    } else {
      if (at < 0) return;
      var to = Math.max(0, Math.min(ids.length - 1, at + dx));
      ids.splice(at, 1);
      ids.splice(to, 0, app.id);
    }
    Prefs.set('shelf', ids);
    pickShelf();
    renderShelf();
    var again = editList();
    for (var i = 0; i < again.rows.length; i++) if (again.rows[i].id === app.id) st.edit = i;
    renderShelfEdit();
  }

  // MARK: - Opening things

  function launcher(id, name) {
    return function () {
      TV.launch(id, null, function (ok) {
        if (!ok) toast(tr('Não deu para abrir ', "Couldn't open ", 'No se pudo abrir ') + (name || id));
      });
    };
  }

  function tvSettings() {
    TV.settings(function (ok) {
      if (!ok) toast(tr('Não deu para abrir os Ajustes da TV', "Couldn't open TV Settings", 'No se pudieron abrir los Ajustes del TV'));
    });
  }

  function liveTV() {
    for (var i = 0; i < inputs.length; i++) if (inputs[i].key === 'live') return inputs[i];
    return null;
  }

  function activate() {
    switch (st.zone) {
      case Z.TOP:
        if (st.top < 3) return;
        if (st.top === 3) openApps();
        else if (st.top === 4) { var live = liveTV(); if (live) launcher(live.id, tr('TV aberta', 'Live TV', 'TV en vivo'))(); }
        else if (st.top === 5) { st.zone = Z.SHELF; openDrawer(); st.drawer = 1 < drawerInputs ? 1 : 0; updateFocus(); }
        else openSettings();
        return;
      case Z.ROWS:
        var p = view[st.r] && view[st.r].items[st.col], app = p && Data.appFor(p.app);
        if (app) launcher(app.id, app.title)();
        else if (p) toast(tr('Disponível em ', 'Available on ', 'Disponible en ') + (p.service || p.app || ''));
        return;
      case Z.SHELF:
        if (shelf[st.shelf]) launcher(shelf[st.shelf].id, shelf[st.shelf].title)();
        return;
      case Z.DRAWER:
        if (drawerItems[st.drawer]) drawerItems[st.drawer].run();
        return;
      case Z.APPS:
        if (others[st.grid]) launcher(others[st.grid].id, others[st.grid].title)();
        return;
      case Z.SETTINGS:
        if (rowsNow[st.row]) { rowsNow[st.row].step(1); if (st.zone === Z.SETTINGS) renderSettings(); }
        return;
      case Z.EDIT:
        editShelf(0);
        return;
    }
  }

  function selectTab(i) {
    if (i === st.tab) return;
    st.tab = i;
    st.r = 0;
    st.col = 0;
    renderRows(true);
  }

  function move(dx, dy) {
    switch (st.zone) {
      case Z.SHELF:
        if (dx) { if (shelf.length > 1) st.shelfPos += dx; }
        else if (dy > 0) {
          if (view.length) {
            st.zone = Z.ROWS;
            st.r = 0;
            st.col = cardNear(0, stageX(shelfCenterX(st.shelfPos)));
          } else { openDrawer(); return; }
        }
        else if (dy < 0) { st.zone = Z.TOP; st.top = st.tab; }
        break;
      case Z.ROWS:
        if (dx) st.col = Math.max(0, Math.min(view[st.r].items.length - 1, st.col + dx));
        else {
          var cx = cardX(st.r, st.col);
          if (dy < 0) {
            if (st.r > 0) { st.r--; st.col = cardNear(st.r, cx); }
            else if (shelf.length) { st.zone = Z.SHELF; st.shelfPos = nearestShelf(screenX(cx)); }
            else { st.zone = Z.TOP; st.top = st.tab; }
          } else if (st.r < view.length - 1) { st.r++; st.col = cardNear(st.r, cx); }
        }
        break;
      case Z.TOP:
        if (dx) {
          st.top = Math.max(0, Math.min(6, st.top + dx));
          if (st.top < 3) selectTab(st.top);   // as on Apple TV: focusing a tab selects it
        } else if (dy > 0) {
          if (shelf.length) st.zone = Z.SHELF;
          else if (view.length) { st.zone = Z.ROWS; st.r = 0; st.col = Math.min(rowF[0], view[0].items.length - 1); }
        }
        break;
      case Z.DRAWER:
        if (dx) st.drawer = Math.max(0, Math.min(drawerItems.length - 1, st.drawer + dx));
        else if (dy < 0) { closeDrawer(); return; }
        break;
      case Z.APPS:
        var g = st.grid + dx + dy * 5;
        if (g >= 0 && g < others.length && (dx === 0 || Math.floor(g / 5) === Math.floor(st.grid / 5))) st.grid = g;
        break;
      case Z.SETTINGS:
        if (dy) st.row = Math.max(0, Math.min(rowsNow.length - 1, st.row + dy));
        else if (dx && rowsNow[st.row]) {
          var r = rowsNow[st.row];
          if (r.value !== '›') { r.step(dx); renderSettings(); }
        }
        break;
      case Z.EDIT:
        if (dy) st.edit = Math.max(0, Math.min(apps.length - 1, st.edit + dy));
        else if (dx) editShelf(dx);
        break;
    }
    updateFocus();
  }

  function back() {
    if (st.zone === Z.EDIT) { setClass($('shelfedit'), 'open', false); openSettings(); st.row = rowsNow.length - 2; updateFocus(); return; }
    if (sheetOpen()) { closeSheets(); return; }
    if (st.zone === Z.DRAWER) { closeDrawer(); return; }
    if (st.zone === Z.ROWS && !shelf.length) { st.zone = Z.TOP; st.top = st.tab; updateFocus(); return; }
    if (st.zone !== Z.SHELF && shelf.length) { st.zone = Z.SHELF; updateFocus(); return; }
    TV.back();
  }

  /** The pointer focuses what it's over (the Magic Remote, or a mouse when previewing). */
  function hover(node, zone, index) {
    node.onmouseover = function () {
      if (saverOn || (sheetOpen() !== (zone === Z.APPS || zone === Z.SETTINGS || zone === Z.EDIT))) return;
      if (zone === Z.DRAWER && st.zone !== Z.DRAWER) return;
      if (zone !== Z.DRAWER && st.zone === Z.DRAWER && zone !== Z.SHELF) return;
      if (zone === Z.SHELF && st.zone === Z.DRAWER) closeDrawer();
      st.zone = zone;
      if (zone === Z.TOP) { st.top = index; if (index < 3) selectTab(index); }
      else if (zone === Z.ROWS) { st.r = node.r; st.col = node.c; }
      else if (zone === Z.SHELF) st.shelfPos = node.k;
      else if (zone === Z.DRAWER) st.drawer = index;
      else if (zone === Z.APPS) st.grid = index;
      else if (zone === Z.SETTINGS) st.row = index;
      else if (zone === Z.EDIT) st.edit = index;
      updateFocus();
    };
    node.onclick = function () { node.onmouseover(); activate(); };
  }

  // MARK: - Toast

  var toastTimer = 0;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    setClass(t, 'on', true);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { setClass(t, 'on', false); }, 6000);
  }

  // MARK: - Night, clock, screensaver

  function checkNight() {
    setClass(body, 'night', Data.isNight(Date.now()));
    setClass(body, 'oled', Prefs.theme() === 'oled');
  }

  function applyAccent() {
    var a = Prefs.accent();
    if (ACCENTS.indexOf(a) < 0) a = 'blue';
    for (var i = 0; i < ACCENTS.length; i++) setClass(body, 'accent-' + ACCENTS[i], ACCENTS[i] === a);
  }

  var saverOn = false, idleAt = Date.now(), saverIndex = 0, saverTimer = 0, SAVER_AFTER = 5 * 60000;

  function showSaver() {
    var photos = Data.showcase().filter(function (p) { return p.backdrop && Data.appFor(p.app); });
    saverOn = true;
    var s = $('saver');
    s.innerHTML = '';
    var a = el('div', 'photo', s), b = el('div', 'photo', s);
    el('div', 'shade', s);
    var clock = el('div', 'clock', s);
    el('div', 'time', clock);
    el('div', 'date', clock);
    el('div', 'title', clock);
    var front = a;
    function next() {
      if (!saverOn) return;
      var p = photos.length ? photos[saverIndex++ % photos.length] : null;
      var back = front === a ? b : a;
      if (p) {
        back.style.backgroundImage = 'url("' + Data.image(p.backdrop, 'original') + '")';
        back.style.webkitTransform = back.style.transform = 'scale(1.0)';
        clock.lastChild.textContent = p.title;
        setTimeout(function () {
          setClass(back, 'on', true);
          setClass(front, 'on', false);
          back.style.webkitTransform = back.style.transform = 'scale(1.08) translateX(-1.5%)';
          front = back;
        }, 60);
      }
      tickSaverClock(clock);
      saverTimer = setTimeout(next, 12000);
    }
    setClass(s, 'on', true);
    next();
  }

  function tickSaverClock(clock) {
    var d = new Date();
    clock.firstChild.textContent = Data.time(d.getTime()).replace(/ (AM|PM)$/, '');
    try {
      clock.children[1].textContent = d.toLocaleDateString(I18N.locale(), {weekday: 'long', day: 'numeric', month: 'long'});
    } catch (e) {
      clock.children[1].textContent = d.toDateString();
    }
  }

  function hideSaver() {
    saverOn = false;
    clearTimeout(saverTimer);
    setClass($('saver'), 'on', false);
  }

  function poke() {
    idleAt = Date.now();
    if (saverOn) { hideSaver(); return true; }
    return false;
  }

  // MARK: - Keys

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (poke()) { e.preventDefault(); return; }   // the first press only wakes the screen
    if (k === TV.keys.left) move(-1, 0);
    else if (k === TV.keys.right) move(1, 0);
    else if (k === TV.keys.up) move(0, -1);
    else if (k === TV.keys.down) move(0, 1);
    else if (k === TV.keys.ok) activate();
    else if (k === TV.keys.back || k === 27 || k === 8) back();
    else return;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function () { poke(); });

  // MARK: - Start

  function renderAll() {
    renderTop();
    renderQuotes();
    renderRows(true);
    renderShelf();
    renderDrawer();
    renderClock();
    checkNight();
    if (st.zone === Z.SETTINGS) renderSettings();
    updateFocus();
  }

  function loadApps(done) {
    TV.apps(function (list) {
      apps = list;
      Data.setApps(apps);
      pickShelf();
      TV.inputs(function (list2) {
        inputs = list2;
        if (done) done();
      });
    });
  }

  /** Back to the home screen (the app was opened again): the shelf, everything closed, the first tab. */
  function reset() {
    hideSaver();
    closeSheets();
    st.zone = Z.SHELF;
    st.shelf = st.shelfPos = 0;
    if (st.tab !== 0) { st.tab = 0; st.r = 0; st.col = 0; renderRows(true); }
    updateFocus();
  }

  Data.onChange(function () {
    renderQuotes();
    renderRows();
    renderMini();
    renderPanels();
    checkNight();
  });

  function reopened() {
    // LG: with handlesRelaunch the app has to come to the front itself, or opening it again while it runs shows nothing.
    if (window.PalmSystem && window.PalmSystem.activate) window.PalmSystem.activate();
    reset();
    loadApps(function () { renderShelf(); renderDrawer(); Data.refresh(); });
  }

  window.addEventListener('resize', fit);
  document.addEventListener('webOSRelaunch', reopened);   // LG: opened again while running
  window.addEventListener('appcontrol', reopened);        // Samsung: the same
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hideSaver(); return; }
    idleAt = Date.now();
    loadApps(function () { renderShelf(); renderDrawer(); updateFocus(); Data.refresh(); });
  });

  I18N.set(Prefs.language());
  fit();
  setStyleGeo();
  checkNight();
  applyAccent();
  renderTop();
  loadApps(function () {
    renderAll();
    Data.refresh();
  });
  setInterval(function () {
    renderClock();
    checkNight();
    Data.refresh();
    if (!saverOn && !sheetOpen() && Date.now() - idleAt > SAVER_AFTER) showSaver();
    if (saverOn) tickSaverClock($('saver').querySelector('.clock'));
  }, 30000);

  // For the browser preview and tests.
  window.FreeMyTV = {state: st, move: move, activate: activate, back: back, showSaver: showSaver, hideSaver: hideSaver, toast: toast};
})();
