# RajaOngkir API Integration

## Base URL
```
https://rajaongkir.komerce.id/api/v1
```

## Authentication
Semua request butuh header:
```
key: <API_KEY>
```

---

## 1. Search Domestic Destination

Cari alamat (kelurahan/kecamatan/kota) berdasarkan keyword.

**Endpoint:** `GET /destination/domestic-destination`

**Params:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Keyword pencarian (misal: "jakarta", "bandung") |
| limit | number | Jumlah hasil (default: 10) |
| offset | number | Pagination offset |

**Response:**
```json
{
  "meta": { "message": "Success Get Domestic Destinations", "code": 200, "status": "success" },
  "data": [
    {
      "id": 17473,
      "label": "GROGOL, GROGOL PETAMBURAN, JAKARTA BARAT, DKI JAKARTA, 11450",
      "province_name": "DKI JAKARTA",
      "city_name": "JAKARTA BARAT",
      "district_name": "GROGOL PETAMBURAN",
      "subdistrict_name": "GROGOL",
      "zip_code": "11450"
    }
  ]
}
```

**Contoh response untuk "bandung":**
```json
{
  "id": 28792,
  "label": "CIPAGALO, CIPAGALO, KAB. BANDUNG, JAWA BARAT, 40615",
  "province_name": "JAWA BARAT",
  "city_name": "KAB. BANDUNG",
  "district_name": "CIPAGALO",
  "subdistrict_name": "CIPAGALO",
  "zip_code": "40615"
}
```

---

## 2. Calculate Domestic Cost

Hitung ongkos kirim antar kota di Indonesia.

**Endpoint:** `POST /calculate/domestic-cost`

**Headers:**
```
key: <API_KEY>
Content-Type: application/x-www-form-urlencoded
```

**Body (form-urlencoded):**
| Param | Type | Description |
|-------|------|-------------|
| origin | number | ID lokasi asal (dari search destination) |
| destination | number | ID lokasi tujuan (dari search destination) |
| weight | number | Berat barang dalam gram |
| courier | string | Kurir dipisah `:` → `jne:sicepat:jnt:ninja:tiki:lion:anteraja:pos` |
| price | string | `"lowest"` untuk harga terendah, atau `"all"` untuk semua |

**Contoh body:**
```
origin=17473&destination=48834&weight=1000&courier=jne:sicepat:jnt&price=lowest
```

**Response:**
```json
{
  "meta": { "message": "Success Calculate Domestic Shipping cost", "code": 200, "status": "success" },
  "data": [
    {
      "name": "J&T Express",
      "code": "jnt",
      "service": "EZ",
      "description": "Reguler",
      "cost": 42000,
      "etd": ""
    },
    {
      "name": "SiCepat Express",
      "code": "sicepat",
      "service": "REG",
      "description": "Reguler",
      "cost": 48000,
      "etd": "4-6 day"
    },
    {
      "name": "Jalur Nugraha Ekakurir (JNE)",
      "code": "jne",
      "service": "REG",
      "description": "Layanan Reguler",
      "cost": 56000,
      "etd": "3 day"
    }
  ]
}
```

**Available couriers:**
- jne, sicepat, ide, sap, jnt, ninja, tiki, lion, anteraja, pos, ncs, rex, rpx, sentral, star, wahana, dse

---

## 3. Calculate International Cost

Hitung ongkir internasional.

**Endpoint:** `POST /calculate/international-cost`

**Body (form-urlencoded):**
| Param | Type | Description |
|-------|------|-------------|
| origin | number | ID lokasi asal (Indonesia) |
| destination | number | ID negara tujuan |
| weight | number | Berat dalam gram |
| courier | string | Kurir tersedia: `tiki:lion:pos:expedito:ray:jne` |
| price | string | `"lowest"` atau `"all"` |

**Response:** Format sama dengan domestic cost.

---

## 4. Track Waybill (Lacak Paket)

Lacak status pengiriman berdasarkan nomor resi.

**Endpoint:** `POST /track/waybill?awb=<NOMOR_RESI>&courier=<KODE_KURIR>**

**Headers:**
```
key: <API_KEY>
```

**Params:**
| Param | Type | Description |
|-------|------|-------------|
| awb | string | Nomor resi/air waybill |
| courier | string | Kode kurir (jne, sicepat, jnt, dll) |

**Response (success):**
```json
{
  "meta": { "message": "Success Track Waybill", "code": 200, "status": "success" },
  "data": {
    "summary": {
      "awb": "JT1234567890",
      "courier": "jnt",
      "service": "EZ",
      "status": "delivered",
      "date": "2026-07-10"
    },
    "history": [
      {
        "date": "2026-07-10 14:30",
        "desc": "Paket telah diterima oleh penerima",
        "status": "DELIVERED"
      },
      {
        "date": "2026-07-09 08:15",
        "desc": "Paket sedang dalam pengiriman",
        "status": "ON_DELIVERY"
      }
    ]
  }
}
```

**Response (error):**
```json
{
  "meta": { "message": "Invalid Awb", "code": 404, "status": "error" },
  "data": null
}
```

---

## Integration Plan

### Database Changes
Tambahkan field di Order:
- `originId` — ID lokasi asal dari RajaOngkir
- `destinationId` — ID lokasi tujuan dari RajaOngkir

### API Routes to Create
1. `GET /api/shipping/search?query=jakarta` → proxy ke search destination
2. `POST /api/shipping/cost` → proxy ke calculate cost
3. `POST /api/shipping/track` → proxy ke track waybill

### Frontend Components
1. `ShippingCalculator` — form search alamat + hitung ongkir
2. `ShippingTracker` — input resi + cek status
3. Integrate ke checkout flow
