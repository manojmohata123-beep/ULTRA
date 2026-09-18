import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/OrderCard";
import { getOrders } from "@/lib/api";

export default function OrdersTab({ archived = false, onCreate, refreshKey }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    getOrders(archived).then(setOrders).finally(() => setLoading(false));
  }, [archived, refreshKey]);

  const filtered = orders.filter((o) => {
    const t = q.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(t) ||
      o.firm_name.toLowerCase().includes(t) ||
      o.phone.includes(t)
    );
  });

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
          <Button
            onClick={onCreate}
            data-testid="create-order-button"
            className="rounded-xl bg-[#3D3935] text-white hover:bg-[#2C2A29]"
          >
            <Plus size={16} className="mr-1.5" /> New Order
          </Button>
        </div>
      )}

      {archived && (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search archived orders…"
          className="max-w-sm rounded-xl border-[#E4DDD3] bg-white"
          data-testid="archive-search-input"
        />
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
