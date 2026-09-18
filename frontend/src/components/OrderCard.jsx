import React from "react";
import { Phone, User, Package, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatINR, formatDate } from "@/lib/format";

export const OrderCard = ({ order, onClick }) => {
  const d = order.derived;
  return (
    <button
      onClick={onClick}
      data-testid={`order-card-${order.id}`}
      className="group flex w-full flex-col gap-4 rounded-2xl border border-[#E4DDD3] bg-white p-5 text-left shadow-[0_2px_8px_rgba(44,42,41,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#D6CFC3] hover:shadow-[0_6px_20px_rgba(44,42,41,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <User size={15} className="shrink-0 text-[#8C857B]" />
            <p className="truncate text-base font-semibold text-[#2C2A29]">{order.customer_name}</p>
          </div>
          <p className="mt-0.5 truncate text-sm text-[#635E59]">{order.firm_name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-[#8C857B]">
            <Phone size={13} /> {order.phone}
          </div>
        </div>
        <StatusBadge status={d.status} />
      </div>

      <div className="flex items-center justify-between border-t border-[#F0ECE1] pt-3">
        <div className="flex items-center gap-4 text-xs text-[#8C857B]">
          <span className="flex items-center gap-1">
            <Package size={13} /> {d.total_items} item{d.total_items !== 1 ? "s" : ""}
          </span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-[#2C2A29]">{formatINR(order.total_value)}</p>
            {d.balance > 0 ? (
              <p className="text-xs text-[#9E3C1B]">{formatINR(d.balance)} due</p>
            ) : (
              <p className="text-xs text-[#5E826D]">Paid</p>
            )}
          </div>
          <ChevronRight size={18} className="text-[#C5C0B7] transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
};
