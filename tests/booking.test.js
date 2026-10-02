const { createLoggedInUser, loginAsAdmin } = require("./helpers/authHelper");
const {
  bookingBody, createBooking, cancelBooking, getSlots,
} = require("./helpers/bookingHelper");
const { uniqueDate, ids } = require("./helpers/testData");
const api = require("./helpers/client");

describe("Booking API: POST /api/bookings and /api/bookings/:id/cancel", () => {
  let alice, bob, admin;

  beforeAll(async () => {
    alice = await createLoggedInUser();
    bob = await createLoggedInUser();
    admin = await loginAsAdmin();
  });

  describe("Create booking", () => {
    test("creates a booking (201) with correct data", async () => {
      const date = uniqueDate();
      const res = await createBooking(alice.token, bookingBody({ date }));
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Booking created successfully");
      expect(res.body.booking).toMatchObject({
        salonId: ids.salon,
        stylistId: ids.stylist1,
        serviceId: ids.service30,
        customerId: alice.userId,
        date,
        startTime: "10:00",
        endTime: "10:30",
        status: "booked",
      });
    });

    test("end time is start + service duration (60 min)", async () => {
      const res = await createBooking(
        alice.token,
        bookingBody({ date: uniqueDate(), serviceId: ids.service60, slotTime: "11:00" })
      );
      expect(res.status).toBe(201);
      expect(res.body.booking.endTime).toBe("12:00");
    });

    test("rejects request without token (401)", async () => {
      const res = await api.post("/api/bookings").send(bookingBody({ date: uniqueDate() }));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authentication required");
    });

    test("rejects invalid token (401)", async () => {
      const res = await createBooking("faketoken", bookingBody({ date: uniqueDate() }));
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token");
    });

    test("rejects tampered token (401)", async () => {
      const res = await createBooking(alice.token + "x", bookingBody({ date: uniqueDate() }));
      expect(res.status).toBe(401);
    });

    test("rejects missing date (400)", async () => {
      const res = await createBooking(alice.token, bookingBody());
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("date is required");
    });

    test("rejects unknown service (404)", async () => {
      const res = await createBooking(
        alice.token,
        bookingBody({ date: uniqueDate(), serviceId: "6abe5fbce282fbd1efb78699" })
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Service not found");
    });

    test.failing("rejects missing slotTime with a 4xx, not 500 (validation)", async () => {
      const res = await createBooking(
        alice.token,
        bookingBody({ date: uniqueDate(), slotTime: undefined })
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    test.failing("rejects malformed serviceId with a 4xx, not 500 (validation)", async () => {
      const res = await createBooking(
        alice.token,
        bookingBody({ date: uniqueDate(), serviceId: "bad-id" })
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe("Double booking rules", () => {
    test("same stylist, same slot is rejected (400)", async () => {
      const date = uniqueDate();
      const first = await createBooking(alice.token, bookingBody({ date }));
      expect(first.status).toBe(201);
      const second = await createBooking(bob.token, bookingBody({ date }));
      expect(second.status).toBe(400);
      expect(second.body.error).toBe("Time slot is no longer available");
    });

    test("overlapping slot is rejected (60 min at 09:00 blocks 09:30)", async () => {
      const date = uniqueDate();
      await createBooking(alice.token, bookingBody({ date, serviceId: ids.service60, slotTime: "09:00" }));
      const res = await createBooking(bob.token, bookingBody({ date, slotTime: "09:30" }));
      expect(res.status).toBe(400);
    });

    test("back-to-back slot is allowed (09:00-09:30 then 09:30)", async () => {
      const date = uniqueDate();
      await createBooking(alice.token, bookingBody({ date, slotTime: "09:00" }));
      const res = await createBooking(bob.token, bookingBody({ date, slotTime: "09:30" }));
      expect(res.status).toBe(201);
    });

    test("a different stylist can take the same time (201)", async () => {
      const date = uniqueDate();
      await createBooking(alice.token, bookingBody({ date }));
      const res = await createBooking(bob.token, bookingBody({ date, stylistId: ids.stylist2 }));
      expect(res.status).toBe(201);
    });
  });

  describe("Booking and availability together", () => {
    test("a booked slot disappears from available slots", async () => {
      const date = uniqueDate();
      await createBooking(alice.token, bookingBody({ date, slotTime: "10:00" }));
      const res = await getSlots(date, ids.service30);
      const taken = res.body.availableSlots.filter(
        (s) => s.time === "10:00" && s.stylistId === ids.stylist1
      );
      expect(taken).toHaveLength(0);
    });
  });

  describe("Cancel booking", () => {
    test("owner can cancel (200)", async () => {
      const date = uniqueDate();
      const created = await createBooking(alice.token, bookingBody({ date }));
      const res = await cancelBooking(alice.token, created.body.booking._id);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Booking cancelled successfully");
    });

    test("cancelled slot becomes available again", async () => {
      const date = uniqueDate();
      const created = await createBooking(alice.token, bookingBody({ date, slotTime: "14:00" }));
      await cancelBooking(alice.token, created.body.booking._id);
      const res = await getSlots(date, ids.service30);
      const back = res.body.availableSlots.filter(
        (s) => s.time === "14:00" && s.stylistId === ids.stylist1
      );
      expect(back).toHaveLength(1);
    });

    test("cancelling twice returns 400", async () => {
      const created = await createBooking(alice.token, bookingBody({ date: uniqueDate() }));
      await cancelBooking(alice.token, created.body.booking._id);
      const res = await cancelBooking(alice.token, created.body.booking._id);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Booking is already cancelled");
    });

    test("another customer cannot cancel it (403)", async () => {
      const created = await createBooking(alice.token, bookingBody({ date: uniqueDate() }));
      const res = await cancelBooking(bob.token, created.body.booking._id);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Not authorized to cancel this booking");
    });

    test("admin can cancel any booking (200)", async () => {
      const created = await createBooking(alice.token, bookingBody({ date: uniqueDate() }));
      const res = await cancelBooking(admin.token, created.body.booking._id);
      expect(res.status).toBe(200);
    });

    test("cancel without token returns 401", async () => {
      const created = await createBooking(alice.token, bookingBody({ date: uniqueDate() }));
      const res = await api.post(`/api/bookings/${created.body.booking._id}/cancel`);
      expect(res.status).toBe(401);
    });

    test("unknown booking id returns 404", async () => {
      const res = await cancelBooking(alice.token, "6abe5fbce282fbd1efb78699");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Booking not found");
    });

    test.failing("malformed booking id returns a 4xx, not 500 (validation)", async () => {
      const res = await cancelBooking(alice.token, "not-an-id");
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });
});

