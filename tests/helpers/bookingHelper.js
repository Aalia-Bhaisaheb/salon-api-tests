const api = require("./client");
const { ids } = require("./testData");
const { bearer } = require("./authHelper");

exports.getSlots = (date, serviceId = ids.service30, salonId = ids.salon) =>
  api.get(`/api/salons/${salonId}/available-slots`).query({ date, serviceId });

exports.bookingBody = (overrides = {}) => ({
  salonId: ids.salon,
  stylistId: ids.stylist1,
  serviceId: ids.service30,
  slotTime: "10:00",
  date: undefined, // always pass a date from uniqueDate()
  ...overrides,
});

exports.createBooking = (token, body) =>
  api.post("/api/bookings").set(bearer(token)).send(body);

exports.cancelBooking = (token, bookingId) =>
  api.post(`/api/bookings/${bookingId}/cancel`).set(bearer(token));
