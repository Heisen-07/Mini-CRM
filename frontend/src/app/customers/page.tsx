"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { API_URL } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  totalSpend: number;
  orderCount: number;
  lastPurchaseDate: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("All Cities");

  // New Customer Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Order modal state
  const [orderCustomer, setOrderCustomer] = useState<Customer | null>(null);
  const [orderAmount, setOrderAmount] = useState("");
  const [orderCategory, setOrderCategory] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);


  const fetchCustomers = () => {
    fetch(`${API_URL}/api/customers`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Customer service unavailable (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.success) {
          setCustomers(json.data);
        } else {
          throw new Error(json.message || "Failed to load customers");
        }
      })
      .catch((err) => {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          setError("Backend service unavailable. Please ensure the CRM API is running.");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`${API_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create customer");
      }

      // Success
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setCity("");
      fetchCustomers(); // Refresh list
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const openOrderModal = (customer: Customer) => {
    setOrderCustomer(customer);
    setOrderAmount("");
    setOrderCategory("");
    setOrderError(null);
    setOrderSuccess(null);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCustomer) return;

    const amountNum = Number(orderAmount);
    if (!amountNum || amountNum <= 0) {
      setOrderError("Enter a valid amount greater than 0");
      return;
    }

    setOrderSubmitting(true);
    setOrderError(null);

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: orderCustomer.id,
          amount: amountNum,
          productCategory: orderCategory.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create order");
      }

      // Success — keep the modal open briefly with a confirmation, then close
      setOrderSuccess(`Order of ₹${amountNum.toLocaleString()} placed for ${orderCustomer.name}.`);
      setOrderAmount("");
      setOrderCategory("");
      fetchCustomers(); // refresh spend/order totals
      setTimeout(() => setOrderCustomer(null), 1500);
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCity =
      selectedCity === "All Cities" ||
      (customer.city && customer.city.toLowerCase() === selectedCity.toLowerCase());

    return matchesSearch && matchesCity;
  });

  // Extract unique cities for the filter dropdown
  const uniqueCities = Array.from(
    new Set(customers.map((c) => c.city).filter((city): city is string => !!city))
  );

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <p className="text-red-400 text-lg font-semibold">Something went wrong</p>
        <p className="text-[#94A3B8] text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Customers</h1>
          <p className="text-[#94A3B8] mt-1">
            {filteredCustomers.length} of {customers.length} total customers
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#6366F1] hover:bg-[#5558E6] text-white px-4 py-2.5 rounded-xl font-medium text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#6366F1]/20"
        >
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name, email, city, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2.5 pl-10 pr-4 text-[#F8FAFC] placeholder-[#94A3B8] text-sm outline-none focus:border-[#6366F1] transition"
          />
          <div className="absolute left-3 top-3 text-[#94A3B8]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl px-4 py-2.5 text-[#F8FAFC] text-sm outline-none focus:border-[#6366F1] transition cursor-pointer min-w-[160px]"
        >
          <option value="All Cities">All Cities</option>
          {uniqueCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Table / Grid */}
      <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(99,102,241,0.15)] bg-[#0B1020]/30 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                <th className="py-4 px-6">Customer Info</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6 text-right">Orders</th>
                <th className="py-4 px-6 text-right">Total Spend</th>
                <th className="py-4 px-6">Last Activity</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(99,102,241,0.1)] text-sm text-[#F8FAFC]">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-[#6366F1]/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-[#F8FAFC] group-hover:text-[#6366F1] transition-colors">
                        {customer.name}
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">{customer.email}</div>
                      {customer.phone && <div className="text-xs text-[#94A3B8]/60 mt-0.5">{customer.phone}</div>}
                    </td>
                    <td className="py-4 px-6">
                      {customer.city ? (
                        <span className="inline-block bg-[#6366F1]/10 text-[#6366F1] px-2.5 py-1 rounded-md text-xs font-medium">
                          {customer.city}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]/40">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      {customer.orderCount.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-[#22C55E]">
                      ₹{customer.totalSpend.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-xs text-[#94A3B8]">
                      {customer.lastPurchaseDate ? (
                        new Date(customer.lastPurchaseDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      ) : (
                        <span className="text-[#94A3B8]/40 italic">Never Purchased</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openOrderModal(customer)}
                        className="bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        + Order
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-[#F8FAFC] mb-4">Add New Customer</h3>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-[#0B1020] border border-[rgba(99,102,241,0.15)] text-[#94A3B8] hover:text-[#F8FAFC] py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#6366F1] hover:bg-[#5558E6] text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Adding..." : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {orderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setOrderCustomer(null)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-[#F8FAFC] mb-1">Add Order</h3>
            <p className="text-sm text-[#94A3B8] mb-4">
              For <span className="text-[#F8FAFC] font-medium">{orderCustomer.name}</span>
            </p>

            {orderError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs mb-4">
                {orderError}
              </div>
            )}
            {orderSuccess && (
              <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-3 text-[#22C55E] text-xs mb-4">
                ✓ {orderSuccess}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="e.g. 2999"
                  className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                  Product Category
                </label>
                <input
                  type="text"
                  value={orderCategory}
                  onChange={(e) => setOrderCategory(e.target.value)}
                  placeholder="e.g. Fashion"
                  className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl py-2 px-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 text-sm outline-none focus:border-[#6366F1] transition"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderCustomer(null)}
                  className="flex-1 bg-[#0B1020] border border-[rgba(99,102,241,0.15)] text-[#94A3B8] hover:text-[#F8FAFC] py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 cursor-pointer"
                >
                  {orderSubmitting ? "Adding..." : "Add Order"}
                </button>
              </div>
            </form>

            <p className="text-xs text-[#94A3B8]/60 mt-4">
              If this customer recently received a campaign, this order is automatically attributed to it and shows up as a conversion on that campaign.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}