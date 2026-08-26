/* =========================================================
   Word(.docx) → 記事ページ 変換ツール
   ブラウザ内だけで動きます（ファイルはどこにも送信されません）
   ========================================================= */
(function () {
  var dz = document.getElementById('dropzone');
  if (!dz) return;

  var fileInput = document.getElementById('fileInput');
  var editor    = document.getElementById('editor');
  var msg       = document.getElementById('msg');
  var fDate     = document.getElementById('fDate');
  var fTag      = document.getElementById('fTag');
  var fTitle    = document.getElementById('fTitle');
  var pvDate    = document.getElementById('pvDate');
  var pvTag     = document.getElementById('pvTag');
  var pvTitle   = document.getElementById('pvTitle');
  var pvBody    = document.getElementById('pvBody');
  var snippet   = document.getElementById('snippet');
  var note      = document.getElementById('fileNameNote');

  var bodyHTML = '';
  var slug = '';

  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'conv-msg ' + (kind || '');
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- ファイル受け取り ---------- */
  dz.addEventListener('click', function () { fileInput.click(); });
  dz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); });
  });
  dz.addEventListener('drop', function (e) {
    if (e.dataTransfer.files && e.dataTransfer.files.length) handle(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length) handle(fileInput.files[0]);
  });

  function handle(file) {
    if (!/\.docx$/i.test(file.name)) {
      say('.docx ファイルを選んでください。（.doc の場合はWordで「名前を付けて保存」→ .docx に変換してください）', 'err');
      return;
    }
    if (typeof mammoth === 'undefined') {
      say('変換ライブラリ（mammoth.min.js）が読み込めませんでした。ファイルが同じ場所にあるか確認してください。', 'err');
      return;
    }
    say('変換しています…', 'ok');

    var reader = new FileReader();
    reader.onerror = function () { say('ファイルを読み込めませんでした。', 'err'); };
    reader.onload = function (ev) {
      mammoth.convertToHtml(
        { arrayBuffer: ev.target.result },
        {
          styleMap: [
            "p[style-name='表題'] => h1:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='見出し 1'] => h1:fresh",
            "p[style-name='見出し 2'] => h2:fresh",
            "p[style-name='見出し 3'] => h3:fresh",
            "p[style-name='見出し 4'] => h4:fresh",
            "p[style-name='引用文'] => blockquote > p:fresh"
          ]
        }
      ).then(function (result) {
        var html = result.value || '';
        var tmp = document.createElement('div');
        tmp.innerHTML = html;

        /* 先頭の h1 を記事タイトルとして取り出す */
        var title = '';
        var firstH1 = tmp.querySelector('h1');
        if (firstH1) { title = firstH1.textContent.trim(); firstH1.parentNode.removeChild(firstH1); }
        if (!title) {
          var firstP = tmp.querySelector('p');
          if (firstP && firstP.textContent.trim()) title = firstP.textContent.trim().slice(0, 60);
        }
        if (!title) title = file.name.replace(/\.docx$/i, '');

        /* 残った見出しを1段階下げる（記事タイトルが h1 なので本文は h2 から） */
        ['h4', 'h3', 'h2', 'h1'].forEach(function (tag) {
          var to = 'h' + Math.min(6, parseInt(tag.charAt(1), 10) + 1);
          Array.prototype.slice.call(tmp.querySelectorAll(tag)).forEach(function (el) {
            var n = document.createElement(to);
            n.innerHTML = el.innerHTML;
            el.parentNode.replaceChild(n, el);
          });
        });

        /* 空段落を掃除、表は横スクロールできるように包む */
        Array.prototype.slice.call(tmp.querySelectorAll('p')).forEach(function (p) {
          if (!p.textContent.trim() && !p.querySelector('img')) p.parentNode.removeChild(p);
        });
        Array.prototype.slice.call(tmp.querySelectorAll('table')).forEach(function (t) {
          var w = document.createElement('div');
          w.className = 'article-table-wrap';
          t.parentNode.insertBefore(w, t);
          w.appendChild(t);
        });
        Array.prototype.slice.call(tmp.querySelectorAll('img')).forEach(function (im) {
          im.setAttribute('loading', 'lazy');
          im.setAttribute('decoding', 'async');
          if (!im.getAttribute('alt')) im.setAttribute('alt', '');
        });

        bodyHTML = tmp.innerHTML.trim();

        /* 日付：ファイル名に 2026-09-15 / 20260915 があれば拾う。なければ今日 */
        var d = new Date();
        var m = file.name.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/);
        var dateStr = m ? (m[1] + '.' + m[2] + '.' + m[3])
                        : (d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()));

        fDate.value  = dateStr;
        fTitle.value = title;
        if (!fTag.value) fTag.value = 'お知らせ';

        editor.classList.remove('hidden');
        refresh();

        var warn = (result.messages || []).filter(function (x) { return x.type === 'warning'; });
        say('変換できました。内容を確認して「記事ファイルをダウンロード」を押してください。'
            + (warn.length ? '（Wordの一部の書式は簡略化されました）' : ''), 'ok');
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }).catch(function (err) {
        say('変換に失敗しました：' + (err && err.message ? err.message : err), 'err');
      });
    };
    reader.readAsArrayBuffer(file);
  }

  /* ---------- 入力に合わせて更新 ---------- */
  [fDate, fTag, fTitle].forEach(function (el) { el.addEventListener('input', refresh); });

  function refresh() {
    var date  = fDate.value.trim()  || '';
    var tag   = fTag.value.trim()   || 'お知らせ';
    var title = fTitle.value.trim() || '（無題）';

    slug = 'article-' + (date.replace(/[^0-9]/g, '') || 'new');

    pvDate.textContent  = date;
    pvTag.textContent   = tag;
    pvTitle.textContent = title;
    pvBody.innerHTML    = bodyHTML;

    note.textContent = slug + '.html として保存されます';
    snippet.textContent =
      '  {\n' +
      '    date:  "' + date + '",\n' +
      '    tag:   "' + tag + '",\n' +
      '    title: "' + title.replace(/"/g, '”') + '",\n' +
      '    url:   "' + slug + '.html"\n' +
      '  },';
  }

  /* ---------- 記事ページのHTMLを組み立てる ---------- */
  function buildPage() {
    var date  = esc(fDate.value.trim());
    var tag   = esc(fTag.value.trim() || 'お知らせ');
    var title = esc(fTitle.value.trim() || '（無題）');

    var head = document.querySelector('header.site').outerHTML;
    var foot = document.querySelector('footer').outerHTML;
    var sprite = document.querySelector('svg[width="0"]').outerHTML;

    return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + title + '｜OLIVE おかやま地域未来共創プラットフォーム</title>\n' +
      '<meta name="description" content="' + title + '">\n' +
      '<script>document.documentElement.classList.remove("no-js");<\/script>\n' +
      '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M20 34C20 34 8 28 8 16C8 9 13 4 20 4C27 4 32 9 32 16C32 28 20 34 20 34Z\' fill=\'none\' stroke=\'%234f6329\' stroke-width=\'2.6\'/%3E%3Cpath d=\'M20 34V10\' stroke=\'%234f6329\' stroke-width=\'2.6\'/%3E%3C/svg%3E">\n' +
      '<meta name="theme-color" content="#0a5ba8">\n' +
      '<meta property="og:type" content="article">\n' +
      '<meta property="og:site_name" content="おかやま地域未来共創プラットフォーム（OLIVE）">\n' +
      '<meta property="og:title" content="' + title + '">\n' +
      '<meta property="og:description" content="' + title + '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap" rel="stylesheet">\n' +
      '<link rel="stylesheet" href="style.css">\n' +
      '</head>\n<body>\n' +
      '<a class="skip" href="#main">本文へスキップ</a>\n' +
      sprite + '\n<div id="scrollProgress"></div>\n' +
      head + '\n<main id="main">\n' +
      '  <div class="page-head-band">\n    <div class="wrap">\n' +
      '      <div class="article-head page-enter">\n' +
      '        <div class="article-meta"><span class="date">' + date + '</span><span class="tag">' + tag + '</span></div>\n' +
      '        <h1>' + title + '</h1>\n' +
      '      </div>\n    </div>\n  </div>\n\n' +
      '  <section>\n    <div class="wrap">\n' +
      '      <div class="article-body reveal">\n' + bodyHTML + '\n      </div>\n' +
      '      <div class="article-back"><a class="btn btn-ghost" href="news.html">← お知らせ一覧へ戻る</a></div>\n' +
      '    </div>\n  </section>\n' +
      '</main>\n' + foot + '\n' +
      '<button class="back-to-top" id="backToTop" aria-label="ページ上部へ戻る">↑</button>\n' +
      '<script src="news.js"><\/script>\n<script src="site.js"><\/script>\n' +
      '</body>\n</html>\n';
  }

  /* ---------- ダウンロード ---------- */
  document.getElementById('btnDownload').addEventListener('click', function () {
    if (!bodyHTML) { say('先にWordファイルを読み込んでください。', 'err'); return; }
    var blob = new Blob([buildPage()], { type: 'text/html;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    say(slug + '.html をダウンロードしました。GitHubにアップロードし、上のコードを news.js に貼り付けてください。', 'ok');
  });

  /* ---------- コピー ---------- */
  document.getElementById('btnCopy').addEventListener('click', function () {
    var t = snippet.textContent;
    function done() { say('コピーしました。news.js に貼り付けてください。', 'ok'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { say('コピーできませんでした。手動で選択してください。', 'err'); }
      ta.remove();
    }
  });
})();
