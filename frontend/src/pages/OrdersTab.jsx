import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OrderCard } from "@/components/OrderCard";
import { getOrders } from "@/lib/api";

const SORTS = {
  date_desc: { label: "Newest first", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  date_asc: { label: "Oldest first", fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  price_desc: { label: "Price: high to low", fn: (a, b) => b.total_value - a.total_value },
  price_asc: { label: "Price: low to high", fn: (a, b) => a.total_value - b.total_value },
};

export default function OrdersTab({ archived = false, onCreate, refreshKey }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date_desc");

  useEffect(() => {
    setLoading(true);
    getOrders(archived).then(setOrders).finally(() => setLoading(false));
  }, [archived, refreshKey]);

  const filtered = [...orders.filter((o) => {
    const t = q.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(t) ||
      o.firm_name.toLowerCase().includes(t) ||
      o.phone.replace(/\s/g, "").includes(t.replace(/\s/g, ""))
    );
  })].sort(SORTS[sort].fn);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#8C857B]" /></div>;

  return (
    <div className="space-y-4">
      {!archived && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search orders…"
            className="max-w-sm rounded-xl border-[#E4DDD3] bg-white"
            data-testid="order-search-input"
          />
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-48 rounded-xl border-[#E4DDD3] bg-white" data-testid="order-sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORTS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={onCreate}
              data-testid="create-order-button"
              className="rounded-xl bg-[#3D3935] text-white hover:bg-[#2C2A29]"
            >
              <Plus size={16} className="mr-1.5" /> New Order
            </Button>
          </div>
        </div>
      )}

      {archived && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search archived orders…"
            className="max-w-sm rounded-xl border-[#E4DDD3] bg-white"
            data-testid="archive-search-input"
          />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48 rounded-xl border-[#E4DDD3] bg-white" data-testid="archive-sort-select">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORTS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <PackageOpen size={40} className="text-[#C5C0B7]" />
          <p className="text-sm text-[#8C857B]">
            {archived ? "No archived orders yet." : "No orders yet. Create your first order."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onClick={() => navigate(`/order/${o.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
