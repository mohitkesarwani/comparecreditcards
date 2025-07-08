import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

export default function MortgagesPage() {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  const fetchMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const params = { limit: 20 };
    if (nextCursor) params.cursor = nextCursor;
    const res = await axios.get('/api/residential-mortgages', { params });
    setItems(prev => [...prev, ...res.data.data]);
    setNextCursor(res.data.nextCursor);
    setLoading(false);
  }, [nextCursor, loading]);

  useEffect(() => {
    fetchMore();
  }, []); // initial load

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextCursor !== null) {
          fetchMore();
        }
      },
      { threshold: 0.8 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [fetchMore, nextCursor]);

  return (
    <div>
      <ul>
        {items.map(m => (
          <li key={m._id}>{m.name}</li>
        ))}
      </ul>
      {nextCursor && <div ref={sentinelRef}>Loading...</div>}
    </div>
  );
}
