
const state = {
  allJobs: [],
  jobs: [],
  metric: 'ai_impact_index',
  rankMetric: 'ai_impact_index',
  rankDescending: true,
  hovered: null,
  selected: null,
  compareA: null,
  compareB: null,
  compareArm: null
};

const colors = {
  '高风险替代型':'red',
  '人机协同增强型':'blue',
  '现实安全型':'green',
  '决策责任型':'purple',
  '重构转型型':'orange'
};

function num(v){ return Number(v || 0); }

async function init(){
  const data = window.__JOB_DATA__ || await (await fetch('data/jobs.json')).json();
  state.allJobs = data.map(d => ({
    ...d,
    ai_replace_index: num(d.ai_replace_index),
    ai_augment_index: num(d.ai_augment_index),
    real_world_index: num(d.real_world_index),
    ai_impact_index: num(d.ai_impact_index)
  }));
  state.jobs = [...state.allJobs];
  setupFilters();
  wireEvents();
  updateAll();
}

function setupFilters(){
  const bigs = [...new Set(state.allJobs.map(d => d.big_category))].sort();
  const labels = [...new Set(state.allJobs.map(d => d.label))].sort();
  const bigFilter = document.getElementById('bigFilter');
  bigs.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v; bigFilter.appendChild(o);
  });
  const labelFilter = document.getElementById('labelFilter');
  labels.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v; labelFilter.appendChild(o);
  });
}

function wireEvents(){
  document.querySelectorAll('.metric').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metric').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.metric = btn.dataset.metric;
      renderTreemap();
      renderInsights();
    });
  });

  document.querySelectorAll('.rank-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.rankMetric = btn.dataset.rank;
      renderRanking();
    });
  });

  document.getElementById('rankOrderToggle').addEventListener('click', () => {
    state.rankDescending = !state.rankDescending;
    updateRankOrderButton();
    renderRanking();
  });

  ['bigFilter','digitalFilter','labelFilter'].forEach(id => {
    document.getElementById(id).addEventListener('input', applyFilters);
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  let searchSugTimer = null;
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchSugTimer);
    searchSugTimer = setTimeout(() => renderSearchSuggestions(), 80);
  });
  searchInput.addEventListener('focus', () => renderSearchSuggestions());
  searchInput.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      hideSearchSuggestions();
      return;
    }
    if(e.key === 'Enter'){
      e.preventDefault();
      const items = getSearchSuggestions(searchInput.value);
      if(items.length){
        locateJobOnMap(items[0]);
        return;
      }
      const q = searchInput.value.trim().toLowerCase();
      if(!q) return;
      const exact = state.jobs.find(d => (d.occupation_name || '').toLowerCase() === q);
      if(exact) locateJobOnMap(exact);
    }
  });
  document.addEventListener('click', (e) => {
    if(!e.target.closest('.search-wrap')) hideSearchSuggestions();
  });

  document.getElementById('setCompareA').addEventListener('click', () => {
    if(state.selected){
      state.compareA = state.selected;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
    }
  });
  document.getElementById('setCompareB').addEventListener('click', () => {
    if(state.selected){
      state.compareB = state.selected;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
    }
  });
  document.getElementById('armCompareA').addEventListener('click', () => {
    state.compareArm = state.compareArm === 'A' ? null : 'A';
    updateArmCompareUI();
  });
  document.getElementById('armCompareB').addEventListener('click', () => {
    state.compareArm = state.compareArm === 'B' ? null : 'B';
    updateArmCompareUI();
  });
  document.getElementById('clearCompare').addEventListener('click', () => {
    state.compareA = null; state.compareB = null; state.compareArm = null;
    updateArmCompareUI();
    renderCompare();
  });
  document.getElementById('downloadCard').addEventListener('click', downloadShareCard);
  window.addEventListener('resize', renderTreemap);
}

