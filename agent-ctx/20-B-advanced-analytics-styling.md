# Task 20-B — Advanced Analytics + Styling Polish

**Agent**: full-stack-developer (Advanced Analytics + Styling)
**Date**: 2026-07-11
**Scope**: Build CLV, Cohort Retention, Seasonal Trends, Product Performance (BCG matrix) APIs + Insights section tabs + chart animations/table hover/heatmap styling.

## Files Created

### 1. `src/app/api/analytics/clv/route.ts` (~165 lines)
- GET `?brandId=X` returns `{ avgCLV, topCustomers[], distribution[], retentionRate, avgDaysBetweenOrders }`
- Fetches all customers + non-cancelled orders in parallel via Prisma.
- Per-customer: totalSpent, orderCount, avgOrderValue, firstOrder, lastOrder, daysActive (first order → today), avgGap (avg days between consecutive orders), predictedCLV = avgOrderValue × projectedOrders (annualFrequency × 365 if ≥2 orders, else 1).
- Aggregates: avgCLV = mean totalSpent across all customers; top 10 sorted by totalSpent; distribution buckets (0-50rb / 50rb-100rb / 100rb-500rb / 500rb+); retentionRate = % customers with >1 order; avgDaysBetweenOrders = mean of customer-level avgGap (only customers with ≥2 orders).

### 2. `src/app/api/analytics/cohort/route.ts` (~140 lines)
- GET `?brandId=X&months=6` returns `{ cohorts[] }` where each cohort = `{ cohortMonth, cohortLabel, size, retention[] }`.
- Groups buyers by first-order month (using firstOrderAt or earliest order createdAt).
- For each cohort, builds retention[] from M0..M_maxOffset where M_i = activeCustomers / size × 100.
- Active customer = placed an order in the (cohort_month + i) month (using Set of YYYY-MM keys).
- Window: last N months. maxOffset per cohort = monthsSinceCohort, capped at months-1.

### 3. `src/app/api/analytics/seasonal/route.ts` (~165 lines)
- GET `?brandId=X` returns `{ byMonth[12], byDayOfWeek[7], byHour[24], bestMonth, worstMonth, peakDay, peakHour, seasonality }`.
- byMonth: 12-month rolling window from current month (Indonesian month names Jan..Des).
- byDayOfWeek: Mon..Sun reorder from JS getDay (which is Sun..Sat).
- byHour: 0-23 from order createdAt.
- seasonality rating via coefficient of variation of monthly revenue: high (cv≥0.5), medium (cv≥0.25), low.

### 4. `src/app/api/analytics/products/route.ts` (~210 lines)
- GET `?brandId=X` returns `{ products[], summary }`.
- Per-product: unitsSold, revenue, cost, profit, marginPct, orderCount, uniqueCustomers, avgQtyPerOrder, lastSoldAt, daysSinceLastSale, performance (BCG quadrant).
- BCG classification using median split (computed only from products with revenue > 0): star (high rev + high margin), cash_cow (high rev + low margin), question_mark (low rev + high margin), dog (low rev + low margin). Unsold products → dog.
- Summary: totalProducts, starProducts, cashCowProducts, avgMargin, topPerformer (by revenue), underperformer (lowest revenue among sold products).

## Files Edited

### 5. `src/sections/nw/insights-section.tsx` (+~880 lines)
- Added imports: Scatter, ScatterChart, ZAxis (recharts), 7 Lucide icons (Award, Calendar, Clock, Crown, Flame, Grid3x3, Star), Tabs + Table shadcn/ui components.
- Added type interfaces for all 4 API responses + BCGQuadrant union.
- Wrapped existing "Main content" block (metrics row + charts grid + recent activity) in `<Tabs defaultValue="overview">` with 5 TabsTriggers: Overview / CLV / Cohort / Seasonal / Produk. TabsList uses h-auto + flex-wrap for mobile.
- Added `CLVTab`: 4 StatCards (avgCLV, retentionRate, avgDaysBetweenOrders, top customer) + Top 10 customers Table (8 columns) + CLVDistributionChart (BarChart with multi-color cells).
- Added `CohortTab`: 4 StatCards (cohort count, avg retention M1/M3/M6) + Heatmap Table (rows=cohorts, cols=M0..M_maxOffset, cells colored: emerald>50%, amber 25-50%, rose<25%, stone=0%) + Legend. Sticky first column.
- Added `SeasonalTab`: 4 StatCards (best/worst month, peak day, peak hour) + Seasonality banner + SeasonalMonthlyChart (12-month BarChart, peak highlighted) + 2-col grid with SeasonalDayChart and SeasonalHourChart (LineChart filtered to 6-22h).
- Added `ProductsPerfTab`: 4 StatCards + BCGScatterChart (4 Scatter series by quadrant, XAxis=revenue, YAxis=marginPct, ZAxis=unitsSold, custom Tooltip) + Top/Underperformer gradient cards + Product performance Table (sticky header, 10 columns, BCG badge per row) + BCG legend.
- Added `BCG_CONFIG` constant (label/color/bg/border/desc) + `BCGBadge` component + `BCG_COLOR` map + `TabSkeleton` shared loading state.
- Each tab has own useQuery (60s staleTime), loading skeleton, error state, empty state. Chart containers use `chart-animate` class.

