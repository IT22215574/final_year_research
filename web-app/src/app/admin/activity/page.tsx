"use client";

import { Activity, CreditCard, DollarSign, MapPin, Users } from "lucide-react";

export default function AdminActivityPage() {
  const dummyLocationUsers = [
    { location: "Colombo", users: 214, active: 71 },
    { location: "Galle", users: 142, active: 48 },
    { location: "Matara", users: 96, active: 21 },
    { location: "Kandy", users: 88, active: 19 },
    { location: "Gampaha", users: 74, active: 25 },
  ] as const;

  const dummyTransactions = [
    { id: "t_001", user: "Shanti Kumar", location: "Colombo", amountLkr: 12500, status: "Success", time: "Today, 10:24" },
    { id: "t_002", user: "Kasun Fernando", location: "Gampaha", amountLkr: 3200, status: "Success", time: "Today, 09:02" },
    { id: "t_003", user: "Nimal Silva", location: "Matara", amountLkr: 4100, status: "Failed", time: "Yesterday, 18:41" },
    { id: "t_004", user: "Ravi Perera", location: "Galle", amountLkr: 12500, status: "Success", time: "Yesterday, 14:10" },
    { id: "t_005", user: "Ishara Jay", location: "Kandy", amountLkr: 5600, status: "Success", time: "2 days ago" },
  ] as const;

  const totalTransactions = 842;
  const totalVolume = 2400000;
  const failedRate = 1.8;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-600 mt-1">Transactions and user activity (dummy data)</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total transactions</p>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Last 30 days</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total volume</p>
              <p className="text-2xl font-bold text-gray-900">LKR {totalVolume.toLocaleString()}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">MTD</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active sessions</p>
              <p className="text-2xl font-bold text-gray-900">57</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Currently online</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed rate</p>
              <p className="text-2xl font-bold text-gray-900">{failedRate}%</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Payments</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Users by location</h2>
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              <MapPin className="w-4 h-4" />
              Districts
            </div>
          </div>

          <div className="space-y-3">
            {dummyLocationUsers.map((row) => (
              <div key={row.location} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{row.location}</div>
                    <div className="text-xs text-gray-500 mt-1">{row.users.toLocaleString()} users</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Active</div>
                    <div className="text-sm font-bold text-emerald-700">{row.active.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent transactions</h2>
          <div className="space-y-3">
            {dummyTransactions.map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.user}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t.location} • {t.time}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      LKR {t.amountLkr.toLocaleString()}
                    </div>
                    <div className={`text-xs mt-1 ${t.status === "Success" ? "text-emerald-700" : "text-red-600"}`}>
                      {t.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4">Dummy data for admin UI preview.</p>
        </div>
      </section>
    </>
  );
}