function applyFilters(){
  const big = document.getElementById('bigFilter').value;
  const digital = document.getElementById('digitalFilter').value;
  const label = document.getElementById('labelFilter').value;

  state.jobs = state.allJobs.filter(d => {
    const hitBig = !big || d.big_category === big;
    const hitDigital = !digital || d.is_digital === digital;
    const hitLabel = !label || d.label === label;
    return hitBig && hitDigital && hitLabel;
  });

  if(state.selected && !state.jobs.find(d => d.record_id === state.selected.record_id)){
    state.selected = null;
  }
  updateAll();
  const si = document.getElementById('searchInput');
  if(si && document.activeElement === si) renderSearchSuggestions();
}

function locateJobOnMap(d){
  if(!d) return;
  const inView = state.jobs.find(j => j.record_id === d.record_id);
  if(!inView){
    alert('当前大类与筛选范围内未找到该职业，请先调整「全部大类 / 岗位 / 标签」后再定位。');
    return;
  }
  state.selected = inView;
  const input = document.getElementById('searchInput');
  if(input) input.value = inView.occupation_name || '';
  hideSearchSuggestions();
  renderTreemap();
  renderDetail();
}

function hideSearchSuggestions(){
  const box = document.getElementById('searchSuggestions');
  box.classList.add('hidden');
  box.innerHTML = '';
}

function getSearchSuggestions(raw){
  const q = raw.trim().toLowerCase();
  if(q.length < 1) return [];
  const scored = [];
  for(const d of state.jobs){
    const name = (d.occupation_name || '').toLowerCase();
    const blob = [d.occupation_name,d.detail_category,d.small_category,d.middle_category,d.big_category,d.label].join(' ').toLowerCase();
    if(!blob.includes(q)) continue;
    let score = 0;
    if(name.startsWith(q)) score += 120;
    else if(name.includes(q)) score += 60;
    if((d.label || '').toLowerCase().includes(q)) score += 15;
    if((d.big_category || '').toLowerCase().includes(q)) score += 8;
    scored.push({d, score});
  }
  scored.sort((a,b) => b.score - a.score || (a.d.occupation_name || '').localeCompare(b.d.occupation_name || '', 'zh'));
  const seen = new Set();
  const out = [];
  for(const {d} of scored){
    const id = d.record_id;
    if(seen.has(id)) continue;
    seen.add(id);
    out.push(d);
    if(out.length >= 12) break;
  }
  return out;
}

function renderSearchSuggestions(){
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggestions');
  const items = getSearchSuggestions(input.value);
  if(!items.length){
    hideSearchSuggestions();
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = '';
  items.forEach(d => {
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.setAttribute('role', 'option');
    const nameEl = document.createElement('div');
    nameEl.className = 'sug-name';
    nameEl.textContent = d.occupation_name || '—';
    const metaEl = document.createElement('div');
    metaEl.className = 'sug-meta';
    metaEl.textContent = [d.big_category, d.middle_category, d.label].filter(Boolean).join(' · ');
    div.appendChild(nameEl);
    div.appendChild(metaEl);
    div.addEventListener('mousedown', e => {
      e.preventDefault();
      locateJobOnMap(d);
    });
    box.appendChild(div);
  });
}

function updateArmCompareUI(){
  const a = document.getElementById('armCompareA');
  const b = document.getElementById('armCompareB');
  if(a) a.classList.toggle('active', state.compareArm === 'A');
  if(b) b.classList.toggle('active', state.compareArm === 'B');
}

function updateAll(){
  renderStats();
  renderTreemap();
  renderLabelBars();
  renderInsights();
  renderRanking();
  renderDetail();
  renderCompare();
}

function colorForValue(metric, value){
  if(metric === 'real_world_index'){
    return d3.interpolateGnBu((value||0)/100);
  }
  return d3.interpolateTurbo((value||0)/100);
}

function renderStats(){
  const jobs = state.jobs;
  const avg = metric => d3.mean(jobs, d => num(d[metric])) || 0;
  document.getElementById('statTotal').textContent = jobs.length.toLocaleString();
  document.getElementById('statAvg').textContent = avg('ai_impact_index').toFixed(1);
  document.getElementById('statDigital').textContent = jobs.length ? ((jobs.filter(d => d.is_digital === '是').length / jobs.length) * 100).toFixed(1) + '%' : '-';
  document.getElementById('statGreen').textContent = jobs.length ? ((jobs.filter(d => d.is_green === '是').length / jobs.length) * 100).toFixed(1) + '%' : '-';

  const svg = d3.select('#histogram');
  svg.selectAll('*').remove();
  const width = 260, height = 150, margin = {top:8,right:8,bottom:20,left:8};
  const bins = d3.bin().domain([0,100]).thresholds(10)(jobs.map(d => num(d[state.metric])));
  const x = d3.scaleLinear().domain([0,100]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length) || 1]).nice().range([height - margin.bottom, margin.top]);
  svg.append('g')
    .selectAll('rect')
    .data(bins)
    .enter()
    .append('rect')
    .attr('x', d => x(d.x0) + 1)
    .attr('y', d => y(d.length))
    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr('height', d => y(0) - y(d.length))
    .attr('rx', 4)
    .attr('fill', '#6ee7ff');
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
    .call(g => g.selectAll('text').attr('fill', '#95a8c8').style('font-size', '10px'))
    .call(g => g.selectAll('path,line').attr('stroke', '#334155'));
}

