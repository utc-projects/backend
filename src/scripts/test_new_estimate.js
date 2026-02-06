require('dotenv').config();

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5001';
const API_URL = `${SERVER_URL}/api/estimates`;
const AUTH_URL = `${SERVER_URL}/api/auth/login`;

const REG_URL = `${SERVER_URL}/api/auth/users`; // Admin create user or public register?
// The authController has `register` at `/api/auth/register`.

const login = async () => {
    const email = `testadmin${Date.now()}@test.com`;
    const password = 'password123';
    
    // 1. Register
    try {
        await fetch(`${SERVER_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: 'Test Admin', 
                email, 
                password,
                role: 'admin',
                department: 'IT',
                studentId: 'ADMIN001'
            })
        });
        // Ignore error if exists (might be duplicate), proceed to login
    } catch (e) {}

    // 2. Login
    try {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        return data.token;
    } catch (e) {
        console.error('Login Error:', e.message);
        process.exit(1);
    }
};

const run = async () => {
    console.log('--- STARTING VERIFICATION (Fetch) ---');
    
    // 1. Login
    const token = await login();
    console.log('1. Login successful');
    
    const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    // 2. Payload
    const payload = {
        code: 'TEST-002',
        name: 'Tour Kiem Tra 2',
        route: 'SGN-DL-SGN',
        startDate: '2026-07-01',
        endDate: '2026-07-04',
        guestsCount: 20,
        revenueItems: [{ name: 'Package', paxAdult: 20, priceAdult: 2000000, totalAmount: 40000000 }],
        restaurants: [{ provider: 'Quan Ngon', mealType: 'Tối', pax: 20, sessions: 3, price: 150000, total: 9000000 }],
        hotels: [{ hotel: 'DL Hotel', roomQty: 10, nights: 3, price: 800000, total: 24000000 }],
        totalRevenue: 40000000,
        totalNetCost: 33000000,
        expectedProfit: 7000000
    };

    try {
        // 3. Create
        let res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
        let data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        console.log('2. Create Estimate: OK', data._id);
        const id = data._id;

        // 4. Get By ID
        res = await fetch(`${API_URL}/${id}`, { headers });
        data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        console.log('3. Get Estimate: OK', data.name);
        
        if (data.hotels[0].hotel !== 'DL Hotel') throw new Error('Data mismatch');

        // 5. Delete
        res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers });
        if (!res.ok) throw new Error('Delete failed');
        console.log('4. Delete Estimate: OK');

        console.log('--- VERIFICATION PASSED ---');
    } catch (e) {
        console.error('FAILED:', e.message);
    }
};

run();
