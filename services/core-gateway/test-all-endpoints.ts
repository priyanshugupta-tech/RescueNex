import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const runAllTests = async () => {
  console.log('====================================================');
  console.log('🚀 Running Complete RescueNex API Test Suite');
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

  let adminAccessToken = '';
  let adminCookie = '';
  let pendingUserId = '';
  let sampleAlertId = '';

  // 1. System Health
  await test('GET /api/health', async () => {
    const res = await axios.get(`${BASE_URL}/api/health`);
    if (res.data.status !== 'HEALTHY') throw new Error('Status not HEALTHY');
    if (!res.data.database) throw new Error('Database status missing');
  });

  // 2. Weather Endpoints
  await test('GET /api/weather', async () => {
    const res = await axios.get(`${BASE_URL}/api/weather`);
    if (!res.data.success || !Array.isArray(res.data.weather)) throw new Error('Weather format invalid');
  });

  await test('POST /api/weather/sync', async () => {
    const res = await axios.post(`${BASE_URL}/api/weather/sync`);
    if (!res.data.success) throw new Error('Weather sync failed');
  });

  await test('POST /api/weather/scenario (Switch to MONSOON)', async () => {
    const res = await axios.post(`${BASE_URL}/api/weather/scenario`, {
      sectorId: 'SECTOR_RAMBAN',
      scenario: 'MONSOON'
    });
    if (!res.data.success || !res.data.weather) throw new Error('Scenario switch failed');
  });

  // 3. Telemetry Ingestion (Dynamic GPS from NEO-6M/8M)
  await test('POST /api/telemetry/ingest (Physical Hardware GPS)', async () => {
    const res = await axios.post(`${BASE_URL}/api/telemetry/ingest`, {
      node_id: 'ESP32_NEO6M_NODE1',
      latitude: 33.2505,
      longitude: 75.2501,
      altitude_m: 1650,
      soil_moisture_pct: 78.4,
      tilt_x: 4.8,
      tilt_y: 2.1,
      accel_rms: 1.12,
      vibration_detected: true,
      wake_reason: 'MOTION_INTERRUPT'
    });
    if (!res.data.success || !res.data.telemetry) throw new Error('Ingest failed');
  });

  await test('GET /api/telemetry/nodes', async () => {
    const res = await axios.get(`${BASE_URL}/api/telemetry/nodes`);
    if (!res.data.success || res.data.nodes.length === 0) throw new Error('No nodes found');
    const node = res.data.nodes.find((n: any) => n.nodeId === 'ESP32_NEO6M_NODE1');
    if (!node) throw new Error('Ingested node not present');
  });

  await test('GET /api/telemetry/sectors', async () => {
    const res = await axios.get(`${BASE_URL}/api/telemetry/sectors`);
    if (!res.data.success || res.data.sectors.length === 0) throw new Error('No sectors found');
  });

  await test('GET /api/telemetry/history', async () => {
    const res = await axios.get(`${BASE_URL}/api/telemetry/history?nodeId=ESP32_NEO6M_NODE1`);
    if (!res.data.success || !Array.isArray(res.data.history)) throw new Error('History failed');
  });

  // 4. Authentication - Admin Login
  await test('POST /api/auth/login (Main Admin)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      userName: 'lead@rescuenex',
      password: 'gupta18'
    });
    if (!res.data.accessToken) throw new Error('Admin login failed: no accessToken returned');
    adminAccessToken = res.data.accessToken;

    const cookies = res.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      adminCookie = cookies.join('; ');
    }
  });

  // 5. Auth - Profile Verification
  await test('GET /api/auth/me (Protected)', async () => {
    const res = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    if (!res.data.success || res.data.user.role !== 'ADMIN') throw new Error('Failed to verify me endpoint');
  });

  // 6. Token Generation / Refresh via HTTP-only cookie
  await test('GET /api/auth/tokengen (Token Refresh via Cookie)', async () => {
    if (!adminCookie) throw new Error('No cookie available for refresh');
    const res = await axios.get(`${BASE_URL}/api/auth/tokengen`, {
      headers: { Cookie: adminCookie }
    });
    if (!res.data.accessToken) throw new Error('Tokengen failed');

    // Update cookie if rotated
    const cookies = res.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      adminCookie = cookies.join('; ');
    }
  });

  // 7. Auth - Signup with confirmPassword for Non-Public Role (Scout)
  const scoutUsername = `scout_${Date.now()}`;
  const scoutEmail = `${scoutUsername}@example.com`;
  await test('POST /api/auth/signup (SCOUT non-public signup with Resend OTP)', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/signup`, {
      userName: scoutUsername,
      email: scoutEmail,
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'SCOUT',
      agency: 'SDRF'
    });
    if (res.status !== 201) throw new Error('Signup failed');
  });

  // 8. Auth - Rate Limiting (5 failed attempts within 2 min => 5 min lockout)
  await test('Rate Limiting: 5 failed logins triggers 429 lockout', async () => {
    const testUsername = `ratelimit_${Date.now()}`;
    let hitLockout = false;

    for (let i = 1; i <= 5; i++) {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          userName: testUsername,
          password: 'WrongPassword'
        });
      } catch (err: any) {
        if (err.response?.status === 429) {
          hitLockout = true;
          break;
        }
      }
    }

    if (!hitLockout) {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          userName: testUsername,
          password: 'WrongPassword'
        });
        throw new Error('Expected 429 Too Many Requests, got 200');
      } catch (err: any) {
        if (err.response?.status !== 429) {
          throw new Error(`Expected 429 Too Many Requests, got ${err.response?.status}`);
        }
      }
    }
  });

  // 9. Auth - Pending Users (Admin Approval Flow)
  await test('GET /api/auth/pending (Admin Approval List)', async () => {
    const res = await axios.get(`${BASE_URL}/api/auth/pending`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` }
    });
    if (!res.data.success) throw new Error('Pending users list failed');
    if (res.data.pendingUsers && res.data.pendingUsers.length > 0) {
      pendingUserId = res.data.pendingUsers[0]._id || res.data.pendingUsers[0].id;
    }
  });

  // 10. Auth - Approve User
  if (pendingUserId) {
    await test(`POST /api/auth/approve/${pendingUserId}`, async () => {
      const res = await axios.post(`${BASE_URL}/api/auth/approve/${pendingUserId}`, {}, {
        headers: { Authorization: `Bearer ${adminAccessToken}` }
      });
      if (!res.data.success) throw new Error('User approval failed');
    });
  }

  // 11. Alerts Endpoints
  await test('GET /api/alerts', async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts`);
    if (!res.data.success || !Array.isArray(res.data.activeAlerts)) throw new Error('Alerts fetch failed');
    if (res.data.activeAlerts.length > 0) {
      sampleAlertId = res.data.activeAlerts[0].id || res.data.activeAlerts[0].alert_id;
    }
  });

  if (sampleAlertId) {
    await test(`GET /api/alerts/${sampleAlertId}/cap-xml`, async () => {
      const res = await axios.get(`${BASE_URL}/api/alerts/${sampleAlertId}/cap-xml`);
      if (typeof res.data !== 'string' || !res.data.includes('<alert')) {
        throw new Error('CAP XML format invalid');
      }
    });

    await test(`POST /api/alerts/${sampleAlertId}/acknowledge`, async () => {
      const res = await axios.post(`${BASE_URL}/api/alerts/${sampleAlertId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${adminAccessToken}` }
      });
      if (!res.data.success) throw new Error('Alert acknowledge failed');
    });
  }

  // 12. High-security Siren Toggle (requires x-emergency-confirm: CONFIRM_DISASTER_OVERRIDE)
  await test('POST /api/alerts/siren/toggle (Emergency Siren Trigger)', async () => {
    const res = await axios.post(
      `${BASE_URL}/api/alerts/siren/toggle`,
      { sectorId: 'SECTOR_RAMBAN', active: true },
      {
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'x-emergency-confirm': 'CONFIRM_DISASTER_OVERRIDE'
        }
      }
    );
    if (!res.data.success) throw new Error('Siren toggle failed');
  });

  // 13. Logout
  await test('POST /api/auth/logout', async () => {
    const res = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${adminAccessToken}`,
        Cookie: adminCookie
      }
    });
    if (res.status !== 204 && res.status !== 200) throw new Error('Logout failed');
  });

  console.log('\n====================================================');
  console.log(`🏁 Complete API Test Run Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');
};

runAllTests();
