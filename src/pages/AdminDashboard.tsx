import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Settings, Users, Plus, ShieldCheck, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [topic, setTopic] = useState('');
  const [targetCount, setTargetCount] = useState(10);
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(5);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.zapier.com/hooks/catch/10611904/u79d9v9/');
  const [newAllowedEmail, setNewAllowedEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clients
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const querySnapshot = await getDocs(q);
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);

      // Fetch allowed emails
      const emailsSnapshot = await getDocs(collection(db, 'allowed_emails'));
      const emailsData = emailsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllowedEmails(emailsData);

      // Fetch webhook settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        setWebhookUrl(settingsDoc.data().googleSheetsWebhookUrl || '');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !topic) return;

    try {
      await addDoc(collection(db, 'assignments'), {
        userId: selectedClient,
        topic,
        targetCount: Number(targetCount),
        targetDurationMinutes: Number(targetDurationMinutes),
        reminderTime,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid
      });
      alert('Assignment created successfully!');
      setTopic('');
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert('Failed to create assignment.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        googleSheetsWebhookUrl: webhookUrl
      });
      alert('Settings saved!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings.');
    }
  };

  const handleAddAllowedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllowedEmail) return;

    const email = newAllowedEmail.toLowerCase().trim();
    try {
      await setDoc(doc(db, 'allowed_emails', email), {
        email: email,
        role: 'client',
        addedAt: new Date().toISOString(),
        addedBy: auth.currentUser?.uid
      });
      setNewAllowedEmail('');
      fetchData(); // Refresh list
      alert('이메일이 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error("Error adding email:", error);
      alert('이메일 등록에 실패했습니다.');
    }
  };

  const handleRemoveAllowedEmail = async (emailId: string) => {
    if (!window.confirm('정말로 이 이메일의 접속 권한을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'allowed_emails', emailId));
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error removing email:", error);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-gray-700 flex items-center">
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Assignment Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Plus className="h-5 w-5 mr-2 text-blue-500" />
              New Assignment
            </h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Client</label>
                <select 
                  value={selectedClient} 
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                  required
                >
                  <option value="">-- Select a client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Stretching Topic</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., Morning Neck Stretch"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Count</label>
                  <input 
                    type="number" 
                    value={targetCount} 
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (mins)</label>
                  <input 
                    type="number" 
                    value={targetDurationMinutes} 
                    onChange={(e) => setTargetDurationMinutes(Number(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reminder Time</label>
                <input 
                  type="time" 
                  value={reminderTime} 
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Assign
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {/* Whitelist Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 text-green-500" />
                사용자 접속 권한 관리
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                여기에 등록된 구글 이메일 계정만 앱에 로그인할 수 있습니다.
              </p>
              
              <form onSubmit={handleAddAllowedEmail} className="mb-6 flex gap-2">
                <input 
                  type="email" 
                  value={newAllowedEmail} 
                  onChange={(e) => setNewAllowedEmail(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="허용할 구글 이메일 입력"
                  required
                />
                <button 
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  등록
                </button>
              </form>

              <div className="mt-4 max-h-48 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {allowedEmails.map(emailDoc => (
                    <li key={emailDoc.id} className="py-2 flex justify-between items-center">
                      <span className="text-sm text-gray-900">{emailDoc.email}</span>
                      <button 
                        onClick={() => handleRemoveAllowedEmail(emailDoc.id)}
                        className="text-red-500 hover:text-red-700"
                        title="권한 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {allowedEmails.length === 0 && (
                    <li className="text-sm text-gray-500 py-2">등록된 이메일이 없습니다.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-gray-500" />
                Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Google Sheets Webhook URL (Zapier/Make)</label>
                  <p className="text-xs text-gray-500 mb-2">When a user completes a stretch, data will be POSTed to this URL.</p>
                  <input 
                    type="url" 
                    value={webhookUrl} 
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="https://hooks.zapier.com/..."
                  />
                </div>
                <button 
                  onClick={handleSaveSettings}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Save Settings
                </button>
              </div>

              <div className="mt-8">
                <h3 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gray-500" />
                  Registered Clients
                </h3>
                <ul className="divide-y divide-gray-200">
                  {clients.map(client => (
                    <li key={client.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </li>
                  ))}
                  {clients.length === 0 && <p className="text-sm text-gray-500">No clients registered yet.</p>}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
