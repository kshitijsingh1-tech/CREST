"use client";

import { useState } from "react";
import { deleteUser } from "@/lib/api";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  userId: number;
  userName: string;
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${userName} from the roster? This will terminate their system access immediately.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteUser(userId);
      router.refresh(); // Triggers server-side re-fetch of listUsers()
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete Personnel Account"
      className="p-2 rounded-xl transition-all duration-300 border flex items-center justify-center
        dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/60
        bg-red-50 border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
