import { useEffect, useState } from "react";
import { adminService } from "../services/admin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalQuota: number;
  totalUsed: number;
  totalRemaining: number;
  totalProxies: number;
  activeProxies: number;
  deadProxies: number;
  disabledProxies: number;
}

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Không thể tải thống kê</div>
      </div>
    );
  }

  const userData = [
    { name: "Tổng Users", value: stats.totalUsers },
    { name: "Active", value: stats.activeUsers },
    { name: "Inactive", value: stats.inactiveUsers },
  ];

  const proxyData = [
    { name: "Active", value: stats.activeProxies },
    { name: "Dead", value: stats.deadProxies },
    { name: "Disabled", value: stats.disabledProxies },
  ];

  const quotaData = [
    { name: "Used", value: Math.round(stats.totalUsed / 1024 / 1024 / 1024) },
    { name: "Remaining", value: Math.round(stats.totalRemaining / 1024 / 1024 / 1024) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Tổng quan hệ thống Proxy992</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Tổng Users</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats.activeUsers} active, {stats.inactiveUsers} inactive
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Tổng Proxies</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProxies}</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats.activeProxies} active, {stats.deadProxies} dead
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Quota Used</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round(stats.totalUsed / 1024 / 1024 / 1024)} GB
          </div>
          <div className="text-sm text-gray-500 mt-1">
            / {Math.round(stats.totalQuota / 1024 / 1024 / 1024)} GB
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Quota Remaining</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round(stats.totalRemaining / 1024 / 1024 / 1024)} GB
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {stats.totalQuota > 0
              ? Math.round((stats.totalRemaining / stats.totalQuota) * 100)
              : 0}% còn lại
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Proxies Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={proxyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {proxyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quota Usage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quotaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="GB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
