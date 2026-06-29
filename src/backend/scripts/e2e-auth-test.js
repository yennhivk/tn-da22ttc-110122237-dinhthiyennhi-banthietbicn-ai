async function run() {
    const stamp = Date.now();
    const email = `e2e_${stamp}@example.com`;
    const password = '123456';
    const username = `e2e_user_${stamp}`;

    const registerRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ten_dang_nhap: username,
            mat_khau: password,
            email,
            vai_tro: 'khach_hang'
        })
    });
    const registerJson = await registerRes.json();

    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mat_khau: password })
    });
    const loginJson = await loginRes.json();

    if (!loginJson?.data?.token) {
        console.log(
            JSON.stringify(
                {
                    ok: false,
                    step: 'login',
                    registerStatus: registerRes.status,
                    registerJson,
                    loginStatus: loginRes.status,
                    loginJson
                },
                null,
                2
            )
        );
        process.exit(1);
    }

    const meRes = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
            Authorization: `Bearer ${loginJson.data.token}`
        }
    });
    const meJson = await meRes.json();

    console.log(
        JSON.stringify(
            {
                ok: true,
                registerStatus: registerRes.status,
                loginStatus: loginRes.status,
                meStatus: meRes.status,
                email,
                username,
                meEmail: meJson?.data?.email || null
            },
            null,
            2
        )
    );
}

run().catch((error) => {
    console.error('E2E auth test failed:', error.message);
    process.exit(1);
});
