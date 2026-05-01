
DROP POLICY IF EXISTS "Authenticated can subscribe to own topics" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
