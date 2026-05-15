import React, { useEffect, useState, useMemo } from 'react';
import api, { notifySuccess } from '@/services/api';
import { X, Search, AlertCircle, Loader2, Paperclip } from 'lucide-react';

const Ticket: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    issueTitle: '',
    description: '',
    priority: 'Medium'
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/doctor/tickets');
      if (response.data) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const keyword = search.toLowerCase();
    return tickets.filter(t => 
      t.issueTitle.toLowerCase().includes(keyword) || 
      t.description.toLowerCase().includes(keyword) ||
      t.status.toLowerCase().includes(keyword)
    );
  }, [tickets, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.issueTitle || !newTicket.description) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('issueTitle', newTicket.issueTitle);
      formData.append('description', newTicket.description);
      formData.append('priority', newTicket.priority);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.post('/doctor/tickets', formData);
      
      setShowModal(false);
      setNewTicket({ issueTitle: '', description: '', priority: 'Medium' });
      setSelectedFile(null);
      await fetchTickets();
      notifySuccess('Ticket raised successfully.');
    } catch (error: any) {
      console.error('Failed to raise ticket', error);
      const message = error.response?.data?.message || 'Failed to raise ticket. Please try again.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button 
          onClick={() => setShowModal(true)}
          className="shrink-0 rounded-xl bg-[#1faa62] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition-all active:scale-95 hover:bg-[#199453] sm:w-auto"
        >
          + Raise Ticket
        </button>
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search support tickets..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm transition-all"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white px-4 py-8 text-center text-sm italic text-gray-400 shadow-sm">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-20" />
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 opacity-20" />
              {search ? "No matching tickets found" : "No support tickets raised yet"}
            </div>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#142e26]">{ticket.issueTitle}</p>
                    {ticket.attachmentUrl && (
                      <a
                        href={api.defaults.baseURL?.replace('/api', '') + ticket.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1 transition-colors hover:bg-gray-100"
                        title={ticket.attachmentName || 'View attachment'}
                      >
                        <Paperclip className="h-3.5 w-3.5 text-[#1faa62]" />
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#607d74]">{ticket.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  ticket.status === 'Open' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                  'bg-green-50 text-green-600 border border-green-100'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className={`font-medium ${
                  ticket.priority === 'Critical' ? 'text-red-600' :
                  ticket.priority === 'High' ? 'text-orange-600' :
                  ticket.priority === 'Medium' ? 'text-blue-600' :
                  'text-gray-500'
                }`}>
                  {ticket.priority}
                </span>
                <span className="text-[#607d74]">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] divide-y divide-gray-50">
            <thead className="bg-[#f8fbf9]">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#607d74] uppercase tracking-wide">Issue Title</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-[#607d74] uppercase tracking-wide">Description</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-[#607d74] uppercase tracking-wide">Status</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-[#607d74] uppercase tracking-wide">Priority</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-[#607d74] uppercase tracking-wide">Created Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-20" />
                    Loading tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      {search ? "No matching tickets found" : "No support tickets raised yet"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-[#f8fbf9] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#142e26]">
                      <div className="flex items-center gap-2">
                        {ticket.issueTitle}
                        {ticket.attachmentUrl && (
                          <a 
                            href={api.defaults.baseURL?.replace('/api', '') + ticket.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                            title={ticket.attachmentName || 'View attachment'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#1faa62]" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#607d74] max-w-xs truncate">{ticket.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        ticket.status === 'Open' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-medium ${
                        ticket.priority === 'Critical' ? 'text-red-600' :
                        ticket.priority === 'High' ? 'text-orange-600' :
                        ticket.priority === 'Medium' ? 'text-blue-600' :
                        'text-gray-500'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-[#607d74]">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142e26]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-[#f8fbf9]">
              <div>
                <h3 className="text-xl font-bold text-[#142e26]">Raise Support Ticket</h3>
                <p className="text-xs text-[#607d74] font-medium">Describe your issue and the admin team will help.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X className="w-6 h-6 text-[#607d74]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#142e26] uppercase tracking-wider">Issue Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Cannot print prescription"
                      value={newTicket.issueTitle}
                      onChange={e => setNewTicket({...newTicket, issueTitle: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f8fbf9] border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#142e26] uppercase tracking-wider">Priority Level</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTicket({...newTicket, priority: p})}
                          className={`py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                            newTicket.priority === p 
                            ? 'bg-[#1faa62] text-white border-[#1faa62] shadow-md shadow-green-100' 
                            : 'bg-white text-[#607d74] border-gray-100 hover:border-[#1faa62]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#142e26] uppercase tracking-wider">Attachment (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-[#607d74] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[#1faa62]/10 file:text-[#1faa62] hover:file:bg-[#1faa62]/20 cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-400">PDF or Images, max 10MB</p>
                  </div>
                </div>

                <div className="space-y-6 flex flex-col">
                  <div className="space-y-2 flex-1 flex flex-col">
                    <label className="text-xs font-bold text-[#142e26] uppercase tracking-wider">Description</label>
                    <textarea 
                      required
                      placeholder="Please provide details about the issue..."
                      value={newTicket.description}
                      onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f8fbf9] border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm resize-none flex-1 min-h-[150px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-50">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-white border border-gray-200 text-[#607d74] font-bold rounded-xl hover:bg-gray-50 transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#1faa62] text-white font-bold rounded-xl hover:bg-[#179353] disabled:opacity-50 transition-all shadow-lg shadow-green-100 active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ticket;
