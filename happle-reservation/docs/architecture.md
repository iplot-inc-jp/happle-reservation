# Happle 予約システム アーキテクチャ

## 1. システム概要

hacomono Admin APIを使用した「黄土韓方よもぎ蒸し Happle」のゲスト向けオンライン予約システム。

## 2. システム構成

```mermaid
flowchart TB
    subgraph client [クライアント]
        Browser[ブラウザ]
    end
    
    subgraph render [Render Cloud]
        subgraph frontend [Frontend Service]
            NextJS[Next.js App]
        end
        
        subgraph backend [Backend Service]
            Flask[Flask API]
            TokenMgr[Token Manager]
        end
    end
    
    subgraph hacomono [hacomono]
        HacomonoAPI[Admin API]
        HacomonoAdmin[管理サイト]
    end
    
    Browser -->|HTTPS| NextJS
    NextJS -->|REST API| Flask
    Flask -->|Bearer Token| HacomonoAPI
    TokenMgr -->|OAuth Refresh| HacomonoAdmin
```

## 3. ユーザーフロー

```mermaid
flowchart LR
    Start([開始]) --> SelectMenu[メニュー選択]
    SelectMenu --> SelectDate[日時選択]
    SelectDate --> InputInfo[情報入力]
    InputInfo --> Confirm{確認}
    Confirm -->|OK| Complete([予約完了])
    Confirm -->|戻る| InputInfo
    
    style Start fill:#e8f5e9
    style Complete fill:#e8f5e9
```

### 画面遷移

```mermaid
stateDiagram-v2
    [*] --> TopPage: アクセス
    TopPage --> SchedulePage: プログラム選択
    SchedulePage --> TopPage: 戻る
    SchedulePage --> BookingPage: 日時選択
    BookingPage --> SchedulePage: 戻る
    BookingPage --> CompletePage: 予約確定
    CompletePage --> TopPage: トップへ
    CompletePage --> [*]: 終了
```

## 4. 予約作成シーケンス

```mermaid
sequenceDiagram
    autonumber
    participant U as ユーザー
    participant F as Frontend
    participant B as Backend
    participant H as hacomono API
    
    U->>F: 予約情報送信
    F->>B: POST /api/reservations
    
    Note over B: ゲスト会員作成
    B->>H: POST /member/members
    H-->>B: member_id
    
    Note over B: 予約作成
    B->>H: POST /reservation/reservations/reserve
    H-->>B: reservation
    
    B-->>F: 予約完了レスポンス
    F-->>U: 完了画面表示
    
    Note over H: 確認メール送信
    H->>U: 予約確認メール
```

## 5. API設計

### エンドポイント一覧

```mermaid
flowchart LR
    subgraph BackendAPI [Backend REST API]
        Health[GET /api/health]
        Studios[GET /api/studios]
        Programs[GET /api/programs]
        Schedule[GET /api/schedule]
        CreateRes[POST /api/reservations]
        GetRes[GET /api/reservations/:id]
        CancelRes[POST /api/reservations/:id/cancel]
    end
    
    subgraph HacomonoAPI [hacomono Admin API]
        MasterStudios[GET /master/studios]
        MasterPrograms[GET /master/programs]
        MasterLessons[GET /master/studio-lessons]
        MemberCreate[POST /member/members]
        ResReserve[POST /reservation/reservations/reserve]
        ResGet[GET /reservation/reservations/:id]
        ResCancel[PUT /reservation/reservations/cancel]
    end
    
    Studios --> MasterStudios
    Programs --> MasterPrograms
    Schedule --> MasterLessons
    CreateRes --> MemberCreate
    CreateRes --> ResReserve
    GetRes --> ResGet
    CancelRes --> ResCancel
```

### データフロー

```mermaid
flowchart TD
    subgraph Request [リクエスト]
        ReqData[予約リクエスト]
    end
    
    subgraph Processing [処理]
        Validate[バリデーション]
        CreateMember[会員作成]
        CreateReservation[予約作成]
    end
    
    subgraph Response [レスポンス]
        Success[成功レスポンス]
        Error[エラーレスポンス]
    end
    
    ReqData --> Validate
    Validate -->|OK| CreateMember
    Validate -->|NG| Error
    CreateMember -->|成功| CreateReservation
    CreateMember -->|失敗| Error
    CreateReservation -->|成功| Success
    CreateReservation -->|失敗| Error
```

