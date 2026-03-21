CREATE OR REPLACE VIEW client_stats AS
SELECT 
    LOWER(customer_email) as email,
    MAX(customer_name) as name,
    COUNT(id) as total_bookings,
    SUM(total_price) as total_spent,
    -- Aggregate reservation details to avoid extra requests on row expansion
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'eventId', event_id,
        'cabinId', cabin_id,
        'cabinType', cabin_type,
        'customerName', customer_name,
        'status', status,
        'totalGuests', total_guests,
        'totalPrice', total_price,
        'createdAt', created_at
      ) ORDER BY created_at DESC
    ) as reservations
FROM reservations
GROUP BY LOWER(customer_email);