### 6. `src/app/globals.css` (+~30 lines)
- Added 3 CSS utilities after Selection color block:
  - `.chart-animate` — chart-draw keyframe (0.5s ease-out, opacity 0→1, translateY 20px→0).
  - `.table-row-hover tbody tr` — 0.15s bg-color transition + teal-tinted hover (rgba(13,148,136,0.04)).
  - `.heatmap-cell` — 0.15s transform transition + scale(1.05) on hover with z-index:1.

### 7. `src/components/nw/primitives.tsx` (1 line)
- Added `table-row-hover` class to SectionCard root div (alongside `card-hover`). Class is scoped to `tbody tr` so non-table content is unaffected. Enables hover effect for all tables inside SectionCards automatically.

## Verification

### Lint & TypeScript
- `bun run lint`: 0 errors, 0 warnings.
- `bunx tsc --noEmit` (excluding skills/examples): 0 errors.

### API tests (curl with valid cookie + brandId)
- `/api/analytics/clv?brandId=hanif` → 200: `{avgCLV:30000, topCustomers:[2 entries with predictedCLV], distribution:[4 buckets], retentionRate:50, avgDaysBetweenOrders:4}`.
- `/api/analytics/cohort?brandId=hanif&months=6` → 200: 2 cohorts (Jun 2026 M0/M1=100%, Jul 2026 M0=100%).
- `/api/analytics/seasonal?brandId=hanif` → 200: 12-month data (Jun/Jul have revenue), day-of-week (Senin=30k, Jumat=18k, Minggu=12k), hour-of-day distribution, seasonality=low.
- `/api/analytics/products?brandId=hanif` → 200: 4 products with BCG classification (1 star, 1 cash_cow, 1 question_mark, 1 dog), summary complete.

### Dev server
- HTTP 200 on home page (`/`).
- All 4 analytics endpoints return 200 with valid JSON.
- No compile errors.

## Key Decisions

1. **Tabs over routes** — keeps single-route architecture intact (Insights is one section), shares PageHeader/AI summary/loading states, lazy-loads each tab's data.
2. **CLV predictedCLV** uses annualFrequency × 365-day horizon for ≥2-order customers; 1 projected order otherwise (conservative for new customers).
3. **Cohort retention** counts customer as "active" in any month with an order (Set of YYYY-MM keys). firstOrderAt also counted as active month (defensive for legacy data).
4. **Seasonal byHour** shows hours 6-22 (typical business hours) when data exists in that range; falls back to all 24 hours otherwise. Improves chart readability.
5. **BCG matrix uses median** (not mean) as high/low threshold — robust to outliers. Median computed only from products with revenue > 0 to avoid diluting split with unsold products.
6. **BCG scatter** uses 4 separate Scatter series (not Cells) — enables Legend with quadrant names + colors.
7. **ZAxis range [40, 360]** — keeps small products visible while preventing huge bubbles from obscuring others. unitsSold clamped to min 20.
8. **Heatmap cells** use semantic colors matching BCG palette philosophy (emerald=healthy, rose=concerning). Cells show both % and absolute count for context.
9. **Sticky columns/headers** — cohort heatmap sticky first column (horizontal scroll), product table sticky header (vertical scroll with max-h-560px).
10. **Cohort avgM1/M3/M6** averages only over cohorts that have a retention point at that offset with activeCustomers > 0 — avoids penalizing average with cohorts that haven't reached that month yet.
11. **table-row-hover on SectionCard root** (not as wrapper prop) — globally enables hover effect for all tables in SectionCards. Class scoped to `tbody tr` so non-table content unaffected. Non-breaking enhancement.
12. **Indonesian localization preserved** — month names (Jan..Des), day names (Senin..Minggu), all UI labels in Indonesian. Matches existing Insights section voice.
