import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import Page from "../Page";
import Otp from "../Otp";
import AuthAside from "../AuthAside";
import PasswordField, { strength } from "../PasswordField";

const EMPTY = Array(6).fill("");
const RULE = "Use 8+ characters with upper and lower case letters and a number";
const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25 },
};

const Err = ({ text, center }) => (
  <AnimatePresence>
    {text && (
      <motion.p
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        role="alert"
        className={`rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 ${center ? "text-center" : ""}`}
      >
        {text}
      </motion.p>
    )}
  </AnimatePresence>
);

export default function Auth({ mode }) {
  const reg = mode === "register";
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "seeker",
    company: "",
  });
  const [step, setStep] = useState("form"); // form | otp | forgot | reset
  const [digits, setDigits] = useState(EMPTY);
  const [newPw, setNewPw] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    setStep("form");
    setErr("");
    setInfo("");
  }, [mode]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const go = (s, msg = "") => {
    setStep(s);
    setDigits(EMPTY);
    setErr("");
    setInfo(msg);
  };
  const done = (d) => {
    login(d);
    nav(d.user.role === "recruiter" ? "/dashboard" : "/");
  };

  // ---- login / register ----
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (reg && strength(f.password) < 3) throw new Error(RULE);
      const d = await api(`/auth/${mode}`, { method: "POST", body: f });
      if (d.needsVerification) {
        go("otp", `We sent a 6-digit code to ${d.email}`);
        setWait(30);
      } else done(d);
    } catch (x) {
      if (x.code === "NOT_VERIFIED") {
        go("otp", "Your email is not verified yet. We sent you a new code.");
        setWait(30);
      } else setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  // ---- verify email ----
  const verify = async () => {
    const code = digits.join("");
    if (code.length < 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      done(
        await api("/auth/verify", {
          method: "POST",
          body: { email: f.email, code },
        }),
      );
    } catch (x) {
      setErr(x.message);
      setDigits(EMPTY);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step === "otp" && digits.every(Boolean)) verify();
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    try {
      await api("/auth/resend", { method: "POST", body: { email: f.email } });
      setWait(30);
      setInfo("A new code is on its way");
      setErr("");
    } catch (x) {
      setErr(x.message);
    }
  };

  // ---- forgot / reset password ----
  const sendReset = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api("/auth/forgot", { method: "POST", body: { email: f.email } });
      if (step !== "reset")
        go(
          "reset",
          `If an account exists for ${f.email}, we sent a 6-digit code to it.`,
        );
      else setInfo("A new code is on its way");
      setWait(30);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    if (strength(newPw) < 3) {
      setErr(RULE);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api("/auth/reset", {
        method: "POST",
        body: { email: f.email, code, password: newPw },
      });
      setNewPw("");
      setF({ ...f, password: "" });
      go("form", "Password updated. Please log in with your new password.");
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="flex min-h-[calc(100vh-120px)] items-center py-10">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        <AuthAside />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="glass overflow-hidden rounded-[2rem] p-7 shadow-2xl shadow-brand-600/10 sm:p-9">
            <div className="mb-6 flex justify-center">
              <motion.div
                whileHover={{ rotate: 8, scale: 1.08 }}
                className="logo-mark !h-14 !w-14 !rounded-2xl !text-lg"
              >
                JP
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  {...slide}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <h2 className="font-display text-3xl font-extrabold">
                      {reg ? "Create your account" : "Welcome back"}
                    </h2>
                    <p className="mt-2 text-sm text-ink/55">
                      {reg
                        ? "It takes less than a minute."
                        : "Log in to continue."}
                    </p>
                  </div>
                  {info && (
                    <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                      ✅ {info}
                    </p>
                  )}

                  {reg && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["seeker", "👤", "Looking for work"],
                          ["recruiter", "🏢", "I am hiring"],
                        ].map(([v, ic, l]) => (
                          <button
                            type="button"
                            key={v}
                            onClick={() => setF({ ...f, role: v })}
                            className={`rounded-xl border p-3 text-left text-xs font-bold transition ${f.role === v ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300" : "border-ink/10 hover:border-brand-500/30"}`}
                          >
                            <span className="block text-base">{ic}</span>
                            {l}
                          </button>
                        ))}
                      </div>
                      <input
                        className="input"
                        placeholder="Full name"
                        value={f.name}
                        onChange={set("name")}
                        required
                      />
                      {f.role === "recruiter" && (
                        <input
                          className="input"
                          placeholder="Company name"
                          value={f.company}
                          onChange={set("company")}
                        />
                      )}
                    </>
                  )}

                  <input
                    className="input"
                    type="email"
                    placeholder="Email address"
                    value={f.email}
                    onChange={set("email")}
                    autoComplete="email"
                    required
                  />
                  <PasswordField
                    value={f.password}
                    onChange={set("password")}
                    meter={reg}
                    auto={reg ? "new-password" : "current-password"}
                  />

                  {!reg && (
                    <div className="-mt-1 text-right">
                      <button
                        type="button"
                        onClick={() => go("forgot")}
                        className="text-sm font-bold text-brand-600 hover:underline dark:text-brand-300"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Err text={err} />
                  <button className="btn-primary w-full py-3.5" disabled={busy}>
                    {busy
                      ? "Please wait..."
                      : reg
                        ? "Create account →"
                        : "Log in →"}
                  </button>
                  <p className="text-center text-sm text-ink/55">
                    {reg
                      ? "Already have an account?"
                      : "Don't have an account?"}{" "}
                    <Link
                      className="font-bold text-brand-600 dark:text-brand-300"
                      to={reg ? "/login" : "/register"}
                    >
                      {reg ? "Log in" : "Create one"}
                    </Link>
                  </p>
                </motion.form>
              )}

              {step === "otp" && (
                <motion.div key="otp" {...slide} className="space-y-5">
                  <div className="text-center">
                    <div className="text-4xl">✉️</div>
                    <h2 className="mt-2 font-display text-3xl font-extrabold">
                      Verify your email
                    </h2>
                    <p className="mt-2 text-sm text-ink/55">{info}</p>
                  </div>
                  <Otp digits={digits} setDigits={setDigits} />
                  <Err text={err} center />
                  <button
                    onClick={verify}
                    className="btn-primary w-full py-3.5"
                    disabled={busy}
                  >
                    {busy ? "Verifying..." : "Verify and continue"}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => go("form")}
                      className="font-bold text-ink/55 hover:text-ink"
                    >
                      ← Change email
                    </button>
                    <button
                      onClick={resend}
                      disabled={wait > 0}
                      className="font-bold text-brand-600 disabled:opacity-50 dark:text-brand-300"
                    >
                      {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "forgot" && (
                <motion.form
                  key="forgot"
                  onSubmit={sendReset}
                  {...slide}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="text-4xl">🔑</div>
                    <h2 className="mt-2 font-display text-3xl font-extrabold">
                      Forgot password?
                    </h2>
                    <p className="mt-2 text-sm text-ink/55">
                      Enter your email and we will send you a 6-digit code.
                    </p>
                  </div>
                  <input
                    className="input"
                    type="email"
                    placeholder="Email address"
                    value={f.email}
                    onChange={set("email")}
                    autoComplete="email"
                    required
                  />
                  <Err text={err} />
                  <button className="btn-primary w-full py-3.5" disabled={busy}>
                    {busy ? "Sending..." : "Send code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => go("form")}
                    className="w-full text-center text-sm font-bold text-ink/55 hover:text-ink"
                  >
                    ← Back to log in
                  </button>
                </motion.form>
              )}

              {step === "reset" && (
                <motion.form
                  key="reset"
                  onSubmit={reset}
                  {...slide}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="text-4xl">🔐</div>
                    <h2 className="mt-2 font-display text-3xl font-extrabold">
                      Set a new password
                    </h2>
                    <p className="mt-2 text-sm text-ink/55">{info}</p>
                  </div>
                  <Otp digits={digits} setDigits={setDigits} />
                  <PasswordField
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password"
                    meter
                    auto="new-password"
                  />
                  <Err text={err} />
                  <button className="btn-primary w-full py-3.5" disabled={busy}>
                    {busy ? "Saving..." : "Reset password"}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => go("forgot")}
                      className="font-bold text-ink/55 hover:text-ink"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={sendReset}
                      disabled={wait > 0 || busy}
                      className="font-bold text-brand-600 disabled:opacity-50 dark:text-brand-300"
                    >
                      {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </Page>
  );
}
