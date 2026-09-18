import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, IndianRupee } from "lucide-react";
import { getPayments, fileUrl } from "@/lib/api";
import { formatINR, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

const SORTS = {
  date_desc: { label: "Newest first", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  date_asc: { label: "Oldest first", fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  price_desc: { label: "Price: high to low", fn: (a, b) => b.total_value - a.total_value },
  price_asc: { label: "Price: low to high", fn: (a, b) => a.total_value - b.total_value },
};

export default function PaymentsTab() {
  const navigate = useNavigate();
  const [data, setData] = useState({ pending: [], archive: [] });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date_desc");

  useEffect(() => {
    getPayments().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#8C857B]" /></div>;

  const applyFilterSort = (list) => {
    const t = q.trim().toLowerCase();
    let out = list.filter((r) => {
      if (!t) return true;
      return (
        r.customer_name.toLowerCase().includes(t) ||
        r.firm_name.toLowerCase().includes(t) ||
        r.phone.replace(/\s/g, "").includes(t.replace(/\s/g, ""))
      );
    });
    out = [...out].sort(SORTS[sort].fn);
    if (sort === "date_desc" && !t) {
      // keep pending highest-balance-first only when explicitly sorted by date default
      if (list === data.pending) out = [...out].sort((a, b) => b.balance - a.balance);
    }
    return out;
  };

  const pending = applyFilterSort(data.pending);
  const archive = applyFilterSort(data.archive);
  const totalDue = pending.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or number…"
          className="max-w-sm rounded-xl border-[#E4DDD3] bg-white"
          data-testid="payment-search-input"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48 rounded-xl border-[#E4DDD3] bg-white" data-testid="payment-sort-select">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8C857B]">No pending payments. All settled.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => <Row key={r.id} r={r} navigate={navigate} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-medium text-[#2C2A29]">
          <FileText size={18} className="text-[#8C857B]" /> Payments Archive
        </h2>
        {archive.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#8C857B]">No fully paid orders yet.</p>
        ) : (
          <div className="space-y-3">
            {archive.map((r) => <Row key={r.id} r={r} navigate={navigate} />)}
          </div>
        )}
      </section>
    </div>
  );
}
