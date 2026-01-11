"use client";

import { useState } from "react";
import { Activity, DollarSign, UserPlus, Users } from "lucide-react";

export default function AdminDashboardPage() {
  const [selectedCard, setSelectedCard] = useState<
    "totalUsers" | "activeUsers" | "revenue" | "newSignups" | null
  >("totalUsers");

  const dummyUsers = [
    { id: "u_001", name: "Ravi Perera", email: "ravi@example.com", role: "admin", district: "Galle", active: true },
    { id: "u_002", name: "Shanti Kumar", email: "shanti@example.com", role: "customer", district: "Colombo", active: true },
    { id: "u_003", name: "Nimal Silva", email: "nimal@example.com", role: "customer", district: "Matara", active: false },
    { id: "u_004", name: "Kasun Fernando", email: "kasun@example.com", role: "customer", district: "Gampaha", active: true },
    { id: "u_005", name: "Ishara Jay", email: "ishara@example.com", role: "customer", district: "Kandy", active: false },
  ] as const;

  const dummySignups = [
    { id: "s_101", name: "Tharindu", email: "tharindu@example.com", createdAt: "Today, 09:12" },
    { id: "s_102", name: "Hasini", email: "hasini@example.com", createdAt: "Yesterday, 17:40" },
    { id: "s_103", name: "Suresh", email: "suresh@example.com", createdAt: "3 days ago" },
    { id: "s_104", name: "Malith", email: "malith@example.com", createdAt: "6 days ago" },
  ] as const;

  const dummyRevenueEntries = [
    { id: "r_901", date: "Today", description: "Subscription payment", amountLkr: 12500, method: "Card" },
    { id: "r_902", date: "Today", description: "Marketplace fee", amountLkr: 3200, method: "Bank" },
    { id: "r_903", date: "Yesterday", description: "Subscription payment", amountLkr: 12500, method: "Card" },
    { id: "r_904", date: "2 days ago", description: "Marketplace fee", amountLkr: 4100, method: "Cash" },
  ] as const;

  const totalUsers = 1248;
  const activeUsers = 392;
  const revenueMtdLabel = "LKR 2.4M";
  const newSignups7d = 81;

  function cardBase(isActive: boolean) {
    return `bg-white rounded-2xl shadow-xl p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
      isActive ? "ring-2 ring-blue-200" : "hover:-translate-y-0.5"
    }`;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of the application (dummy data)</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setSelectedCard("totalUsers")}
          className={cardBase(selectedCard === "totalUsers")}
          aria-pressed={selectedCard === "totalUsers"}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total users</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">+34 in last 7 days</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCard("activeUsers")}
          className={cardBase(selectedCard === "activeUsers")}
          aria-pressed={selectedCard === "activeUsers"}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active users</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Active today</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCard("revenue")}
          className={cardBase(selectedCard === "revenue")}
          aria-pressed={selectedCard === "revenue"}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenue (MTD)</p>
              <p className="text-2xl font-bold text-gray-900">{revenueMtdLabel}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">+12.6% vs last month</p>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCard("newSignups")}
          className={cardBase(selectedCard === "newSignups")}
          aria-pressed={selectedCard === "newSignups"}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">New signups (7d)</p>
              <p className="text-2xl font-bold text-gray-900">{newSignups7d.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Conversion 4.1%</p>
        </button>
      </section>

      <section className="mt-6 bg-white rounded-2xl shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedCard === "totalUsers"
              ? "All users"
              : selectedCard === "activeUsers"
                ? "Active users"
                : selectedCard === "newSignups"
                  ? "New signups"
                  : "Revenue entries"}
          </h2>
          <p className="text-xs text-gray-500">Dummy data for admin UI preview</p>
        </div>

        {selectedCard === "revenue" ? (
          <div className="space-y-3">
            {dummyRevenueEntries.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-gray-50 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.date} • {r.method}
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  LKR {r.amountLkr.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : selectedCard === "newSignups" ? (
          <div className="space-y-3">
            {dummySignups.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.email}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">{s.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(selectedCard === "activeUsers" ? dummyUsers.filter((u) => u.active) : dummyUsers).map((u) => (
              <div key={u.id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {u.email} • {u.district}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-700">{u.role}</div>
                    <div className={`text-xs mt-1 ${u.active ? "text-emerald-700" : "text-gray-500"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