function renderLabelBars(){
  const container = document.getElementById('labelBars');
  container.innerHTML = '';
  const counts = d3.rollup(state.jobs, v => v.length, d => d.label);
  const total = state.jobs.length || 1;
  [...counts.entries()].sort((a,b)=>b[1]-a[1]).forEach(([label, count]) => {
    const row = document.createElement('div'); row.className = 'label-row';
    row.innerHTML = `<div>${label}</div><div class="bar"><span style="width:${(count/total)*100}%;background:${labelColor(label)}"></span></div><div>${count}</div>`;
    container.appendChild(row);
  });
}

function labelColor(label){
  const map = {
    '高风险替代型':'#ef4444',
    '人机协同增强型':'#3b82f6',
    '现实安全型':'#22c55e',
    '决策责任型':'#8b5cf6',
    '重构转型型':'#f59e0b'
  };
  return map[label] || '#94a3b8';
}

function renderInsights(){
  const jobs = state.jobs;
  const avgImpact = d3.mean(jobs, d => num(d.ai_impact_index)) || 0;
  const avgDigital = d3.mean(jobs.filter(d=>d.is_digital==='是'), d => num(d.ai_impact_index)) || 0;
  const avgNonDigital = d3.mean(jobs.filter(d=>d.is_digital!=='是'), d => num(d.ai_impact_index)) || 0;
  const top = [...jobs].sort((a,b)=>num(b[state.metric])-num(a[state.metric]))[0];
  const text = `
    当前筛选下，平均综合影响为 <b>${avgImpact.toFixed(1)}</b>。数字化岗位的平均综合影响为 <b>${avgDigital.toFixed(1)}</b>，
    高于非数字化岗位的 <b>${avgNonDigital.toFixed(1)}</b>。当前视图中最突出的职业是 <b>${top ? top.occupation_name : '—'}</b>，
    在“${metricTitle(state.metric)}”维度上分值最高，说明这一类工作更可能被 AI 重构。`;
  document.getElementById('insightText').innerHTML = text;
}

function metricTitle(metric){
  const m = {
    ai_impact_index:'综合影响',
    ai_replace_index:'替代指数',
    ai_augment_index:'增强指数',
    real_world_index:'现实依赖'
  };
  return m[metric] || metric;
}

