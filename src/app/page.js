"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LandingPage() {
  const router = useRouter();

  const handleSignUp = () => {
    router.push("/register");
  };
  const handleSignIn = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Gas Agency</div>
        <ul className={styles.navLinks}>
          <li className={styles.navItem2} onClick={handleSignUp}>Sign Up</li>
          <li className={styles.navItem} onClick={handleSignIn}>Sign In</li>
        </ul>
      </nav>
      <main className={styles.mainContent}>
        <h1 className={styles.title}>
          Welcome to Gas Agency
        </h1>
        <p className={styles.description}>
          Experience seamless gas delivery services right to your doorstep, anytime, with just a single click.
        </p>
        <button
          className={styles.ctaButton}
          onClick={handleSignIn}
        >
          Book Now
        </button>
        <button
          className={styles.signupButton}
          onClick={handleSignUp}
        >
          Sign up
        </button>
      </main>
    </div>
  );
}
