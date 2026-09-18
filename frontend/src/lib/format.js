export const formatINR = (n) => {
  const num = Number(n || 0);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const STAGE_META = [
  { key: "ordered", label: "Order Placed", short: "Ordered", hint: "With manufacturer" },
  { key: "dispatched", label: "Dispatched", short: "Dispatched", hint: "From factory · needs LR" },
  { key: "received", label: "Received", short: "Received", hint: "At warehouse" },
  { key: "delivered", label: "Delivered", short: "Delivered", hint: "To client" },
];

// Warm NotebookLM status badge palette
export const statusStyle = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("complete"))
    return "bg-[#EBF2EE] text-[#2D503C] border-[#C4DACE]";
  if (s.includes("payment"))
    return "bg-[#FBEBE4] text-[#9E3C1B] border-[#F3C5B4]";
  if (s.includes("deliver"))
    return "bg-[#EBF2EE] text-[#2D503C] border-[#C4DACE]";
  if (s.includes("receiv"))
    return "bg-[#F2EFF6] text-[#514362] border-[#D5CDE2]";
  if (s.includes("dispatch"))
    return "bg-[#EEF3F8] text-[#264163] border-[#C1D3E5]";
  if (s.includes("order"))
    return "bg-[#FAF4E8] text-[#825C1C] border-[#EED5A6]";
  return "bg-[#EFECE8] text-[#3D3935] border-[#C5C0B7]";
};
