import React from 'react';
import styles from '../styles/CustomAlert.module.css';

const CustomAlert = ({ message, onClose }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.alertBox}>
        <p>{message}</p>
        <button className={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default CustomAlert;