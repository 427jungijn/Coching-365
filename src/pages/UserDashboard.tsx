import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { signOut } from 'firebase/auth';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { CheckCircle, LogOut, Activity, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    // Check for notifications every minute
    const interval = setInterval(() => {
      if (notificationPermission === 'granted' && assignments.length > 0) {
        const now = new Date();
        const currentTime = format(now, 'HH:mm');
        
        assignments.forEach(assignment => {
          if (assignment.reminderTime === currentTime) {
            new Notification('Time to Stretch!', {
              body: `It's time for your ${assignment.topic} stretch!`,
              icon: '/vite.svg'
            });
          }
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [assignments, notificationPermission]);

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assignments
      const qAssignments = query(
        collection(db, 'assignments'), 
        where('userId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const assignSnap = await getDocs(qAssignments);
      const assigns = assignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(assigns);

      // Fetch logs
      const qLogs = query(
        collection(db, 'logs'),
        where('userId', '==', user?.uid),
        orderBy('completedAt', 'desc')
      );
      const logsSnap = await getDocs(qLogs);
      const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleCheck = async (assignment: any) => {
    try {
      const now = new Date();
      const logData = {
        userId: user?.uid,
        assignmentId: assignment.id,
        completedAt: now.toISOString(),
        dateString: format(now, 'yyyy-MM-dd'),
        durationMinutes: assignment.targetDurationMinutes,
        count: assignment.targetCount
      };

      await addDoc(collection(db, 'logs'), logData);
      
      // Send to webhook if configured
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      let webhookUrl = 'https://hooks.zapier.com/hooks/catch/10611904/u79d9v9/';
      if (settingsDoc.exists() && settingsDoc.data().googleSheetsWebhookUrl) {
        webhookUrl = settingsDoc.data().googleSheetsWebhookUrl;
      }
      
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...logData,
              userName: profile?.name,
              userEmail: profile?.email,
              topic: assignment.topic
            })
          });
        } catch (e) {
          console.error("Webhook failed", e);
        }
      }

      alert('Great job! Stretch logged.');
      fetchData(); // Refresh logs
    } catch (error) {
      console.error("Error logging stretch:", error);
      alert('Failed to log stretch.');
    }
  };

  // Prepare chart data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const chartData = daysInWeek.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(log => log.dateString === dayStr);
    const totalDuration = dayLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
    return {
      name: format(day, 'EEE'),
      duration: totalDuration
    };
  });

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Biocode Coaching365</h1>
            </div>
            <div className="flex items-center space-x-4">
              {notificationPermission !== 'granted' && (
                <button onClick={requestNotificationPermission} className="text-yellow-600 hover:text-yellow-700 flex items-center text-sm">
                  <Bell className="h-4 w-4 mr-1" />
                  Enable Notifications
                </button>
              )}
              <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-gray-700 flex items-center text-sm">
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome, {profile?.name}!</h2>
          <p className="text-gray-600">Here are your stretching assignments.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Assignments List */}
          <div className="md:col-span-2 space-y-6">
            {assignments.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                You have no assignments yet. Your coach will assign them soon.
              </div>
            ) : (
              assignments.map(assignment => {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const hasCompletedToday = logs.some(log => log.assignmentId === assignment.id && log.dateString === todayStr);

                return (
                  <div key={assignment.id} className="bg-white shadow rounded-lg p-6 flex flex-col sm:flex-row justify-between items-center">
                    <div className="mb-4 sm:mb-0">
                      <h3 className="text-lg font-bold text-gray-900">{assignment.topic}</h3>
                      <p className="text-sm text-gray-500">
                        {assignment.targetCount} reps • {assignment.targetDurationMinutes} mins • Reminder: {assignment.reminderTime}
                      </p>
                    </div>
                    <div>
                      {hasCompletedToday ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="h-6 w-6 mr-2" />
                          Completed Today
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleCheck(assignment)}
                          className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Check (Done)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Progress Sidebar */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Progress (Mins)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" textAnchor="end" tick={{fontSize: 12}} />
                    <Tooltip />
                    <Bar dataKey="duration" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Logs</h3>
              <ul className="divide-y divide-gray-200">
                {logs.slice(0, 5).map(log => {
                  const assignment = assignments.find(a => a.id === log.assignmentId);
                  return (
                    <li key={log.id} className="py-3">
                      <p className="text-sm font-medium text-gray-900">{assignment?.topic || 'Unknown Stretch'}</p>
                      <p className="text-xs text-gray-500">
                        {format(parseISO(log.completedAt), 'MMM d, yyyy h:mm a')} • {log.durationMinutes} mins
                      </p>
                    </li>
                  );
                })}
                {logs.length === 0 && <p className="text-sm text-gray-500">No logs yet.</p>}
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
