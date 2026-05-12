import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { getAuthSession } from '@/services/auth-storage';
import { emitDashboardRefresh } from '@/services/dashboard-refresh';
import { Search, Mic, Send, Calendar, Clock } from 'lucide-react';
import clsx from 'clsx';
import { getClinicDoctors, type ClinicDoctorListItem } from '@/services/doctor-management';

type Patient = {
  patientId: string;
  name: string;
  phone: string;
  doctorName: string | null;
  primaryDoctorId: string | null;
};

type PatientListResponse = {
  total: number;
  items: Patient[];
};

const Chat: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetPatientId = searchParams.get('patientId');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const session = getAuthSession();
  const [doctors, setDoctors] = useState<ClinicDoctorListItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Speech Recognition setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Always listen in English

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const targetLang = language;
          if (targetLang !== 'en') {
            // Translate from English to selected language
            fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(finalTranscript.trim())}`)
              .then(res => res.json())
              .then(data => {
                const translated = data[0].map((item: any) => item[0]).join('');
                setMessage((prev) => prev + (prev ? ' ' : '') + translated);
              })
              .catch(err => {
                console.error('Translation error:', err);
                setMessage((prev) => prev + (prev ? ' ' : '') + finalTranscript);
              });
          } else {
            setMessage((prev) => prev + (prev ? ' ' : '') + finalTranscript);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert('Speech recognition is not supported in this browser.');
      }
    }
  };

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get<PatientListResponse>('/doctor/patients');
      const items = response.data.items ?? [];
      setPatients(items);

      // Auto-select if patientId is in URL
      if (targetPatientId) {
        const patient = items.find((p) => p.patientId === targetPatientId);
        if (patient) {
          setSelectedPatient(patient);
        }
      }
    } catch (error) {
      console.error('Failed to fetch patients', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const data = await getClinicDoctors();
      setDoctors(data);
      if (data.length > 0) {
        const currentDoc = data.find(d => d.userId === session?.userId);
        if (currentDoc) setSelectedDoctorId(currentDoc.userId);
        else setSelectedDoctorId(data[0].userId);
      }
    } catch (error) {
      console.error('Failed to fetch doctors', error);
    }
  };

  useEffect(() => {
    void fetchPatients();
    void fetchDoctors();
  }, [targetPatientId]);

  useEffect(() => {
    if (selectedPatient?.primaryDoctorId) {
      setSelectedDoctorId(selectedPatient.primaryDoctorId);
    }
  }, [selectedPatient]);

  const filteredPatients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(keyword) || p.phone.includes(keyword));
  }, [patients, search]);

  const handleSend = async () => {
    if (!selectedPatient || !message.trim()) return;

    setIsSending(true);
    try {
      let finalMessage = message.trim();

      if (language !== 'en') {
        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${language}&dt=t&q=${encodeURIComponent(finalMessage)}`);
          const data = await res.json();
          finalMessage = data[0].map((item: any) => item[0]).join('');
        } catch (e) {
          console.error('Translation failed before sending', e);
        }
      }

      await api.post('/whatsapp/chat/send', {
        patientId: selectedPatient.patientId,
        doctorId: selectedDoctorId || session?.userId,
        message: finalMessage,
        sourceLanguage: 'en',
        targetLanguage: language,
      });
      setMessage('');
      emitDashboardRefresh('chat:send');
      alert('Message sent successfully via WhatsApp!');
    } catch (error) {
      console.error('Failed to send message', error);
      alert('Failed to send message. Please check your Twilio configuration.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl border border-[#dce4e0] overflow-hidden">
      {/* Left Sidebar: Patient List */}
      <div className="w-[300px] border-r border-[#dce4e0] flex flex-col">
        <div className="p-4 border-b border-[#dce4e0]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-2 bg-[#f4f8f6] border border-[#dce4e0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1faa62]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-[#8ea59d]">Loading patients...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#8ea59d]">
              No patients found
            </div>
          ) : (
            filteredPatients.map((p) => (
              <div
                key={p.patientId}
                onClick={() => setSelectedPatient(p)}
                className={clsx(
                  "p-4 cursor-pointer border-b border-[#f0f4f2] hover:bg-[#f8fbf9] transition-colors",
                  selectedPatient?.patientId === p.patientId && "bg-[#eef5f1]"
                )}
              >
                <div className="font-semibold text-[#142e26] text-sm">{p.name}</div>
                <div className="text-xs text-[#738980]">{p.phone}</div>
              </div>
            )))}
        </div>
      </div>

      {/* Right Content: Chat Interface */}
      <div className="flex-1 flex flex-col bg-[#f8fbf9] overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
          <div className="w-16 h-16 bg-[#f4f8f6] rounded-2xl flex items-center justify-center text-[#1faa62] font-bold text-xl border border-[#dce4e0] mb-6 shadow-sm">
            {selectedPatient ? selectedPatient.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CL'}
          </div>
          <h1 className="text-2xl font-bold text-[#142e26] mb-2">Send a patient message</h1>
          <p className="text-[#607d74] text-sm mb-10 text-center">
            Choose a patient, pick a doctor, then send directly from this main section.
          </p>

          <div className="w-full space-y-6">
            {/* Doctor Name Field */}
            <div className="w-full">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#dce4e0] rounded-xl text-[#142e26] shadow-sm outline-none appearance-none"
              >
                <option value="" disabled>Select a doctor</option>
                {doctors.map((doc) => (
                  <option key={doc.userId} value={doc.userId}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#dce4e0] rounded-lg text-sm font-medium text-[#142e26] hover:bg-gray-50 transition-colors shadow-sm">
                <Calendar className="w-4 h-4 text-[#1faa62]" />
                Send Slots
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#dce4e0] rounded-lg text-sm font-medium text-[#142e26] hover:bg-gray-50 transition-colors shadow-sm">
                <Clock className="w-4 h-4 text-[#1faa62]" />
                Follow-Up
              </button>
            </div>

            {/* Patient Name Field */}
            <div className="w-full">
              <div className="w-full px-4 py-3 bg-white border border-[#dce4e0] rounded-xl text-[#142e26] shadow-sm">
                {selectedPatient ? selectedPatient.name : 'Select a patient'}
              </div>
            </div>

            {/* Language Selection */}
            <div className="w-full">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#dce4e0] rounded-xl text-[#142e26] shadow-sm outline-none appearance-none"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            {/* Message Area */}
            <div className="relative group">
              <textarea
                placeholder="Type a message to send via WhatsApp..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 px-5 py-4 bg-white border border-[#dce4e0] rounded-2xl text-[#142e26] shadow-sm focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] outline-none transition-all resize-none"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-3">
                <button
                  onClick={toggleListening}
                  className={clsx(
                    "p-2.5 rounded-full transition-all",
                    isListening ? "bg-red-50 text-red-500 animate-pulse" : "bg-[#f4f8f6] text-[#607d74] hover:bg-[#eef5f1] hover:text-[#1faa62]"
                  )}
                  title={isListening ? "Stop listening" : "Start voice typing"}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !message.trim() || !selectedPatient}
                  className="p-2.5 bg-[#1faa62] text-white rounded-full hover:bg-[#179353] disabled:bg-[#dce4e0] disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
