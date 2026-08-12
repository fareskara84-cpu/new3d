import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowUpRight, Box, Check, ChevronRight, CreditCard,
  FileImage, History, ImagePlus, Layers3, LockKeyhole,
  LogOut, Menu, RotateCw, ScanLine, Settings, ShieldCheck,
  Sparkles, Upload, X, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

type Profile = { id: string; email: string; credits: number; is_admin: boolean };
type Generation = { id: string; status: string; texture: boolean; model_format: string; created_at: string; model_url: string | null; error_message: string | null };
type Transaction = { id: string; amount: number; reason: string; balance_after: number; created_at: string };
type View = 'workspace' | 'history' | 'billing' | 'admin';

const features = [
  { icon: ScanLine, title: 'Image to 3D', text: 'Turn a single reference into a production-ready mesh in minutes.' },
  { icon: Layers3, title: 'Texture synthesis', text: 'Generate rich, seamless textures with the material details intact.' },
];

const creditPacks = [
  { credits: 50, price: '$9', label: 'Starter pack' },
  { credits: 200, price: '$29', label: 'Creator pack', popular: true },
  { credits: 500, price: '$59', label: 'Studio pack' },
];

function App() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>('workspace');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? { user: { id: data.session.user.id, email: data.session.user.email } } : null);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ? { user: { id: nextSession.user.id, email: nextSession.user.email } } : null);
      if (nextSession) loadProfile(nextSession.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('id, email, credits, is_admin').eq('id', userId).maybeSingle();
    setProfile(data);
    setLoading(false);
  }

  async function signOut() { await supabase.auth.signOut(); setNotice(''); }

  if (loading) return <div className="min-h-screen bg-[#091015] flex items-center justify-center"><RotateCw className="spin text-[#b8f36b]" /></div>;
  if (!session) return <><Landing onAuth={(mode) => { setAuthMode(mode); setAuthOpen(true); }} /><AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} /></>;

  return <Dashboard profile={profile} view={view} setView={setView} onSignOut={signOut} reloadProfile={() => loadProfile(session.user.id)} notice={notice} setNotice={setNotice} />;
}

