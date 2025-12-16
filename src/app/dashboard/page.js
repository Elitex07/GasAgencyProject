'use client';
import { useEffect, useState, useMemo } from 'react';
import styles from '../../styles/dashboard.module.css';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import CustomAlert from '../CustomAlert';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newBookingDate, setNewBookingDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [newUsername, setNewUsername] = useState('');
  const [newAddress, setNewAddress] = useState({ house: '', city: '', pincode: '' });
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedOption, setSelectedOption] = useState('personalInfo');
  const [usageStats, setUsageStats] = useState({ cityStats: {}, pincodeStats: {} });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pipeline State
  const [meterReadings, setMeterReadings] = useState([]);
  // Removed manual reading inputs (randomizer implemented)

  // Payment State
  const [transactions, setTransactions] = useState([]);

  // Inventory & Financial State
  const [inventory, setInventory] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ quantity: '', costPrice: '', sellingPrice: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setAllBookings(data.allBookings);

      // Fetch Inventory for all users
      const inventoryRes = await fetch('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inventoryData = await inventoryRes.json();
      setInventory(inventoryData.inventory || []);

      if (data.user.type === 'admin') {
        setSelectedOption('overview'); // Default to overview for admin
        const usersRes = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData = await usersRes.json();
        setAllUsers(usersData.users);

        const transactionsRes = await fetch('/api/payments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);

        const statsRes = await fetch('/api/analytics/usage-by-area', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        setUsageStats(statsData);

        const financialsRes = await fetch('/api/analytics/financials', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const financialsData = await financialsRes.json();
        setFinancials(financialsData.financials);

        const allReadingsRes = await fetch('/api/meter-readings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allReadingsData = await allReadingsRes.json();
        setMeterReadings(allReadingsData.readings || []);

      } else if (data.user.connectionType === 'Pipeline') {
        const readingsRes = await fetch('/api/meter-readings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const readingsData = await readingsRes.json();
        setMeterReadings(readingsData.readings);

        const transactionsRes = await fetch('/api/payments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleCreateBooking = async () => {
    if (!user.address) {
      setAlertMessage('Please update your address before booking');
      setShowAlert(true);
      return;
    }

    if (!selectedItem) {
      setAlertMessage('Please select an item');
      setShowAlert(true);
      return;
    }

    const token = localStorage.getItem('token');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookedOn: newBookingDate, item: selectedItem }),
    });

    if (res.ok) {
      const data = await res.json();
      setAllBookings((prev) => [...prev, data.booking]);
      setNewBookingDate('');
      setAlertMessage('Refill requested successfully!');
      setShowAlert(true);
    }
  };

  const handleSubmitReading = async () => {
    // Randomizer Logic
    const lastReading = meterReadings.length > 0 ? meterReadings[0] : null;
    const lastReadingValue = lastReading ? lastReading.readingValue : 0;
    const lastDate = lastReading ? new Date(lastReading.readingDate) : new Date(new Date().setDate(new Date().getDate() - 30));

    // Calculate days difference
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    // Ensure at least 1 day difference to prevent zero or negative increment if spamming
    // For demo purposes, we allow immediate multiple readings but with small random increment
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Generate random usage: 0.5 to 2.5 units per day
    const dailyUsage = Math.random() * (2.5 - 0.5) + 0.5;
    const estimatedUsage = Math.floor(diffDays * dailyUsage);

    // Ensure non-decreasing
    const increment = Math.max(1, estimatedUsage); // Minimum 1 unit increment
    const generatedReading = lastReadingValue + increment;
    const submissionDate = today.toISOString().split('T')[0];

    const token = localStorage.getItem('token');
    const res = await fetch('/api/meter-readings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ readingValue: generatedReading, readingDate: submissionDate }),
    });

    if (res.ok) {
      const data = await res.json();
      setMeterReadings([data.reading, ...meterReadings]);
      setAlertMessage(`Meter reading submitted successfully! New Reading: ${generatedReading}`);
      setShowAlert(true);
    } else {
      const errorData = await res.json();
      setAlertMessage(errorData.message || 'Failed to submit reading');
      setShowAlert(true);
    }
  };

  const handlePayment = async (readingId, amount) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ readingId, amount }),
    });

    if (res.ok) {
      setAlertMessage('Payment successful!');
      setShowAlert(true);
      // Refresh data
      const readingsRes = await fetch('/api/meter-readings', { headers: { Authorization: `Bearer ${token}` } });
      const readingsData = await readingsRes.json();
      setMeterReadings(readingsData.readings);

      const transactionsRes = await fetch('/api/payments', { headers: { Authorization: `Bearer ${token}` } });
      const transactionsData = await transactionsRes.json();
      setTransactions(transactionsData.transactions || []);
    } else {
      const errorData = await res.json();
      setAlertMessage(errorData.message || 'Payment failed');
      setShowAlert(true);
    }
  };

  const handleRefund = async (transactionId) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactionId }),
    });

    if (res.ok) {
      setAlertMessage('Refund processed successfully!');
      setShowAlert(true);
      // Refresh transactions
      const transactionsRes = await fetch('/api/payments', { headers: { Authorization: `Bearer ${token}` } });
      const transactionsData = await transactionsRes.json();
      setTransactions(transactionsData.transactions || []);
    } else {
      const errorData = await res.json();
      setAlertMessage(errorData.message || 'Refund failed');
      setShowAlert(true);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    // Update user data
    setAllBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking.user._id === userId ? { ...booking, user: { ...booking.user, type: newRole } } : booking
      )
    );
  };

  const analyticsData = useMemo(() => {
    const dataMap = {};

    // Helper to init date entry
    const initDate = (date) => {
      if (!dataMap[date]) dataMap[date] = { date, cylinder: 0, pipeline: 0 };
    };

    // Process Bookings (Cylinder)
    allBookings.forEach(b => {
      if (b.status !== 'Cancelled') {
        const date = new Date(b.bookedOn).toISOString().split('T')[0];
        initDate(date);
        dataMap[date].cylinder += 1;
      }
    });

    // Process Meter Readings (Pipeline Usage)
    meterReadings.forEach(r => {
      const date = new Date(r.readingDate).toISOString().split('T')[0];
      initDate(date);
      // specific logic: sum usage. If usage is not present, use readingValue difference? 
      // The API stores 'usage'.
      dataMap[date].pipeline += (r.usage || 0);
    });

    // Convert to array and sort
    return Object.values(dataMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allBookings, meterReadings]);

  // Prediction Logic
  const predictionData = useMemo(() => {
    if (meterReadings.length < 2) return [];

    // Sort readings by date
    const sortedReadings = [...meterReadings].sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));

    // Calculate Average Daily Usage over history
    // Simple approach: Total Usage / Total Days
    const firstReading = sortedReadings[0];
    const lastReading = sortedReadings[sortedReadings.length - 1];

    const totalUsage = Math.abs(lastReading.readingValue - firstReading.readingValue);
    const daysDiff = (new Date(lastReading.readingDate) - new Date(firstReading.readingDate)) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 0) return [];

    const avgDailyUsage = totalUsage / daysDiff;

    // Generate prediction for next 7 days
    const predictions = [];
    let accumulatedUsage = lastReading.readingValue;
    const lastDate = new Date(lastReading.readingDate);

    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);

      // Add random variance (+/- 10%)
      const variance = (Math.random() * 0.2) + 0.9;
      const dailyPredicted = avgDailyUsage * variance;

      // For chart, we might want to show Daily Usage trend or Cumulative?
      // Let's show Likely Daily Consumption
      predictions.push({
        date: nextDate.toISOString().split('T')[0],
        predictedUsage: parseFloat(dailyPredicted.toFixed(2))
      });
    }

    return predictions;
  }, [meterReadings]);

  const handleBookingStatusChange = async (bookingId, newStatus) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/bookings/${bookingId}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    // Update booking data
    setAllBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking._id === bookingId ? { ...booking, status: newStatus } : booking
      )
    );
  };

  const handleUpdateUser = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: newUsername, address: newAddress }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setNewUsername('');
      setNewAddress({ house: '', city: '', pincode: '' });
      setAlertMessage('Profile updated successfully!');
      setShowAlert(true);
    }
  };

  const handleAdminUpdateUser = async (userId, field, value) => {
    const token = localStorage.getItem('token');
    // We need to fetch the current user to get their existing address if we are updating a part of it
    // For simplicity, let's assume we are passing the full address object if updating address

    let body = {};
    if (field === 'address') {
      body = { address: value };
    } else {
      body = { [field]: value };
    }

    await fetch(`/api/users/${userId}`, { // Changed endpoint to a generic user update
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    // Update user data locally
    setAllUsers((prevUsers) =>
      prevUsers.map((u) =>
        u._id === userId ? { ...u, ...body } : u
      )
    );
  };

  const handleUpdateInventory = async (item) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        item: item,
        quantity: Number(editForm.quantity),
        costPrice: Number(editForm.costPrice),
        sellingPrice: Number(editForm.sellingPrice)
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setInventory((prev) => {
        const index = prev.findIndex((i) => i.item === item);
        if (index > -1) {
          const newInv = [...prev];
          newInv[index] = data.inventoryItem;
          return newInv;
        } else {
          return [...prev, data.inventoryItem];
        }
      });
      setEditingItem(null);
      setAlertMessage('Inventory updated successfully!');
      setShowAlert(true);

      // Refresh financials as they depend on inventory costs
      const financialsRes = await fetch('/api/analytics/financials', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const financialsData = await financialsRes.json();
      setFinancials(financialsData.financials);

    } else {
      setAlertMessage('Failed to update inventory');
      setShowAlert(true);
    }
  };

  const startEditing = (itemData) => {
    setEditingItem(itemData.item);
    setEditForm({
      quantity: itemData.quantity,
      costPrice: itemData.costPrice,
      sellingPrice: itemData.sellingPrice
    });
  };

  // Calculate Stats
  const getStats = () => {
    if (!user) return [];

    if (user.type === 'admin') {
      const totalBookings = allBookings.length;
      const pendingDeliveries = allBookings.filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled').length;
      const totalUsers = allUsers.length;
      const revenue = transactions.filter(t => t.type === 'Payment' && t.status === 'Success').reduce((acc, curr) => acc + curr.amount, 0);
      const refunds = transactions.filter(t => t.type === 'Refund' && t.status === 'Success').reduce((acc, curr) => acc + curr.amount, 0);

      return [
        { label: 'Total Users', value: totalUsers, icon: '👥' },
        { label: 'Total Refills', value: totalBookings, icon: '📦' },
        { label: 'Total Revenue', value: `₹${revenue.toLocaleString()}`, icon: '💰' },
        { label: 'Total Refunds', value: `₹${refunds.toLocaleString()}`, icon: '💸' },
      ];
    } else {
      // User Stats
      if (user.connectionType === 'Pipeline') {
        const totalReadings = meterReadings.length;
        const totalUsage = meterReadings.reduce((acc, curr) => acc + curr.usage, 0);
        const totalCost = meterReadings.reduce((acc, curr) => acc + curr.cost + (curr.penalty || 0), 0);
        const pendingBills = meterReadings.filter(r => r.status === 'Unpaid').length;

        return [
          { label: 'Total Readings', value: totalReadings, icon: '📊' },
          { label: 'Total Usage', value: `${totalUsage} Units`, icon: '🔥' },
          { label: 'Total Cost', value: `₹${totalCost.toLocaleString()}`, icon: '💰' },
          { label: 'Pending Bills', value: pendingBills, icon: '⚠️' },
        ];
      } else {
        // Cylinder Stats
        const myBookings = allBookings || [];
        const totalBookings = myBookings.length;
        const pendingDeliveries = myBookings.filter(b => b.status !== 'Delivered' && b.status !== 'Cancelled').length;
        const totalSpent = myBookings.filter(b => b.status === 'Delivered').length * 1200;

        return [
          { label: 'My Refills', value: totalBookings, icon: '📝' },
          { label: 'Pending', value: pendingDeliveries, icon: '⏳' },
          { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, icon: '💳' },
        ];
      }
    }
  };

  const getFilteredBookings = (bookings) => {
    if (filterStatus === 'all') return bookings;
    return bookings.filter(b => (b.status || (b.delivered ? 'Delivered' : 'Pending')) === filterStatus);
  };

  const pipelineEstimates = useMemo(() => {
    if (!user || user.connectionType !== 'Pipeline' || !meterReadings.length) return null;

    const totalUsage = meterReadings.reduce((acc, r) => acc + r.usage, 0);
    const avgUsage = (totalUsage / meterReadings.length).toFixed(2);
    const unitRate = user.pipelineDetails?.unitRate || 45;
    const estimatedBill = (avgUsage * unitRate).toFixed(2);

    // Calculate totals
    const totalPaid = meterReadings.filter(r => r.status === 'Paid').reduce((acc, r) => acc + r.cost + (r.penalty || 0), 0);
    const totalUnpaid = meterReadings.filter(r => r.status === 'Unpaid').reduce((acc, r) => acc + r.cost + (r.penalty || 0), 0);
    const totalPenalty = meterReadings.reduce((acc, r) => acc + (r.penalty || 0), 0);

    return {
      avgUsage,
      estimatedBill,
      unitRate,
      totalPaid,
      totalUnpaid,
      totalPenalty
    };
  }, [meterReadings, user]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Delivered': return styles.badgeSuccess;
      case 'Cancelled': return styles.badgeDanger;
      default: return styles.badgeWarning;
    }
  };

  if (!user) {
    return <div className={styles.container}><p style={{ padding: '2rem' }}>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
      <div className={styles.sidebar}>
        {user && user.type !== 'admin' && (
          <>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('personalInfo')}>Personal Information</button>
            {user.connectionType === 'Pipeline' ? (
              <>
                <button className={styles.sidebarButton} onClick={() => setSelectedOption('readings')}>Meter Readings</button>
                <button className={styles.sidebarButton} onClick={() => setSelectedOption('transactions')}>Transactions</button>
              </>
            ) : (
              <button className={styles.sidebarButton} onClick={() => setSelectedOption('bookings')}>Refill History</button>
            )}
          </>
        )}
        {user && user.type === 'admin' && (
          <>
            <h3 className={styles.sidebarHeader}>Admin Menu</h3>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('overview')}>Dashboard</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('manageUsers')}>Manage Users</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('manageBookings')}>Manage Refills</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('transactions')}>Transactions</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('analytics')}>Analytics</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('inventory')}>Inventory & Finance</button>
          </>
        )}
        <button className={styles.logoutButton} onClick={handleLogout}>Logout</button>
      </div>

      <div className={styles.content}>
        {selectedOption === 'personalInfo' && user.type !== 'admin' && (
          <div className={styles.profileCard}>
            {/* Header with Avatar Placeholder */}
            <div className={styles.profileHeader}>
              <div className={styles.avatarPlaceholder}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 className={styles.headings} style={{ margin: 0 }}>My Profile</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>Manage your account settings</p>
              </div>
              <div className={styles.profileActions}>
                <button className={`${styles.actionButton} ${styles.btnPrimary}`}>Change avatar</button>
                <button className={`${styles.actionButton} ${styles.btnSecondary}`}>Remove</button>
              </div>
            </div>

            {/* Grid Layout Form */}
            <div className={styles.profileGrid}>

              {/* Username (First Name slot) */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Username</label>
                <input
                  type="text"
                  placeholder={user.username}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={styles.profileInput}
                />
              </div>

              {/* Email (Last Name slot - re-purposed or just Email) */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className={styles.profileInput}
                />
              </div>

              {/* Connection Type */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Connection Type</label>
                <input
                  type="text"
                  value={user.connectionType}
                  disabled
                  className={styles.profileInput}
                />
              </div>

              {/* Phone (Placeholder if not exists) */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Phone Number</label>
                <input
                  type="text"
                  value={user.phone || '+91 98765 43210'}
                  disabled
                  className={styles.profileInput}
                />
              </div>

              {/* Full Address - House */}
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.profileInputLabel}>House No / Street</label>
                <input
                  type="text"
                  placeholder={user.address?.house || 'Enter House No'}
                  value={newAddress.house}
                  onChange={(e) => setNewAddress({ ...newAddress, house: e.target.value })}
                  className={styles.profileInput}
                />
              </div>

              {/* City */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>City</label>
                <input
                  type="text"
                  placeholder={user.address?.city || 'Enter City'}
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className={styles.profileInput}
                />
              </div>

              {/* Pincode */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Zip / Postal Code</label>
                <input
                  type="text"
                  placeholder={user.address?.pincode || 'Enter Pincode'}
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  className={styles.profileInput}
                />
              </div>

              {/* Country (Static) */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Country</label>
                <select className={styles.profileInput} style={{ appearance: 'auto' }} disabled>
                  <option>India</option>
                </select>
              </div>

              {/* Language (Static) */}
              <div className={styles.inputGroup}>
                <label className={styles.profileInputLabel}>Language</label>
                <select className={styles.profileInput} style={{ appearance: 'auto' }}>
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </div>

              {/* Bio (Static Placeholder to match design) */}
              <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                <label className={styles.profileInputLabel}>Bio</label>
                <textarea
                  className={styles.profileInput}
                  rows="3"
                  placeholder="Tell us a little about yourself..."
                  style={{ resize: 'vertical' }}
                ></textarea>
              </div>

            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className={`${styles.actionButton} ${styles.btnSecondary}`} onClick={() => window.location.reload()}>Cancel</button>
              <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={handleUpdateUser} style={{ padding: '0.6rem 1.5rem' }}>Save Changes</button>
            </div>
          </div>
        )}

        {selectedOption === 'bookings' && user.connectionType === 'Cylinder' && (
          <>
            <div className={styles.card}>
              <h3 className={styles.headings} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Request Refill</h3>

              <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.profileInputLabel}>Select Item</label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className={styles.modernInput}
                >
                  <option value="">Select Cylinder Type</option>
                  {inventory.map((item) => (
                    <option key={item._id} value={item.item}>
                      {item.item} (₹{item.sellingPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup} style={{ marginBottom: '2rem' }}>
                <label className={styles.profileInputLabel}>Booking Date</label>
                <input
                  type="date"
                  value={newBookingDate}
                  onChange={(e) => setNewBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={styles.modernInput}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={handleCreateBooking} style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
                  Book Now
                </button>
              </div>
            </div>

            <h3 className={styles.headings} style={{ marginTop: '2rem' }}>Booking History</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Delivery Date</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{new Date(booking.bookedOn).toLocaleDateString()}</td>
                    <td>{booking.item}</td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>{booking.deliveryDate ? new Date(booking.deliveryDate).toLocaleDateString() : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {
          selectedOption === 'readings' && user.connectionType === 'Pipeline' && (
            <>
              <h3 className={styles.headings}>Pipeline Dashboard</h3>

              {pipelineEstimates && (
                <>
                  <h4 className={styles.subHeadings} style={{ marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Estimates & Projections</h4>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>⚡</div>
                      <div className={styles.statLabel}>Avg. Monthly Usage</div>
                      <div className={styles.statValue}>{pipelineEstimates.avgUsage} Units</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>📅</div>
                      <div className={styles.statLabel}>Est. Monthly Bill</div>
                      <div className={styles.statValue}>₹{pipelineEstimates.estimatedBill}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🏷️</div>
                      <div className={styles.statLabel}>Current Unit Rate</div>
                      <div className={styles.statValue}>₹{pipelineEstimates.unitRate}/unit</div>
                    </div>
                  </div>

                  <h4 className={styles.subHeadings} style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Costs & Billing Summary</h4>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>💰</div>
                      <div className={styles.statLabel}>Total Paid</div>
                      <div className={styles.statValue} style={{ color: '#27ae60' }}>₹{pipelineEstimates.totalPaid}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>⚠️</div>
                      <div className={styles.statLabel}>Total Unpaid</div>
                      <div className={styles.statValue} style={{ color: '#e67e22' }}>₹{pipelineEstimates.totalUnpaid}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🚫</div>
                      <div className={styles.statLabel}>Total Penalties</div>
                      <div className={styles.statValue} style={{ color: '#c0392b' }}>₹{pipelineEstimates.totalPenalty}</div>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.card}>
                <h3 className={styles.headings} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Submit Meter Reading</h3>
                <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.95rem' }}>
                  Click the button below to automatically generate and submit the current meter reading.
                </p>
                <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                  <label className={styles.profileInputLabel}>Reading Date</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString()}
                    disabled
                    className={styles.modernInput}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button className={`${styles.actionButton} ${styles.btnPrimary}`} onClick={handleSubmitReading} style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
                    Generate & Submit Reading
                  </button>
                </div>
              </div>

              <h4 className={styles.subHeadings} style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Metered Usage History</h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reading</th>
                    <th>Usage</th>
                    <th>Cost (₹)</th>
                    <th>Penalty</th>
                    <th>Total</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {meterReadings.map((reading) => {
                    const isOverdue = reading.status === 'Unpaid' && new Date() > new Date(reading.dueDate);
                    const totalAmount = reading.cost + (reading.penalty || 0);
                    return (
                      <tr key={reading._id}>
                        <td>{new Date(reading.readingDate).toLocaleDateString()}</td>
                        <td>{reading.readingValue}</td>
                        <td>{reading.usage}</td>
                        <td>{reading.cost}</td>
                        <td style={{ color: '#e74c3c' }}>{reading.penalty > 0 ? `+₹${reading.penalty}` : '-'}</td>
                        <td><strong>₹{totalAmount}</strong></td>
                        <td style={{ color: isOverdue ? '#e74c3c' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                          {reading.dueDate ? new Date(reading.dueDate).toLocaleDateString() : 'N/A'}
                          {isOverdue && <span style={{ fontSize: '0.7em', marginLeft: '5px' }}>(Overdue)</span>}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${reading.status === 'Paid' ? styles.badgeSuccess : (reading.status === 'Refunded' ? styles.badgeInfo : (isOverdue ? styles.badgeDanger : styles.badgeWarning))}`}>
                            {reading.status}
                          </span>
                        </td>
                        <td>
                          {reading.status === 'Unpaid' && (
                            <button
                              className={styles.button}
                              style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#27ae60' }}
                              onClick={() => handlePayment(reading._id, totalAmount)}
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>


            </>
          )
        }

        {
          selectedOption === 'transactions' && (
            <>
              <h3 className={styles.headings}>Transaction History</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    {user.type === 'admin' && <th>User</th>}
                    {user.type === 'admin' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td>{new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}</td>
                      <td>
                        <span className={`${styles.badge} ${transaction.type === 'Payment' ? styles.badgeSuccess : (transaction.type === 'Refund' ? styles.badgeInfo : styles.badgeDanger)}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>₹{transaction.amount}</td>
                      <td>{transaction.status}</td>
                      {user.type === 'admin' && <td>{transaction.user?.username || 'Unknown'}</td>}
                      {user.type === 'admin' && (
                        <td>
                          {transaction.type === 'Payment' && transaction.status === 'Success' && (
                            <button
                              className={styles.button}
                              style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: '#e74c3c' }}
                              onClick={() => handleRefund(transaction._id)}
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        }

        {
          selectedOption === 'manageUsers' && user.type === 'admin' && (
            <>
              <h3 className={styles.headings}>Manage Users:</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Address (House, City, Pin)</th>
                    <th>Connection Type</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                          <input
                            type="text"
                            placeholder="House"
                            value={u.address?.house || ''}
                            onChange={(e) => handleAdminUpdateUser(u._id, 'address', { ...u.address, house: e.target.value })}
                            className={styles.input}
                            style={{ padding: '0.2rem', fontSize: '0.8rem' }}
                          />
                          <input
                            type="text"
                            placeholder="City"
                            value={u.address?.city || ''}
                            onChange={(e) => handleAdminUpdateUser(u._id, 'address', { ...u.address, city: e.target.value })}
                            className={styles.input}
                            style={{ padding: '0.2rem', fontSize: '0.8rem' }}
                          />
                          <input
                            type="text"
                            placeholder="Pin"
                            value={u.address?.pincode || ''}
                            onChange={(e) => handleAdminUpdateUser(u._id, 'address', { ...u.address, pincode: e.target.value })}
                            className={styles.input}
                            style={{ padding: '0.2rem', fontSize: '0.8rem' }}
                          />
                        </div>
                      </td>
                      <td>
                        <select
                          value={u.connectionType || 'Cylinder'}
                          onChange={(e) => handleAdminUpdateUser(u._id, 'connectionType', e.target.value)}
                          className={styles.select}
                        >
                          <option value="Cylinder">Cylinder</option>
                          <option value="Pipeline">Pipeline</option>
                        </select>
                      </td>
                      <td>{u.type}</td>
                      <td>
                        <select
                          value={u.type}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className={styles.select}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        }

        {
          selectedOption === 'manageBookings' && user.type === 'admin' && (
            <>
              <div className={styles.filterContainer}>
                <h3 className={styles.headings} style={{ marginBottom: 0 }}>Manage Refills:</h3>
                <select
                  className={styles.filterSelect}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Booked On</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredBookings(allBookings).map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.user.username}</td>
                      <td>{new Date(booking.bookedOn).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.badge} ${getStatusBadgeClass(booking.status || (booking.delivered ? 'Delivered' : 'Pending'))}`}>
                          {booking.status || (booking.delivered ? 'Delivered' : 'Pending')}
                        </span>
                      </td>
                      <td>
                        <select
                          value={booking.status || (booking.delivered ? 'Delivered' : 'Pending')}
                          onChange={(e) => handleBookingStatusChange(booking._id, e.target.value)}
                          className={styles.select}
                          style={{ padding: '0.2rem', fontSize: '0.9rem' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        }
        {
          selectedOption === 'analytics' && user.type === 'admin' && (
            <>
              <h3 className={styles.headings}>Analytics</h3>

              {/* Side-by-Side Charts Container */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

                {/* Chart 1: Cylinder Bookings */}
                <div className={styles.card} style={{ height: '400px', padding: '1rem', marginBottom: 0 }}>
                  <h4 style={{ marginBottom: '1rem', color: '#e67e22' }}>Cylinder Booking Trends</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analyticsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(str) => {
                          if (!str) return '';
                          const date = new Date(str);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        label={{ value: 'Bookings', angle: -90, position: 'insideLeft', fill: '#e67e22' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [value, 'Bookings']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="cylinder" name="Cylinder Bookings" stroke="#e67e22" activeDot={{ r: 8 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 2: Pipeline Usage */}
                <div className={styles.card} style={{ height: '400px', padding: '1rem', marginBottom: 0 }}>
                  <h4 style={{ marginBottom: '1rem', color: '#3498db' }}>Pipeline Usage Trends</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={analyticsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(str) => {
                          if (!str) return '';
                          const date = new Date(str);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        label={{ value: 'Usage (Units)', angle: -90, position: 'insideLeft', fill: '#3498db' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [value, 'Units']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="pipeline" name="Pipeline Usage" stroke="#3498db" activeDot={{ r: 8 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Predicted Usage */}
              <div className={styles.card} style={{ height: '400px', padding: '1rem', marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                <h4 style={{ marginBottom: '1rem', color: '#9b59b6' }}>Predicted Pipeline Usage (Next 7 Days)</h4>
                {predictionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={predictionData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(str) => {
                          if (!str) return '';
                          const date = new Date(str);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        label={{ value: 'Predicted Units', angle: -90, position: 'insideLeft', fill: '#9b59b6' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [value, 'Units']}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="predictedUsage" name="Forecasted Usage" stroke="#9b59b6" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    Insufficient usage history to generate predictions.
                  </div>
                )}
              </div>
            </>
          )
        }
        {
          false && user.type === 'admin' && (
            <>

              {/* Pipeline Section */}
              <div className={styles.statCard} style={{ display: 'block', marginBottom: '2rem' }}>
                <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#3498db' }}>Pipeline Usage by Area</h4>
                <div className={styles.chartContainer}>
                  {usageStats.stats && usageStats.stats.pipeline && Object.keys(usageStats.stats.pipeline).length > 0 ? (
                    Object.entries(usageStats.stats.pipeline).map(([area, stats]) => {
                      const maxUsage = Math.max(...Object.values(usageStats.stats.pipeline).map(s => s.totalUsage), 1);
                      const percentage = (stats.totalUsage / maxUsage) * 100;
                      return (
                        <div key={area} className={styles.chartRow}>
                          <div className={styles.chartLabel}>{area}</div>
                          <div className={styles.chartBarArea}>
                            <div
                              className={styles.chartBar}
                              style={{ width: `${percentage}%`, backgroundColor: '#3498db' }}
                            >
                              {percentage > 20 && <span className={styles.barValue}>{stats.totalUsage} units</span>}
                            </div>
                          </div>
                          {percentage <= 20 && <span className={styles.barValueOutside}>{stats.totalUsage} units</span>}
                        </div>
                      );
                    })
                  ) : (
                    <p>No Pipeline data available</p>
                  )}
                </div>
              </div>

              {/* Cylinder Section */}
              <div className={styles.statCard} style={{ display: 'block' }}>
                <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#e67e22' }}>Cylinder Bookings by Area</h4>
                <div className={styles.chartContainer}>
                  {usageStats.stats && usageStats.stats.cylinder && Object.keys(usageStats.stats.cylinder).length > 0 ? (
                    Object.entries(usageStats.stats.cylinder).map(([area, stats]) => {
                      const maxBookings = Math.max(...Object.values(usageStats.stats.cylinder).map(s => s.totalBookings), 1);
                      const percentage = (stats.totalBookings / maxBookings) * 100;
                      return (
                        <div key={area} className={styles.chartRow}>
                          <div className={styles.chartLabel}>{area}</div>
                          <div className={styles.chartBarArea}>
                            <div
                              className={styles.chartBar}
                              style={{ width: `${percentage}%`, backgroundColor: '#e67e22' }}
                            >
                              {percentage > 20 && <span className={styles.barValue}>{stats.totalBookings} bookings</span>}
                            </div>
                          </div>
                          {percentage <= 20 && <span className={styles.barValueOutside}>{stats.totalBookings} bookings</span>}
                        </div>
                      );
                    })
                  ) : (
                    <p>No Cylinder data available</p>
                  )}
                </div>
              </div>
            </>
          )
        }

        {
          selectedOption === 'inventory' && user.type === 'admin' && (
            <>
              <h3 className={styles.headings}>Inventory Management</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {inventory.map((item) => (
                  <div key={item._id} className={styles.statCard} style={{ display: 'block', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>{item.item}</h4>
                      <button
                        className={styles.button}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', margin: 0 }}
                        onClick={() => startEditing(item)}
                      >
                        Edit
                      </button>
                    </div>

                    {editingItem === item.item ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.8rem' }}>Stock:</label>
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                          className={styles.input}
                          style={{ padding: '0.2rem' }}
                        />
                        <label style={{ fontSize: '0.8rem' }}>Cost Price:</label>
                        <input
                          type="number"
                          value={editForm.costPrice}
                          onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                          className={styles.input}
                          style={{ padding: '0.2rem' }}
                        />
                        <label style={{ fontSize: '0.8rem' }}>Selling Price:</label>
                        <input
                          type="number"
                          value={editForm.sellingPrice}
                          onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                          className={styles.input}
                          style={{ padding: '0.2rem' }}
                        />
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          <button className={styles.button} onClick={() => handleUpdateInventory(item.item)} style={{ margin: 0, padding: '0.3rem', fontSize: '0.8rem' }}>Save</button>
                          <button className={styles.button} onClick={() => setEditingItem(null)} style={{ margin: 0, padding: '0.3rem', fontSize: '0.8rem', background: '#95a5a6' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p><strong>Stock:</strong> {item.quantity}</p>
                        <p><strong>Cost Price:</strong> ₹{item.costPrice}</p>
                        <p><strong>Selling Price:</strong> ₹{item.sellingPrice}</p>
                        <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>Last Updated: {new Date(item.lastUpdated).toLocaleDateString()}</p>
                      </>
                    )}
                  </div>
                ))}
                {inventory.length === 0 && <p>No inventory items found. Please initialize via API or DB.</p>}
              </div>
            </>
          )
        }

        {
          selectedOption === 'overview' && user.type === 'admin' && (
            <>
              <h3 className={styles.headings}>Financial Overview</h3>
              {
                financials && (
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>💰</div>
                      <div className={styles.statLabel}>Total Revenue</div>
                      <div className={styles.statValue}>₹{financials.totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>📉</div>
                      <div className={styles.statLabel}>Total Cost</div>
                      <div className={styles.statValue}>₹{financials.totalCost.toLocaleString()}</div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>⚠️</div>
                      <div className={styles.statLabel}>Pending Dues</div>
                      <div className={styles.statValue}>₹{financials.totalDues.toLocaleString()}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>💸</div>
                      <div className={styles.statLabel}>Total Refunds</div>
                      <div className={styles.statValue}>₹{financials.breakdown.refunds.toLocaleString()}</div>
                    </div>
                  </div>
                )
              }

              <h3 className={styles.headings} style={{ marginTop: '2rem' }}>Usage by Area</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div className={styles.statCard} style={{ display: 'block' }}>
                  <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>By City</h4>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>City</th>
                        <th>Users</th>
                        <th>Total Usage</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(usageStats.cityStats || {}).map(([city, stats]) => {
                        const maxUsage = Math.max(...Object.values(usageStats.cityStats || {}).map(s => s.totalUsage), 1);
                        const percentage = (stats.totalUsage / maxUsage) * 100;
                        return (
                          <tr key={city}>
                            <td>{city}</td>
                            <td>{stats.count}</td>
                            <td style={{ minWidth: '200px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.totalUsage} units</span>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  backgroundColor: '#ecf0f1',
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: '#3498db',
                                    borderRadius: '3px',
                                    transition: 'width 0.5s ease-in-out'
                                  }}></div>
                                </div>
                              </div>
                            </td>
                            <td>₹{stats.totalCost.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className={styles.statCard} style={{ display: 'block' }}>
                  <h4 className={styles.headings} style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>By Pin Code</h4>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Pin Code</th>
                        <th>Users</th>
                        <th>Total Usage</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(usageStats.pincodeStats || {}).map(([pincode, stats]) => {
                        const maxUsage = Math.max(...Object.values(usageStats.pincodeStats || {}).map(s => s.totalUsage), 1);
                        const percentage = (stats.totalUsage / maxUsage) * 100;
                        return (
                          <tr key={pincode}>
                            <td>{pincode}</td>
                            <td>{stats.count}</td>
                            <td style={{ minWidth: '200px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.totalUsage} units</span>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  backgroundColor: '#ecf0f1',
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${percentage}%`,
                                    height: '100%',
                                    backgroundColor: '#2ecc71',
                                    borderRadius: '3px',
                                    transition: 'width 0.5s ease-in-out'
                                  }}></div>
                                </div>
                              </div>
                            </td>
                            <td>₹{stats.totalCost.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        }
      </div>
    </div>
  );
}