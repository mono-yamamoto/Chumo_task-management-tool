# チェックシートテンプレートIDの設定

## チェックシートID

提供されたURLから抽出したID:
```
1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M
```

## Secret Managerへの設定方法

このIDをGCP Secret Managerの`CHECKSHEET_TEMPLATE_ID`シークレットに設定してください。

### gcloud CLIを使用する場合

```bash
echo -n "1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M" | gcloud secrets create CHECKSHEET_TEMPLATE_ID --data-file=- --project=chumo-3506a
```

既にシークレットが存在する場合は、バージョンを追加:

```bash
echo -n "1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M" | gcloud secrets versions add CHECKSHEET_TEMPLATE_ID --data-file=- --project=chumo-3506a
```

### GCP Consoleを使用する場合

1. [GCP Console](https://console.cloud.google.com/)にアクセス
2. 「Secret Manager」に移動
3. `CHECKSHEET_TEMPLATE_ID`シークレットを選択（存在しない場合は作成）
4. 「新しいバージョンを追加」をクリック
5. 値として `1LGoFol8V0kOv9n6PmwDiJF2C6hNohm2u4TTba-hCh-M` を入力
6. 「バージョンを追加」をクリック

## 確認

設定後、Drive機能を使用してチェックシートが正しく作成されることを確認してください。

