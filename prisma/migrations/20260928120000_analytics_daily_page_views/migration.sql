CREATE TABLE "analytics_daily_page_views" (
    "day" DATE NOT NULL,
    "route_group" VARCHAR(32) NOT NULL,
    "source" VARCHAR(24) NOT NULL,
    "device" VARCHAR(12) NOT NULL,
    "country" CHAR(2) NOT NULL,
    "landing" BOOLEAN NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_daily_page_views_pkey" PRIMARY KEY ("day","route_group","source","device","country","landing")
);

ALTER TABLE "analytics_daily_page_views" ADD CONSTRAINT "analytics_daily_page_views_positive_count" CHECK ("view_count" > 0);

CREATE INDEX "orders_paid_at_idx" ON "orders"("paid_at");
CREATE INDEX "b2b_inquiries_created_at_idx" ON "b2b_inquiries"("created_at");
CREATE INDEX "custom_print_requests_created_at_idx" ON "custom_print_requests"("created_at");
