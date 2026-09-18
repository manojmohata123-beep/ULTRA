import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, Building2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getCustomers } from "@/lib/api";
import { formatINR, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";

export default function CustomersTab() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getCustomers().then(setCustomers).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    const t = q.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(t) ||
      c.firm_name.toLowerCase().includes(t) ||
      c.phone.includes(t)
    );
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#8C857B]" /></div>;

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search customers…"
        className="max-w-sm rounded-xl border-[#E4DDD3] bg-white"
        data-testid="customer-search-input"
      />
      {filtered.length === 0 && <p className="py-10 text-center text-sm text-[#8C857B]">No customers yet.</p>}
      <div className="space-y-3">
        {filtered.map((c) => {
          const isOpen = open === c.phone;
          return (
            <div key={c.phone || c.customer_name} className="rounded-2xl border border-[#E4DDD3] bg-white shadow-[0_2px_8px_rgba(44,42,41,0.04)]" data-testid={`customer-card-${c.phone}`}>
              <button
                onClick={() => setOpen(isOpen ? null : c.phone)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[#2C2A29]">{c.customer_name}</p>
                  <p className="truncate text-sm text-[#635E59]">{c.firm_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#8C857B]">
                    <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>
                    {c.company_name && <span className="flex items-center gap-1"><Building2 size={12} /> {c.company_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#2C2A29]">{formatINR(c.lifetime_value)}</p>
                    <p className="text-xs text-[#8C857B]">{c.order_count} order{c.order_count !== 1 ? "s" : ""}</p>
                    {c.outstanding > 0 && <p className="text-xs text-[#9E3C1B]">{formatINR(c.outstanding)} due</p>}
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-[#C5C0B7]" /> : <ChevronDown size={18} className="text-[#C5C0B7]" />}
                </div>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-[#F0ECE1] px-5 py-4">
                  <p className="text-xs font-medium text-[#8C857B]">Past orders</p>
                  {c.orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/order/${o.id}`)}
                      data-testid={`customer-order-${o.id}`}
                      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#F8F6F0] px-4 py-2.5 text-left text-sm hover:bg-[#F0ECE1]"
                    >
                      <span className="text-[#635E59]">{formatDate(o.created_at)} · {o.item_count} items</span>
                      <span className="flex items-center gap-3">
                        <span className="font-medium text-[#2C2A29]">{formatINR(o.total_value)}</span>
                        <StatusBadge status={o.status} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
