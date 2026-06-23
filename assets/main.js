/* =========================================================
   撮影＆現像ハブ — 共通スクリプト main.js
   ・スクロールで要素をふわっと表示
   ・現在ページをナビでハイライト
   ・用語集ページがあれば検索フィルタを有効化
   ページ固有のシミュレーターは各ページ側に書く。
   ========================================================= */
(function(){
  // ---- scroll reveal ----
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if(reduce || !('IntersectionObserver' in window)){
    items.forEach(function(i){ i.classList.add('in'); });
  }else{
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    items.forEach(function(i){ io.observe(i); });
  }

  // ---- nav active state ----
  // data-page 属性 (body) と nav a[data-nav] を突き合わせてハイライト
  var page = document.body.getAttribute('data-page');
  if(page){
    document.querySelectorAll('.nav a[data-nav]').forEach(function(a){
      if(a.getAttribute('data-nav') === page){ a.classList.add('active'); }
    });
  }

  // ---- glossary filter (用語集ページのみ) ----
  var search = document.getElementById('glossarySearch');
  if(search){
    var terms = Array.prototype.slice.call(document.querySelectorAll('[data-term]'));
    var empty = document.getElementById('glossaryEmpty');
    search.addEventListener('input', function(){
      var q = search.value.trim().toLowerCase();
      var hits = 0;
      terms.forEach(function(t){
        var hay = (t.getAttribute('data-term') + ' ' + t.textContent).toLowerCase();
        var show = q === '' || hay.indexOf(q) !== -1;
        t.style.display = show ? '' : 'none';
        if(show) hits++;
      });
      if(empty){ empty.style.display = hits === 0 ? 'block' : 'none'; }
    });
  }
})();
