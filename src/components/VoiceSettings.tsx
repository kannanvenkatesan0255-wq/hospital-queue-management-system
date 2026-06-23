import React, { useState, useEffect } from 'react';
import { Volume2, Languages, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { getStoredVoiceSettings, saveVoiceSettings, VoiceSettingsConfig, DEFAULT_VOICE_SETTINGS } from '../utils/voiceAnnouncer';

export function VoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettingsConfig>({ ...DEFAULT_VOICE_SETTINGS });
  const [testToken, setTestToken] = useState('A-024');
  const [testRoom, setTestRoom] = useState('Room 101');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setSettings(getStoredVoiceSettings());
    
    // Load speech synthesis voices if available
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleChange = (key: keyof VoiceSettingsConfig, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveVoiceSettings(updated);
  };

  const triggerTestSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    let voiceText = '';
    const cleanRoom = testRoom || 'Room 101';
    
    if (settings.language === 'ta') {
      voiceText = `டோக்கன் ${testToken}, தயவுசெய்து டாக்டர் Jenkins, ${cleanRoom} க்கு செல்லவும்.`;
    } else {
      voiceText = `Token ${testToken}. Please proceed immediately to Doctor Jenkins in ${cleanRoom}.`;
    }

    const utterance = new SpeechSynthesisUtterance(voiceText);
    utterance.volume = settings.volume;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    // Apply voice language
    const currentVoices = window.speechSynthesis.getVoices();
    const foundVoice = settings.language === 'ta' 
      ? currentVoices.find(v => v.lang.startsWith('ta')) 
      : currentVoices.find(v => v.lang.startsWith('en')) || null;
      
    if (foundVoice) {
      utterance.voice = foundVoice;
    } else {
      utterance.lang = settings.language === 'ta' ? 'ta-IN' : 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-violet-50 text-violet-600 rounded-xl">
            <Volume2 className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Audio Announcement System</h3>
            <p className="text-xs text-[#6B7280]">Voice synthesis controller for clinical arrivals</p>
          </div>
        </div>
        
        {/* Toggle switch */}
        <button
          onClick={() => handleChange('enabled', !settings.enabled)}
          className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition ${
            settings.enabled 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-xs' 
              : 'bg-slate-100 text-[#4B5563] border border-slate-200'
          }`}
        >
          {settings.enabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 animate-pulse" /> SYSTEM ON
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" /> SYSTEM MUTED
            </>
          )}
        </button>
      </div>

      {settings.enabled ? (
        <div className="space-y-4">
          
          {/* Select language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#4B5563] flex items-center gap-1">
                <Languages size={12} /> Announcement Language
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChange('language', 'en')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    settings.language === 'en' 
                      ? 'bg-violet-50 border-violet-300 text-violet-700 font-black' 
                      : 'border-slate-200 hover:bg-slate-50 text-[#4B5563]'
                  }`}
                >
                  English Language
                </button>
                <button
                  onClick={() => handleChange('language', 'ta')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    settings.language === 'ta' 
                      ? 'bg-violet-50 border-violet-300 text-violet-700 font-black' 
                      : 'border-slate-200 hover:bg-slate-50 text-[#4B5563]'
                  }`}
                >
                  Tamil Language (தமிழ்)
                </button>
              </div>
            </div>

            {/* Test panel parameters */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4B5563] block">Test Simulation variables</span>
              <div className="flex gap-2 text-xs font-medium">
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] text-[#6B7280]">Token Code</span>
                  <input 
                    type="text" 
                    value={testToken} 
                    onChange={e => setTestToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200. p-1.5 rounded-lg text-[#111827] focus:outline-hidden text-center uppercase tracking-wider font-bold"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] text-[#6B7280]">Target Cabin</span>
                  <input 
                    type="text" 
                    value={testRoom} 
                    onChange={e => setTestRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 p-1.5 rounded-lg text-[#111827] focus:outline-hidden text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Voice configurations sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-50 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#4B5563]">
                  <span>Vocal Volume</span>
                  <span className="font-mono">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={settings.volume} 
                  onChange={e => handleChange('volume', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Rate / Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#4B5563]">
                  <span>Vocal Speed</span>
                  <span className="font-mono">{settings.rate}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.1" 
                  value={settings.rate} 
                  onChange={e => handleChange('rate', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Pitch Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#4B5563]">
                  <span>Vocal Pitch</span>
                  <span className="font-mono">{settings.pitch}</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.1" 
                  value={settings.pitch} 
                  onChange={e => handleChange('pitch', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

            </div>
          </div>

          <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
            <div className="text-[10px] text-[#6B7280] font-mono flex items-center gap-1">
              <Sparkles size={11} className="text-violet-500" /> Web Speech Synthesis Engaged
            </div>
            
            <button
              onClick={triggerTestSpeech}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            >
              🔊 Test Announcement
            </button>
          </div>

        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 text-[#4B5563] text-xs">
          <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <p>
            The Voice Announcement System is presently muted. Patients called to clinical cabins will not trigger automatic audio notifications until turned back on.
          </p>
        </div>
      )}
    </div>
  );
}
