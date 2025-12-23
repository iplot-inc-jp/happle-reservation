#!/usr/bin/env python3
"""
hacomono OAuth トークン生成スクリプト

新しいclient_idとclient_secretを使用してアクセストークンとリフレッシュトークンを生成します。

使用方法:
1. 認可コードフロー（ブラウザ認証）:
   python generate_hacomono_tokens.py --auth

2. 既存のリフレッシュトークンでトークン更新:
   python generate_hacomono_tokens.py --refresh
"""

import os
import sys
import json
import argparse
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests

# 設定
BRAND_CODE = "happle"
ADMIN_DOMAIN = f"{BRAND_CODE}-admin.hacomono.jp"
TOKEN_URL = f"https://{ADMIN_DOMAIN}/api/oauth/token"
AUTHORIZE_URL = f"https://{ADMIN_DOMAIN}/api/oauth/authorize"
REDIRECT_URI = "http://localhost:8888/callback"

# 新しいクライアント認証情報
NEW_CLIENT_ID = "eDJUVA7r6EY9Vx4OYVhd3f89y0dxPVEWPdu0KCi5TXY"
NEW_CLIENT_SECRET = "8RwRTsg8sCrlttGdCq1qxTJYnuql5F7ZxGPIRHQPe1M"


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """OAuth コールバックハンドラー"""
    
    authorization_code = None
    
    def do_GET(self):
        """コールバックを処理"""
        parsed = urlparse(self.path)
        if parsed.path == "/callback":
            query_params = parse_qs(parsed.query)
            if "code" in query_params:
                OAuthCallbackHandler.authorization_code = query_params["code"][0]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"""
                <html>
                <head><title>Authorization Successful</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: green;">Authorization Successful!</h1>
                    <p>You can close this window and return to the terminal.</p>
                </body>
                </html>
                """)
            else:
                error = query_params.get("error", ["unknown"])[0]
                self.send_response(400)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"""
                <html>
                <head><title>Authorization Failed</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1 style="color: red;">Authorization Failed</h1>
                    <p>Error: {error}</p>
                </body>
                </html>
                """.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """ログを抑制"""
        pass


def authorize_flow():
    """認可コードフローでトークンを取得"""
    print("=" * 60)
    print("hacomono OAuth 認可コードフロー")
    print("=" * 60)
    
    # 認可URLを構築
    auth_params = {
        "response_type": "code",
        "client_id": NEW_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": "admin"
    }
    
    auth_url = f"{AUTHORIZE_URL}?" + "&".join(f"{k}={v}" for k, v in auth_params.items())
    
    print(f"\n1. ブラウザで以下のURLを開いて認証してください:")
    print(f"\n   {auth_url}\n")
    
    # ローカルサーバーを起動
    print("2. コールバックを待機中...")
    server = HTTPServer(("localhost", 8888), OAuthCallbackHandler)
    
    # ブラウザを開く
    webbrowser.open(auth_url)
    
    # コールバックを1回だけ処理
    server.handle_request()
    
    if not OAuthCallbackHandler.authorization_code:
        print("\nエラー: 認可コードを取得できませんでした")
        return None
    
    print(f"\n3. 認可コードを取得しました")
    
    # 認可コードをトークンに交換
    print("4. アクセストークンを取得中...")
    
    token_data = {
        "grant_type": "authorization_code",
        "code": OAuthCallbackHandler.authorization_code,
        "redirect_uri": REDIRECT_URI,
        "client_id": NEW_CLIENT_ID,
        "client_secret": NEW_CLIENT_SECRET
    }
    
    response = requests.post(
        TOKEN_URL,
        json=token_data,
        headers={"Content-Type": "application/json"}
    )
    
    if not response.ok:
        print(f"\nエラー: トークン取得に失敗しました")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    tokens = response.json()
    return tokens


def refresh_flow(refresh_token: str):
    """リフレッシュトークンでアクセストークンを更新"""
    print("=" * 60)
    print("hacomono トークン更新")
    print("=" * 60)
    
    token_data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": NEW_CLIENT_ID,
        "client_secret": NEW_CLIENT_SECRET
    }
    
    response = requests.post(
        TOKEN_URL,
        json=token_data,
        headers={"Content-Type": "application/json"}
    )
    
    if not response.ok:
        print(f"\nエラー: トークン更新に失敗しました")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    tokens = response.json()
    return tokens


def client_credentials_flow():
    """クライアントクレデンシャルフローでトークンを取得（サポートされている場合）"""
    print("=" * 60)
    print("hacomono クライアントクレデンシャルフロー")
    print("=" * 60)
    
    token_data = {
        "grant_type": "client_credentials",
        "client_id": NEW_CLIENT_ID,
        "client_secret": NEW_CLIENT_SECRET,
        "scope": "admin"
    }
    
    response = requests.post(
        TOKEN_URL,
        json=token_data,
        headers={"Content-Type": "application/json"}
    )
    
    if not response.ok:
        print(f"\nクライアントクレデンシャルフローはサポートされていません")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    tokens = response.json()
    return tokens


def print_tokens(tokens: dict):
    """トークン情報を表示"""
    print("\n" + "=" * 60)
    print("トークン取得成功!")
    print("=" * 60)
    
    access_token = tokens.get("access_token", "N/A")
    refresh_token = tokens.get("refresh_token", "N/A")
    expires_in = tokens.get("expires_in", "N/A")
    
    print(f"\nHACOMONO_ACCESS_TOKEN={access_token}")
    print(f"\nHACOMONO_REFRESH_TOKEN={refresh_token}")
    print(f"\n有効期限: {expires_in}秒")
    
    print("\n" + "-" * 60)
    print("Render環境変数設定コマンド:")
    print("-" * 60)
    print(f"""
# 以下のコマンドでRenderに設定してください:

RENDER_API_KEY=$(grep "key:" ~/.render/cli.yaml | awk '{{print $2}}')
BACKEND_ID="srv-d4tpkhumcj7s7384p62g"

# 環境変数を取得して更新
curl -s "https://api.render.com/v1/services/$BACKEND_ID/env-vars" \\
  -H "Authorization: Bearer $RENDER_API_KEY" | \\
  jq '[.[].envVar | 
    if .key == "HACOMONO_ACCESS_TOKEN" then .value = "{access_token}"
    elif .key == "HACOMONO_REFRESH_TOKEN" then .value = "{refresh_token}"
    else . end]' | \\
  curl -s -X PUT "https://api.render.com/v1/services/$BACKEND_ID/env-vars" \\
    -H "Authorization: Bearer $RENDER_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d @-
""")


def main():
    parser = argparse.ArgumentParser(description="hacomono OAuth トークン生成")
    parser.add_argument("--auth", action="store_true", help="認可コードフローで新規トークン取得")
    parser.add_argument("--refresh", type=str, help="リフレッシュトークンでトークン更新")
    parser.add_argument("--client-credentials", action="store_true", help="クライアントクレデンシャルフロー（試験的）")
    
    args = parser.parse_args()
    
    tokens = None
    
    if args.auth:
        tokens = authorize_flow()
    elif args.refresh:
        tokens = refresh_flow(args.refresh)
    elif args.client_credentials:
        tokens = client_credentials_flow()
    else:
        # デフォルトは認可コードフロー
        print("使用方法:")
        print("  --auth               : ブラウザで認証してトークンを取得")
        print("  --refresh <token>    : リフレッシュトークンでトークン更新")
        print("  --client-credentials : クライアントクレデンシャルフロー（試験的）")
        return
    
    if tokens:
        print_tokens(tokens)


if __name__ == "__main__":
    main()