function Landing({ onAuth }: { onAuth: (mode: 'signin' | 'signup') => void }) {
  return <main className="min-h-screen overflow-hidden bg-[#091015] text-[#e8edf2]">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Logo />
      <div className="hidden items-center gap-9 text-sm text-[#8d9ca5] md:flex"><a href="#how-it-works" className="transition hover:text-white">How it works</a><a href="#features" className="transition hover:text-white">Capabilities</a><a href="#pricing" className="transition hover:text-white">Pricing</a></div>
      <div className="flex items-center gap-3"><button onClick={() => onAuth('signin')} className="hidden px-4 py-2 text-sm text-[#a9b5bb] hover:text-white sm:block">Sign in</button><button onClick={() => onAuth('signup')} className="rounded-full bg-[#b8f36b] px-5 py-2.5 text-sm font-bold text-[#0c1610] transition hover:bg-[#d0ff91]">Start creating <ArrowUpRight className="ml-1 inline h-4 w-4" /></button></div>
    </nav>
    <section className="grid-bg relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-10 lg:pb-32 lg:pt-28"><div className="pointer-events-none absolute -right-28 top-16 h-96 w-96 rounded-full bg-[#b8f36b]/10 blur-3xl" /><div className="max-w-3xl fade-up"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#314047] bg-[#101b20] px-3 py-1.5 text-xs text-[#a9b5bb]"><span className="h-1.5 w-1.5 rounded-full bg-[#b8f36b]" /> Next-generation 3D creation studio</div><h1 className="max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-[-.05em] text-white sm:text-7xl lg:text-[88px]">Shape the <span className="text-[#b8f36b]">impossible.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-[#91a1aa]">MeshForge transforms your ideas and images into beautiful, usable 3D assets. From first sketch to final mesh, move at the speed of imagination.</p><div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"><button onClick={() => onAuth('signup')} className="rounded-full bg-[#b8f36b] px-7 py-4 font-bold text-[#0c1610] shadow-[0_0_45px_rgba(184,243,107,.15)] transition hover:scale-[1.02] hover:bg-[#d0ff91]">Create your first model <ArrowUpRight className="ml-2 inline h-4 w-4" /></button><span className="text-sm text-[#70818a]">5 free credits included</span></div></div><div className="relative mt-20 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4"><Metric value="2.1m+" label="models generated" /><Metric value="68%" label="faster iteration" /><Metric value="4k" label="texture resolution" /><Metric value="∞" label="ways to create" /></div></section>
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-10"><div className="mb-14 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase tracking-[.22em] text-[#b8f36b]">One workspace. Infinite forms.</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">Your fastest path<br />from thought to <span className="text-[#84939a]">form.</span></h2></div><p className="max-w-xs text-sm leading-6 text-[#82929a]">Everything you need to turn visual references into assets that are ready to use.</p></div><div className="grid gap-px overflow-hidden rounded-2xl border border-[#27353c] bg-[#27353c] md:grid-cols-2">{features.map(({ icon: Icon, title, text }) => <div key={title} className="bg-[#0d171c] p-8 transition hover:bg-[#111e24]"><Icon className="h-6 w-6 text-[#b8f36b]" /><h3 className="mt-16 text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-[#82929a]">{text}</p></div>)}</div></section>
    <section id="how-it-works" className="border-y border-[#1e2b31] bg-[#0c151a] px-6 py-24 lg:px-10"><div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="font-mono text-xs uppercase tracking-[.22em] text-[#b8f36b]">The simple loop</p><h2 className="mt-4 text-4xl font-bold tracking-tight text-white">Make. See.<br />Make better.</h2><p className="mt-5 max-w-sm leading-7 text-[#82929a]">No complex pipelines. Upload a reference, choose how much detail you want, and let MeshForge handle the heavy lifting.</p></div><div className="space-y-3">{['Upload a reference image', 'Set your creative direction', 'Export your finished mesh'].map((step, i) => <div key={step} className="flex items-center gap-5 rounded-xl border border-[#26343a] bg-[#101b20] p-5"><span className="font-mono text-sm text-[#b8f36b]">0{i + 1}</span><span className="font-semibold text-white">{step}</span><ChevronRight className="ml-auto h-4 w-4 text-[#63747c]" /></div>)}</div></div></section>
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-24 lg:px-10"><div className="rounded-3xl border border-[#34443a] bg-[#121d1b] p-8 sm:p-12"><div className="flex flex-col justify-between gap-10 md:flex-row md:items-center"><div><p className="font-mono text-xs uppercase tracking-[.22em] text-[#b8f36b]">Start free</p><h2 className="mt-4 text-4xl font-bold text-white">A little room<br />to experiment.</h2><p className="mt-4 max-w-sm text-[#8da097]">Your first 5 generations are on us. Buy credit packs or upgrade when your ideas start moving faster.</p></div><div className="flex items-end gap-8"><div><span className="text-6xl font-extrabold tracking-tight text-white">5</span><p className="mt-1 text-sm text-[#8da097]">free credits</p></div><button onClick={() => onAuth('signup')} className="rounded-full bg-[#b8f36b] px-6 py-3.5 font-bold text-[#0c1610] transition hover:bg-[#d0ff91]">Claim yours <ArrowUpRight className="ml-1 inline h-4 w-4" /></button></div></div></div></section>
    <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-[#1e2b31] px-6 py-8 text-sm text-[#64757d] sm:flex-row sm:items-center sm:justify-between lg:px-10"><Logo /><span>Make something worth seeing.</span></footer>
  </main>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="border-l border-[#334249] px-4 py-2"><p className="text-2xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-[#71828b]">{label}</p></div>;
}

function Logo() {
  return <div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#b8f36b] text-[#0c1610]"><Box className="h-5 w-5" /></div><span className="font-bold tracking-[-.03em] text-white">MeshForge<span className="text-[#b8f36b]">3D</span></span></div>;
}

function AuthModal({ open, mode, onClose, onSuccess }: { open: boolean; mode: 'signin' | 'signup'; onClose: () => void; onSuccess: () => void }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setCurrentMode(mode), [mode]);
  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = currentMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) { setError('We could not complete that request. Check your details and try again.'); return; }
    onSuccess();
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#05090b]/80 p-5 backdrop-blur-sm"><div className="relative w-full max-w-md rounded-2xl border border-[#2b3a41] bg-[#101b20] p-7 shadow-2xl"><button onClick={onClose} className="absolute right-5 top-5 text-[#73838b] hover:text-white"><X className="h-5 w-5" /></button><Logo /><h2 className="mt-9 text-2xl font-bold text-white">{currentMode === 'signup' ? 'Start shaping ideas.' : 'Welcome back.'}</h2><p className="mt-2 text-sm text-[#84949c]">{currentMode === 'signup' ? 'Create an account and get 5 free credits.' : 'Enter your details to open your studio.'}</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm text-[#b2bec3]">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-[#2f4048] bg-[#0b1418] px-4 py-3 text-white outline-none focus:border-[#b8f36b]" /></label><label className="block text-sm text-[#b2bec3]">Password<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-[#2f4048] bg-[#0b1418] px-4 py-3 text-white outline-none focus:border-[#b8f36b]" /></label>{error && <p className="text-sm text-[#ff8c80]">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-[#b8f36b] py-3.5 font-bold text-[#0c1610] transition hover:bg-[#d0ff91] disabled:opacity-60">{busy ? 'Opening studio...' : currentMode === 'signup' ? 'Create free account' : 'Sign in'}</button></form><button onClick={() => { setCurrentMode(currentMode === 'signup' ? 'signin' : 'signup'); setError(''); }} className="mt-6 w-full text-center text-sm text-[#8c9ba2] hover:text-[#b8f36b]">{currentMode === 'signup' ? 'Already have an account? Sign in' : 'New to MeshForge? Create an account'}</button></div></div>;
}

function Dashboard({ profile, view, setView, onSignOut, reloadProfile, notice, setNotice }: { profile: Profile | null; view: View; setView: (view: View) => void; onSignOut: () => void; reloadProfile: () => void; notice: string; setNotice: (notice: string) => void }) {
  const [mobileNav, setMobileNav] = useState(false);
  const navItems: { id: View; label: string; icon: typeof Box }[] = [
    { id: 'workspace', label: 'Create', icon: Sparkles },
    { id: 'history', label: 'My models', icon: History },
    { id: 'billing', label: 'Plans & billing', icon: CreditCard },
  ];

  return <div className="min-h-screen bg-[#091015] text-[#e8edf2]">
    <header className="flex h-16 items-center justify-between border-b border-[#1d2a30] bg-[#0b151a] px-5 lg:px-8">
      <div className="flex items-center gap-8"><button className="lg:hidden" onClick={() => setMobileNav(!mobileNav)}><Menu className="h-5 w-5" /></button><Logo /><span className="hidden border-l border-[#304047] pl-8 text-sm text-[#6f8088] lg:block">Creator studio</span></div>
      <div className="flex items-center gap-4"><div className="flex items-center gap-2 rounded-full border border-[#35443b] bg-[#122019] px-3 py-1.5"><Zap className="h-3.5 w-3.5 text-[#b8f36b]" /><span className="font-mono text-xs text-[#d4e6d0]">{profile?.credits ?? 0} credits</span></div><div className="hidden h-8 w-8 place-items-center rounded-full bg-[#26363d] text-xs font-bold text-[#b8f36b] sm:grid">{profile?.email?.slice(0, 1).toUpperCase()}</div></div>
    </header>
    <div className="flex">
      {mobileNav && <div className="fixed inset-0 top-16 z-10 bg-black/50 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`${mobileNav ? 'block' : 'hidden'} absolute z-20 h-[calc(100vh-4rem)] w-64 border-r border-[#1d2a30] bg-[#0b151a] p-4 lg:relative lg:block`}>
        <nav className="space-y-1">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${view === id ? 'bg-[#1c2d25] font-semibold text-[#b8f36b]' : 'text-[#87969d] hover:bg-[#132027] hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}{profile?.is_admin && <button onClick={() => { setView('admin'); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${view === 'admin' ? 'bg-[#1c2d25] font-semibold text-[#b8f36b]' : 'text-[#87969d] hover:bg-[#132027] hover:text-white'}`}><ShieldCheck className="h-4 w-4" />Admin panel</button>}</nav>
        <div className="absolute bottom-5 left-4 right-4 space-y-1"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#87969d] hover:bg-[#132027] hover:text-white"><Settings className="h-4 w-4" />Settings</button><button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#87969d] hover:bg-[#132027] hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></div>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-12">
        {notice && <div className="mb-5 rounded-lg border border-[#38553c] bg-[#132219] px-4 py-3 text-sm text-[#b8f36b]">{notice}<button onClick={() => setNotice('')} className="ml-3 text-[#5a7a5c] hover:text-[#b8f36b]"><X className="inline h-3.5 w-3.5" /></button></div>}
        {view === 'workspace' ? <Workspace profile={profile} reloadProfile={reloadProfile} setNotice={setNotice} /> : view === 'history' ? <HistoryView /> : view === 'billing' ? <BillingView profile={profile} reloadProfile={reloadProfile} setNotice={setNotice} /> : <AdminView />}
      </main>
    </div>
  </div>;
}

function Workspace({ profile, reloadProfile, setNotice }: { profile: Profile | null; reloadProfile: () => void; setNotice: (notice: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [texture, setTexture] = useState(true);
  const [quality, setQuality] = useState('Balanced');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (chosen) { setFile(chosen); setPreview(URL.createObjectURL(chosen)); setDone(false); }
  }

  async function generate() {
    if (!file || !profile) return;
    if (profile.credits < 1) { setNotice('You need at least 1 credit to generate a model. Buy credits in Plans & billing.'); return; }
    setBusy(true);
    setNotice('');

    // Step 1: Atomically check credits + deduct + create generation record
    const { data: genId, error: genError } = await supabase.rpc('start_generation', {
      p_texture: texture,
      p_quality: quality,
      p_model_format: 'glb',
    });

    if (genError || !genId) {
      setBusy(false);
      setNotice('Not enough credits or could not start generation. Buy credits in Plans & billing.');
      return;
    }

    // Step 2: Convert image to base64 and call the edge function
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      const { data: funcData, error: funcError } = await supabase.functions.invoke('meshforge-generate', {
        body: {
          generation_id: genId,
          image: base64,
          texture,
          quality,
          remove_background: true,
        },
      });

      if (funcError || (funcData && funcData.error)) {
        await supabase.from('generations').update({
          status: 'failed',
          error_message: 'Engine request failed',
        }).eq('id', genId);
        setBusy(false);
        setNotice('The model engine could not process this request. Your credit was used.');
        reloadProfile();
        return;
      }

      await supabase.from('generations').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', genId);

      setBusy(false);
      setDone(true);
      reloadProfile();
    };
    reader.onerror = () => { setBusy(false); setNotice('Could not read the image file.'); };
    reader.readAsDataURL(file);
  }

  return <div className="mx-auto max-w-6xl fade-up">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="font-mono text-xs uppercase tracking-[.2em] text-[#b8f36b]">Workspace</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Create a new model</h1><p className="mt-2 text-sm text-[#84949c]">Bring a reference image. We'll handle the geometry.</p></div>
      <div className="hidden items-center gap-2 text-xs text-[#71818a] sm:flex"><LockKeyhole className="h-3.5 w-3.5" />Private by default</div>
    </div>
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-[#2a3940] bg-[#0d171c] p-4">
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#3a4b52] bg-[#0a1317]">
          {done ? <ModelViewer /> : preview ? <img src={preview} className="max-h-[390px] max-w-full object-contain" /> : <div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#17252b]"><ImagePlus className="h-7 w-7 text-[#b8f36b]" /></div><h3 className="mt-5 font-semibold text-white">Drop your reference here</h3><p className="mt-2 text-sm text-[#74858d]">PNG, JPG, or WEBP up to 10MB</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3a4a51] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#b8f36b] hover:text-[#b8f36b]"><Upload className="h-4 w-4" />Browse files<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} className="hidden" /></label></div>}
          {preview && !done && <label className="absolute bottom-4 right-4 cursor-pointer rounded-lg border border-[#43535a] bg-[#101c21]/90 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:border-[#b8f36b]">Change image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} className="hidden" /></label>}
        </div>
        {file && <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#132026] px-3 py-2.5"><FileImage className="h-4 w-4 text-[#b8f36b]" /><span className="min-w-0 flex-1 truncate text-xs text-[#b8c4c9]">{file.name}</span><Check className="h-4 w-4 text-[#b8f36b]" /></div>}
      </div>
      <div className="rounded-2xl border border-[#2a3940] bg-[#0d171c] p-6">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Generation settings</h2><span className="rounded-full bg-[#17252b] px-2.5 py-1 font-mono text-[10px] text-[#83949c]">1 credit</span></div>
        <div className="mt-8 space-y-7">
          <div><label className="text-sm font-semibold text-[#d6dfe2]">Geometry quality</label><div className="mt-3 grid grid-cols-3 gap-2">{['Draft', 'Balanced', 'High'].map(item => <button key={item} onClick={() => setQuality(item)} className={`rounded-lg border px-2 py-2.5 text-xs ${quality === item ? 'border-[#b8f36b] bg-[#1a2a21] text-[#b8f36b]' : 'border-[#2d3d44] text-[#809098] hover:border-[#53656d]'}`}>{item}</button>)}</div></div>
          <div className="flex items-center justify-between border-t border-[#223137] pt-6"><div><p className="text-sm font-semibold text-[#d6dfe2]">Generate textures</p><p className="mt-1 text-xs text-[#73848c]">Add rich surface detail to your mesh</p></div><button onClick={() => setTexture(!texture)} className={`relative h-6 w-11 rounded-full transition ${texture ? 'bg-[#b8f36b]' : 'bg-[#33434a]'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-[#0b1418] transition ${texture ? 'left-6' : 'left-1'}`} /></button></div>
          <div className="border-t border-[#223137] pt-6"><div className="flex justify-between text-xs text-[#74858d]"><span>Estimated time</span><span className="text-[#d6dfe2]">~ 2 minutes</span></div><button disabled={!file || busy || done} onClick={generate} className="mt-4 w-full rounded-lg bg-[#b8f36b] py-3.5 text-sm font-bold text-[#0c1610] transition hover:bg-[#d0ff91] disabled:cursor-not-allowed disabled:bg-[#34443b] disabled:text-[#718176]">{busy ? <><RotateCw className="spin mr-2 inline h-4 w-4" />Forging your model...</> : done ? <><Check className="mr-2 inline h-4 w-4" />Model ready</> : <><Sparkles className="mr-2 inline h-4 w-4" />Generate model</>}</button>{done && <div className="mt-4 rounded-lg border border-[#38553c] bg-[#132219] p-3 text-center text-xs text-[#b8f36b]">Your model is ready in My models.</div>}</div>
        </div>
      </div>
    </div>
  </div>;
}

function ModelViewer() {
  return <div className="absolute inset-0"><Canvas camera={{ position: [3.2, 2.4, 3.2], fov: 42 }}><color attach="background" args={['#0a1317']} /><ambientLight intensity={0.6} /><directionalLight position={[4, 5, 3]} intensity={3} color="#d9f5c1" /><directionalLight position={[-4, 2, -2]} intensity={1.5} color="#78a8ff" /><pointLight position={[0, 3, 0]} intensity={2} color="#ffffff" /><mesh rotation={[0.25, 0.45, 0]} castShadow><icosahedronGeometry args={[1.25, 2]} /><meshStandardMaterial color="#b8f36b" metalness={0.3} roughness={0.35} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]}><circleGeometry args={[2.1, 64]} /><meshBasicMaterial color="#14242a" /></mesh><OrbitControls enableDamping autoRotate autoRotateSpeed={1.4} /></Canvas><div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[.18em] text-[#6d8188]">Drag to orbit · Scroll to zoom</div></div>;
}

function BillingView({ profile, reloadProfile, setNotice }: { profile: Profile | null; reloadProfile: () => void; setNotice: (notice: string) => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('credit_transactions').select('id,amount,reason,balance_after,created_at').order('created_at', { ascending: false }).limit(20).then(({ data }) => setTransactions(data ?? []));
  }, []);

  async function buyPack(credits: number) {
    setBuying(credits);
    const { data, error } = await supabase.rpc('buy_credits', { p_amount: credits, p_reason: 'credit_pack' });
    if (error || data === null) {
      setNotice('Could not complete the purchase. Please try again.');
    } else {
      setNotice(`${credits} credits added to your account.`);
      reloadProfile();
      const { data: txData } = await supabase.from('credit_transactions').select('id,amount,reason,balance_after,created_at').order('created_at', { ascending: false }).limit(20);
      setTransactions(txData ?? []);
    }
    setBuying(null);
  }

  const plans = [
    { name: 'Free', price: '$0', credits: '5 credits / month', features: ['Image to 3D', 'Standard quality', 'Public generations'] },
    { name: 'Creator', price: '$19', credits: '300 credits / month', features: ['Everything in Free', 'HD textures', 'Private generations', 'API access'], popular: true },
    { name: 'Studio', price: '$59', credits: '1,200 credits / month', features: ['Everything in Creator', 'Priority generation', 'Team workspace', 'Commercial license'] },
  ];

  return <div className="mx-auto max-w-6xl fade-up">
    <p className="font-mono text-xs uppercase tracking-[.2em] text-[#b8f36b]">Plans & billing</p>
    <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold text-white">Choose your creative runway</h1><p className="mt-2 text-sm text-[#84949c]">You currently have <span className="font-semibold text-[#b8f36b]">{profile?.credits ?? 0} credits</span> available.</p></div></div>

    <div className="mt-8 rounded-2xl border border-[#2a3940] bg-[#0d171c] p-6"><h2 className="font-semibold text-white">Buy credit packs</h2><p className="mt-1 text-xs text-[#84949c]">Top up instantly — no subscription needed.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{creditPacks.map(pack => <div key={pack.credits} className={`relative rounded-xl border p-5 ${pack.popular ? 'border-[#b8f36b] bg-[#142019]' : 'border-[#2a3940] bg-[#101b20]'}`}>{pack.popular && <span className="absolute -top-2.5 left-4 rounded-full bg-[#b8f36b] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#0c1610]">Best value</span>}<p className="text-sm text-[#84949c]">{pack.label}</p><div className="mt-3 flex items-baseline gap-2"><span className="text-3xl font-extrabold text-white">{pack.credits}</span><span className="text-xs text-[#76878f]">credits</span></div><p className="mt-2 text-lg font-bold text-[#b8f36b]">{pack.price}</p><button disabled={buying !== null} onClick={() => buyPack(pack.credits)} className="mt-4 w-full rounded-lg bg-[#b8f36b] py-2.5 text-xs font-bold text-[#0c1610] transition hover:bg-[#d0ff91] disabled:opacity-50">{buying === pack.credits ? <RotateCw className="spin mx-auto h-4 w-4" /> : 'Buy now'}</button></div>)}</div></div>

    <div className="mt-6 grid gap-4 lg:grid-cols-3">{plans.map(plan => <div key={plan.name} className={`relative rounded-2xl border p-6 ${plan.popular ? 'border-[#b8f36b] bg-[#142019]' : 'border-[#2a3940] bg-[#0d171c]'}`}>{plan.popular && <span className="absolute -top-3 left-5 rounded-full bg-[#b8f36b] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#0c1610]">Most popular</span>}<h2 className="text-lg font-bold text-white">{plan.name}</h2><div className="mt-5"><span className="text-4xl font-extrabold text-white">{plan.price}</span><span className="text-sm text-[#76878f]"> / month</span></div><p className="mt-3 rounded-lg bg-[#17252b] px-3 py-2 text-xs font-semibold text-[#b8f36b]">{plan.credits}</p><ul className="mt-6 space-y-3">{plan.features.map(feature => <li key={feature} className="flex items-center gap-2 text-sm text-[#aab8bd]"><Check className="h-4 w-4 text-[#b8f36b]" />{feature}</li>)}</ul><button className={`mt-8 w-full rounded-lg py-3 text-sm font-bold ${plan.name === 'Free' ? 'border border-[#3a4a51] text-[#aebbc0]' : 'bg-[#b8f36b] text-[#0c1610] hover:bg-[#d0ff91]'}`}>{plan.name === 'Free' ? 'Current plan' : 'Upgrade plan'}</button></div>)}</div>

    <div className="mt-8 rounded-2xl border border-[#2a3940] bg-[#0d171c] p-6"><h2 className="font-semibold text-white">Transaction history</h2>{transactions.length === 0 ? <p className="mt-4 text-sm text-[#74858d]">No transactions yet.</p> : <div className="mt-4 space-y-2">{transactions.map(tx => <div key={tx.id} className="flex items-center justify-between border-b border-[#1e2d33] py-2.5 last:border-0"><div className="flex items-center gap-3"><span className={`font-mono text-sm font-bold ${tx.amount > 0 ? 'text-[#b8f36b]' : 'text-[#ff8c80]'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span><span className="text-xs text-[#84949c]">{tx.reason.replace(/_/g, ' ')}</span></div><div className="flex items-center gap-4"><span className="font-mono text-xs text-[#74858d]">{tx.balance_after} after</span><span className="text-xs text-[#74858d]">{new Date(tx.created_at).toLocaleDateString()}</span></div></div>)}</div>}</div>
  </div>;
}

function HistoryView() {
  const [items, setItems] = useState<Generation[]>([]);
  useEffect(() => {
    supabase.from('generations').select('id,status,texture,model_format,created_at,model_url,error_message').order('created_at', { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, []);

  return <div className="mx-auto max-w-6xl fade-up">
    <p className="font-mono text-xs uppercase tracking-[.2em] text-[#b8f36b]">Library</p>
    <div className="mt-3 flex items-center justify-between"><div><h1 className="text-3xl font-bold text-white">My models</h1><p className="mt-2 text-sm text-[#84949c]">Everything you've forged, in one place.</p></div></div>
    {items.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-[#314149] py-24 text-center"><Box className="mx-auto h-8 w-8 text-[#63747c]" /><p className="mt-4 font-semibold text-white">Your library is waiting</p><p className="mt-2 text-sm text-[#74858d]">Generated models will appear here.</p></div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <div key={item.id} className="overflow-hidden rounded-xl border border-[#2a3940] bg-[#0d171c]"><div className="grid h-48 place-items-center bg-[#101e24]"><Box className="h-14 w-14 text-[#b8f36b]/70" /></div><div className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-xs uppercase text-[#b8f36b]">{item.model_format}</span><span className={`text-xs ${item.status === 'completed' ? 'text-[#b8f36b]' : item.status === 'failed' ? 'text-[#ff8c80]' : 'text-[#f0c890]'}`}>{item.status}</span></div><p className="mt-3 text-sm font-semibold text-white">MeshForge creation</p><p className="mt-1 text-xs text-[#74858d]">{new Date(item.created_at).toLocaleDateString()}</p></div></div>)}</div>}
  </div>;
}

function AdminView() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('id,email,credits,is_admin').order('created_at', { ascending: false }).then(({ data }) => setUsers(data ?? []));
  }, []);

  async function grant(userId: string) {
    const amount = Number(amounts[userId] ?? 0);
    if (!amount || isNaN(amount)) return;
    const { error } = await supabase.rpc('grant_credits', { p_user_id: userId, p_amount: amount, p_reason: amount > 0 ? 'admin_grant' : 'admin_revoke' });
    if (error) setMessage('Could not update credits.');
    else {
      setUsers(users.map(user => user.id === userId ? { ...user, credits: user.credits + amount } : user));
      setAmounts({ ...amounts, [userId]: '' });
      setMessage('Credit balance updated.');
    }
  }

  return <div className="mx-auto max-w-6xl fade-up">
    <p className="font-mono text-xs uppercase tracking-[.2em] text-[#b8f36b]">Control room</p>
    <h1 className="mt-3 text-3xl font-bold text-white">Admin panel</h1>
    <p className="mt-2 text-sm text-[#84949c]">Manage creator access and credit balances.</p>
    {message && <p className="mt-5 text-sm text-[#b8f36b]">{message}</p>}
    <div className="mt-10 overflow-hidden rounded-2xl border border-[#2a3940] bg-[#0d171c]">
      <div className="hidden grid-cols-[1fr_100px_220px] gap-4 border-b border-[#26363d] px-5 py-4 text-xs uppercase tracking-wider text-[#71828a] md:grid"><span>Creator</span><span>Credits</span><span>Adjust balance</span></div>
      {users.map(user => <div key={user.id} className="flex flex-col gap-3 border-b border-[#1e2d33] px-5 py-4 last:border-0 md:grid md:grid-cols-[1fr_100px_220px] md:items-center md:gap-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#24343b] text-xs font-bold text-[#b8f36b]">{user.email.slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-semibold text-white">{user.email}</p>{user.is_admin && <p className="text-[10px] uppercase tracking-wider text-[#b8f36b]">Admin</p>}</div></div><span className="font-mono text-sm text-[#dbe4e7]">{user.credits}</span><div className="flex gap-2"><input value={amounts[user.id] ?? ''} onChange={e => setAmounts({ ...amounts, [user.id]: e.target.value })} placeholder="+10 / -5" className="w-24 rounded-md border border-[#33444b] bg-[#101c21] px-2.5 py-2 text-xs text-white outline-none focus:border-[#b8f36b]" /><button onClick={() => grant(user.id)} className="rounded-md bg-[#b8f36b] px-3 text-xs font-bold text-[#0c1610] hover:bg-[#d0ff91]">Apply</button></div></div>)}
    </div>
  </div>;
}

export default App;
