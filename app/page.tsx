import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, Typography, Container } from "@mui/material";

export default function Home() {
  return (
    <Box component="main" sx={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h2" component="h1" sx={{ fontWeight: "bold", mb: 2, textAlign: "center" }}>
          タスク管理ツール
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, textAlign: "center" }}>
          準備中...
        </Typography>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Button>ログインページへ</Button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <Button variant="outline">ダッシュボードへ</Button>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}

