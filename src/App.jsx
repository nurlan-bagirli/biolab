import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AudioWaveform, Brain, ChartNoAxesCombined, CircleDot, Clock3,
  Cpu, FlaskConical, Gauge, HeartPulse, Layers3, Menu, Pause, Play,
  Radio, Settings2, ShieldCheck, Sparkles, Thermometer, Waves, Zap
} from 'lucide-react'
import { supabaseConfigured } from './lib/supabase'

const channels = [
  { id: 'EEG', name: 'EEG', subtitle: 'Beyin fəaliyyəti', unit: 'µV', color: '#9b8cff', range: 45, rate: '250 Hz', icon: Brain },
  { id: 'EMG', name: 'EMG', subtitle: 'Əzələ aktivliyi', unit: 'mV', color: '#42d6bd', range: 0.9, rate: '1000 Hz', icon: Activity },
  { id: 'EOG', name: 'EOG', subtitle: 'Göz hərəkətləri', unit: 'µV', color: '#f5b85b', range: 160, rate: '250 Hz', icon: AudioWaveform },
  { id: 'PPG', name: 'PPG', subtitle: 'Nəbz dalğası', unit: 'a.u.', color: '#f07891', range: 1, rate: '100 Hz', icon: HeartPulse },
  { id: 'GSR', name: 'GSR', subtitle: 'Dəri keçiriciliyi', unit: 'µS', color: '#65a9ff', range: 18, rate: '10 Hz', icon: Zap },
]
const nav = [
  { id: 'overview', label: 'İcmal', icon: Layers3 },
  { id: 'monitor', label: 'Canlı monitor', icon: Waves },
  { id: 'experiments', label: 'Eksperimentlər', icon: FlaskConical },
  { id: 'analysis', label: 'Analiz', icon: ChartNoAxesCombined },
]
const presets = [
  { title: 'Sakit vəziyyət', desc: 'İstirahət zamanı bazal siqnalların müşahidəsi', duration: '02:00', tag: 'BAZAL' },
  { title: 'Əzələ yığılması', desc: 'EMG amplitudasının dəyişməsinin vizuallaşdırılması', duration: '01:00', tag: 'EMG' },
  { title: 'Vizual stimul', desc: 'EOG və EEG siqnallarında şərti dəyişikliklər', duration: '01:30', tag: 'EOG / EEG' },
]
const makeWave = (id, t, n = 180) => Array.from({ length: n }, (_, i) => {
  const x = i / n * 14 + t
  let y = 0
  if (id === 'EEG') y = Math.sin(x * 8.1) * .27 + Math.sin(x * 3.1) * .24 + Math.sin(x * 13.7) * .08 + Math.sin(x * .7) * .12
  if (id === 'EMG') y = (Math.sin(x * 15) * .16 + Math.sin(x * 23) * .12 + Math.sin(x * 41) * .08) * (0.25 + Math.pow(Math.max(0, Math.sin(x * .65)), 3) * 2.3)
  if (id === 'EOG') y = Math.sin(x * 1.4) * .12 + (Math.sin(x * .38) > .84 ? Math.sin(x * 2.1) * .8 : 0) + Math.sin(x * 7) * .035
  if (id === 'PPG') { const p = (x * 1.15) % (Math.PI * 2); y = Math.exp(-Math.pow((p - 1.1) / .24, 2)) * .92 - .12 + Math.sin(x * 2.3) * .025 }
  if (id === 'GSR') y = .34 + Math.sin(x * .22) * .13 + Math.sin(x * .075) * .19 + (Math.sin(x * .31) > .94 ? .22 : 0)
  return y
})
const pathFor = (values, w = 560, h = 140) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * w} ${h / 2 - v * h * .39}`).join(' ')

function WaveChart({ channel, time, compact = false, paused = false }) {
  const values = useMemo(() => makeWave(channel.id, paused ? 3 : time), [channel.id, time, paused])
  return <svg className="wave-svg" viewBox="0 0 560 140" preserveAspectRatio="none" role="img" aria-label={channel.name + ' simulyasiya siqnalı'}>
    <defs><linearGradient id={`fill-${channel.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={channel.color} stopOpacity=".23"/><stop offset="100%" stopColor={channel.color} stopOpacity="0"/></linearGradient></defs>
    {[28, 63, 98].map(y => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="rgba(148,163,184,.12)" strokeDasharray="4 6" />)}
    <path d={pathFor(values) + ' L 560 140 L 0 140 Z'} fill={`url(#fill-${channel.id})`} />
    <path d={pathFor(values)} fill="none" stroke={channel.color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
}

function Metric({ label, value, unit, note, icon: Icon, color }) {
  return <div className="metric-card">
    <div className="metric-top"><span>{label}</span><span className="metric-icon" style={{ color }}><Icon size={17}/></span></div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <div className="metric-note"><span className="live-dot" />{note}</div>
  </div>
}

function SignalCard({ channel, time, paused, onExpand }) {
  return <button className="signal-card" onClick={onExpand}>
    <div className="signal-head"><div className="signal-name"><span className="signal-bullet" style={{ background: channel.color, boxShadow: `0 0 12px ${channel.color}` }}/><div><strong>{channel.name}</strong><small>{channel.subtitle}</small></div></div><span className="signal-rate">{channel.rate}</span></div>
    <div className="signal-wave"><WaveChart channel={channel} time={time} paused={paused}/></div>
    <div className="signal-foot"><span>Simulyasiya siqnalı</span><span style={{ color: channel.color }}>CANLI <span className="tiny-dot"/></span></div>
  </button>
}

function App() {
  const [page, setPage] = useState('overview')
  const [running, setRunning] = useState(true)
  const [time, setTime] = useState(0)
  const [active, setActive] = useState('EEG')
  const [experiment, setExperiment] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [mobileNav, setMobileNav] = useState(false)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setTime(v => v + .12), 120)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => {
    if (!experiment) return
    const timer = setInterval(() => setElapsed(v => v + 1), 1000)
    return () => clearInterval(timer)
  }, [experiment])
  const selected = channels.find(c => c.id === active) || channels[0]
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const startExperiment = title => { setExperiment(title); setElapsed(0); setRunning(true); setPage('monitor') }
  const stopExperiment = () => { setExperiment(''); setElapsed(0) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><div><b>HUMAN<span>BioLab</span></b><small>BIOSIGNAL RESEARCH</small></div></div>
      <div className="workspace"><span className="workspace-avatar">N</span><div><b>Personal Lab</b><small>Research workspace</small></div><span className="chevron">⌄</span></div>
      <div className="nav-label">LABORATORİYA</div>
      <nav>{nav.map(item => <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(item.id); setMobileNav(false) }}><item.icon size={18}/><span>{item.label}</span>{item.id === 'monitor' && <i className="nav-live"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="device-box"><div className="device-icon"><Cpu size={18}/></div><div><b>Sensor sistemi</b><small>{supabaseConfigured ? 'Supabase qoşulub' : 'Demo rejim'}</small></div><span className="device-status"/></div>
        <button className="nav-item settings" onClick={() => setPage('settings')}><Settings2 size={18}/> Parametrlər</button>
        <div className="profile"><div className="profile-avatar">NB</div><div><b>Nurlan</b><small>Lab administrator</small></div><span className="more">···</span></div>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Menyunu bağla"/>}
    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">HUMAN BioLab <span>/</span> <b>{nav.find(n => n.id === page)?.label || 'Parametrlər'}</b></div><div className="top-actions"><span className="environment"><i/> {supabaseConfigured ? 'BACKEND READY' : 'LOCAL SIMULATION'}</span><button className="icon-button" title="Bildirişlər"><CircleDot size={18}/></button><div className="top-avatar">NB</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> HUMAN BIOSIGNAL PLATFORM</div><h1>{page === 'overview' ? 'Laboratoriya icmalı' : page === 'monitor' ? 'Canlı siqnal monitoru' : page === 'experiments' ? 'Eksperiment laboratoriyası' : page === 'analysis' ? 'Siqnal analizi' : 'Parametrlər'}</h1><p>{page === 'overview' ? 'Biometrik siqnalları müşahidə et, eksperimentləri idarə et və nəticələri araşdır.' : 'Tədris və eksperimental vizuallaşdırma mühiti.'}</p></div><div className="heading-actions"><span className="demo-pill"><span/> SİMULYASİYA REJİMİ</span>{page !== 'experiments' && <button className="primary-button" onClick={() => setPage('experiments')}><Play size={15} fill="currentColor"/> Eksperiment başlat</button>}</div></div>

        {page === 'overview' && <>
          <div className="notice"><ShieldCheck size={17}/><span><b>Demo məlumatları:</b> Qrafiklər hazırda süni yaradılmış siqnallardır. Heç bir real sensor və ya insan ölçməsi aparılmır.</span><button onClick={() => setPage('monitor')}>Monitoru aç ↗</button></div>
          <div className="metrics-grid">
            <Metric label="Ümumi kanallar" value="05" unit="/ 05" note="Simulyasiya aktivdir" icon={Waves} color="#9b8cff"/>
            <Metric label="Ürək ritmi" value="72" unit="BPM" note="Nümunəvi PPG metrikası" icon={HeartPulse} color="#f07891"/>
            <Metric label="Siqnal keyfiyyəti" value="98.4" unit="%" note="Süni keyfiyyət göstəricisi" icon={Gauge} color="#42d6bd"/>
            <Metric label="Aktiv eksperiment" value={experiment ? '01' : '00'} unit="" note={experiment || 'Hazırda eksperiment yoxdur'} icon={FlaskConical} color="#f5b85b"/>
          </div>
          <div className="section-title"><div><h2>Siqnal axınları</h2><p>Seçilmiş biosiqnalların vizual monitorinqi</p></div><button className="text-button" onClick={() => setPage('monitor')}>Hamısına bax <span>→</span></button></div>
          <div className="signals-grid">{channels.map(c => <SignalCard key={c.id} channel={c} time={time} paused={!running} onExpand={() => { setActive(c.id); setPage('monitor') }}/>)}</div>
          <div className="bottom-grid"><div className="panel"><div className="panel-heading"><div><h3>Son eksperimentlər</h3><p>Laboratoriya fəaliyyəti</p></div><button className="text-button" onClick={() => setPage('experiments')}>Hamısı →</button></div>{presets.slice(0,2).map((p,i)=><div className="experiment-row" key={p.title}><div className="experiment-symbol"><FlaskConical size={17}/></div><div className="experiment-info"><b>{p.title}</b><small>{p.desc}</small></div><span className="tag">{p.tag}</span><span className="row-time">{i===0?'Hazır':'Şablon'}</span></div>)}</div><div className="panel system-panel"><div className="panel-heading"><div><h3>Sistem statusu</h3><p>Platforma komponentləri</p></div><span className="status-ok">STABİL</span></div>{[['Frontend','Aktiv'],['Siqnal generatoru','Aktiv'],['Supabase',supabaseConfigured?'Qoşulub':'Konfiqurasiya gözləyir'],['ESP32 cihazları','Qoşulmayıb']].map(([k,v])=><div className="system-row" key={k}><span>{k}</span><b className={v==='Aktiv'||v==='Qoşulub'?'green-text':''}>{v}</b></div>)}</div></div>
        </>}

        {page === 'monitor' && <><div className="notice"><ShieldCheck size={17}/><span>Bu ekrandakı dalğalar <b>simulyasiyadır</b>; klinik və ya fizioloji ölçmə deyil.</span><button onClick={() => setRunning(!running)}>{running ? 'Dayandır' : 'Davam et'}</button></div><div className="monitor-toolbar"><div><span className="live-indicator"/><b>{running?'Axın işləyir':'Axın dayandırılıb'}</b><small> · 120 ms vizual yenilənmə</small></div><div className="toolbar-actions"><button className="secondary-button" onClick={() => setTime(0)}>Sıfırla</button><button className="primary-button" onClick={() => setRunning(!running)}>{running?<Pause size={15}/>:<Play size={15}/>} {running?'Pauza':'Davam et'}</button></div></div><div className="monitor-layout"><div className="channel-list"><div className="mini-label">KANALLAR</div>{channels.map(c=><button key={c.id} className={active===c.id?'channel-select selected':'channel-select'} onClick={()=>setActive(c.id)}><span className="channel-color" style={{background:c.color}}/><span><b>{c.name}</b><small>{c.subtitle}</small></span><span className="channel-arrow">›</span></button>)}</div><div className="panel focus-panel"><div className="panel-heading"><div><div className="signal-name"><span className="signal-bullet" style={{background:selected.color}}/><h3>{selected.name} — {selected.subtitle}</h3></div><p>Vizualizasiya · {selected.rate} · {selected.unit}</p></div><span className="demo-pill"><span/> DEMO</span></div><div className="large-wave"><WaveChart channel={selected} time={time} paused={!running}/></div><div className="axis-labels"><span>− 6 s</span><span>− 4 s</span><span>− 2 s</span><span>İNDİ</span></div><div className="signal-stats"><div><small>AMPLİTUDA</small><b>{selected.id==='PPG'?'0.92':selected.id==='EMG'?'0.84':selected.id==='GSR'?'12.6':selected.id==='EOG'?'148':'38.2'} <i>{selected.unit}</i></b></div><div><small>NÜMUNƏLƏMƏ</small><b>{selected.rate}</b></div><div><small>STATUS</small><b className="green-text">{running?'Axın aktiv':'Pauzada'}</b></div></div></div></div><div className="section-title"><div><h2>Bütün kanallar</h2><p>Detallı görünüş üçün kanal seç</p></div></div><div className="signals-grid">{channels.map(c=><SignalCard key={c.id} channel={c} time={time} paused={!running} onExpand={()=>setActive(c.id)}/>)}</div></>}

        {page === 'experiments' && <><div className="notice"><FlaskConical size={17}/><span>Eksperiment şablonları yalnız interfeys və siqnal generatorunu idarə edir; real iştirakçı ölçməsi aparmır.</span></div><div className="experiment-hero"><div className="hero-icon"><Brain size={28}/></div><div><div className="eyebrow">EXPERIMENT WORKSPACE</div><h2>Yeni eksperiment seç</h2><p>Hazır protokollardan birini başladaraq simulyasiya siqnallarını müşahidə et.</p></div></div><div className="preset-grid">{presets.map((p,i)=><div className="preset-card" key={p.title}><div className="preset-top"><span className="tag">{p.tag}</span><span className="preset-number">0{i+1}</span></div><div className="preset-icon"><FlaskConical size={22}/></div><h3>{p.title}</h3><p>{p.desc}</p><div className="preset-bottom"><span><Clock3 size={14}/> {p.duration}</span><button className="primary-button" onClick={()=>startExperiment(p.title)}><Play size={14} fill="currentColor"/> Başlat</button></div></div>)}</div><div className="panel active-experiment"><div className="panel-heading"><div><h3>Aktiv sessiya</h3><p>Hazırda işləyən eksperimentin statusu</p></div><span className={experiment?'status-ok':'tag'}>{experiment?'İŞLƏYİR':'BOŞ'}</span></div>{experiment?<div className="session-active"><div><b>{experiment}</b><small>Simulyasiya sessiyası · {clock}</small></div><button className="danger-button" onClick={stopExperiment}>Sessiyanı bitir</button></div>:<div className="empty-state"><FlaskConical size={25}/><b>Aktiv eksperiment yoxdur</b><span>Başlamaq üçün yuxarıdakı protokollardan birini seç.</span></div>}</div></>}

        {page === 'analysis' && <><div className="notice"><ChartNoAxesCombined size={17}/><span>Analiz göstəriciləri demonstrasiya məqsədilə yaradılmış sintetik siqnallardan hesablanır.</span></div><div className="metrics-grid"><Metric label="Orta ürək ritmi" value="72" unit="BPM" note="Sintetik PPG" icon={HeartPulse} color="#f07891"/><Metric label="RMSSD" value="34.6" unit="ms" note="Nümunəvi HRV" icon={Activity} color="#42d6bd"/><Metric label="EEG alfa gücü" value="38.2" unit="%" note="Şərti spektral pay" icon={Brain} color="#9b8cff"/><Metric label="GSR səviyyəsi" value="12.6" unit="µS" note="Sintetik göstərici" icon={Zap} color="#65a9ff"/></div><div className="panel analysis-panel"><div className="panel-heading"><div><h3>Siqnal analizi</h3><p>İlkin metrikalar — EEG kanalı</p></div><span className="tag">DEMO DATA</span></div><div className="analysis-bars">{[['Delta · 0.5–4 Hz',18],['Theta · 4–8 Hz',28],['Alpha · 8–13 Hz',72],['Beta · 13–30 Hz',46],['Gamma · 30+ Hz',24]].map(([name,val])=><div className="bar-row" key={name}><span>{name}</span><div className="bar-track"><i style={{width:val+'%'}}/></div><b>{val}%</b></div>)}</div><p className="analysis-footnote">Spektral paylar real FFT hesablaması deyil; interfeys prototipi üçün nümunəvi vizuallaşdırmadır.</p></div></>}

        {page === 'settings' && <div className="panel settings-panel"><div className="panel-heading"><div><h3>Platforma parametrləri</h3><p>İlkin konfiqurasiya</p></div></div><div className="setting-row"><div><b>Supabase bağlantısı</b><small>Backend layihəsi və publishable key</small></div><span className={supabaseConfigured?'status-ok':'tag'}>{supabaseConfigured?'Konfiqurasiya olunub':'Demo rejim'}</span></div><div className="setting-row"><div><b>Sensor bağlantısı</b><small>ESP32 cihazları hələ inteqrasiya edilməyib</small></div><span className="tag">Gözləyir</span></div><div className="setting-row"><div><b>Məlumat təhlükəsizliyi</b><small>Supabase cədvəllərində RLS aktivdir</small></div><span className="status-ok">Aktiv</span></div><div className="setting-row"><div><b>İnterfeys versiyası</b><small>HUMAN BioLab · ilkin prototip</small></div><span className="tag">v0.1.0</span></div></div>}
        <footer className="footer"><span>HUMAN BioLab <b>·</b> v0.1.0</span><span><i/> Bütün sistemlər normaldır</span><span>Experimental platform · Not for medical use</span></footer>
      </div>
    </main>
  </div>
}

export default App
