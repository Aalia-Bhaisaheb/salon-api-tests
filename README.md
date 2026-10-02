# Salon API Automation (Jest + Supertest)

Automated API tests for the Salon backend: register, login, available slots, create booking and cancel booking.

## Prerequisites
- Node.js 18 or newer (tested on v22.13.0)
- npm
- The Salon backend (assignment repo) running locally
- A MongoDB database (MongoDB Atlas free tier or local MongoDB)

## Dependencies
Installed via `npm install`: `jest`, `supertest`, `dotenv`.

## Environment setup

### 1. Start the Salon backend
In the assignment repo, create a `.env`:

    PORT=3001
    MONGO_URI=<your MongoDB connection string, ending with a database name such as /salon-test>
    JWT_SECRET=<any secret>

Use a fresh database. The seed script deletes all existing data.

Seed the database and note the printed IDs:

    npx tsx utils/seed.ts

Start the backend:

    npm run dev

### 2. Configure the tests
Copy `.env.example` to `.env` (Windows: `copy .env.example .env`).
Replace the IDs with the ones printed by the seed script:

| Variable | Meaning |
|---|---|
| BASE_URL | Backend URL, e.g. http://localhost:3001 |
| SALON_ID | Salon ID from seed output |
| SERVICE_30_ID | "Men Haircut" (30 min) ID |
| SERVICE_60_ID | "Women Hair Coloring" (60 min) ID |
| STYLIST_1_ID / STYLIST_2_ID | Stylist IDs |
| ADMIN_EMAIL / ADMIN_PASSWORD | Seeded admin (admin@salon.com / admin123) |

## Run tests

    npm install
    npm test
    npx jest tests/e2e.test.js --runInBand

## Test configuration
- `jest.config.js`: node environment, 20 s timeout, loads `.env` via dotenv.
- Tests run serially (`--runInBand`) because they share one database.
- No setup/teardown scripts are needed. Every test creates its own data.

## Structure

    tests/
      helpers/
        client.js         Supertest client bound to BASE_URL
        testData.js       Unique users, unique future dates, seeded IDs
        authHelper.js     register, login, createLoggedInUser, loginAsAdmin
        bookingHelper.js  getSlots, createBooking, cancelBooking
      auth.test.js        Register and login (positive and negative)
      slots.test.js       Available slots
      booking.test.js     Booking, double booking, cancel, authorization
      e2e.test.js         Register -> Login -> Slots -> Book -> Cancel

## Test data strategy
- Each run registers new users with unique emails (timestamp + random).
- Each booking test uses a random future date (2027 onward), so tests never collide with each other or with earlier runs.
- Only the seeded salon, services, stylists and admin are shared.

## Coverage
- Authentication: valid and invalid credentials; missing, fake and tampered tokens.
- Authorization: a customer cannot cancel another customer's booking (403), an admin can, and role escalation on register is ignored.
- Business rules: end time = start + duration, same-stylist overlap rejected, back-to-back allowed, different stylist allowed, slots disappear when booked and return when cancelled, opening hours respected, double cancel rejected.

## Known bugs found in the application
These 7 tests are marked `test.failing`. They document real defects: the app returns 500 instead of a 4xx. They show as passing while the bug exists, and will turn red once the app is fixed, which is the signal to change them to `test`:
1. Register with an empty body
2. Register without a password
3. Login without a password
4. Create booking without `slotTime`
5. Create booking with a malformed `serviceId`
6. Cancel with a malformed booking ID
7. Available slots with a malformed salon ID

Cause: no input validation, and Mongoose cast errors are not handled.

## Assumptions
- Backend runs on port 3001 (port 3000 may be taken).
- The database was seeded with `utils/seed.ts` before running.
- Slots are listed for all stylists, because the app does not link stylists to a salon.
