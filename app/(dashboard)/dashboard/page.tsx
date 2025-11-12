import { Box, Typography } from "@mui/material";

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 2 }}>
        ダッシュボード
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        ようこそ、タスク管理ツールへ
      </Typography>
    </Box>
  );
}

