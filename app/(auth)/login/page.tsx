"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Box, Typography, Alert, Container } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "not_allowed") {
      setError("このアカウントは許可されていません。管理者に連絡してください。");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      await login();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <Container maxWidth="sm">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, p: 4 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h3" component="h1" sx={{ fontWeight: "bold", mb: 2 }}>
              タスク管理ツール
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Googleアカウントでログイン
            </Typography>
          </Box>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          <Button onClick={handleLogin} fullWidth size="large">
            Googleでログイン
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

