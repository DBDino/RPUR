"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartDatum = { name: string; value: number };

const tooltipStyle = {
  border: "1px solid #e8e7e2",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(24, 25, 29, .08)",
  fontSize: 12,
};

export function DashboardCharts({
  conflicts,
  occupancy,
  daily,
  unusedRooms,
}: {
  conflicts: ChartDatum[];
  occupancy: ChartDatum[];
  daily: ChartDatum[];
  unusedRooms: ChartDatum[];
}) {
  return (
    <div className="dashboard-grid">
      <section className="chart-card conflicts-card" id="jadwal">
        <h2><span className="chart-title-icon red">▥</span> Kasus Jadwal Bentrok</h2>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conflicts} margin={{ top: 8, right: 4, left: -18, bottom: 18 }}>
              <CartesianGrid stroke="#ecebe7" vertical />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#737782" }} interval={0} angle={-12} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: "#737782" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#ef5a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-card occupancy-card" id="okupansi">
        <h2><span className="chart-title-icon cyan">◔</span> Okupansi Kapasitas Ruang</h2>
        <div className="donut-wrap">
          <ResponsiveContainer width="62%" height="100%">
            <PieChart>
              <Pie data={occupancy} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={1} stroke="white">
                {occupancy.map((item, index) => (
                  <Cell key={item.name} fill={["#ef5a5f", "#22b573", "#f59e0b", "#697386"][index % 4]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {occupancy.map((item, index) => (
              <span key={item.name}><i style={{ background: ["#ef5a5f", "#22b573", "#f59e0b", "#697386"][index % 4] }} />{item.name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="chart-card daily-card">
        <h2><span className="chart-title-icon blue">▣</span> Distribusi Jadwal per Hari</h2>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 5, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#ecebe7" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#737782" }} />
              <YAxis tick={{ fontSize: 10, fill: "#737782" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#2878f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-card unused-card">
        <h2><span className="chart-title-icon blue">▦</span> Ruangan Tidak Terpakai</h2>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={unusedRooms} layout="vertical" margin={{ top: 5, right: 10, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#ecebe7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#737782" }} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 9, fill: "#737782" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#5e697b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
