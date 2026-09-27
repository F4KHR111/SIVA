import { useState, useRef, useEffect } from "react";
import { Container, Card, Form, Button, Alert, InputGroup, Badge, Spinner } from "react-bootstrap";
import { LockFill, PersonFill, EyeFill, EyeSlashFill, ShieldCheck, BoxSeam, PhoneFill, ArrowLeft, KeyFill, QrCode } from "react-bootstrap-icons";
import { useAuth } from "../context/AuthContext";

function Login() {
    const { login, verify2FA, activateAndLogin2FA } = useAuth();

    // State Step: "credentials", "2fa_setup" (pertama kali), atau "2fa" (login berikutnya)
    const [step, setStep] = useState("credentials");
    const [tempToken, setTempToken] = useState("");
    const [setupData, setSetupData] = useState(null);
    const [twoFAUser, setTwoFAUser] = useState(null);
    const [otpCode, setOtpCode] = useState("");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Ref untuk mengunci agar tidak terjadi double-submit atau race condition
    const submittingRef = useRef(false);
    const otpInputRef = useRef(null);

    // Fokus otomatis ke kotak 6 digit begitu masuk step 2FA
    useEffect(() => {
        if (step === "2fa_setup" || step === "2fa") {
            submittingRef.current = false;
            setTimeout(() => {
                if (otpInputRef.current) otpInputRef.current.focus();
            }, 100);
        }
    }, [step]);

    // Handle Submit Step 1: Username/Email & Password
    const handleSubmitCredentials = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!username.trim() || !password.trim()) {
            setErrorMsg("Username/Email dan password wajib diisi.");
            return;
        }

        setLoading(true);
        const result = await login(username, password);
        setLoading(false);

        if (result.require2FASetup) {
            // Pegawai baru / belum pasang 2FA: Tampilkan QR Code untuk scan mandiri di HP!
            setSetupData({
                setupToken: result.setupToken,
                qrCodeUrl: result.qrCodeUrl,
                secret: result.secret
            });
            setTwoFAUser(result.user);
            setStep("2fa_setup");
            setOtpCode("");
            setErrorMsg("");
        } else if (result.require2FA) {
            // Pegawai sudah pasang 2FA sebelumnya: Minta 6 digit kode
            setTempToken(result.tempToken);
            setTwoFAUser(result.user);
            setStep("2fa");
            setOtpCode("");
            setErrorMsg("");
        } else if (!result.success) {
            setErrorMsg(result.message);
        }
    };

    // Handle Submit Step 2A: Setup Pertama Kali (Scan Mandiri) - Instant Auto-Submit saat digit ke-6 diketik
    const handleSubmit2FASetup = async (codeToSubmit) => {
        if (submittingRef.current) return;
        const code = (typeof codeToSubmit === "string" ? codeToSubmit : otpCode).trim();
        setErrorMsg("");

        if (!code || code.length !== 6) {
            setErrorMsg("Masukkan 6 digit kode angka dari Microsoft Authenticator di HP Anda.");
            return;
        }

        submittingRef.current = true;
        setLoading(true);

        try {
            const result = await activateAndLogin2FA(setupData.setupToken, code);
            if (!result.success) {
                setErrorMsg(result.message);
                setOtpCode("");
                setTimeout(() => otpInputRef.current?.focus(), 50);
            }
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    // Handle Submit Step 2B: 6-Digit OTP untuk login reguler - Instant Auto-Submit saat digit ke-6 diketik
    const handleSubmit2FA = async (codeToSubmit) => {
        if (submittingRef.current) return;
        const code = (typeof codeToSubmit === "string" ? codeToSubmit : otpCode).trim();
        setErrorMsg("");

        if (!code || code.length !== 6) {
            setErrorMsg("Masukkan 6 digit kode angka dari Microsoft Authenticator.");
            return;
        }

        submittingRef.current = true;
        setLoading(true);

        try {
            const result = await verify2FA(tempToken, code);
            if (!result.success) {
                setErrorMsg(result.message);
                setOtpCode("");
                setTimeout(() => otpInputRef.current?.focus(), 50);
            }
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    // Trigger verifikasi seketika begitu 6 digit selesai diketik tanpa harus menunggu klik mouse
    const handleOtpChange = (e, targetStep) => {
        const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
        setOtpCode(clean);

        if (clean.length === 6 && !submittingRef.current && !loading) {
            if (targetStep === "2fa_setup") {
                handleSubmit2FASetup(clean);
            } else {
                handleSubmit2FA(clean);
            }
        }
    };

    const handleBackToCredentials = () => {
        setStep("credentials");
        setTempToken("");
        setSetupData(null);
        setTwoFAUser(null);
        setOtpCode("");
        setErrorMsg("");
    };

    const fillSampleAccount = (user, pass) => {
        setUsername(user);
        setPassword(pass);
        setErrorMsg("");
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light py-5">
            <Container style={{ maxWidth: step === "2fa_setup" ? "480px" : "440px" }}>
                <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="p-4 text-center text-white" style={{ background: "linear-gradient(135deg, #0f4c81 0%, #1e293b 100%)" }}>
                        <div className="bg-white bg-opacity-20 rounded-circle d-inline-flex p-3 mb-2 shadow-sm">
                            {step === "2fa_setup" ? (
                                <QrCode size={36} className="text-white" />
                            ) : step === "2fa" ? (
                                <PhoneFill size={36} className="text-white" />
                            ) : (
                                <BoxSeam size={36} className="text-white" />
                            )}
                        </div>
                        <h4 className="fw-bold mb-1">Sistem Inventaris Barang</h4>
                        <p className="small text-white-50 mb-0">
                            {step === "2fa_setup"
                                ? "Pendaftaran Microsoft Authenticator"
                                : step === "2fa"
                                ? "Verifikasi Keamanan Microsoft Authenticator"
                                : "Silakan login ke akun pengguna Anda"}
                        </p>
                    </div>

                    <Card.Body className="p-4 bg-white">
                        <div className="d-flex align-items-center justify-content-center gap-2 mb-3 py-1.5 px-3 rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 text-center" style={{ fontSize: "0.8rem" }}>
                            <ShieldCheck size={16} className="text-primary flex-shrink-0" />
                            <span className="fw-bold">Proteksi Keamanan: Bcrypt + Microsoft Authenticator</span>
                        </div>

                        {errorMsg && (
                            <Alert variant="danger" dismissible onClose={() => setErrorMsg("")} className="py-2.5 small fw-semibold">
                                {errorMsg}
                            </Alert>
                        )}

                        {step === "credentials" ? (
                            /* ================= STEP 1: LOGIN FORM ================= */
                            <Form onSubmit={handleSubmitCredentials}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-dark">Username atau Email</Form.Label>
                                    <InputGroup size="lg">
                                        <InputGroup.Text className="bg-light border-end-0">
                                            <PersonFill className="text-muted" size={18} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Username atau alamat email..."
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="border-start-0 fs-6 fw-semibold"
                                            autoFocus
                                        />
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-dark">Password</Form.Label>
                                    <InputGroup size="lg">
                                        <InputGroup.Text className="bg-light border-end-0">
                                            <LockFill className="text-muted" size={18} />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Masukkan password..."
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="border-start-0 border-end-0 fs-6 fw-semibold"
                                        />
                                        <Button
                                            variant="light"
                                            className="border border-start-0 text-muted"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeSlashFill size={18} /> : <EyeFill size={18} />}
                                        </Button>
                                    </InputGroup>
                                </Form.Group>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-100 fw-bold py-2.5 shadow-sm d-flex align-items-center justify-content-center gap-2"
                                    disabled={loading}
                                >
                                    <ShieldCheck size={20} />
                                    {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
                                </Button>
                            </Form>
                        ) : step === "2fa_setup" ? (
                            /* ================= STEP 2A: SCAN QR MANDIRI (PERTAMA KALI LOGIN) ================= */
                            <Form onSubmit={(e) => { e.preventDefault(); handleSubmit2FASetup(); }}>
                                <div className="text-center mb-3">
                                    <h5 className="fw-bold text-dark mb-1">Halo, {twoFAUser?.nama || "Pegawai"} 👋</h5>
                                    <p className="text-muted small mb-3">
                                        Demi keamanan akun Anda, silakan buka aplikasi <strong>Microsoft Authenticator</strong> di smartphone dan scan QR Code di bawah ini:
                                    </p>

                                    {/* Gambar QR Code */}
                                    <div className="p-2 border rounded-3 bg-white d-inline-block shadow-sm mb-2">
                                        <img
                                            src={setupData?.qrCodeUrl}
                                            alt="Scan QR Code Microsoft Authenticator"
                                            style={{ width: "190px", height: "190px" }}
                                        />
                                    </div>
                                    <div className="small text-muted fw-bold" style={{ fontSize: "0.78rem" }}>
                                        Akun: <span className="text-primary font-monospace">{twoFAUser?.email || twoFAUser?.username}</span>
                                    </div>
                                </div>

                                <div className="bg-light p-2.5 rounded-3 border mb-3 text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
                                    <div className="fw-bold text-dark mb-1">Langkah Mudah di HP:</div>
                                    <div>1. Buka <strong>Microsoft Authenticator</strong> di HP Anda.</div>
                                    <div>2. Tekan tanda <strong>+</strong> lalu pilih <strong>"Akun lainnya"</strong>.</div>
                                    <div>3. Arahkan kamera ke QR Code di atas.</div>
                                </div>

                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-bold text-dark text-center d-block">
                                        Masukkan 6 Digit Angka dari HP untuk Konfirmasi:
                                    </Form.Label>
                                    <Form.Control
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(e) => handleOtpChange(e, "2fa_setup")}
                                        disabled={loading}
                                        className="text-center fw-bold fs-3 letter-spacing font-monospace py-2"
                                        style={{ letterSpacing: "8px" }}
                                        autoFocus
                                        autoComplete="one-time-code"
                                        required
                                    />
                                    <Form.Text className="text-center d-block text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                                        * Masukkan 6 angka, sistem otomatis memverifikasi seketika tanpa perlu klik.
                                    </Form.Text>
                                </Form.Group>

                                {loading ? (
                                    <div className="text-center py-2.5 px-3 mb-3 rounded-3 bg-success bg-opacity-10 text-success fw-bold d-flex align-items-center justify-content-center gap-2 border border-success border-opacity-25">
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        <span>Menghubungkan akun...</span>
                                    </div>
                                ) : (
                                    <div className="text-center py-2 px-3 mb-3 text-muted small fw-semibold bg-light rounded-3 border">
                                        ✨ Ketik 6 digit angka, sistem otomatis langsung mengaktifkan akun
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    size="sm"
                                    className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                                    onClick={handleBackToCredentials}
                                    disabled={loading}
                                >
                                    <ArrowLeft size={16} /> Batal / Kembali ke Login
                                </Button>
                            </Form>
                        ) : (
                            /* ================= STEP 2B: VERIFIKASI 6 DIGIT BIASA ================= */
                            <Form onSubmit={(e) => { e.preventDefault(); handleSubmit2FA(); }}>
                                <div className="text-center mb-3">
                                    <div className="badge bg-primary px-3 py-2 fs-6 mb-2">
                                        <KeyFill className="me-1" /> Verifikasi Microsoft Authenticator
                                    </div>
                                    <p className="small text-dark fw-semibold mb-1">
                                        Akun: <span className="text-primary fw-bold font-monospace">{twoFAUser?.username}</span>
                                        {twoFAUser?.email ? ` (${twoFAUser.email})` : ""}
                                    </p>
                                    <p className="text-muted" style={{ fontSize: "0.825rem" }}>
                                        Buka aplikasi <strong>Microsoft Authenticator</strong> di HP Anda, lalu masukkan 6 digit kode yang tampil.
                                    </p>
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold text-dark text-center d-block">
                                        Kode 6 Digit Microsoft Authenticator
                                    </Form.Label>
                                    <Form.Control
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={otpCode}
                                        onChange={(e) => handleOtpChange(e, "2fa")}
                                        disabled={loading}
                                        className="text-center fw-bold fs-3 letter-spacing font-monospace py-2"
                                        style={{ letterSpacing: "8px" }}
                                        autoFocus
                                        autoComplete="one-time-code"
                                        required
                                    />
                                    <Form.Text className="text-center d-block text-muted mt-1" style={{ fontSize: "0.78rem" }}>
                                        * Kode berganti setiap 30 detik pada layar HP Anda.
                                    </Form.Text>
                                </Form.Group>

                                {loading ? (
                                    <div className="text-center py-2.5 px-3 mb-3 rounded-3 bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center gap-2 border border-primary border-opacity-25">
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        <span>Memverifikasi kode & masuk...</span>
                                    </div>
                                ) : (
                                    <div className="text-center py-2 px-3 mb-3 text-muted small fw-semibold bg-light rounded-3 border">
                                        ✨ Ketik 6 digit angka dari HP, langsung otomatis masuk
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    size="sm"
                                    className="w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                                    onClick={handleBackToCredentials}
                                    disabled={loading}
                                >
                                    <ArrowLeft size={16} /> Kembali ke Form Login
                                </Button>
                            </Form>
                        )}

                        {/* Akun Bawaan Sistem (Hanya tampil di Step 1) */}
                        {step === "credentials" && (
                            <div className="mt-4 pt-3 border-top text-center">
                                <p className="small text-muted mb-2 fw-semibold">Pilihan Akun Uji Coba Bawaan:</p>
                                <div className="d-flex flex-wrap justify-content-center gap-1.5">
                                    <Badge
                                        bg="dark"
                                        className="px-2.5 py-1.5 cursor-pointer hover-shadow"
                                        onClick={() => fillSampleAccount("admin", "admin123")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        Admin
                                    </Badge>
                                    <Badge
                                        bg="primary"
                                        className="px-2.5 py-1.5 cursor-pointer hover-shadow"
                                        onClick={() => fillSampleAccount("operator_inv", "operator123")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        Operator Inventaris
                                    </Badge>
                                    <Badge
                                        bg="info"
                                        className="px-2.5 py-1.5 text-dark cursor-pointer hover-shadow"
                                        onClick={() => fillSampleAccount("operator_poli", "operator123")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        Operator Poliklinik
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}

export default Login;
