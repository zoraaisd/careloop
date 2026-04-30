import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX, FiTrash2 } from 'react-icons/fi';
import type { AdminUserSubscriptionDetail } from '@/services/admin';

interface UserSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: AdminUserSubscriptionDetail[];
  isLoading: boolean;
  onDelete?: (id: string, name: string) => Promise<void>;
}

export function UserSubscriptionModal({ isOpen, onClose, title, users, isLoading, onDelete }: UserSubscriptionModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-[24px] border border-slate-200 bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <FiX className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="relative overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Doctor Name</th>
                  <th className="px-6 py-4 font-medium">Clinic</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Expiration Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{user.doctorName}</td>
                      <td className="px-6 py-4">{user.clinicName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          {user.planName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(user.expirationDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDelete?.(user.id, user.doctorName)}
                          title="Permanently Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
