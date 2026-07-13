-- This is an empty migration.
ALTER TABLE "Ticket" ADD CONSTRAINT "reserved_sold_within_quantity" CHECK (
  (reserved + sold) <= quantity
);