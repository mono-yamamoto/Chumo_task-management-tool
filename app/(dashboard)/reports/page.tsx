"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { TaskSession } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const functionsUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL || "";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"normal" | "brg">("normal");
  const [fromDate, setFromDate] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports", activeTab, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: new Date(fromDate).toISOString(),
        to: new Date(toDate).toISOString(),
        type: activeTab,
      });

      const response = await fetch(`${functionsUrl}/reports/time?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch report");
      }
      return response.json();
    },
  });

  const handleExportCSV = async () => {
    const params = new URLSearchParams({
      from: new Date(fromDate).toISOString(),
      to: new Date(toDate).toISOString(),
      type: activeTab,
    });

    const response = await fetch(`${functionsUrl}/reports/time.csv?${params}`);
    if (!response.ok) {
      alert("CSVのエクスポートに失敗しました");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${activeTab}_${fromDate}_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalDurationMin = reportData?.totalDurationMin || 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">レポート</h1>
        <Button onClick={handleExportCSV}>CSVエクスポート</Button>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium">開始日</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">終了日</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 rounded border px-3 py-2"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("normal")}
            className={`px-4 py-2 ${
              activeTab === "normal"
                ? "border-b-2 border-blue-600 font-semibold"
                : ""
            }`}
          >
            通常
          </button>
          <button
            onClick={() => setActiveTab("brg")}
            className={`px-4 py-2 ${
              activeTab === "brg"
                ? "border-b-2 border-blue-600 font-semibold"
                : ""
            }`}
          >
            BRG
          </button>
        </div>
      </div>

      {isLoading ? (
        <div>読み込み中...</div>
      ) : (
        <div>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left">タイトル</th>
                  <th className="border p-2 text-left">時間（分）</th>
                  <th className="border p-2 text-left">3時間超過理由</th>
                </tr>
              </thead>
              <tbody>
                {reportData?.items?.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border p-2">{item.title}</td>
                    <td className="border p-2">{item.durationMin}</td>
                    <td className="border p-2">{item.over3hours || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t pt-4 text-right">
            <p className="text-lg font-semibold">
              合計時間: {totalDurationMin}分 ({Math.floor(totalDurationMin / 60)}時間{totalDurationMin % 60}分)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

