"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  Crown,
} from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { apiFetch } from "@/lib/api";

type Tab = "all" | "verified" | "unverified" | "admins";

const ROLES = ["fisher", "dealer", "buyer", "officer", "other"];
const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Galle", "Matara", "Hambantota",
  "Kandy", "Kurunegala", "Puttalam", "Jaffna", "Trincomalee", "Batticaloa",
];

function getInitials(u: any): string {
  const first = u.firstName?.charAt(0) ?? "";
  const last = u.lastName?.charAt(0) ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return (u.username ?? u.email ?? "?").charAt(0).toUpperCase();
}

function getDisplayName(u: any): string {
  if (u.firstName || u.lastName) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return u.username ?? u.email ?? "Unknown";
}

function avatarColor(id: string): string {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-amber-500 to-amber-600",
    "from-violet-500 to-violet-600",
    "from-cyan-500 to-cyan-600",
    "from-rose-500 to-rose-600",
  ];
  const idx = id?.charCodeAt(0) ?? 0;
  return colors[idx % colors.length];
}

export default function AdminUsersPage() {
  const { users, isLoading, error, fetchUsers } = useDashboardStore();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab counts
  const counts = useMemo(() => ({
    all: users.length,
    verified: users.filter((u) => u.isVerified).length,
    unverified: users.filter((u) => !u.isVerified).length,
    admins: users.filter((u) => u.isAdmin).length,
  }), [users]);

  // Filtered result
  const filtered = useMemo(() => {
    let list = [...users];

    // Tab filter
    if (tab === "verified") list = list.filter((u) => u.isVerified);
    else if (tab === "unverified") list = list.filter((u) => !u.isVerified);
    else if (tab === "admins") list = list.filter((u) => u.isAdmin);

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          getDisplayName(u).toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q) ||
          (u.username ?? "").toLowerCase().includes(q),
      );
    }

    // Role filter
    if (roleFilter) list = list.filter((u) => u.role?.toLowerCase() === roleFilter.toLowerCase());

    // District filter
    if (districtFilter) list = list.filter((u) => u.district === districtFilter);

    return list;
  }, [users, tab, search, roleFilter, districtFilter]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      await fetchUsers();
    } catch (e: any) {
      setDeleteError(e?.message ?? "Failed to delete user");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "all", label: "All Users", icon: <Users className="w-4 h-4" />, count: counts.all },
    { key: "verified", label: "Verified", icon: <UserCheck className="w-4 h-4" />, count: counts.verified },
    { key: "unverified", label: "Unverified", icon: <UserX className="w-4 h-4" />, count: counts.unverified },
    { key: "admins", label: "Admins", icon: <ShieldCheck className="w-4 h-4" />, count: counts.admins },
  ];

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            {isLoading ? "Loading…" : `${counts.all.toLocaleString()} total registered users`}
          </p>
        </div>
        <button
          onClick={() => fetchUsers()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: counts.all, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Verified", value: counts.verified, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Unverified", value: counts.unverified, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Admins", value: counts.admins, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, phone or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white min-w-[130px]"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>

          {/* District filter */}
          <div className="relative">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all bg-white min-w-[140px]"
            >
              <option value="">All Districts</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
          </div>

          {/* Clear filters button */}
          {(search || roleFilter || districtFilter) && (
            <button
              onClick={() => { setSearch(""); setRoleFilter(""); setDistrictFilter(""); }}
              className="px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
          {isLoading ? "Loading users…" : `Showing ${filtered.length} of ${counts.all} users`}
        </div>

        {/* Error */}
        {(error || deleteError) && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error ?? deleteError}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && users.length === 0 && (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">No users found</p>
            <p className="text-gray-400 text-sm mt-1 max-w-sm">
              {search || roleFilter || districtFilter
                ? "Try adjusting your search or filters."
                : "No users match the current tab."}
            </p>
          </div>
        )}

        {/* User list */}
        {filtered.length > 0 && (
          <div className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <div
                key={u._id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(u._id)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}
                >
                  {getInitials(u)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm truncate">
                      {getDisplayName(u)}
                    </span>
                    {u.isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                        <Crown className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {u.isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        Unverified
                      </span>
                    )}
                    {u.role && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold capitalize">
                        {u.role}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {u.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" />
                        {u.email}
                      </span>
                    )}
                    {u.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {u.phone}
                      </span>
                    )}
                    {(u.district || u.zone) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[u.district, u.zone].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {u.createdAt && (
                      <span className="text-gray-400">
                        Joined {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <div className="shrink-0 flex items-center">
                  {confirmDeleteId === u._id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 hidden sm:block">Delete?</span>
                      <button
                        onClick={() => handleDelete(u._id)}
                        disabled={deletingId === u._id}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
                      >
                        {deletingId === u._id ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setConfirmDeleteId(u._id); setDeleteError(null); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-right">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} displayed
          </div>
        )}
      </div>
    </>
  );
}