## 6. 認証フロー

### OAuth 2.0 Authorization Code Grant

```mermaid
sequenceDiagram
    autonumber
    participant Admin as 管理者
    participant Browser as ブラウザ
    participant HacomonoAuth as hacomono認証
    participant Backend as Backend
    
    Admin->>Browser: 認証URL開く
    Browser->>HacomonoAuth: GET /oauth/login
    HacomonoAuth->>Browser: ログイン画面
    Admin->>Browser: 認証情報入力
    Browser->>HacomonoAuth: ログイン
    HacomonoAuth->>Browser: 認可画面
    Admin->>Browser: 許可
    HacomonoAuth->>Browser: redirect with code
    Browser->>Backend: code送信
    Backend->>HacomonoAuth: POST /oauth/token
    HacomonoAuth->>Backend: access_token, refresh_token
    Backend->>Backend: トークン保存
```

### トークンリフレッシュ

```mermaid
sequenceDiagram
    participant B as Backend
    participant H as hacomono API
    
    B->>H: APIリクエスト
    H-->>B: 401 Unauthorized
    
    Note over B: トークン期限切れ検出
    
    B->>H: POST /oauth/token (refresh)
    H-->>B: 新しいaccess_token
    
    B->>H: APIリクエスト (リトライ)
    H-->>B: 成功レスポンス
```

## 7. 技術スタック

```mermaid
mindmap
    root((Happle予約システム))
        Frontend
            Next.js 14
            TypeScript
            Tailwind CSS
            date-fns
        Backend
            Flask
            Python 3.11
            Gunicorn
            Requests
        Infrastructure
            Render
            Docker
        External
            hacomono API
            OAuth 2.0
```

## 8. デプロイ構成

```mermaid
flowchart TB
    subgraph GitHub [GitHub Repository]
        Code[ソースコード]
        RenderYAML[render.yaml]
    end
    
    subgraph Render [Render Platform]
        subgraph Services [Web Services]
            FE[Frontend<br/>Next.js Docker]
            BE[Backend<br/>Python Flask]
        end
        
        subgraph Config [環境変数]
            EnvFE[NEXT_PUBLIC_API_URL]
            EnvBE[HACOMONO_ACCESS_TOKEN<br/>HACOMONO_REFRESH_TOKEN<br/>HACOMONO_CLIENT_ID<br/>HACOMONO_CLIENT_SECRET]
        end
    end
    
    Code --> FE
    Code --> BE
    RenderYAML --> Services
    EnvFE --> FE
    EnvBE --> BE
```

## 9. エラーハンドリング

```mermaid
flowchart TD
    Request[APIリクエスト] --> Check{レスポンス確認}
    
    Check -->|200| Success[成功処理]
    Check -->|400| BadRequest[パラメータエラー表示]
    Check -->|401| Unauthorized[トークンリフレッシュ]
    Check -->|403| Forbidden[権限エラー表示]
    Check -->|404| NotFound[リソースなしエラー]
    Check -->|429| RateLimit[待機してリトライ]
    Check -->|500| ServerError[サーバーエラー表示]
    
    Unauthorized --> Retry{リトライ}
    RateLimit --> Retry
    Retry -->|成功| Success
    Retry -->|失敗| Error[エラー表示]
```

## 10. セキュリティ

```mermaid
flowchart LR
    subgraph Security [セキュリティ対策]
        direction TB
        Token[トークン管理<br/>環境変数で管理]
        CORS[CORS設定<br/>許可オリジン指定]
        Validate[入力バリデーション<br/>F/B両方で実施]
        RateLimit[Rate Limit対応<br/>リトライロジック]
        HTTPS[HTTPS通信<br/>SSL/TLS]
    end
```

## 11. 今後の拡張

```mermaid
timeline
    title 機能拡張ロードマップ
    
    Phase 1 : 基本機能
             : プログラム予約
             : ゲスト予約
    
    Phase 2 : 機能強化
             : 予約キャンセル
             : リマインダー通知
             : 複数店舗対応
    
    Phase 3 : 高度な機能
             : オンライン決済
             : 会員登録・ログイン
             : マイページ
```
