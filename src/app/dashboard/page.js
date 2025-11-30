'use client';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import CustomAlert from '../CustomAlert';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newBookingDate, setNewBookingDate] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newAddress, setNewAddress] = useState({ house: '', city: '', pincode: '' });
  const [selectedOption, setSelectedOption] = useState('personalInfo');
  const [usageStats, setUsageStats] = useState({ cityStats: {}, pincodeStats: {} });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pipeline State
  const [meterReadings, setMeterReadings] = useState([]);
  const [newReadingValue, setNewReadingValue] = useState('');
  const [readingDate, setReadingDate] = useState('');

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
        localStorage.removeItem('token'); // Clear invalid token
        router.push('/login');
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setAllBookings(data.allBookings);

      if (data.user.type === 'admin') {
        const usersRes = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData = await usersRes.json();
        setAllUsers(usersData.users);

        // Fetch Admin Transactions
        const transactionsRes = await fetch('/api/payments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData.transactions || []);

        // Fetch Usage Stats
        const statsRes = await fetch('/api/analytics/usage-by-area', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        setUsageStats(statsData);

        // Fetch Inventory
        const inventoryRes = await fetch('/api/inventory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.inventory || []);

        // Fetch Financials
        const financialsRes = await fetch('/api/analytics/financials', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const financialsData = await financialsRes.json();
        setFinancials(financialsData.financials);

      } else if (data.user.connectionType === 'Pipeline') {
        const readingsRes = await fetch('/api/meter-readings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const readingsData = await readingsRes.json();
        setMeterReadings(readingsData.readings);

        // Fetch User Transactions
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

    const token = localStorage.getItem('token');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookedOn: newBookingDate }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser((prevUser) => ({
        ...prevUser,
        bookings: [...prevUser.bookings, data.booking],
      }));
      setNewBookingDate('');
      setAlertMessage('Refill requested successfully!');
      setShowAlert(true);
    }
  };

  const handleSubmitReading = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/meter-readings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ readingValue: Number(newReadingValue), readingDate: readingDate }),
    });

    if (res.ok) {
      const data = await res.json();
      setMeterReadings([data.reading, ...meterReadings]);
      setNewReadingValue('');
      setReadingDate('');
      setAlertMessage('Meter reading submitted successfully!');
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
        const myBookings = user.bookings || [];
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Delivered': return styles.badgeSuccess;
      case 'Cancelled': return styles.badgeDanger;
      case 'Pending': return styles.badgeWarning;
      default: return styles.badgeInfo; // Confirmed, Out for Delivery
    }
  };

  if (!user) return <h1>Loading...</h1>;
  const stats = getStats();

  return (
    <div className={styles.container}>
      {showAlert && <CustomAlert message={alertMessage} onClose={() => setShowAlert(false)} />}
      <nav className={styles.navbar}>
        <div className={styles.logo}>Gas Agency</div>
        <ul className={styles.navLinks}>
          <li className={styles.navItem} onClick={handleLogout}>Logout</li>
        </ul>
      </nav>
      <div className={styles.sidebar}>
        {user.type !== 'admin' && (
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
        {user.type === 'admin' && (
          <>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('manageUsers')}>Manage Users</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('manageBookings')}>Manage Refills</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('transactions')}>Transactions</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('analytics')}>Analytics</button>
            <button className={styles.sidebarButton} onClick={() => setSelectedOption('inventory')}>Inventory & Finance</button>
          </>
        )}
      </div>
      <div className={styles.content}>
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statLabel}>{stat.label}</div>
              <div className={styles.statValue}>{stat.value}</div>
            </div>
          ))}
        </div>

        {selectedOption === 'personalInfo' && (
          <>
            <h2 className={styles.headings}>Welcome, {user.username}</h2>
            <table className={styles.invisibleTable}>
              <tbody>
                <tr>
                  <td><strong>Username:</strong></td>
                  <td>{user.username}</td>
                </tr>
                <tr>
                  <td><strong>Email:</strong></td>
                  <td>{user.email}</td>
                </tr>
                <tr>
                  <td><strong>Address:</strong></td>
                  <td>
                    {user.address && typeof user.address === 'object'
                      ? `${user.address.house}, ${user.address.city} - ${user.address.pincode}`
                      : user.address}
                  </td>
                </tr>
                <tr>
                  <td><strong>Connection Type:</strong></td>
                  <td><span className={styles.badge} style={{ background: '#667eea', color: 'white' }}>{user.connectionType}</span></td>
                </tr>
              </tbody>
            </table>
            <div className={styles.form}>
              <h3 className={styles.headings}>Update Your Information</h3>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="New Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>House / Flat No.</label>
                <input
                  type="text"
                  placeholder="House No."
                  value={newAddress.house}
                  onChange={(e) => setNewAddress({ ...newAddress, house: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>City</label>
                <input
                  type="text"
                  placeholder="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>Pin Code</label>
                <input
                  type="text"
                  placeholder="Pin Code"
                  value={newAddress.pincode}
                  onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  className={styles.input}
                />
              </div>
              <button className={styles.button} onClick={handleUpdateUser}>Update</button>
            </div>
          </>
        )}
        {selectedOption === 'bookings' && (
          <>
            <div className={styles.filterContainer}>
              <h3 className={styles.headings} style={{ marginBottom: 0 }}>Your Refills:</h3>
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
                  <th>Booked On</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredBookings(user.bookings).map((booking) => (
                  <tr key={booking._id}>
                    <td>{new Date(booking.bookedOn).toLocaleDateString()}</td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(booking.status || (booking.delivered ? 'Delivered' : 'Pending'))}`}>
                        {booking.status || (booking.delivered ? 'Delivered' : 'Pending')}
                      </span>
                    </td>
                    <td>
                      <button className={styles.button} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', marginBottom: 0 }}>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.form} style={{ marginTop: '2rem' }}>
              <h3 className={styles.headings}>Request New Refill</h3>
              <input
                type="date"
                value={newBookingDate}
                onChange={(e) => setNewBookingDate(e.target.value)}
                className={styles.input}
                style={{ marginBottom: '0.5rem' }}
              />
              <button className={styles.button} onClick={handleCreateBooking}>Request Refill</button>
            </div>
          </>
        )}

        {selectedOption === 'readings' && user.connectionType === 'Pipeline' && (
          <>
            <h3 className={styles.headings}>Meter Readings & Usage</h3>
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

            <div className={styles.form} style={{ marginTop: '2rem' }}>
              <h3 className={styles.headings}>Submit Meter Reading</h3>
              <div className={styles.inputGroup}>
                <label style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>Reading Date</label>
                <input
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>Reading Value</label>
                <input
                  type="number"
                  placeholder="Enter current meter reading"
                  value={newReadingValue}
                  onChange={(e) => setNewReadingValue(e.target.value)}
                  className={styles.input}
                />
              </div>
              <button className={styles.button} onClick={handleSubmitReading}>Submit Reading</button>
            </div>
          </>
        )}

        {selectedOption === 'transactions' && (
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
        )}

        {selectedOption === 'manageBookings' && (
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
        )}
        {selectedOption === 'manageUsers' && user.type === 'admin' && (
          <>
            <h3 className={styles.headings}>Manage Users:</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Address (House, City, Pin)</th>
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
        )}

        {selectedOption === 'analytics' && user.type === 'admin' && (
          <>
            <h3 className={styles.headings}>Usage Estimation by Area</h3>
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
        )}

        {selectedOption === 'inventory' && user.type === 'admin' && (
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

            <h3 className={styles.headings}>Financial Overview</h3>
            {financials && (
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
                  <div className={styles.statIcon}>📈</div>
                  <div className={styles.statLabel}>Net Profit</div>
                  <div className={styles.statValue} style={{ color: financials.netProfit >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    ₹{financials.netProfit.toLocaleString()}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>⚠️</div>
                  <div className={styles.statLabel}>Pending Dues</div>
                  <div className={styles.statValue}>₹{financials.totalDues.toLocaleString()}</div>
                </div>
              </div>
            )}

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
        )}
      </div>
    </div>
  );
}