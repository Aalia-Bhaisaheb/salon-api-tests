const { newUser, uniqueDate, ids } = require("./helpers/testData");
const { register, login } = require("./helpers/authHelper");
const {
  getSlots, bookingBody, createBooking, cancelBooking,
} = require("./helpers/bookingHelper");

describe("E2E: Register -> Login -> Check slots -> Book -> Cancel", () => {
  const user = newUser();
  const date = uniqueDate();
  let token, userId, chosenSlot, bookingId;

  test("1. register a new customer", async () => {
    const res = await register(user);
    expect(res.status).toBe(201);
  });

  test("2. login and receive a token", async () => {
    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("customer");
    token = res.body.token;
    userId = res.body.userId;
    expect(token).toBeDefined();
  });

  test("3. check available slots and pick one", async () => {
    const res = await getSlots(date, ids.service30);
    expect(res.status).toBe(200);
    expect(res.body.availableSlots.length).toBeGreaterThan(0);
    chosenSlot = res.body.availableSlots[0];
  });

  test("4. book the chosen slot", async () => {
    const res = await createBooking(
      token,
      bookingBody({ date, slotTime: chosenSlot.time, stylistId: chosenSlot.stylistId })
    );
    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe("booked");
    expect(res.body.booking.customerId).toBe(userId);
    bookingId = res.body.booking._id;
  });

  test("5. the slot is no longer available", async () => {
    const res = await getSlots(date, ids.service30);
    const still = res.body.availableSlots.filter(
      (s) => s.time === chosenSlot.time && s.stylistId === chosenSlot.stylistId
    );
    expect(still).toHaveLength(0);
  });

  test("6. cancel the booking", async () => {
    const res = await cancelBooking(token, bookingId);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Booking cancelled successfully");
  });

  test("7. the slot is available again", async () => {
    const res = await getSlots(date, ids.service30);
    const back = res.body.availableSlots.filter(
      (s) => s.time === chosenSlot.time && s.stylistId === chosenSlot.stylistId
    );
    expect(back).toHaveLength(1);
  });

  test("8. cancelling again is rejected (400)", async () => {
    const res = await cancelBooking(token, bookingId);
    expect(res.status).toBe(400);
  });
});