function renderTreemap(){
  const canvas = document.getElementById('treemap');
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const width = wrap.clientWidth;
  const height = wrap.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);

  // size by impact and tasks to avoid zero-size nodes
  const root = d3.hierarchy({children: state.jobs})
    .sum(d => Math.max(1, num(d.task_count) * 4 + num(d.ai_impact_index)));
  d3.treemap().size([width,height]).paddingInner(2).round(true)(root);
  const leaves = root.leaves();

  leaves.forEach(d => {
    const v = num(d.data[state.metric]);
    ctx.fillStyle = colorForValue(state.metric, v);
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    ctx.strokeStyle = 'rgba(11,16,32,.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(d.x0 + .5, d.y0 + .5, d.x1 - d.x0 - 1, d.y1 - d.y0 - 1);

    const w = d.x1-d.x0, h = d.y1-d.y0;
    if(w > 88 && h > 34){
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textBaseline = 'top';
      let txt = d.data.occupation_name;
      if(ctx.measureText(txt).width > w - 10){
        while(txt.length && ctx.measureText(txt + '…').width > w - 12) txt = txt.slice(0,-1);
        txt += '…';
      }
      ctx.fillText(txt, d.x0 + 6, d.y0 + 6);
      ctx.fillStyle = 'rgba(229,238,252,.7)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(String(v), d.x0 + 6, d.y0 + 22);
    }
  });

  if(state.selected){
    const sel = leaves.find(d => d.data.record_id === state.selected.record_id);
    if(sel){
      ctx.save();
      ctx.shadowColor = 'rgba(110,231,255,.9)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#6ee7ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(sel.x0 + 1.5, sel.y0 + 1.5, sel.x1 - sel.x0 - 3, sel.y1 - sel.y0 - 3);
      ctx.restore();
    }
  }

  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = leaves.find(d => x>=d.x0 && x<=d.x1 && y>=d.y0 && y<=d.y1);
    if(hit){
      state.hovered = hit.data;
      showTooltip(e.clientX, e.clientY, hit.data);
    } else {
      hideTooltip();
    }
  };
  canvas.onmouseleave = () => {
    state.hovered = null;
    hideTooltip();
  };
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = leaves.find(d => x>=d.x0 && x<=d.x1 && y>=d.y0 && y<=d.y1);
    if(!hit) return;

    const shortcutA = e.metaKey || e.ctrlKey;
    const shortcutB = e.shiftKey && !shortcutA;

    if(shortcutA){
      state.compareA = hit.data;
      state.selected = hit.data;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
      renderDetail();
      renderTreemap();
      return;
    }
    if(shortcutB){
      state.compareB = hit.data;
      state.selected = hit.data;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
      renderDetail();
      renderTreemap();
      return;
    }
    if(state.compareArm === 'A'){
      state.compareA = hit.data;
      state.selected = hit.data;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
      renderDetail();
      renderTreemap();
      return;
    }
    if(state.compareArm === 'B'){
      state.compareB = hit.data;
      state.selected = hit.data;
      state.compareArm = null;
      updateArmCompareUI();
      renderCompare();
      renderDetail();
      renderTreemap();
      return;
    }

    state.selected = hit.data;
    renderDetail();
    renderTreemap();
  };
}

function showTooltip(clientX, clientY, d){
  const tip = document.getElementById('tooltip');
  tip.style.position = 'fixed';
  tip.innerHTML = `
    <div style="font-weight:800;font-size:14px;margin-bottom:4px">${d.occupation_name}</div>
    <div style="color:#95a8c8;margin-bottom:6px">${d.big_category} / ${d.middle_category}</div>
    <div>综合影响：<b>${d.ai_impact_index}</b>｜替代：<b>${d.ai_replace_index}</b>｜增强：<b>${d.ai_augment_index}</b>｜现实依赖：<b>${d.real_world_index}</b></div>
    <div style="margin-top:6px"><span class="tag ${colors[d.label] || 'blue'}">${d.label}</span></div>
  `;
  tip.classList.remove('hidden');

  const gap = 12;
  let left = clientX + gap;
  let top = clientY + gap;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const margin = 10;

  if(left + tw > vw - margin) left = Math.max(margin, clientX - tw - gap);
  if(top + th > vh - margin) top = Math.max(margin, clientY - th - gap);
  if(left < margin) left = margin;
  if(top < margin) top = margin;

  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}

function hideTooltip(){
  document.getElementById('tooltip').classList.add('hidden');
}

