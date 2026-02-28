.main-layout{
  display:flex;
  min-height: calc(100vh - var(--nav-height));
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--hfs-light-red) 22%, var(--bg-color)) 0%,
    var(--bg-color) 60%);
}

/* Sidebar */
.sidebar{
  width: 320px;
  padding: 18px;
  background: color-mix(in oklab, var(--sidebar-bg) 92%, var(--hfs-light-red));
  border-right: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  display:flex;
  flex-direction:column;
  gap: 14px;
}

.sidebar-card{
  background: color-mix(in oklab, var(--card-bg) 94%, white);
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 14px;
}

.sidebar-card.subtle{
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--bg-color) 78%, white),
    color-mix(in oklab, var(--bg-color) 92%, white));
}

.sidebar-title{
  font-weight: 950;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--hfs-red);
  font-size: 0.78rem;
  margin-bottom: 10px;
}

.next-title{ font-weight: 950; font-size: 1.05rem; }
.next-sub{ font-weight: 800; color: var(--hfs-red); margin-top: 4px; }

/* Tagok gombok */
.member-filter{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.filter-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  gap: 8px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  font-weight: 900;
  cursor:pointer;
  transition: .16s ease;
}

.filter-btn:hover{
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--hfs-red) 28%, var(--border-color));
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
}

.filter-btn.active{
  background: color-mix(in oklab, var(--hfs-light-red) 70%, white);
  border-color: color-mix(in oklab, var(--hfs-red) 35%, var(--border-color));
}

/* Quick stats */
.quick-stats{ display:flex; flex-direction:column; gap: 10px; }
.qs-item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--bg-color) 78%, white),
    color-mix(in oklab, var(--bg-color) 92%, white));
}
.qs-label{ color: var(--text-muted); font-weight: 800; }
.qs-value{ font-weight: 950; color: var(--hfs-red); }

/* Main */
.content-area{
  flex:1;
  padding: 22px;
  overflow-y:auto;
}

.card{
  background: color-mix(in oklab, var(--card-bg) 94%, white);
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  border-radius: 18px;
  box-shadow: var(--shadow);
}

.section-box{
  padding: 18px;
  margin-bottom: 16px;
}

.section-title{
  font-weight: 950;
  color: var(--hfs-red);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 0.82rem;
  margin-bottom: 12px;
}

.member-head{
  padding: 16px 18px;
  margin-bottom: 16px;
}

.member-name{
  font-size: 1.35rem;
  font-weight: 950;
}

/* Division strip */
.division-bar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  margin: 8px 0 10px;
}

.div-newcomer{ background: linear-gradient(90deg, rgba(52,152,219,0.20), rgba(52,152,219,0.06)); border-color: rgba(52,152,219,0.25); }
.div-novice{ background: linear-gradient(90deg, rgba(155,89,182,0.20), rgba(155,89,182,0.06)); border-color: rgba(155,89,182,0.25); }
.div-intermediate{ background: linear-gradient(90deg, rgba(241,196,15,0.24), rgba(241,196,15,0.08)); border-color: rgba(241,196,15,0.28); }
.div-advanced{ background: linear-gradient(90deg, rgba(46,204,113,0.20), rgba(46,204,113,0.06)); border-color: rgba(46,204,113,0.25); }
.div-allstar{ background: linear-gradient(90deg, rgba(231,76,60,0.20), rgba(231,76,60,0.06)); border-color: rgba(231,76,60,0.25); }
.div-champion{ background: linear-gradient(90deg, rgba(0,0,0,0.12), rgba(0,0,0,0.04)); border-color: rgba(0,0,0,0.18); }

.division-name{
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: .78rem;
  color: var(--hfs-red);
}
.division-summary{ color: var(--text-muted); font-weight: 800; }

/* --- EVENT KÁRTYÁK (mobil screenshot stílus) --- */

.results-list{ display:flex; flex-direction:column; gap: 12px; margin-bottom: 20px; }

.result-card{
  background: var(--card-bg);
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  border-radius: 16px;
  overflow:hidden;
  box-shadow: 0 10px 22px rgba(0,0,0,0.05);
  transition: .16s ease;
}

.result-card:hover{
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--hfs-red) 24%, var(--border-color));
  box-shadow: 0 14px 28px rgba(0,0,0,0.07);
}

.result-header{
  display:grid;
  grid-template-columns: 1fr auto;
  align-items:center;
  gap: 14px;
  padding: 14px 16px;
  cursor:pointer;
}

.result-left{ min-width:0; display:flex; flex-direction:column; gap: 6px; }
.result-date{ font-size: .78rem; color: var(--text-muted); font-weight: 800; }
.result-event{ font-weight: 950; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.result-right{
  display:flex;
  align-items:flex-end;
  gap: 14px;
}

.metric{
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap: 6px;
  min-width: 58px;
}
.metric-label{
  font-size: .62rem;
  font-weight: 950;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--text-muted) 80%, var(--text-color));
}

.metric-value{ display:flex; align-items:center; gap: 8px; }

.pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height: 34px;
  min-width: 34px;
  padding: 0 12px;
  border-radius: 12px;
  font-weight: 950;
  font-size: .9rem;
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  background: var(--bg-color);
}

.pill.final{
  min-width: 34px;
  padding: 0 10px;
  border-radius: 10px;
}
.pill.final.p1{ background: color-mix(in oklab, var(--rank-1) 60%, white); color:#111; border-color: color-mix(in oklab, var(--rank-1) 45%, var(--border-color)); }
.pill.final.p2{ background: color-mix(in oklab, var(--rank-2) 60%, white); color:#111; border-color: color-mix(in oklab, var(--rank-2) 45%, var(--border-color)); }
.pill.final.p3{ background: color-mix(in oklab, var(--rank-3) 55%, white); color:#111; border-color: color-mix(in oklab, var(--rank-3) 45%, var(--border-color)); }

/* 4+ helyezés: HFS piros */
.pill.final.other{
  background: color-mix(in oklab, var(--hfs-red) 18%, white);
  color: var(--hfs-red);
  border-color: color-mix(in oklab, var(--hfs-red) 35%, var(--border-color));
}

/* Pont: light red háttér */
.pill.points{
  background: color-mix(in oklab, var(--hfs-light-red) 80%, white);
  color: var(--hfs-red);
  border-color: color-mix(in oklab, var(--hfs-red) 22%, var(--border-color));
  min-width: 56px;
}

.chev{
  width: 32px; height: 32px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  background: var(--bg-color);
  display:flex; align-items:center; justify-content:center;
  color: var(--text-muted);
  font-weight: 950;
  transition: transform .18s ease;
}

.result-card.open .chev{ transform: rotate(180deg); }

.result-body{
  max-height: 0;
  overflow:hidden;
  transition: max-height .26s ease;
  border-top: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--bg-color) 78%, white),
    color-mix(in oklab, var(--bg-color) 92%, white));
}
.result-card.open .result-body{ max-height: 520px; }

.result-body-inner{
  padding: 14px 16px 16px;
  display:grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail{
  background: var(--card-bg);
  border: 1px solid color-mix(in oklab, var(--border-color) 85%, var(--hfs-light-red));
  border-radius: 14px;
  padding: 10px 12px;
}
.detail-label{
  font-size: .7rem;
  font-weight: 950;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.detail-value{ font-weight: 950; }

@media (max-width: 1024px){
  .main-layout{ flex-direction:column; }
  .sidebar{
    width:auto;
    border-right:none;
    border-bottom:1px solid var(--border-color);
  }
  .member-filter{ grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 720px){
  .content-area{ padding: 16px; }
  .result-body-inner{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .member-filter{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}