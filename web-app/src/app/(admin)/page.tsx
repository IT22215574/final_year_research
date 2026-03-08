"use client";

import { useEffect, useState } from "react";
import { Activity, DollarSign, UserPlus, Users } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function AdminDashboardPage() {
  const [selectedCard, setSelectedCard] = useState<
    "totalUsers" | "activeUsers" | "revenue" | "newSignups"
  >("totalUsers");

  const { users, isLoading, error, fetchUsers } = useDashboardStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isVerified === true).length;

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const newSignups7d = users.filter((u) => {
    const created = u?.createdAt ? new Date(u.createdAt).getTime() : 0;
    return created && now - created <= sevenDaysMs;
  }).length;

  const revenueMtdLabel = "LKR 2.4M";

  function cardBase(isActive: boolean) {
    return `bg-white rounded-2xl shadow-xl p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 ${
      isActive ? "ring-2 ring-blue-200" : "hover:-translate-y-0.5"
    }`;
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h2>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={() => fetchUsers()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {isLoading ? "Refreshing..." : `Overview (${users.length} total users)`}
        </p>
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
          <p className="text-xs text-gray-500 mt-3">+{newSignups7d} in last 7 days</p>
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
          <p className="text-xs text-gray-500 mt-3">Verified accounts</p>
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
          <p className="text-xs text-gray-500 mt-3">Last 7 days</p>
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
                  ? "New signups (7 days)"
                  : "Revenue entries"}
          </h2>
          <p className="text-xs text-gray-500">
            {isLoading ? "Refreshing..." : `Showing ${users.length} users`}
          </p>
        </div>

        {selectedCard === "revenue" ? (
          <div className="space-y-3">
            <p className="text-gray-500 text-center py-8">Revenue module coming soon</p>
          </div>
        ) : selectedCard === "newSignups" ? (
          <div className="space-y-3">
            {users
              .filter((u) => {
                const created = u?.createdAt ? new Date(u.createdAt).getTime() : 0;
                return created && now - created <= sevenDaysMs;
              })
              .map((u) => (
                <div key={u._id} className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {u.firstName || u.lastName
                          ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                          : u.username || u.email}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{u.email}</div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                    </div>
                  </div>
                </div>
              ))}
            {newSignups7d === 0 && (
              <p className="text-gray-500 text-center py-4">No new signups in last 7 days</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {(selectedCard === "activeUsers"
              ? users.filter((u) => u.isVerified === true)
              : users
            ).map((u) => (
              <div key={u._id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {u.firstName || u.lastName
                        ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                        : u.username || u.email}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {u.email} • {u.district || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-700">{u.role || "-"}</div>
                    <div className={`text-xs mt-1 ${u.isVerified ? "text-emerald-700" : "text-gray-500"}`}>
                      {u.isVerified ? "Verified" : "Unverified"}
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