import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, IndianRupee } from "lucide-react";
import { getPayments, fileUrl } from "@/lib/api";
import { formatINR, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

const Row = ({ r, navigate }) => (
  <button
    onClick={() => navigate(`/order/${r.id}`)}
    data-testid={`payment-order-${r.id}`}
    className="flex w-full flex-col gap-3 rounded-2xl border border-[#E4DDD3] bg-white p-5 text-left shadow-[0_2px_8px_rgba(44,42,41,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(44,42,41,0.08)] sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="min-w-0">
      <p className="truncate text-base font-semibold text-[#2C2A29]">{r.customer_name}</p>
      <p className="truncate text-sm text-[#635E59]">{r.firm_name} · {r.phone}</p>
      <p className="mt-0.5 text-xs text-[#8C857B]">{formatDate(r.created_at)}</p>
    </div>
    <div className="flex items-center gap-5">
      <div className="text-right">
        <p className="text-xs text-[#8C857B]">Total</p>
        <p className="text-sm font-semibold text-[#2C2A29]">{formatINR(r.total_value)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-[#8C857B]">Received</p>
        <p className="text-sm font-semibold text-[#2D503C]">{formatINR(r.total_paid)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-[#8C857B]">Balance</p>
        <p className={`text-sm font-semibold ${r.balance > 0 ? "text-[#9E3C1B]" : "text-[#2D503C]"}`}>{formatINR(r.balance)}</p>
      </div>
      <StatusBadge status={r.status} />
    </div>
  </button>
);

export default function PaymentsTab() {
  const navigate = useNavigate();
  const [data, setData] = useState({ pending: [], archive: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPayments().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#8C857B]" /></div>;

  const totalDue = data.pending.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium text-[#2C2A29]">
            <IndianRupee size={18} className="text-[#D96B43]" /> Pending Collections
          </h2>
          {totalDue > 0 && (
            <span className="rounded-full border border-[#F3C5B4] bg-[#FBEBE4] px-3 py-1 text-xs font-medium text-[#9E3C1B]">
              {formatINR(totalDue)} outstanding
            </span>
          )}
        </div>
        {data.pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8C857B]">No pending payments. All settled.</p>
        ) : (
          <div className="space-y-3">
            {data.pending.map((r) => <Row key={r.id} r={r} navigate={navigate} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-[#2C2A29]">
          <FileText size={18} className="text-[#8C857B]" /> Payments Archive
        </h2>
        {data.archive.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8C857B]">No fully paid orders yet.</p>
        ) : (
          <div className="space-y-3">
            {data.archive.map((r) => <Row key={r.id} r={r} navigate={navigate} />)}
          </div>
        )}
      </section>
    </div>
  );
}
