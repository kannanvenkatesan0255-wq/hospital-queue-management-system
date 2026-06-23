import React, { useState, useEffect } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { api } from './services/api';
import { Patient, Doctor, QueueSettings, AnalyticsSummary, User } from './types';
import { ReceptionControl } from './components/ReceptionControl';
import { WaitingTVBoard } from './components/WaitingTVBoard';
import { PatientPortal } from './components/PatientPortal';
import { DoctorPortal } from './components/DoctorPortal';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import {
  Activity,
  Users,
  Tv,
  Stethoscope,
  Heart,
  LogIn,
  LogOut,
  Settings as SettingsIcon,
  Bell,
  CheckCircle,
  X,
  Lock,
  Plus,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: string;
}

export default function App() {
  // Navigation active route state
  // 'patient' | 'tv' | 'doctor' | 'receptionist' | 'analytics'
  const [activeTab, setActiveTab] = useState<'patient' | 'tv' | 'doctor' | 'receptionist' | 'analytics'>('patient');

  // Master lists
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [settings, setSettings] = useState<QueueSettings>({
    id: 'global_settings',
    clinicName: 'St. Jude Health Center',
    avgConsultationTime: 10,
    resetTime: '00:00',
  });
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    patientsWaiting: 0,
    currentServingToken: null,
    patientsServedToday: 0,
    averageWaitTimeMinutes: 10,
    efficiencyPercent: 100,
    activeDoctorsCount: 0,
    patientsPerHour: [],
    patientsPerDay: [],
    doctorEfficiencyList: [],
  });

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Notifications Alert Stack
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Socket Connection Status
  const [socketConnected, setSocketConnected] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showDbHelp, setShowDbHelp] = useState(false);

  // Helper trigger to append standard toasts manually
  const triggerToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newToast = { id, message, type, timestamp };
    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep last 5

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // --- 1. BOOTSTRAP DATASHEETS ---
  const loadSnapshot = async (retryCount = 0) => {
    try {
      const [patList, docList, setObj, anaStats, dbStatus] = await Promise.all([
        api.getPatients(),
        api.getDoctors(),
        api.getSettings(),
        api.getAnalytics(),
        api.getDbStatus().catch(() => ({ connected: false, error: 'Endpoint unreachable' })),
      ]);

      setPatients(patList);
      setDoctors(docList);
      setSettings(setObj);
      setAnalytics(anaStats);
      setDbConnected(dbStatus.connected);
      setDbError(dbStatus.error || null);
      setLoadError(null);
      setIsInitialLoading(false);
    } catch (err: any) {
      console.error('Error fetching clinical databases:', err);
      const errMsg = err?.message || 'Failed to connect to backend service';
      setLoadError(errMsg);
      
      // Auto-retry with backoff
      const nextDelay = Math.min(8000, 1500 * Math.pow(1.5, retryCount));
      setTimeout(() => {
        loadSnapshot(retryCount + 1);
      }, nextDelay);
    }
  };

  // Check login profile status from token
  const checkSession = async () => {
    const token = localStorage.getItem('qc_token');
    if (token) {
      try {
        const res = await api.getProfile();
        setUser(res.user);
      } catch (err) {
        localStorage.removeItem('qc_token');
        setUser(null);
      }
    }
  };

  // --- 2. WEBSOCKET STATE SYNC ---
  useEffect(() => {
    loadSnapshot();
    checkSession();

    // Connect socket on same host endpoint
    const socket = socketIO();

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('Sync system online with Server via Socket.IO');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('queue:updated', (data: { patients: Patient[]; doctors: Doctor[] }) => {
      setPatients(data.patients);
      setDoctors(data.doctors);
    });

    socket.on('analytics:updated', (newAnalytics: AnalyticsSummary) => {
      setAnalytics(newAnalytics);
    });

    socket.on('toast:notify', (data: { message: string; type: ToastMessage['type'] }) => {
      triggerToast(data.message, data.type);
    });

    // Periodically poll MongoDB connection status
    const dbInterval = setInterval(async () => {
      try {
        const dbStatus = await api.getDbStatus();
        setDbConnected(dbStatus.connected);
        setDbError(dbStatus.error || null);
      } catch (err) {
        setDbConnected(false);
        setDbError('Failed to probe connection endpoint');
      }
    }, 15000);

    return () => {
      socket.disconnect();
      clearInterval(dbInterval);
    };
  }, []);

  // --- 3. CONTROLLER COMMANDS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await api.login(loginEmail, loginPassword);
      localStorage.setItem('qc_token', res.token);
      setUser(res.user);
      setLoginEmail('');
      setLoginPassword('');
      triggerToast(`Welcome back, ${res.user.name}!`, 'success');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid clinical administrator credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('qc_token');
    setUser(null);
    triggerToast('Logged out successfully', 'info');
  };

  // Helper trigger to auto fill receptionist login for testing panel
  const handleQuickLoginFill = () => {
    setLoginEmail('demo@queuecure.com');
    setLoginPassword('Password123');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col md:flex-row font-sans antialiased text-[#111827]">
      
      {/* SIDEBAR - PROFESSIONAL INTEGRATION */}
      <aside className="w-68 bg-white border-r border-[#E5E7EB] hidden md:flex flex-col flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-[#F1F5F9] cursor-pointer" onClick={() => setActiveTab('patient')}>
          <span className="p-2.5 bg-gradient-to-br from-[#2563EB] to-[#14B8A6] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/15 transition hover:opacity-90">
            <Activity className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <span className="text-md font-black tracking-widest text-[#111827]">
              QUEUE <span className="text-[#14B8A6]">CURE</span>
            </span>
            <span className="text-[8px] uppercase tracking-wider block font-bold leading-none text-slate-400">
              Clinic SaaS v1.0
            </span>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('patient')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'patient' 
                ? 'bg-[#F1F5F9] text-[#2563EB]' 
                : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'
            }`}
          >
            <Users className="w-4 h-4" />
            Patient Portal
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'tv' 
                ? 'bg-[#F1F5F9] text-[#2563EB]' 
                : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'
            }`}
          >
            <Tv className="w-4 h-4" />
            Overhead Display
          </button>

          <button
            onClick={() => setActiveTab('doctor')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'doctor' 
                ? 'bg-[#F1F5F9] text-[#2563EB]' 
                : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Doctor Cabin
          </button>

          <button
            onClick={() => setActiveTab('receptionist')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'receptionist' 
                ? 'bg-[#F1F5F9] text-[#2563EB]' 
                : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Receptionist Console
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'analytics' 
                ? 'bg-[#F1F5F9] text-[#2563EB]' 
                : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'
            }`}
          >
            <Activity className="w-4 h-4" />
            Analytics Board
          </button>
        </nav>

        {/* User context footer block */}
        <div className="p-4 border-t border-[#E5E7EB]">
          {user ? (
            <div className="bg-[#F1F5F9] p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#14B8A6] flex items-center justify-center text-white font-bold text-xs">
                PC
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">Patricia C.</p>
                <p className="text-xs text-[#6B7280] truncate">Reception Head</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('receptionist')}
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Lock size={13} /> Counselor Login
            </button>
          )}
        </div>
      </aside>

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP COMPANION HEADER */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 md:px-8 shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-[#111827] font-extrabold text-sm md:text-lg tracking-tight uppercase">
              {activeTab === 'patient' && 'Patient Lounge'}
              {activeTab === 'tv' && 'Overhead Display Monitor'}
              {activeTab === 'doctor' && 'Doctor Consultation Cabin'}
              {activeTab === 'receptionist' && 'Receptionist Dispatch Control'}
              {activeTab === 'analytics' && 'Hospital Telemetry Analytics'}
            </h1>

            {/* Live Synchronized state indicator badge */}
            <div className="flex items-center gap-2 bg-[#ECFDF5] px-2.5 py-1 rounded-lg border border-[#10B981] text-[#065F46] text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${socketConnected ? 'bg-[#10B981]' : 'bg-rose-500'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketConnected ? 'bg-[#10B981]' : 'bg-rose-500'}`}></span>
              </span>
              {socketConnected ? 'LIVE FEED ACTIVE' : 'RECONNECTING'}
            </div>

            {/* Database connection indicator badge */}
            {dbConnected === null ? (
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 text-[10px] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400 animate-pulse"></span>
                </span>
                VERIFYING DATABASE...
              </div>
            ) : dbConnected ? (
              <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-[#10B981] text-emerald-700 text-[10px] font-bold" title="Using connected live MongoDB cluster for data persistence">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                MONGODB CONNECTED
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowDbHelp(!showDbHelp)}
                  className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-400 text-amber-700 text-[10px] font-extrabold cursor-pointer transition shadow-2xs" 
                  title="Click for MongoDB Connection Guide and diagnosis instructions"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse"></span>
                  </span>
                  LOCAL BACKUP ACTIVE (HELP ⚡)
                </button>
                
                {showDbHelp && (
                  <div className="absolute left-0 mt-2 w-80 bg-white border-2 border-amber-400 rounded-xl p-4 shadow-xl z-[9999] animate-fade-in text-xs text-[#374151] space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-amber-800 uppercase tracking-wide text-[11px] flex items-center gap-1">🔌 MongoDB Connection Assistant</h4>
                      <button onClick={() => setShowDbHelp(false)} className="text-[#9CA3AF] hover:text-[#4B5563] p-0.5 cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="space-y-2.5 leading-relaxed">
                      <p className="text-[#4B5563]">
                        The system has seamlessly activated the <strong>Local Backup DB</strong> to ensure perfect operation of clinical queue workflows.
                      </p>
                      
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-2 font-mono text-[9px] text-rose-700 break-all max-h-24 overflow-y-auto">
                        <strong className="text-[10px]">❌ Connection Attempt Detail:</strong><br />
                        {dbError || 'Could not establish connection stream with cluster.'}
                      </div>

                      <div className="text-[10px] space-y-1.5 bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-blue-800">
                        <p className="font-extrabold uppercase tracking-wider text-[9px]">💡 Why did adding your IP not work?</p>
                        <p>
                          Our server runs in a secure <strong>cloud container environment</strong>, NOT on your local device. Therefore, the outbound traffic originates from cloud routing, not your personal IP address.
                        </p>
                        <p className="font-semibold text-blue-900 mt-1">
                          👉 <strong>Immediate Fix:</strong> In your MongoDB Atlas Dashboard under <strong>&quot;Network Access&quot;</strong>, add or update the allowed IP list to <strong>0.0.0.0/0</strong> (Allow access from anywhere).
                        </p>
                      </div>

                      <div className="pt-1.5 flex justify-end">
                        <button 
                          onClick={async () => {
                            setDbConnected(null);
                            try {
                              const dbStatus = await api.getDbStatus();
                              setDbConnected(dbStatus.connected);
                              setDbError(dbStatus.error || null);
                            } catch {
                              setDbConnected(false);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[9px] uppercase px-3 py-1.5 rounded-lg transition tracking-wide flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={10} /> Test Connection Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Display active capacity load */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl font-medium">
              <div className="text-right">
                <span className="text-[8px] text-[#6B7280] font-bold uppercase block tracking-wider leading-none">Admission Load</span>
                <span className="text-xs text-slate-800 font-extrabold">{patients.filter(p => p.status === 'waiting' || p.status === 'serving').length} Active</span>
              </div>
              <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div 
                  className="bg-[#8B5CF6] h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (patients.filter(p => p.status === 'waiting').length / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Mobile login indicator option */}
            <div className="md:hidden">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition"
                  title="Logout Session"
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('receptionist')}
                  className="px-2.5 py-1.5 bg-[#2563EB] text-white text-xs rounded-lg font-bold flex items-center gap-1"
                >
                  <Lock size={12} /> Login
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Small screen mobile routing tabs */}
        <div className="flex md:hidden bg-white border-b border-slate-200 grid grid-cols-5 p-1 text-center font-bold sticky top-15 z-20 shadow-3xs">
          <button
            onClick={() => setActiveTab('patient')}
            className={`text-[10px] py-1.5 rounded-lg transition-all ${activeTab === 'patient' ? 'bg-[#E1F5FE] text-[#2563EB] font-black' : 'text-[#6B7280]'}`}
          >
            Lounge
          </button>
          <button
            onClick={() => setActiveTab('tv')}
            className={`text-[10px] py-1.5 rounded-lg transition-all ${activeTab === 'tv' ? 'bg-[#E1F5FE] text-[#2563EB] font-black' : 'text-[#6B7280]'}`}
          >
            Monitor
          </button>
          <button
            onClick={() => setActiveTab('doctor')}
            className={`text-[10px] py-1.5 rounded-lg transition-all ${activeTab === 'doctor' ? 'bg-[#E1F5FE] text-[#2563EB] font-black' : 'text-[#6B7280]'}`}
          >
            Doctor
          </button>
          <button
            onClick={() => setActiveTab('receptionist')}
            className={`text-[10px] py-1.5 rounded-lg transition-all ${activeTab === 'receptionist' ? 'bg-[#E1F5FE] text-[#2563EB] font-black' : 'text-[#6B7280]'}`}
          >
            Desk
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`text-[10px] py-1.5 rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-[#E1F5FE] text-[#2563EB] font-black' : 'text-[#6B7280]'}`}
          >
            Charts
          </button>
        </div>

        {/* FLOATING REALTIME TOAST STACK */}
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none space-y-3 max-w-sm w-full">
          {toasts.map((t) => {
            const typeStyle = t.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-100 border-l-emerald-500'
              : t.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-100 border-l-amber-500'
                : t.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-100 border-l-rose-500'
                  : 'bg-blue-50 text-blue-800 border-blue-100 border-l-blue-500';

            return (
              <div
                key={t.id}
                className={`p-4 border rounded-2xl shadow-xl flex items-start gap-3 bg-white w-full pointer-events-auto border-l-4 animate-slide-in ${typeStyle}`}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold leading-relaxed">{t.message}</p>
                  <span className="text-[9px] text-[#6B7280] font-mono font-medium block">
                    {t.timestamp} • Active Broadcast
                  </span>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-slate-400 hover:text-slate-1000 p-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {/* ROUTED CONTENT WRAPPER */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 md:px-8 py-6 relative">
          
          {isInitialLoading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center min-h-[450px] text-center space-y-4 z-50 p-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl animate-pulse">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[#111827] uppercase tracking-wider">Syncing Clinical Registry...</p>
                {loadError ? (
                  <div className="space-y-2 max-w-md mx-auto">
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl font-mono leading-relaxed">
                      ⚠️ {loadError}
                    </p>
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 rounded-lg py-1 px-2.5 inline-block">
                      🔄 Connection error detected. Retrying connection shortly...
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7280]">Connecting to secure MongoDB & synchronizing local standby backup.</p>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'patient' && (
            <div className="animate-fade-in">
              <PatientPortal 
                patients={patients} 
                doctors={doctors} 
                avgConsultationTime={settings.avgConsultationTime} 
              />
            </div>
          )}

          {activeTab === 'tv' && (
            <div className="animate-fade-in max-w-7xl mx-auto">
              <WaitingTVBoard 
                patients={patients} 
                doctors={doctors} 
                avgConsultationTime={settings.avgConsultationTime} 
              />
            </div>
          )}

          {activeTab === 'doctor' && (
            <div className="animate-fade-in">
              <DoctorPortal 
                doctors={doctors} 
                patients={patients} 
                onRefresh={loadSnapshot} 
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="animate-fade-in space-y-8">
              <div className="border-b border-[#E5E7EB] pb-4 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black">ANALYTICS SUMMARY WORKSPACE</h1>
                  <p className="text-xs text-[#6B7280]">Live compiled hospital loads, active doctors and comparative daily volume reports</p>
                </div>
              </div>
              
              <AnalyticsCharts analytics={analytics} />

              {/* General details table */}
              <div className="bg-white border rounded-2xl p-6 shadow-3xs space-y-3">
                <h3 className="font-bold text-sm">Hourly Flow Details Table</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                  {analytics.patientsPerHour.map((ph, idx) => (
                    <div key={idx} className="bg-slate-50 border p-3 rounded-xl">
                      <span className="text-xs font-mono font-bold block">{ph.hour}</span>
                      <strong className="text-lg text-[#2563EB]">{ph.count} patients</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'receptionist' && (
            <div className="animate-fade-in">
              {user ? (
                <ReceptionControl
                  patients={patients}
                  doctors={doctors}
                  settings={settings}
                  analytics={analytics}
                  onRefresh={loadSnapshot}
                />
              ) : (
                /* CLEAN ADVISORY COUNSELOR LOGIN PANEL */
                <div className="max-w-md mx-auto bg-white border border-[#E5E7EB] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
                  
                  <div className="text-center space-y-1">
                    <div className="flex justify-center mb-3">
                      <span className="p-3.5 bg-[#2563EB]/10 text-[#2563EB] rounded-2xl">
                        <Lock size={28} />
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-[#111827]">RECON REGISTER ACCESS</h2>
                    <p className="text-xs text-[#6B7280]">Enter administrator clinic passwords to access receptionist panel</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Administrator Email</label>
                      <input
                        type="email"
                        required
                        placeholder="demo@queuecure.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl text-[#111827] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Security Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Password123"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-[#E5E7EB] text-xs px-3.5 py-2.5 rounded-xl text-[#111827] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    {loginError && (
                      <p className="text-xs text-rose-500 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                        {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#2563EB] text-white py-3 rounded-xl text-xs font-black cursor-pointer transition shadow hover:scale-[1.01]"
                    >
                      Authenticate Counselor
                    </button>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleQuickLoginFill}
                        className="w-full text-xs text-[#2563EB] font-bold hover:underline py-1"
                      >
                        💡 Use Demo Credentials (demo@queuecure.com / Password123)
                      </button>
                    </div>
                  </form>

                </div>
              )}
            </div>
          )}

        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-[#E5E7EB] py-6 text-center text-xs text-[#6B7280] bg-linear-to-b from-white to-slate-50/50">
          <p className="font-semibold text-slate-800">
            📍 Queue Cure '26 • Hospital Dispatch Center System Interface
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Designed for optimal clinical performance • Real-time websockets authorized via JWT encryption algorithms
          </p>
        </footer>

      </div>

    </div>
  );
}
