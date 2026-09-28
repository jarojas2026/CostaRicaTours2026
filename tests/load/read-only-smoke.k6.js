import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('crt_failures');
const availabilityLatency = new Trend('crt_availability_latency', true);

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOUR_ID = __ENV.TOUR_ID || 'manuel-antonio-national-park';
const DATE = __ENV.TOUR_DATE || '2026-12-15';

/**
 * Read-only production-readiness smoke profile.
 * It never creates bookings, payments, provider orders or other persistent state.
 * Use against preview/staging by default; production execution should be deliberate.
 */
export const options = {
  scenarios: {
    public_catalog_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '60s', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
    crt_failures: ['rate<0.02'],
    crt_availability_latency: ['p(95)<1200'],
  },
};

export default function () {
  const home = http.get(`${BASE_URL}/`);
  const homeOk = check(home, {
    'home responds 200': (r) => r.status === 200,
    'home has HTML': (r) => String(r.headers['Content-Type'] || '').includes('text/html'),
  });
  failureRate.add(!homeOk);

  const tours = http.get(`${BASE_URL}/tours`);
  const toursOk = check(tours, {
    'tours responds 200': (r) => r.status === 200,
  });
  failureRate.add(!toursOk);

  const availability = http.get(
    `${BASE_URL}/api/tours/${encodeURIComponent(TOUR_ID)}/availability?date=${encodeURIComponent(DATE)}&time=08%3A00%20AM&seats=2`,
  );
  availabilityLatency.add(availability.timings.duration);
  const availabilityOk = check(availability, {
    // 200 = verified response. 503 is also a valid fail-closed production outcome
    // when the live availability source cannot be reached; 404/HTML is not.
    'availability endpoint is routed': (r) => r.status === 200 || r.status === 503,
    'availability responds JSON': (r) => String(r.headers['Content-Type'] || '').includes('application/json'),
  });
  failureRate.add(!availabilityOk);

  sleep(Math.random() * 1.5 + 0.5);
}
