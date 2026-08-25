
var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

(function(){
  var els = document.querySelectorAll('.reveal, .stagger, .draw, .wipe');
  if(!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function(en){
    en.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.1, rootMargin:'0px 0px -40px 0px' });
  els.forEach(function(e){ io.observe(e); });
})();

(function(){
  var bar = document.getElementById('scrollProgress');
  if(!bar) return;
  var t = false;
  function up(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    t = false;
  }
  window.addEventListener('scroll', function(){ if(!t){ requestAnimationFrame(up); t = true; } }, { passive:true });
  up();
})();

(function(){
  var btn = document.getElementById('navToggleBtn'), nav = document.getElementById('navLinks');
  if(!btn || !nav) return;
  btn.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); });
  });
})();

(function(){
  var b = document.getElementById('backToTop');
  if(!b) return;
  window.addEventListener('scroll', function(){ b.classList.toggle('show', window.scrollY > 700); }, { passive:true });
  b.addEventListener('click', function(){ window.scrollTo({ top:0, behavior: REDUCE ? 'auto' : 'smooth' }); });
})();

(function(){
  var hero = document.getElementById('heroSection');
  var glow = document.getElementById('heroGlow');
  var tilt = document.getElementById('heroTilt');
  if(!hero || REDUCE) return;
  hero.addEventListener('mousemove', function(e){
    var r = hero.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    if(glow){ glow.style.setProperty('--mx', x+'%'); glow.style.setProperty('--my', y+'%'); }
    if(tilt) tilt.style.transform = 'rotateX(' + (((y-50)/50)*-6) + 'deg) rotateY(' + (((x-50)/50)*8) + 'deg)';
  });
  hero.addEventListener('mouseleave', function(){ if(tilt) tilt.style.transform = 'rotateX(0deg) rotateY(0deg)'; });
})();

(function(){
  var cs = document.querySelectorAll('.count[data-target]');
  if(!cs.length) return;
  function fmt(v,d){ return v.toLocaleString('ja-JP',{ minimumFractionDigits:d, maximumFractionDigits:d }); }
  function run(el){
    var target = parseFloat(el.getAttribute('data-target'));
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if(REDUCE || isNaN(target)){ el.textContent = fmt(target,d); return; }
    var start = null, dur = 1500;
    function step(ts){
      if(start === null) start = ts;
      var p = Math.min((ts-start)/dur, 1);
      el.textContent = fmt(target * (1 - Math.pow(1-p,3)), d);
      if(p < 1) requestAnimationFrame(step); else el.textContent = fmt(target,d);
    }
    requestAnimationFrame(step);
  }
  if(!('IntersectionObserver' in window)){ cs.forEach(run); return; }
  var io = new IntersectionObserver(function(en){
    en.forEach(function(e){ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
  }, { threshold:0.5 });
  cs.forEach(function(c){ io.observe(c); });
})();

(function(){
  var btns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  if(!btns.length) return;
  function select(btn){
    btns.forEach(function(b){
      var on = (b === btn);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      var p = document.getElementById(b.getAttribute('aria-controls'));
      if(p) p.classList.toggle('active', on);
    });
  }
  btns.forEach(function(b,i){
    b.addEventListener('click', function(){ select(b); });
    b.addEventListener('keydown', function(e){
      var n = null;
      if(e.key === 'ArrowRight') n = btns[(i+1) % btns.length];
      if(e.key === 'ArrowLeft')  n = btns[(i-1+btns.length) % btns.length];
      if(n){ e.preventDefault(); n.focus(); select(n); }
    });
  });
})();

(function(){
  var wrap = document.getElementById('roadWrap'), fill = document.getElementById('roadFill');
  if(!wrap || !fill) return;
  var t = false;
  function up(){
    var r = wrap.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh * 0.62 - r.top) / r.height;
    fill.style.height = Math.max(0, Math.min(1, p)) * r.height + 'px';
    t = false;
  }
  window.addEventListener('scroll', function(){ if(!t){ requestAnimationFrame(up); t = true; } }, { passive:true });
  window.addEventListener('resize', up);
  up();
})();

(function(){
  if(REDUCE) return;
  var arts = Array.prototype.slice.call(document.querySelectorAll('.section-art'));
  if(!arts.length) return;
  var t = false;
  function up(){
    var vh = window.innerHeight;
    arts.forEach(function(a){
      var r = a.getBoundingClientRect();
      if(r.bottom < -100 || r.top > vh + 100) return;
      var c = (r.top + r.height/2 - vh/2) / vh;
      a.style.transform = 'translateY(' + (c * -14).toFixed(2) + 'px)';
    });
    t = false;
  }
  window.addEventListener('scroll', function(){ if(!t){ requestAnimationFrame(up); t = true; } }, { passive:true });
  up();
})();

/* ---- 3D tilt on cards ---- */
(function(){
  if(REDUCE || !window.matchMedia('(hover:hover)').matches) return;
  var cards = document.querySelectorAll('.tilt-card');
  cards.forEach(function(card){
    card.addEventListener('pointermove', function(e){
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.style.transform = 'perspective(900px) rotateX(' + (((y-0.5)*-7).toFixed(2)) + 'deg) rotateY(' + (((x-0.5)*9).toFixed(2)) + 'deg) translateY(-6px)';
    });
    card.addEventListener('pointerleave', function(){ card.style.transform = ''; });
  });
})();

/* ---- soft page transition between pages ---- */
(function(){
  if(REDUCE) return;
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if(!a) return;
    if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if(a.target && a.target !== '_self') return;
    var href = a.getAttribute('href');
    if(!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:)/.test(href)) return;
    if(!/\.html$/.test(href)) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(function(){ window.location.href = href; }, 240);
  });
  window.addEventListener('pageshow', function(){ document.body.classList.remove('leaving'); });
})();
