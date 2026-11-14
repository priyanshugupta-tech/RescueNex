import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting RescueNex End-to-End API Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (error: any) {
      console.error(`❌ [FAIL] ${name}:`, error.response?.data?.message || error.message);
      failed++;
    }
  };

  // 1. Health check
  await test('GET /api/health', async () => {
    const res = await axios.get(`${BASE_URL}/api/health`);
    if (res.data.status !== 'HEALTHY') throw new Error('Status not HEALTHY');
  });

  // 2. Weather endpoints
  await test('GET /api/weather', async () => {
    const res = await axios.get(`${BASE_URL}/api/weather`);
    if (!res.data.success || !Array.isArray(res.data.weather)) throw new Error('Weather format invalid');
  });

  // 3. Sectors endpoints
  await test('GET /api/telemetry/sectors', async () => {
    const res = await axios.get(`${BASE_URL}/api/telemetry/sectors`);
    if (!res.data.success || res.data.sectors.length === 0) throw new Error('Sectors empty');
  });

  // 4. GPS Telemetry Ingest
  await test('POST /api/telemetry/ingest (Dynamic GPS)', async () => {
    const res = await axios.post(`${BASE_URL}/api/telemetry/ingest`, {
      node_id: 'NODE_TEST_01',
      latitude: 33.4975,
      longitude: 75.2014,
      altitude_m: 1730,
      soil_moisture_pct: 65.5,
      tilt_x: 2.1,
      tilt_y: -0.9,
      accel_rms: 1.05,
      vibration_detected: false
    });
    if (!res.data.success || !res.data.gps) throw new Error('Ingest failed');
  });

  // 5. Query live nodes
  await test('GET /api/telemetry/nodes', async () => {
    const res = await axios.get(`${BASE_URL}/api/telemetry/nodes`);
    if (!res.data.success || res.data.nodes.length === 0) throw new Error('Nodes list empty');
  });

  // 6. Main Admin Login
  let adminToken = '';
  let refreshCookie = '';
  await test('POST /api/auth/login (Main Admin: lead@rescuenex)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: process.env.MAIN_ADMIN_EMAIL || 'lead@rescuenex.org',
      password: process.env.MAIN_ADMIN_PASSWORD || ''
    });
    if (!res.data.accessToken || res.data.user.role !== 'ADMIN') throw new Error('Admin login failed');
    adminToken = res.data.accessToken;

    const cookies = res.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      refreshCookie = cookies[0];
    }
  });

  // 7. Rate Limiting Check (5 attempts trigger 5-min lockout)
  await test('Rate Limiting: 5 failed logins triggers 5-min lockout', async () => {
    const testUsername = 'attacker_' + Date.now();
    let lockoutTriggered = false;

    for (let i = 1; i <= 6; i++) {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          userName: testUsername,
          password: 'wrong_password_123'
        });
      } catch (err: any) {
        if (err.response?.status === 429) {
          lockoutTriggered = true;
          break;
        }
      }
    }

    if (!lockoutTriggered) throw new Error('Rate limit did not trigger 429 after 5 failed attempts');
  });

  // 8. Signup with Resend OTP
  const testEmail = `test_${Date.now()}@example.com`;
  await test('POST /api/auth/signup (Unverified user + OTP generation)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/signup`, {
      userName: 'user_' + Date.now(),
      email: testEmail,
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'PUBLIC'
    });
    if (!res.data.message) throw new Error('Signup failed');
  });

  // 9. Query Alerts
  await test('GET /api/alerts', async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts`);
    if (!res.data.success) throw new Error('Alerts fetch failed');
  });

  // 10. Admin-protected route: GET /api/auth/pending
  await test('GET /api/auth/pending (Admin Protected)', async () => {
    const res = await axios.get(`${BASE_URL}/api/auth/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.data.success) throw new Error('Admin pending users fetch failed');
  });

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
};

runTests();
