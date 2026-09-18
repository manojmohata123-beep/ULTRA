import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotebookPen } from "lucide-react";
import OrdersTab from "@/pages/OrdersTab";
import CustomersTab from "@/pages/CustomersTab";
import PaymentsTab from "@/pages/PaymentsTab";
import { CreateOrderDialog } from "@/components/CreateOrderDialog";

export default function Dashboard() {
  const [tab, setTab] = useState("orders");
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { v: "orders", label: "Orders" },
    { v: "customers", label: "Customers" },
    { v: "payments", label: "Payments" },
    { v: "archive", label: "Archive" },
  ];

  return (
    <div className="min-h-screen bg-[#FBF9F5]">
      <header className="sticky top-0 z-20 border-b border-[#E4DDD3] bg-[#FBF9F5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3D3935] text-white">
              <NotebookPen size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#2C2A29]">Order Desk</h1>
              <p className="text-xs text-[#8C857B]">Track confirmed orders</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 h-auto gap-1 rounded-xl border border-[#E4DDD3] bg-[#F4F0E8] p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                data-testid={`tab-${t.v}`}
                className="rounded-lg px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#2C2A29] data-[state=active]:shadow-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="orders" className="animate-fade-in-up">
            <OrdersTab onCreate={() => setCreateOpen(true)} refreshKey={refreshKey} />
          </TabsContent>
          <TabsContent value="customers" className="animate-fade-in-up">
            <CustomersTab />
          </TabsContent>
          <TabsContent value="payments" className="animate-fade-in-up">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="archive" className="animate-fade-in-up">
            <OrdersTab archived refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </main>

      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
