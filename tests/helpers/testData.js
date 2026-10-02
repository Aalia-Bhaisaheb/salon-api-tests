const unique = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

exports.newUser = (overrides = {}) => ({
  name: "Test User",
  email: `user_${unique()}@example.com`,
  password: "Password@123",
  ...overrides,
});

// Returns a date string like "2027-03-15" far in the future,
// unique per call so bookings from different tests never clash.
exports.uniqueDate = () => {
  const d = new Date(2027, 0, 1);
  d.setDate(d.getDate() + Math.floor(Math.random() * 3000));
  return d.toISOString().slice(0, 10);
};

exports.ids = {
  salon: process.env.SALON_ID,
  service30: process.env.SERVICE_30_ID,
  service60: process.env.SERVICE_60_ID,
  stylist1: process.env.STYLIST_1_ID,
  stylist2: process.env.STYLIST_2_ID,
};
