import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Phone, Building2, MapPin, FileText, Loader2,
  Trash2, IndianRupee, Check,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { FileUpload } from "@/components/FileUpload";
import { getOrder, updateStage, addPayment, deleteOrder, fileUrl, openFile } from "@/lib/api";
import { formatINR, formatDateTime, formatDate, STAGE_META } from "@/lib/format";
import { toast } from "sonner";

const StageCheck = ({ stage, item, orderId, onUpdate, onRequestLR }) => {
  const st = item.stages[stage.key];
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (stage.key === "dispatched" && !st.done) {
      onRequestLR(item);
      return;
    }
    setBusy(true);
    try {
      const updated = await updateStage(orderId, item.id, { stage: stage.key, done: !st.done });
      onUpdate(updated);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <button
        onClick={toggle}
        disabled={busy}
        data-testid={`stage-${stage.key}-checkbox-${item.id}`}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
          st.done
            ? "border-[#5E826D] bg-[#5E826D] text-white"
            : "border-[#D6CFC3] bg-white text-transparent hover:border-[#8C857B]"
        }`}
      >
        {busy ? <Loader2 size={15} className="animate-spin text-[#8C857B]" /> : <Check size={16} />}
      </button>
      <span className="text-xs font-medium leading-tight text-[#2C2A29]">{stage.short}</span>
      {st.done && st.at && (
        <span className="font-mono text-[10px] leading-tight text-[#8C857B]">{formatDateTime(st.at)}</span>
      )}
      {stage.key === "dispatched" && st.done && st.lr_document_id && (
        <button
  onClick={() => openFile(st.lr_document_id)}
  data-testid={`view-lr-${item.id}`}
        >
          <FileText size={11} /> LR
        </button>
      )}
    </div>
  );
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // LR modal
  const [lrItem, setLrItem] = useState(null);
  const [lrDoc, setLrDoc] = useState(null);
  const [lrBusy, setLrBusy] = useState(false);

  // Payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payDoc, setPayDoc] = useState(null);
  const [payBusy, setPayBusy] = useState(false);

  const load = async () => {
    try {
      setOrder(await getOrder(id));
    } catch (e) {
      toast.error("Order not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const confirmLR = async () => {
    if (!lrDoc?.id) { toast.error("Upload the LR document first"); return; }
    setLrBusy(true);
    try {
      const updated = await updateStage(id, lrItem.id, {
        stage: "dispatched", done: true, lr_document_id: lrDoc.id,
      });
      setOrder(updated);
      setLrItem(null); setLrDoc(null);
      toast.success("Marked dispatched with LR");
    } catch (e) {
      toast.error("Could not update");
    } finally {
      setLrBusy(false);
    }
  };

  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setPayBusy(true);
    try {
      const updated = await addPayment(id, { amount: amt, note: payNote, document_id: payDoc?.id || null });
      setOrder(updated);
      setPayOpen(false); setPayAmount(""); setPayNote(""); setPayDoc(null);
      toast.success("Payment recorded");
    } catch (e) {
      toast.error("Could not record payment");
    } finally {
      setPayBusy(false);
    }
  };

  const remove = async () => {
    await deleteOrder(id);
    toast.success("Order deleted");
    navigate("/");
  };

  if (loading || !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#8C857B]" />
      </div>
    );
  }

  const d = order.derived;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 animate-fade-in-up">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          data-testid="back-button"
          className="flex items-center gap-2 text-sm text-[#635E59] hover:text-[#2C2A29]"
        >
          <ArrowLeft size={16} /> Back to orders
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-lg text-[#9E3C1B] hover:bg-[#FBEBE4]" data-testid="delete-order-button">
              <Trash2 size={15} className="mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-[#E4DDD3] bg-[#FBF9F5]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this order?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="rounded-xl bg-[#D96B43] hover:bg-[#9E3C1B]" data-testid="confirm-delete-button">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-[#E4DDD3] bg-white p-6 shadow-[0_2px_8px_rgba(44,42,41,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#2C2A29]">{order.customer_name}</h1>
            <p className="text-sm text-[#635E59]">{order.firm_name}</p>
          </div>
          <StatusBadge status={d.status} />
        </div>

        <div className="mt-4 grid gap-3 text-sm text-[#635E59] sm:grid-cols-2">
          <div className="flex items-center gap-2"><Phone size={15} className="text-[#8C857B]" /> {order.phone}</div>
          {order.company_name && (
            <div className="flex items-center gap-2"><Building2 size={15} className="text-[#8C857B]" /> {order.company_name}</div>
          )}
          {order.delivery_address && (
            <div className="flex items-start gap-2 sm:col-span-2"><MapPin size={15} className="mt-0.5 shrink-0 text-[#8C857B]" /> {order.delivery_address}</div>
          )}
          <div className="text-xs text-[#8C857B]">Created {formatDate(order.created_at)}</div>
        </div>

        {order.notes && (
          <div className="mt-4 rounded-xl bg-[#F8F6F0] p-3 text-sm text-[#635E59]">{order.notes}</div>
        )}

        {order.document_id && (
          <button
  onClick={() => openFile(order.document_id)}
            data-testid="view-order-document"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E4DDD3] bg-[#F8F6F0] px-4 py-2 text-sm text-[#2C2A29] hover:bg-[#F0ECE1]"
          >
            <FileText size={15} className="text-[#8C857B]" /> View order document
          </button>
        )}
      </div>

      {/* Financials */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: formatINR(order.total_value), color: "text-[#2C2A29]" },
          { label: "Advance", value: formatINR(order.advance_value), color: "text-[#2C2A29]" },
          { label: "Received", value: formatINR(d.total_paid), color: "text-[#2D503C]" },
          { label: "Balance", value: formatINR(d.balance), color: d.balance > 0 ? "text-[#9E3C1B]" : "text-[#2D503C]" },
        ].map((f) => (
          <div key={f.label} className="rounded-2xl border border-[#E4DDD3] bg-white p-4">
            <p className="text-xs text-[#8C857B]">{f.label}</p>
            <p className={`mt-1 text-lg font-semibold tracking-tight ${f.color}`}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Items checklist */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-medium text-[#2C2A29]">Items & Progress</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#E4DDD3] bg-white p-5" data-testid={`item-row-${item.id}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#2C2A29]">{item.name}</p>
                  <p className="text-xs text-[#8C857B]">
                    {item.brand ? `${item.brand} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STAGE_META.map((stage) => (
                  <StageCheck
                    key={stage.key}
                    stage={stage}
                    item={item}
                    orderId={order.id}
                    onUpdate={setOrder}
                    onRequestLR={(it) => { setLrItem(it); setLrDoc(null); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payments */}
      <div className="mt-6 rounded-2xl border border-[#E4DDD3] bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#2C2A29]">Payments</h2>
          <Button
            onClick={() => setPayOpen(true)}
            data-testid="mark-payment-button"
            className="rounded-xl bg-[#5E826D] text-white hover:bg-[#2D503C]"
            size="sm"
          >
            <IndianRupee size={15} className="mr-1" /> Record payment
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {order.advance_value > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-[#F8F6F0] px-4 py-2.5 text-sm">
              <span className="text-[#635E59]">Advance</span>
              <span className="font-medium text-[#2C2A29]">{formatINR(order.advance_value)}</span>
            </div>
          )}
          {order.payments?.length === 0 && order.advance_value === 0 && (
            <p className="py-2 text-sm text-[#8C857B]">No payments recorded yet.</p>
          )}
          {order.payments?.map((p) => (
  <div
    key={p.id}
    className="flex items-center justify-between rounded-xl bg-[#F8F6F0] px-4 py-2.5 text-sm"
    data-testid={`payment-row-${p.id}`}
  >
    <div>
      <span className="font-medium text-[#2C2A29]">
        {formatINR(p.amount)}
      </span>
      <span className="ml-2 text-xs text-[#8C857B]">
        {formatDateTime(p.at)}
      </span>
      {p.note && (
        <span className="ml-2 text-xs text-[#8C857B]">
          · {p.note}
        </span>
      )}
    </div>

    {p.document_id && (
      <button
        type="button"
        onClick={() => openFile(p.document_id)}
        className="flex items-center gap-1 text-xs text-[#264163] hover:underline"
      >
        <FileText size={12} />
        Receipt
      </button>
    )}
  </div>
))}
        </div>
      </div>

      {/* LR upload modal */}
      <Dialog open={!!lrItem} onOpenChange={(v) => { if (!v) { setLrItem(null); setLrDoc(null); } }}>
        <DialogContent className="border-[#E4DDD3] bg-[#FBF9F5]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2A29]">Upload LR to dispatch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#635E59]">A LR document or image is required to mark <b>{lrItem?.name}</b> as dispatched.</p>
          <FileUpload value={lrDoc} onChange={setLrDoc} label="Upload LR document or image" testid="lr-upload" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLrItem(null); setLrDoc(null); }} className="rounded-xl border-[#D6CFC3]">Cancel</Button>
            <Button onClick={confirmLR} disabled={lrBusy} className="rounded-xl bg-[#3D3935] text-white hover:bg-[#2C2A29]" data-testid="confirm-lr-button">
              {lrBusy ? "Saving…" : "Mark dispatched"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment modal */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="border-[#E4DDD3] bg-[#FBF9F5]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2A29]">Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8C857B]">Amount received (₹)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="rounded-xl border-[#E4DDD3] bg-white" data-testid="payment-amount-input" />
              <p className="text-xs text-[#8C857B]">Balance due: {formatINR(d.balance)}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8C857B]">Note (optional)</Label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="rounded-xl border-[#E4DDD3] bg-white" data-testid="payment-note-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8C857B]">Receipt document (optional)</Label>
              <FileUpload value={payDoc} onChange={setPayDoc} testid="payment-doc-upload" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} className="rounded-xl border-[#D6CFC3]">Cancel</Button>
            <Button onClick={submitPayment} disabled={payBusy} className="rounded-xl bg-[#5E826D] text-white hover:bg-[#2D503C]" data-testid="submit-payment-button">
              {payBusy ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
