"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { TaskSession } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Box, Typography, TextField, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from "@mui/material";

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

      const response = await fetch(`${functionsUrl}/getTimeReport?${params}`);
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

    const response = await fetch(`${functionsUrl}/exportTimeReportCSV?${params}`);
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
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          レポート
        </Typography>
        <Button onClick={handleExportCSV}>CSVエクスポート</Button>
      </Box>

      <Box sx={{ mb: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="開始日"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="終了日"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Tabs value={activeTab === "normal" ? 0 : 1} onChange={(_, value) => setActiveTab(value === 0 ? "normal" : "brg")}>
          <Tab label="通常" />
          <Tab label="BRG" />
        </Tabs>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell>タイトル</TableCell>
                  <TableCell>時間（分）</TableCell>
                  <TableCell>3時間超過理由</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData?.items?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.durationMin}</TableCell>
                    <TableCell>{item.over3hours || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2, textAlign: "right" }}>
            <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
              合計時間: {totalDurationMin}分 ({Math.floor(totalDurationMin / 60)}時間{totalDurationMin % 60}分)
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

