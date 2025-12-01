'use client';
import { useState, useEffect, Suspense } from 'react';
import styles from '../../styles/register.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CustomAlert from '../CustomAlert';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ username: '', email: '', password: '', connectionType: 'Cylinder' });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const type = searchParams.get('type');
    if (type && (type === 'Cylinder' || type === 'Pipeline')) {
      setForm(prev => ({ ...prev, connectionType: type }));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.message == 'User already exists') {
      setAlertMessage(`Email already in use`);
      setShowAlert(true);
      router.push('/login');
      return;
    }
    alert(data.message);
    if (res.ok) {
      router.push('/login');
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Register for {form.connectionType}</h2>
        <label className={styles.label}>
          Username
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={styles.input}
            required
          />
        </label>
        <label className={styles.label}>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={styles.input}
            required
          />
        </label>
        <label className={styles.label}>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={styles.input}
            required
          />
        </label>
        <label className={styles.label}>
          Connection Type
          <select
            name="connectionType"
            value={form.connectionType}
            onChange={(e) => setForm({ ...form, connectionType: e.target.value })}
            className={styles.input}
            style={{ backgroundColor: 'white' }}
          >
            <option value="Cylinder">LPG Cylinder</option>
            <option value="Pipeline">Piped Gas (PNG)</option>
          </select>
        </label>
        <button type="submit" className={styles.button}>Register</button>

        <p className={styles.text}>
          Already registered? <Link href="/login">Sign In</Link>
        </p>
      </form>
      {showAlert && <CustomAlert message={alertMessage} onClose={() => setShowAlert(false)} />}
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