function renderDetail(){
  const el = document.getElementById('detailCard');
  const d = state.selected;
  if(!d){
    el.className = 'detail-card empty';
    el.textContent = '点击任意职业，查看四项指数、标签与解释。';
    return;
  }
  el.className = 'detail-card';
  el.innerHTML = `
    <div class="detail-title">${d.occupation_name}</div>
    <div class="detail-sub">${d.big_category} / ${d.middle_category} / ${d.small_category}</div>
    <div>
      <span class="tag ${colors[d.label] || 'blue'}">${d.label}</span>
      <span class="tag blue">${d.is_digital==='是' ? '数字化岗位' : '非数字化岗位'}</span>
      <span class="tag green">${d.is_green==='是' ? '绿色岗位' : '非绿色岗位'}</span>
    </div>
    <div class="metrics">
      <div class="metric-box"><div class="k">综合影响</div><div class="v">${d.ai_impact_index}</div></div>
      <div class="metric-box"><div class="k">替代指数</div><div class="v">${d.ai_replace_index}</div></div>
      <div class="metric-box"><div class="k">增强指数</div><div class="v">${d.ai_augment_index}</div></div>
      <div class="metric-box"><div class="k">现实依赖</div><div class="v">${d.real_world_index}</div></div>
    </div>
    <div class="detail-text"><b>职业描述：</b>${d.detail_description || '—'}</div>
    <div class="detail-text" style="margin-top:8px"><b>主要任务：</b>${(d.detail_tasks || '—').replace(/\n/g,'<br>')}</div>
    <div class="detail-text" style="margin-top:10px"><b>替代解释：</b>${d.replace_rationale}</div>
    <div class="detail-text"><b>增强解释：</b>${d.augment_rationale}</div>
    <div class="detail-text"><b>现实依赖解释：</b>${d.real_world_rationale}</div>
    <div class="detail-text"><b>综合影响解释：</b>${d.impact_rationale}</div>
  `;
}

function updateRankOrderButton(){
  const btn = document.getElementById('rankOrderToggle');
  if(!btn) return;
  if(state.rankDescending){
    btn.textContent = '升序';
    btn.title = '当前：分值从高到低；点击改为从低到高';
    btn.setAttribute('aria-pressed', 'false');
  } else {
    btn.textContent = '降序';
    btn.title = '当前：分值从低到高；点击改为从高到低';
    btn.setAttribute('aria-pressed', 'true');
  }
}

function renderRanking(){
  const list = document.getElementById('rankingList');
  list.innerHTML = '';
  const dir = state.rankDescending ? 1 : -1;
  [...state.jobs]
    .sort((a,b)=> dir * (num(b[state.rankMetric]) - num(a[state.rankMetric])))
    .slice(0,15)
    .forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'ranking-item';
      li.innerHTML = `<b>${d.occupation_name}</b><span style="color:#95a8c8">${d.label}｜${metricTitle(state.rankMetric)} ${d[state.rankMetric]}</span>`;
      li.addEventListener('click', ()=>{ state.selected = d; renderDetail(); renderTreemap(); });
      list.appendChild(li);
    });
  updateRankOrderButton();
}

