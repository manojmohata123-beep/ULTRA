import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Package } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { createOrder, lookupCustomer } from "@/lib/api";
import { toast } from "sonner";

const emptyItem = () => ({ name: "", brand: "", quantity: "1" });

export const CreateOrderDialog = ({ open, onOpenChange, onCreated }) => {
  const [form, setForm] = useState({
    phone: "",
    customer_name: "",
    firm_name: "",
    company_name: "",
    total_value: "",
    advance_value: "",
    notes: "",
    delivery_address: "",
  });
  const [document, setDocument] = useState(null);
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [autofilled, setAutofilled] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoneBlur = async () => {
    if (!form.phone.trim()) return;
    try {
      const res = await lookupCustomer(form.phone.trim());
      if (res.found) {
        setForm((f) => ({
          ...f,
          customer_name: f.customer_name || res.customer_name,
          firm_name: f.firm_name || res.firm_name,
          company_name: f.company_name || res.company_name,
          delivery_address: f.delivery_address || res.delivery_address,
        }));
        setAutofilled(true);
        toast.success("Customer details autofilled");
      }
    } catch (e) {}
  };

  const updateItem = (i, k, v) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((arr) => [...arr, emptyItem()]);
  const removeItem = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const reset = () => {
    setForm({
      phone: "", customer_name: "", firm_name: "", company_name: "",
      total_value: "", advance_value: "", notes: "", delivery_address: "",
    });
    setDocument(null);
    setItems([emptyItem()]);
    setAutofilled(false);
  };

  const submit = async () => {
    if (!form.customer_name.trim() || !form.firm_name.trim() || !form.phone.trim()) {
      toast.error("Customer name, firm name and phone are required");
      return;
    }
    const validItems = items.filter((it) => it.name.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_value: parseFloat(form.total_value || 0),
        advance_value: parseFloat(form.advance_value || 0),
        document_id: document?.id || null,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          brand: it.brand.trim(),
          quantity: it.quantity.trim() || "1",
        })),
      };
      const order = await createOrder(payload);
      toast.success("Order created");
      reset();
      onOpenChange(false);
      onCreated?.(order);
    } catch (e) {
      toast.error("Could not create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-[#E4DDD3] bg-[#FBF9F5] p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-[#E4DDD3] bg-[#FBF9F5]/95 px-6 py-4 backdrop-blur">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#2C2A29]">
            <Package size={20} className="text-[#D96B43]" /> New Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Customer */}
          <section className="space-y-3">
            <p className="text-sm font-medium text-[#635E59]">Customer</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8C857B]">Phone number</Label>
                <Input
                  data-testid="phone-number-input"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={onPhoneBlur}
                  placeholder="98xxxxxxxx"
                  className="rounded-xl border-[#E4DDD3] bg-white"
                />
                {autofilled && (
                  <span className="text-xs text-[#5E826D]">Existing customer found</span>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8C857B]">Customer name</Label>
                <Input
                  data-testid="customer-name-input"
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                  className="rounded-xl border-[#E4DDD3] bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8C857B]">Firm name</Label>
                <Input
                  data-testid="firm-name-input"
                  value={form.firm_name}
                  onChange={(e) => set("firm_name", e.target.value)}
                  className="rounded-xl border-[#E4DDD3] bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8C857B]">Company name (optional)</Label>
                <Input
                  data-testid="company-name-input"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  className="rounded-xl border-[#E4DDD3] bg-white"
                />
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#635E59]">Items</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItem}
                data-testid="add-item-button"
                className="h-8 rounded-lg text-[#9E3C1B] hover:bg-[#FBEBE4]"
              >
                <Plus size={15} className="mr-1" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2 rounded-xl border border-[#E4DDD3] bg-white p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-[#8C857B]">Item name</Label>
                    <Input
                      data-testid={`item-name-input-${i}`}
                      value={it.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      className="rounded-lg border-[#E4DDD3]"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs text-[#8C857B]">Brand</Label>
                    <Input
                      data-testid={`item-brand-input-${i}`}
                      value={it.brand}
                      onChange={(e) => updateItem(i, "brand", e.target.value)}
                      className="rounded-lg border-[#E4DDD3]"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs text-[#8C857B]">Qty</Label>
                    <Input
                      data-testid={`item-qty-input-${i}`}
                      value={it.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      className="rounded-lg border-[#E4DDD3]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    className="mb-1 rounded-lg p-2 text-[#8C857B] hover:bg-[#F0ECE1] disabled:opacity-30"
                    data-testid={`remove-item-button-${i}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Values */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8C857B]">Total order value (₹)</Label>
              <Input
                data-testid="total-value-input"
                type="number"
                value={form.total_value}
                onChange={(e) => set("total_value", e.target.value)}
                className="rounded-xl border-[#E4DDD3] bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8C857B]">Advance received (₹)</Label>
              <Input
                data-testid="advance-value-input"
                type="number"
                value={form.advance_value}
                onChange={(e) => set("advance_value", e.target.value)}
                className="rounded-xl border-[#E4DDD3] bg-white"
              />
            </div>
          </section>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#8C857B]">Delivery address</Label>
            <Textarea
              data-testid="delivery-address-input"
              value={form.delivery_address}
              onChange={(e) => set("delivery_address", e.target.value)}
              className="rounded-xl border-[#E4DDD3] bg-white"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#8C857B]">Notes</Label>
            <Textarea
              data-testid="notes-input"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="rounded-xl border-[#E4DDD3] bg-white"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#8C857B]">Order document / image</Label>
            <FileUpload value={document} onChange={setDocument} testid="order-document-upload" />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-[#E4DDD3] bg-[#FBF9F5]/95 px-6 py-4 backdrop-blur">
          <Button
            variant="outline"
            onClick={() => { reset(); onOpenChange(false); }}
            className="rounded-xl border-[#D6CFC3]"
            data-testid="cancel-order-button"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            data-testid="submit-order-button"
            className="rounded-xl bg-[#3D3935] text-white hover:bg-[#2C2A29]"
          >
            {saving ? "Creating…" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
