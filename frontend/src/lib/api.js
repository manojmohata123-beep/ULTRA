import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const fileUrl = (id) =>
  id ? `${API}/files/${id}` : null;

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await api.post("/files", fd, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export const getOrders = (archived = false) =>
  api.get("/orders", { params: { archived } }).then((r) => r.data);

export const getOrder = (id) =>
  api.get(`/orders/${id}`).then((r) => r.data);

export const createOrder = (payload) =>
  api.post("/orders", payload).then((r) => r.data);

export const deleteOrder = (id) =>
  api.delete(`/orders/${id}`).then((r) => r.data);

export const updateStage = (orderId, itemId, payload) =>
  api
    .put(`/orders/${orderId}/items/${itemId}/stage`, payload)
    .then((r) => r.data);

export const addPayment = (orderId, payload) =>
  api.post(`/orders/${orderId}/payments`, payload).then((r) => r.data);

export const lookupCustomer = (phone) =>
  api
    .get("/customers/lookup", { params: { phone } })
    .then((r) => r.data);

export const getCustomers = () =>
  api.get("/customers").then((r) => r.data);

export async function openFile(id) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  const newWindow = window.open("", "_blank");

  try {
    const response = await api.get(`/files/${id}`, {
      responseType: "blob",
    });

    const blobUrl = URL.createObjectURL(response.data);

    if (newWindow) {
      newWindow.location.href = blobUrl;
    } else {
      window.location.href = blobUrl;
    }
  } catch (error) {
    if (newWindow) {
      newWindow.close();
    }

    console.error("Could not open file", error);
  }
}

export const getPayments = () =>
  api.get("/payments").then((r) => r.data);