function renderCompare(){
  const a = state.compareA, b = state.compareB;
  document.getElementById('compareA').textContent = 'A：' + (a ? a.occupation_name : '未选择');
  document.getElementById('compareB').textContent = 'B：' + (b ? b.occupation_name : '未选择');

  const svg = d3.select('#compareRadar');
  svg.selectAll('*').remove();
  const width = 320, height = 260, cx = 160, cy = 130, radius = 82;
  const metrics = [
    ['综合影响','ai_impact_index'],
    ['替代','ai_replace_index'],
    ['增强','ai_augment_index'],
    ['现实依赖','real_world_index']
  ];
  for(let level=1; level<=5; level++){
    const r = radius * level / 5;
    const pts = metrics.map((_,i)=>{
      const angle = -Math.PI/2 + i * (Math.PI*2/metrics.length);
      return [cx + Math.cos(angle)*r, cy + Math.sin(angle)*r];
    });
    svg.append('polygon').attr('points', pts.map(p=>p.join(',')).join(' '))
      .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,.08)');
  }
  metrics.forEach((m,i)=>{
    const angle = -Math.PI/2 + i * (Math.PI*2/metrics.length);
    const x = cx + Math.cos(angle)*radius, y = cy + Math.sin(angle)*radius;
    svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', x).attr('y2', y).attr('stroke','rgba(255,255,255,.08)');
    svg.append('text').attr('x', cx + Math.cos(angle)*(radius+18)).attr('y', cy + Math.sin(angle)*(radius+18))
      .attr('text-anchor','middle').attr('fill','#95a8c8').style('font-size','11px').text(m[0]);
  });

  function poly(job, color){
    if(!job) return;
    const pts = metrics.map((m,i)=>{
      const angle = -Math.PI/2 + i * (Math.PI*2/metrics.length);
      const r = radius * (num(job[m[1]])/100);
      return [cx + Math.cos(angle)*r, cy + Math.sin(angle)*r];
    });
    svg.append('polygon').attr('points', pts.map(p=>p.join(',')).join(' '))
      .attr('fill', color).attr('fill-opacity', .18).attr('stroke', color).attr('stroke-width', 2);
  }
  poly(a, '#6ee7ff'); poly(b, '#f59e0b');

  if(a) svg.append('text').attr('x',18).attr('y',18).attr('fill','#6ee7ff').style('font-size','12px').text('A ' + a.occupation_name);
  if(b) svg.append('text').attr('x',18).attr('y',36).attr('fill','#f59e0b').style('font-size','12px').text('B ' + b.occupation_name);
}

function downloadShareCard(){
  const d = state.selected;
  if(!d){ alert('请先点击一个职业'); return; }
  const canvas = document.getElementById('shareCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,1200,630);
  const grad = ctx.createLinearGradient(0,0,1200,630);
  grad.addColorStop(0,'#08111f'); grad.addColorStop(1,'#101a33');
  ctx.fillStyle = grad; ctx.fillRect(0,0,1200,630);
  ctx.fillStyle = 'rgba(110,231,255,.12)'; ctx.fillRect(40,40,1120,550);
  ctx.strokeStyle = 'rgba(110,231,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(40,40,1120,550);
  ctx.fillStyle = '#e5eefc';
  ctx.font = '700 48px sans-serif';
  ctx.fillText('中国职业 AI 影响全景图', 70, 110);
  ctx.font = '600 42px sans-serif';
  ctx.fillText(d.occupation_name, 70, 190);
  ctx.fillStyle = '#95a8c8';
  ctx.font = '24px sans-serif';
  ctx.fillText(d.big_category + ' / ' + d.middle_category, 70, 230);

  const cards = [
    ['综合影响', d.ai_impact_index, '#6ee7ff'],
    ['替代指数', d.ai_replace_index, '#ef4444'],
    ['增强指数', d.ai_augment_index, '#3b82f6'],
    ['现实依赖', d.real_world_index, '#22c55e']
  ];
  cards.forEach((c, i)=>{
    const x = 70 + i*260, y = 290;
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(x,y,220,120);
    ctx.fillStyle = c[2]; ctx.font = '22px sans-serif'; ctx.fillText(c[0], x+20, y+36);
    ctx.fillStyle = '#fff'; ctx.font = '800 48px sans-serif'; ctx.fillText(String(c[1]), x+20, y+92);
  });

  ctx.fillStyle = '#e5eefc'; ctx.font = '600 26px sans-serif';
  ctx.fillText('标签：' + d.label, 70, 470);
  ctx.fillStyle = '#95a8c8'; ctx.font = '22px sans-serif';
  const text = (d.impact_rationale || '').slice(0,70);
  wrapText(ctx, text, 70, 520, 1060, 32);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${d.occupation_name}-AI职业卡.png`;
  a.click();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const chars = text.split('');
  let line='';
  let cy=y;
  for(const ch of chars){
    const test = line + ch;
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line, x, cy);
      line = ch;
      cy += lineHeight;
    } else line = test;
  }
  if(line) ctx.fillText(line, x, cy);
}

init();
