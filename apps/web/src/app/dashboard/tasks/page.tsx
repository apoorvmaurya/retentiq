'use client';

import React, { useEffect, useState } from 'react';
import { Customer } from '@retentiq/shared';
import {
  Square,
  Calendar,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { fetchFromApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface Task {
  id: string;
  customerId: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  createdAt: string;
  customerName: string;
  customerCompany: string;
}

export default function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCustId, setNewCustId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, customersData] = await Promise.all([
        fetchFromApi('/tasks'),
        fetchFromApi('/customers'),
      ]);
      setTasks(tasksData);
      setCustomers(customersData.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load task manager data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

      await fetchFromApi(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Task marked as ${nextStatus}`);
    } catch (err: any) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      toast.error(`Failed to update task: ${err.message}`);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTaskToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const id = taskToDelete;
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await fetchFromApi(`/tasks/${id}`, {
        method: 'DELETE',
      });
      toast.success('Task deleted successfully');
    } catch (err: any) {
      toast.error(`Failed to delete task: ${err.message}`);
      loadData();
    } finally {
      setIsConfirmOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCustId) {
      toast.warning('Please provide a title and select a customer');
      return;
    }
    setSubmitting(true);
    try {
      await fetchFromApi('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          customerId: newCustId,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
          status: 'pending',
        }),
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewCustId('');
      setNewDueDate('');
      toast.success('Task created successfully');
      loadData();
    } catch (err: any) {
      toast.error(`Failed to create task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase())) ||
      task.customerName.toLowerCase().includes(search.toLowerCase()) ||
      task.customerCompany.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-cyan-400" /> CSM Task Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track and execute key customer outreach plans to safeguard MRR.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-panel flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Pending Action Items
            </span>
            <h2 className="text-xl font-bold text-slate-200 mt-0.5">{pendingCount}</h2>
          </div>
        </div>
        <div className="p-4 rounded-xl glass-panel flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Completed Safeguards
            </span>
            <h2 className="text-xl font-bold text-slate-200 mt-0.5">{completedCount}</h2>
          </div>
        </div>
        <div className="p-4 rounded-xl glass-panel flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Target Customers
            </span>
            <h2 className="text-xl font-bold text-slate-200 mt-0.5">{customers.length}</h2>
          </div>
        </div>
      </div>

      {/* Filtering Panel */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-xl glass-panel bg-opacity-35">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, customers, or playbooks..."
            className="dashboard-input pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {(['all', 'pending', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? 'btn-primary !py-1.5 !px-3.5'
                  : 'btn-secondary !py-1.5 !px-3.5'
              }
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Container */}
      <div className="rounded-xl glass-panel overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading CSM outreach tasks...</p>
          </div>
        ) : error ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs text-slate-400">{error}</p>
            <button onClick={loadData} className="btn-secondary">
              Retry
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-slate-600" />
            <p className="text-xs text-slate-500">No tasks found matching current filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {filteredTasks.map((task) => {
              const isOverdue =
                task.dueDate && new Date(task.dueDate) < new Date() && task.status === 'pending';
              return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-all hover:bg-[#152347]/10 ${
                    task.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors duration-250 shrink-0"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <h3
                        className={`text-sm font-bold text-slate-100 ${
                          task.status === 'completed' ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Sub-line metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                          <User className="w-3.5 h-3.5 text-cyan-400" /> {task.customerName} (
                          {task.customerCompany})
                        </span>
                        {task.dueDate && (
                          <span
                            className={`flex items-center gap-1 ${
                              isOverdue
                                ? 'text-rose-400 bg-rose-950/25 px-2 py-0.5 rounded border border-rose-900/30'
                                : ''
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" /> Due:{' '}
                            {new Date(task.dueDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:border-l sm:border-slate-800/80 sm:pl-4">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 relative shadow-2xl">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#152347]/40 rounded-lg"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-cyan-400" /> Create Outreach Task
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Add a manual outreach safeguard for a customer.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Schedule checkpoint review"
                  className="dashboard-input"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Add context or meeting agenda outline..."
                  rows={3}
                  className="dashboard-input resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Customer Account *
                  </label>
                  <select
                    required
                    value={newCustId}
                    onChange={(e) => setNewCustId(e.target.value)}
                    className="dashboard-select"
                  >
                    <option value="">Select Account</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="dashboard-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />} Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Task Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Outreach Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteTask}
        onCancel={() => {
          setIsConfirmOpen(false);
          setTaskToDelete(null);
        }}
        isDanger={true}
      />
    </div>
  );
}
