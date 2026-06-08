import { useState, useEffect } from "react";
import { Learner } from "../../context/DataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface EditLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  learner: Learner | null;
  onSave: (id: number, updates: Partial<Learner>) => void;
}

export function EditLearnerModal({ isOpen, onClose, learner, onSave }: EditLearnerModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "active" as "active" | "inactive" | "suspended",
  });

  useEffect(() => {
    if (learner) {
      setFormData({
        name: learner.name,
        email: learner.email,
        status: learner.status,
      });
    }
  }, [learner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    if (!learner) return;

    // Generate new avatar initials if name changed
    const avatar = formData.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    onSave(learner.id, {
      name: formData.name,
      email: formData.email,
      status: formData.status,
      avatar,
      accountStatus: formData.status === "active" ? "Active" : formData.status === "suspended" ? "Suspended" : "Inactive",
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Learner</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter learner name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="learner@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "suspended" })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
