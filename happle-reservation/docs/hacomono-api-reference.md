# hacomono API リファレンス

## 1. 基本情報

| 項目 | 値 |
|------|-----|
| エンドポイント | `https://{brand_code}.admin.egw.hacomono.app/api/v2/` |
| 認証方式 | Bearer Token |
| Content-Type | application/json |

## 2. Rate Limit

```mermaid
flowchart LR
    subgraph RateLimits [Rate Limit しきい値]
        GET[GET: 10回/秒]
        POST[POST: 2回/秒]
        PUT[PUT: 2回/秒]
        DELETE[DELETE: 2回/秒]
    end
    
    Request[リクエスト] --> Check{Rate Limit確認}
    Check -->|OK| Process[処理実行]
    Check -->|超過| Error[429 Too Many Requests]
    Error --> Wait[retry-after秒待機]
    Wait --> Request
```

## 3. 認証ヘッダー

```
Authorization: Bearer {access_token}
X-Requested-With: XMLHttpRequest
Content-Type: application/json
```

## 4. API構成

```mermaid
flowchart TB
    subgraph HacomonoAPI [hacomono Admin API v2]
        subgraph Master [マスタ API]
            direction LR
            Studios[店舗<br/>/master/studios]
            Programs[プログラム<br/>/master/programs]
            Lessons[スケジュール<br/>/master/studio-lessons]
            Instructors[スタッフ<br/>/master/instructors]
        end
        
        subgraph Member [会員 API]
            direction LR
            Members[メンバー<br/>/member/members]
            MemberPlans[契約プラン<br/>/member/members/:id/plans]
            MemberTickets[チケット<br/>/member/members/:id/tickets]
        end
        
        subgraph Reservation [予約 API]
            direction LR
            Reservations[予約情報<br/>/reservation/reservations]
            Reserve[予約作成<br/>/reservation/reservations/reserve]
            Cancel[キャンセル<br/>/reservation/reservations/cancel]
        end
        
        subgraph Purchase [売上 API]
            direction LR
            Purchases[売上<br/>/purchase/purchases]
        end
    end
```

## 5. 使用API詳細

### 5.1 店舗一覧取得

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: GET /master/studios
    Note right of C: query: {"is_active": true}
    API-->>C: 200 OK
    Note left of API: studios.list[]
```

**リクエスト**
```
GET /master/studios?query={"is_active":true}
```

**レスポンス**
```json
{
  "data": {
    "studios": {
      "length": 50,
      "page": 1,
      "total_count": 3,
      "list": [
        {
          "id": 1,
          "name": "黄土韓方よもぎ蒸し Happle",
          "code": "S0001",
          "status": 1,
          "prefecture": "東京都",
          "address1": "渋谷区...",
          "tel": "03-xxxx-xxxx",
          "business_hours": "10:00-20:00"
        }
      ]
    }
  }
}
```

### 5.2 プログラム一覧取得

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: GET /master/programs
    Note right of C: query: {"is_active": true, "studio_id": 1}
    API-->>C: 200 OK
    Note left of API: programs.list[]
```

**リクエスト**
```
GET /master/programs?query={"is_active":true,"studio_id":1}
```

**レスポンス**
```json
{
  "data": {
    "programs": {
      "list": [
        {
          "id": 1,
          "name": "よもぎ蒸し60分",
          "code": "P0001",
          "description": "黄土よもぎ蒸し",
          "duration": 60,
          "capacity": 1,
          "price": 5000,
          "status": 1
        }
      ]
    }
  }
}
```

### 5.3 スケジュール取得

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: GET /master/studio-lessons
    Note right of C: query: {<br/>"program_id": 1,<br/>"start_date": "2024-01-01",<br/>"end_date": "2024-01-07"<br/>}
    API-->>C: 200 OK
    Note left of API: studio_lessons.list[]
```

**リクエスト**
```
GET /master/studio-lessons?query={
  "is_active": true,
  "studio_id": 1,
  "program_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-01-07"
}
```

**レスポンス**
```json
{
  "data": {
    "studio_lessons": {
      "list": [
        {
          "id": 1,
          "studio_id": 1,
          "program_id": 1,
          "program_name": "よもぎ蒸し60分",
          "instructor_id": 1,
          "instructor_name": "スタッフA",
          "start_at": "2024-01-01T10:00:00+09:00",
          "end_at": "2024-01-01T11:00:00+09:00",
          "capacity": 1,
          "reserved_count": 0,
          "is_reservable": true
        }
      ]
    }
  }
}
```

### 5.4 メンバー作成

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: POST /member/members
    Note right of C: {<br/>"name": "山田太郎",<br/>"mail_address": "...",<br/>"tel": "...",<br/>"is_guest": true<br/>}
    API-->>C: 201 Created
    Note left of API: member.id
```

**リクエスト**
```json
POST /member/members
{
  "name": "山田太郎",
  "name_kana": "ヤマダタロウ",
  "mail_address": "example@email.com",
  "tel": "090-1234-5678",
  "is_guest": true,
  "studio_id": 1,
  "note": "Web予約ゲスト"
}
```

**レスポンス**
```json
{
  "data": {
    "member": {
      "id": 123,
      "name": "山田太郎",
      "mail_address": "example@email.com",
      "status": 1
    }
  }
}
```

### 5.5 予約作成

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: POST /reservation/reservations/reserve
    Note right of C: {<br/>"member_id": 123,<br/>"studio_lesson_id": 1<br/>}
    API-->>C: 201 Created
    Note left of API: reservation
    
    Note over API: 確認メール自動送信
```

**リクエスト**
```json
POST /reservation/reservations/reserve
{
  "member_id": 123,
  "studio_lesson_id": 1,
  "note": "Web予約"
}
```

**レスポンス**
```json
{
  "data": {
    "reservation": {
      "id": 456,
      "member_id": 123,
      "studio_lesson_id": 1,
      "status": 1,
      "start_at": "2024-01-01T10:00:00+09:00",
      "end_at": "2024-01-01T11:00:00+09:00",
      "created_at": "2024-01-01T09:00:00+09:00"
    }
  }
}
```

### 5.6 予約キャンセル

```mermaid
sequenceDiagram
    participant C as Client
    participant API as hacomono API
    
    C->>API: PUT /reservation/reservations/cancel
    Note right of C: {"ids": [456]}
    API-->>C: 200 OK
    
    Note over API: キャンセル通知送信
```

**リクエスト**
```json
PUT /reservation/reservations/cancel
{
  "ids": [456]
}
```

## 6. エラーレスポンス

```mermaid
flowchart TD
    subgraph ErrorCodes [HTTPステータスコード]
        E400[400 Bad Request<br/>パラメータ不正]
        E401[401 Unauthorized<br/>トークン無効]
        E403[403 Forbidden<br/>権限なし]
        E404[404 Not Found<br/>リソースなし]
        E429[429 Too Many Requests<br/>Rate Limit超過]
        E500[500 Internal Server Error<br/>サーバーエラー]
    end
```

**エラーレスポンス形式**
```json
{
  "errors": [
    {
      "code": "ERROR_CODE",
      "message": "エラーメッセージ"
    }
  ],
  "data": null
}
```

## 7. スコープ一覧

```mermaid
mindmap
    root((APIスコープ))
        Master
            MasterRead
            MasterEdit
        Member
            MemberRead
            MemberEdit
        Reservation
            ReservationRead
            ReservationEdit
            ReservationReservationsReserve
            ReservationReservationsCancel
        Purchase
            PurchaseRead
            PurchaseEdit
        System
            SystemRead
            SystemEdit
        openapi
            全API許可
```

## 8. 実装例

### Rate Limit対策

```python
def handle_rate_limit(response):
    if response.status_code == 429:
        retry_after = int(response.headers.get("retry-after", 1))
        time.sleep(retry_after)
        return True  # リトライ必要
    return False
```

### トークンリフレッシュ

```python
def refresh_token():
    response = requests.post(
        f"https://{admin_domain}/api/oauth/token",
        json={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }
    )
    return response.json()
```
