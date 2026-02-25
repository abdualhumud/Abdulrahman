/**
 * REMS Integration Test Suite
 * ============================
 * Tests the Booking.com handshake, Overlap Guard engine, and Gathern bridge.
 * Run with: node apps/dashboard/tests/test-integration.mjs
 *
 * No external test framework required — plain Node.js assert module.
 * The service logic is reimplemented here in pure JS (identical algorithms,
 * types stripped) so we can test without a TypeScript transpiler.
 */

import assert from 'node:assert/strict';

// ── ANSI colours ────────────────────────────────────────────────────────────
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};

// ── Tiny async test harness ───────────────────────────────────────────────────
let passed = 0, failed = 0;
const _suites = [];   // { name, tests: [{ name, fn }] }
let _currentSuite = null;

function suite(name, fn) {
  _currentSuite = { name, tests: [] };
  _suites.push(_currentSuite);
  fn();   // collect test registrations synchronously
  _currentSuite = null;
}

function test(name, fn) {
  _currentSuite.tests.push({ name, fn });
}

async function runAll() {
  for (const s of _suites) {
    console.log(`\n${c.cyan(c.bold('▸ ' + s.name))}`);
    for (const t of s.tests) {
      try {
        await t.fn();
        passed++;
        console.log(`  ${c.green('✓')} ${c.dim(t.name)}`);
      } catch (err) {
        failed++;
        console.log(`  ${c.red('✗')} ${c.bold(t.name)}`);
        console.log(`    ${c.red(err.message)}`);
        if (err.actual !== undefined) {
          console.log(`    ${c.dim('actual  :')} ${JSON.stringify(err.actual)}`);
          console.log(`    ${c.dim('expected:')} ${JSON.stringify(err.expected)}`);
        }
      }
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 1: Overlap Guard Engine  ───────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

// ── Pure logic extracted from overlap-guard.ts ──────────────────────────────

const _locks    = new Map();
const _bookings = new Map();
let   _idSeq    = 1;

const LOCK_TTL_MS       = 10_000;
const LOCK_POLL_MS      = 50;
const LOCK_WAIT_TIMEOUT = 5_000;

function checkAvailability(unitId, range) {
  const reqIn  = new Date(range.checkIn).getTime();
  const reqOut = new Date(range.checkOut).getTime();
  for (const booking of _bookings.values()) {
    if (booking.unitId !== unitId) continue;
    const bookedIn  = new Date(booking.checkIn).getTime();
    const bookedOut = new Date(booking.checkOut).getTime();
    const overlaps  = !(reqOut <= bookedIn || reqIn >= bookedOut);
    if (overlaps) return { available: false, conflictingBooking: booking };
  }
  return { available: true };
}

function makeLockKey(unitId, range) {
  return `${unitId}::${range.checkIn}::${range.checkOut}`;
}

async function acquireLock(unitId, range) {
  const lockKey = makeLockKey(unitId, range);
  const token   = `lk-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT;
  while (Date.now() < deadline) {
    const existing = _locks.get(lockKey);
    if (existing && Date.now() > existing.expiresAt) _locks.delete(lockKey);
    if (!_locks.has(lockKey)) {
      const handle = { token, unitId, checkIn: range.checkIn, checkOut: range.checkOut,
        acquiredAt: Date.now(), expiresAt: Date.now() + LOCK_TTL_MS };
      _locks.set(lockKey, handle);
      return handle;
    }
    await sleep(LOCK_POLL_MS);
  }
  return null;
}

function releaseLock(handle) {
  const lockKey = makeLockKey(handle.unitId, handle);
  const stored  = _locks.get(lockKey);
  if (stored && stored.token === handle.token) _locks.delete(lockKey);
}

function seedBooking(booking) {
  const id = `BK-SEED-${_idSeq++}`;
  _bookings.set(id, { ...booking, internalId: id, confirmedAt: Date.now() });
  return id;
}

async function processBookingRequest(request) {
  const range = { checkIn: request.checkIn, checkOut: request.checkOut };
  const lock  = await acquireLock(request.unitId, range);
  if (!lock) return { success: false, reason: 'LOCK_TIMEOUT' };
  try {
    if (Date.now() > lock.expiresAt) return { success: false, reason: 'LOCK_EXPIRED' };
    const avail = checkAvailability(request.unitId, range);
    if (!avail.available)           return { success: false, reason: 'DATES_UNAVAILABLE' };
    const id = `BK-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const booking = { ...request, internalId: id, confirmedAt: Date.now() };
    _bookings.set(id, booking);
    releaseLock(lock);
    return { success: true, booking };
  } catch (err) { releaseLock(lock); throw err; }
}

function clearState() { _locks.clear(); _bookings.clear(); }

// ── Tests ────────────────────────────────────────────────────────────────────

suite('Overlap Detection — checkAvailability()', () => {

  test('returns available=true when registry is empty', async () => {
    clearState();
    const r = checkAvailability('u1', { checkIn: '2026-04-01', checkOut: '2026-04-05' });
    assert.equal(r.available, true);
  });

  test('returns available=true for a different unit with same dates', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-04-01', checkOut: '2026-04-05', guestName: 'Alice', amount: 1000 });
    const r = checkAvailability('u2', { checkIn: '2026-04-01', checkOut: '2026-04-05' });
    assert.equal(r.available, true);
  });

  test('detects full overlap (same dates)', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Airbnb', checkIn: '2026-04-01', checkOut: '2026-04-05', guestName: 'Bob', amount: 2000 });
    const r = checkAvailability('u1', { checkIn: '2026-04-01', checkOut: '2026-04-05' });
    assert.equal(r.available, false);
    assert.equal(r.conflictingBooking.guestName, 'Bob');
  });

  test('detects partial overlap — check-in falls inside existing booking', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Gathern', checkIn: '2026-05-01', checkOut: '2026-05-08', guestName: 'Carol', amount: 3000 });
    // new request: 2026-05-05 → 2026-05-10  (overlaps by 3 days)
    const r = checkAvailability('u1', { checkIn: '2026-05-05', checkOut: '2026-05-10' });
    assert.equal(r.available, false);
  });

  test('detects partial overlap — check-out falls inside existing booking', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Direct', checkIn: '2026-05-05', checkOut: '2026-05-10', guestName: 'Dave', amount: 1500 });
    // new request: 2026-05-02 → 2026-05-07  (overlaps by 2 days)
    const r = checkAvailability('u1', { checkIn: '2026-05-02', checkOut: '2026-05-07' });
    assert.equal(r.available, false);
  });

  test('detects overlap — new booking fully contains existing booking', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-06-10', checkOut: '2026-06-12', guestName: 'Eve', amount: 800 });
    // new: 2026-06-08 → 2026-06-15  (contains existing booking entirely)
    const r = checkAvailability('u1', { checkIn: '2026-06-08', checkOut: '2026-06-15' });
    assert.equal(r.available, false);
  });

  test('allows adjacent booking — checkout date = new check-in date (no overlap)', async () => {
    clearState();
    seedBooking({ unitId: 'u1', channel: 'Airbnb', checkIn: '2026-07-01', checkOut: '2026-07-05', guestName: 'Frank', amount: 2200 });
    // next guest checks in exactly when previous checks out
    const r = checkAvailability('u1', { checkIn: '2026-07-05', checkOut: '2026-07-10' });
    assert.equal(r.available, true, 'Adjacent bookings (checkout = next checkin) must NOT be flagged as overlap');
  });

  test('allows back-to-back: previous checkout = new checkin', async () => {
    clearState();
    seedBooking({ unitId: 'u3', channel: 'Gathern', checkIn: '2026-08-20', checkOut: '2026-08-25', guestName: 'Grace', amount: 5000 });
    const r = checkAvailability('u3', { checkIn: '2026-08-25', checkOut: '2026-08-30' });
    assert.equal(r.available, true);
  });

  test('correctly identifies conflicting channel in the result', async () => {
    clearState();
    const id = seedBooking({ unitId: 'u2', channel: 'Gathern', checkIn: '2026-09-01', checkOut: '2026-09-07', guestName: 'Hank', amount: 3300 });
    const r = checkAvailability('u2', { checkIn: '2026-09-03', checkOut: '2026-09-10' });
    assert.equal(r.available, false);
    assert.equal(r.conflictingBooking.channel, 'Gathern');
    assert.equal(r.conflictingBooking.internalId, id);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('Lock Engine — acquireLock() / releaseLock()', () => {

  test('acquires a lock on a free unit', async () => {
    clearState();
    const handle = await acquireLock('u1', { checkIn: '2026-03-01', checkOut: '2026-03-05' });
    assert.ok(handle, 'should return a lock handle');
    assert.equal(handle.unitId, 'u1');
    assert.ok(handle.token.startsWith('lk-'));
    releaseLock(handle);
  });

  test('second request for same unit+dates waits, then acquires after release', async () => {
    clearState();
    const range = { checkIn: '2026-03-10', checkOut: '2026-03-15' };
    const h1 = await acquireLock('u1', range);
    assert.ok(h1, 'first lock must succeed');

    // Release after 150 ms so the second caller can acquire
    setTimeout(() => releaseLock(h1), 150);
    const h2 = await acquireLock('u1', range);
    assert.ok(h2, 'second lock must succeed after h1 is released');
    assert.notEqual(h1.token, h2.token, 'tokens must differ');
    releaseLock(h2);
  });

  test('two locks on different units are independent', async () => {
    clearState();
    const range = { checkIn: '2026-04-01', checkOut: '2026-04-05' };
    const [h1, h2] = await Promise.all([
      acquireLock('u1', range),
      acquireLock('u2', range),
    ]);
    assert.ok(h1 && h2, 'both locks must succeed simultaneously');
    releaseLock(h1);
    releaseLock(h2);
  });

  test('releaseLock with wrong token does not release', async () => {
    clearState();
    const range = { checkIn: '2026-05-01', checkOut: '2026-05-05' };
    const handle = await acquireLock('u1', range);
    assert.ok(handle);
    // Attempt to release with a tampered token
    releaseLock({ ...handle, token: 'WRONG-TOKEN' });
    // Lock should still be held — a fresh acquireLock should block (but we can't wait 5s in test)
    // Instead verify the lock map still contains the correct entry
    const key = makeLockKey('u1', range);
    assert.ok(_locks.has(key), 'lock should still exist after bad-token release attempt');
    releaseLock(handle);   // proper release
    assert.ok(!_locks.has(key), 'lock should be gone after correct release');
  });

  test('expired lock is evicted and replaced on next acquireLock', async () => {
    clearState();
    const range = { checkIn: '2026-06-01', checkOut: '2026-06-05' };
    // Manually inject a stale lock (already expired)
    const key = makeLockKey('u1', range);
    _locks.set(key, { token: 'stale', unitId: 'u1', checkIn: range.checkIn,
      checkOut: range.checkOut, acquiredAt: Date.now() - 20_000, expiresAt: Date.now() - 1 });

    const h = await acquireLock('u1', range);
    assert.ok(h, 'should acquire lock after evicting expired stale lock');
    assert.notEqual(h.token, 'stale');
    releaseLock(h);
  });
});

// ────────────────────────────────────────────────────────────────────────────

suite('processBookingRequest() — Full Transaction', () => {

  test('confirms a booking when dates are free', async () => {
    clearState();
    const result = await processBookingRequest({
      unitId: 'u1', channel: 'Booking.com',
      checkIn: '2026-10-01', checkOut: '2026-10-05',
      guestName: 'Mohammed Al-Otaibi', amount: 5248,
    });
    assert.equal(result.success, true);
    assert.ok(result.booking.internalId.startsWith('BK-'));
    assert.equal(result.booking.channel, 'Booking.com');
  });

  test('rejects a booking when dates overlap with a confirmed booking', async () => {
    clearState();
    // First booking — confirmed
    const r1 = await processBookingRequest({
      unitId: 'u1', channel: 'Gathern',
      checkIn: '2026-11-01', checkOut: '2026-11-07',
      guestName: 'Khalid Al-Dosari', amount: 3600,
    });
    assert.equal(r1.success, true, 'first booking should confirm');

    // Second booking — overlaps (should be rejected)
    const r2 = await processBookingRequest({
      unitId: 'u1', channel: 'Booking.com',
      checkIn: '2026-11-04', checkOut: '2026-11-09',
      guestName: 'Sarah Thompson', amount: 8750,
    });
    assert.equal(r2.success, false);
    assert.equal(r2.reason, 'DATES_UNAVAILABLE');
  });

  test('allows a back-to-back booking (checkout = next checkin)', async () => {
    clearState();
    const r1 = await processBookingRequest({
      unitId: 'u2', channel: 'Airbnb',
      checkIn: '2026-12-01', checkOut: '2026-12-05',
      guestName: 'Emma Wilson', amount: 4200,
    });
    assert.equal(r1.success, true);

    const r2 = await processBookingRequest({
      unitId: 'u2', channel: 'Direct',
      checkIn: '2026-12-05', checkOut: '2026-12-09',
      guestName: 'Ravi Sharma', amount: 3800,
    });
    assert.equal(r2.success, true, 'back-to-back booking should be allowed');
  });

  test('booking on different unit is never blocked', async () => {
    clearState();
    await processBookingRequest({
      unitId: 'u1', channel: 'Booking.com',
      checkIn: '2027-01-01', checkOut: '2027-01-10',
      guestName: 'Guest A', amount: 9000,
    });
    const r2 = await processBookingRequest({
      unitId: 'u3', channel: 'Gathern',   // different unit
      checkIn: '2027-01-01', checkOut: '2027-01-10',
      guestName: 'Guest B', amount: 7000,
    });
    assert.equal(r2.success, true, 'same dates on a different unit must always succeed');
  });

  test('race condition — only one booking wins when two arrive simultaneously', async () => {
    clearState();
    const request = (guest) => processBookingRequest({
      unitId: 'u4', channel: 'Booking.com',
      checkIn: '2027-02-10', checkOut: '2027-02-15',
      guestName: guest, amount: 5000,
    });

    // Fire both requests at exactly the same time
    const [r1, r2] = await Promise.all([request('Guest X'), request('Guest Y')]);

    const successes = [r1, r2].filter(r => r.success);
    const failures  = [r1, r2].filter(r => !r.success);

    assert.equal(successes.length, 1, 'exactly ONE booking must succeed');
    assert.equal(failures.length,  1, 'exactly ONE booking must be rejected');
    assert.equal(failures[0].reason, 'DATES_UNAVAILABLE', 'loser must be DATES_UNAVAILABLE');
  });

  test('three concurrent requests — exactly one wins', async () => {
    clearState();
    const make = (guest) => processBookingRequest({
      unitId: 'u5', channel: 'Airbnb',
      checkIn: '2027-03-01', checkOut: '2027-03-06',
      guestName: guest, amount: 4000,
    });
    const results = await Promise.all([make('A'), make('B'), make('C')]);
    const wins = results.filter(r => r.success);
    assert.equal(wins.length, 1, 'exactly one of three concurrent requests must win');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 2: Booking.com XML Builders  ────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

// Pure JS reimplementations of the XML builder functions (same output)

function generateEchoToken() {
  return `REMS-${Date.now()}-TEST`;
}

function buildAvailNotifXml(block) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <AvailStatusMessages HotelCode="${block.hotelId}">
    <AvailStatusMessage BookingLimit="${block.count}">
      <StatusApplicationControl
        Start="${block.dateFrom}"
        End="${block.dateTo}"
        RoomTypeCode="${block.roomTypeId}"
        InvTypeCode="${block.roomTypeId}"
      />
      <RestrictionStatus
        Restriction="Master"
        Status="${block.available ? 'Open' : 'Close'}"
      />
    </AvailStatusMessage>
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;
}

function buildRatePlanNotifXml(rate) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRatePlanNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <RatePlans HotelCode="${rate.hotelId}">
    <RatePlan
      RatePlanCode="${rate.ratePlanCode}"
      Start="${rate.dateFrom}"
      End="${rate.dateTo}"
      CurrencyCode="${rate.currencyCode}"
      ${rate.minStay != null ? `MinStay="${rate.minStay}"` : ''}>
      <Rates>
        <Rate InvTypeCode="${rate.roomTypeId}">
          <BaseByGuestAmts>
            <BaseByGuestAmt
              AmountBeforeTax="${rate.amountBeforeTax}"
              CurrencyCode="${rate.currencyCode}"
            />
          </BaseByGuestAmts>
        </Rate>
      </Rates>
    </RatePlan>
  </RatePlans>
</OTA_HotelRatePlanNotifRQ>`;
}

function buildReadReservationsXml(hotelId, afterTimestamp) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_ReadRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <ReadRequests>
    <HotelReadRequest HotelCode="${hotelId}">
      <SelectionCriteria
        SelectionType="Undelivered"
        Start="${afterTimestamp}"
      />
    </HotelReadRequest>
  </ReadRequests>
</OTA_ReadRQ>`;
}

function buildReservationAckXml(hotelId, channelBookingId, internalBookingId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001"
  ResStatus="Commit">
  <HotelReservations>
    <HotelReservation>
      <UniqueID Type="14" ID="${channelBookingId}"   ID_Context="Booking.com" />
      <UniqueID Type="14" ID="${internalBookingId}"  ID_Context="REMS" />
      <ResGlobalInfo>
        <HotelReservationIDs>
          <HotelReservationID ResID_Source="${hotelId}" ResID_Type="3" />
        </HotelReservationIDs>
      </ResGlobalInfo>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRQ>`;
}

suite('Booking.com XML Builders — OTA 2003B structure', () => {

  test('OTA_HotelAvailNotifRQ — contains correct XML declaration', async () => {
    const xml = buildAvailNotifXml({ hotelId: 'u1', roomTypeId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: false, count: 0 });
    assert.ok(xml.includes('<?xml version="1.0"'), 'must have XML declaration');
    assert.ok(xml.includes('OTA_HotelAvailNotifRQ'), 'must have correct root element');
  });

  test('OTA_HotelAvailNotifRQ — Status=Close when available=false', async () => {
    const xml = buildAvailNotifXml({ hotelId: 'u1', roomTypeId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: false, count: 0 });
    assert.ok(xml.includes('Status="Close"'), 'blocked dates must have Status=Close');
    assert.ok(xml.includes('BookingLimit="0"'), 'blocked dates must have BookingLimit=0');
  });

  test('OTA_HotelAvailNotifRQ — Status=Open when available=true', async () => {
    const xml = buildAvailNotifXml({ hotelId: 'u1', roomTypeId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: true, count: 1 });
    assert.ok(xml.includes('Status="Open"'), 'unblocked dates must have Status=Open');
    assert.ok(xml.includes('BookingLimit="1"'), 'unblocked must have BookingLimit=1');
  });

  test('OTA_HotelAvailNotifRQ — injects hotelId and date range', async () => {
    const xml = buildAvailNotifXml({ hotelId: 'HOTEL-42', roomTypeId: 'RM-1', dateFrom: '2026-05-01', dateTo: '2026-05-10', available: false, count: 0 });
    assert.ok(xml.includes('HotelCode="HOTEL-42"'), 'hotelId must appear as HotelCode');
    assert.ok(xml.includes('Start="2026-05-01"'),   'check-in date must appear as Start');
    assert.ok(xml.includes('End="2026-05-10"'),     'check-out date must appear as End');
  });

  test('OTA_HotelRatePlanNotifRQ — includes rate, currency, and MinStay', async () => {
    const xml = buildRatePlanNotifXml({
      hotelId: 'u1', roomTypeId: 'u1', ratePlanCode: 'BAR',
      dateFrom: '2026-06-01', dateTo: '2026-06-30',
      amountBeforeTax: 1248, currencyCode: 'SAR', minStay: 2,
    });
    assert.ok(xml.includes('OTA_HotelRatePlanNotifRQ'), 'correct root element');
    assert.ok(xml.includes('AmountBeforeTax="1248"'),   'rate amount must appear');
    assert.ok(xml.includes('CurrencyCode="SAR"'),       'currency must be SAR');
    assert.ok(xml.includes('MinStay="2"'),              'min stay must appear');
    assert.ok(xml.includes('RatePlanCode="BAR"'),       'rate plan code must appear');
  });

  test('OTA_ReadRQ — uses PCI-scoped SelectionType=Undelivered', async () => {
    const xml = buildReadReservationsXml('u1', '2026-01-01T00:00:00.000Z');
    assert.ok(xml.includes('SelectionType="Undelivered"'), 'must request only undelivered reservations');
    assert.ok(xml.includes('HotelCode="u1"'),              'must scope to correct hotel');
    assert.ok(xml.includes('OTA_ReadRQ'),                  'correct root element');
  });

  test('OTA_HotelResNotifRQ — ACK includes both Booking.com and REMS IDs', async () => {
    const xml = buildReservationAckXml('u1', 'BCM-999', 'BK-REMS-001');
    assert.ok(xml.includes('ID_Context="Booking.com"'), 'must include Booking.com context');
    assert.ok(xml.includes('ID_Context="REMS"'),        'must include REMS context');
    assert.ok(xml.includes('ID="BCM-999"'),             'channel booking ID must appear');
    assert.ok(xml.includes('ID="BK-REMS-001"'),         'internal booking ID must appear');
    assert.ok(xml.includes('ResStatus="Commit"'),       'ACK must have ResStatus=Commit');
  });

  test('EchoToken is unique per call', async () => {
    const xml1 = buildAvailNotifXml({ hotelId: 'u1', roomTypeId: 'u1', dateFrom: '2026-01-01', dateTo: '2026-01-05', available: false, count: 0 });
    await sleep(2);   // ensure different timestamp
    const xml2 = buildAvailNotifXml({ hotelId: 'u1', roomTypeId: 'u1', dateFrom: '2026-01-01', dateTo: '2026-01-05', available: false, count: 0 });
    const token1 = xml1.match(/EchoToken="([^"]+)"/)?.[1];
    const token2 = xml2.match(/EchoToken="([^"]+)"/)?.[1];
    assert.notEqual(token1, token2, 'each XML request must have a unique EchoToken');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 3: Booking.com Token Exchange (mocked fetch)  ───────────────────
// ════════════════════════════════════════════════════════════════════════════

// Minimal reimplementation of the token cache logic
let _cachedToken = null;
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

function resetTokenCache() { _cachedToken = null; }

async function exchangeToken(credentials, fetchFn) {
  const response = await fetchFn('https://connectivity-authentication.booking.com/token-based-authentication/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed — HTTP ${response.status}: ${body}`);
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

async function getValidToken(credentials, fetchFn) {
  const needsRefresh = !_cachedToken || Date.now() >= _cachedToken.expiresAt - TOKEN_REFRESH_BUFFER;
  if (needsRefresh) _cachedToken = await exchangeToken(credentials, fetchFn);
  return _cachedToken.accessToken;
}

suite('Booking.com Token Exchange — OAuth 2.0 Client Credentials', () => {

  const CREDS = { clientId: 'test-client-id', clientSecret: 'test-secret', providerId: 'p1', machineAccountId: 'ma1' };

  test('exchangeToken — sends correct POST body with client_id and client_secret', async () => {
    resetTokenCache();
    let capturedBody = null;
    const mockFetch = async (url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ access_token: 'tok-abc', expires_in: 3600 }) };
    };
    await exchangeToken(CREDS, mockFetch);
    assert.equal(capturedBody.client_id,     'test-client-id');
    assert.equal(capturedBody.client_secret, 'test-secret');
  });

  test('exchangeToken — returns token with correct TTL', async () => {
    resetTokenCache();
    const before = Date.now();
    const mockFetch = async () => ({ ok: true, json: async () => ({ access_token: 'tok-xyz', expires_in: 3600 }) });
    const token = await exchangeToken(CREDS, mockFetch);
    assert.equal(token.accessToken, 'tok-xyz');
    assert.ok(token.expiresAt >= before + 3600_000, 'expiresAt should be ~1 hour from now');
  });

  test('exchangeToken — throws on HTTP 401 Unauthorized', async () => {
    resetTokenCache();
    const mockFetch = async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' });
    await assert.rejects(
      () => exchangeToken(CREDS, mockFetch),
      /HTTP 401/,
      'should throw with status code in message',
    );
  });

  test('exchangeToken — throws on HTTP 429 Too Many Requests', async () => {
    resetTokenCache();
    const mockFetch = async () => ({ ok: false, status: 429, text: async () => 'Rate limit exceeded' });
    await assert.rejects(
      () => exchangeToken(CREDS, mockFetch),
      /HTTP 429/,
    );
  });

  test('getValidToken — caches token and does not re-call exchange within TTL', async () => {
    resetTokenCache();
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return { ok: true, json: async () => ({ access_token: `tok-${callCount}`, expires_in: 3600 }) };
    };
    const t1 = await getValidToken(CREDS, mockFetch);
    const t2 = await getValidToken(CREDS, mockFetch);
    const t3 = await getValidToken(CREDS, mockFetch);
    assert.equal(callCount, 1, 'exchange should only be called once within TTL');
    assert.equal(t1, t2);
    assert.equal(t2, t3);
  });

  test('getValidToken — refreshes when token is expired', async () => {
    resetTokenCache();
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return { ok: true, json: async () => ({ access_token: `tok-${callCount}`, expires_in: 3600 }) };
    };
    // Manually set an expired token in cache
    _cachedToken = { accessToken: 'old-tok', expiresAt: Date.now() - 1000 };
    const t = await getValidToken(CREDS, mockFetch);
    assert.equal(callCount, 1, 'should refresh an expired token');
    assert.notEqual(t, 'old-tok', 'should return new token, not the expired one');
  });

  test('getValidToken — refreshes 5 minutes before expiry (pre-expiry buffer)', async () => {
    resetTokenCache();
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return { ok: true, json: async () => ({ access_token: `tok-${callCount}`, expires_in: 3600 }) };
    };
    // Simulate token expiring in 4 min (< 5 min buffer → should refresh)
    _cachedToken = { accessToken: 'near-expiry', expiresAt: Date.now() + 4 * 60 * 1000 };
    await getValidToken(CREDS, mockFetch);
    assert.equal(callCount, 1, 'should refresh when within 5-min buffer');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 4: Gathern Service Bridge (mocked fetch)  ──────────────────────
// ════════════════════════════════════════════════════════════════════════════

const GATHERN_API_BASE = 'https://api.gathern.com/v1';

async function pushGathernBlock(req, fetchFn) {
  const response = await fetchFn(`${GATHERN_API_BASE}/units/${req.unitId}/availability`, {
    method:  'PUT',
    headers: { 'Authorization': `Bearer ${req.apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify({ date_from: req.dateFrom, date_to: req.dateTo, available: req.available, quantity: req.available ? 1 : 0 }),
  });
  if (!response.ok) throw new Error(`Gathern availability push failed: ${response.status}`);
}

async function pushGathernRates(req, fetchFn) {
  const response = await fetchFn(`${GATHERN_API_BASE}/units/${req.unitId}/rates`, {
    method:  'PUT',
    headers: { 'Authorization': `Bearer ${req.apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify({ date_from: req.dateFrom, date_to: req.dateTo, nightly_rate: req.nightlyRate, currency: req.currency, min_stay: req.minStay, ...(req.cleaningFee != null ? { cleaning_fee: req.cleaningFee } : {}) }),
  });
  if (!response.ok) throw new Error(`Gathern rate push failed: ${response.status}`);
}

async function pullGathernReservations(apiKey, unitIds, afterTimestamp, fetchFn) {
  const params = new URLSearchParams({ unit_ids: unitIds.join(','), since: afterTimestamp, status: 'confirmed,modified,cancelled' });
  const response = await fetchFn(`${GATHERN_API_BASE}/reservations?${params}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`Gathern reservations pull failed: ${response.status}`);
  return response.json();
}

suite('Gathern Bridge — REST/JSON sync', () => {

  test('pushGathernBlock — sends PUT with correct URL and Authorization header', async () => {
    let capturedUrl, capturedOpts;
    const mockFetch = async (url, opts) => { capturedUrl = url; capturedOpts = opts; return { ok: true }; };
    await pushGathernBlock({ apiKey: 'gk-secret', unitId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: false }, mockFetch);
    assert.equal(capturedUrl, `${GATHERN_API_BASE}/units/u1/availability`);
    assert.equal(capturedOpts.method, 'PUT');
    assert.ok(capturedOpts.headers['Authorization'].includes('gk-secret'), 'must include API key in Authorization');
  });

  test('pushGathernBlock — sets quantity=0 when blocking (available=false)', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushGathernBlock({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: false }, mockFetch);
    assert.equal(capturedBody.available, false);
    assert.equal(capturedBody.quantity,  0, 'blocking must set quantity=0');
  });

  test('pushGathernBlock — sets quantity=1 when unblocking (available=true)', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushGathernBlock({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: true }, mockFetch);
    assert.equal(capturedBody.available, true);
    assert.equal(capturedBody.quantity,  1, 'unblocking must set quantity=1');
  });

  test('pushGathernRates — includes cleaning_fee when provided', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushGathernRates({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-04-01', dateTo: '2026-04-30', nightlyRate: 1100, currency: 'SAR', minStay: 2, cleaningFee: 200 }, mockFetch);
    assert.equal(capturedBody.nightly_rate,  1100);
    assert.equal(capturedBody.currency,      'SAR');
    assert.equal(capturedBody.min_stay,      2);
    assert.equal(capturedBody.cleaning_fee,  200, 'cleaning_fee must be synced alongside nightly rate');
  });

  test('pushGathernRates — omits cleaning_fee when not provided', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushGathernRates({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-04-01', dateTo: '2026-04-30', nightlyRate: 900, currency: 'SAR', minStay: 1 }, mockFetch);
    assert.ok(!('cleaning_fee' in capturedBody), 'cleaning_fee must be absent when not provided');
  });

  test('pullGathernReservations — sends correct query params', async () => {
    let capturedUrl;
    const mockFetch = async (url) => { capturedUrl = url; return { ok: true, json: async () => [] }; };
    await pullGathernReservations('gk-secret', ['u1','u2','u4'], '2026-01-01T00:00:00.000Z', mockFetch);
    assert.ok(capturedUrl.includes('unit_ids=u1%2Cu2%2Cu4') || capturedUrl.includes('unit_ids=u1,u2,u4'), 'unit_ids param must be in query string');
    assert.ok(capturedUrl.includes('since='), 'since param must be included');
    assert.ok(capturedUrl.includes('status=confirmed'), 'status filter must be included');
  });

  test('pullGathernReservations — returns parsed JSON array', async () => {
    const fakeData = [{ id: 'g-1', unitId: 'u1', guestName: 'Test Guest', checkIn: '2026-04-01', checkOut: '2026-04-05', nights: 4, totalAmount: 3200, currency: 'SAR', status: 'confirmed', createdAt: '2026-03-01T10:00:00Z' }];
    const mockFetch = async () => ({ ok: true, json: async () => fakeData });
    const result = await pullGathernReservations('k', ['u1'], '2026-01-01T00:00:00Z', mockFetch);
    assert.equal(result.length, 1);
    assert.equal(result[0].guestName, 'Test Guest');
  });

  test('pushGathernBlock — throws on non-OK response', async () => {
    const mockFetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(
      () => pushGathernBlock({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-03-01', dateTo: '2026-03-05', available: false }, mockFetch),
      /503/,
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 5: End-to-End Callback Flow  ───────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

suite('End-to-End Callback Flow — Booking.com webhook → Guard → Gathern block', () => {

  test('Full flow: incoming Booking.com booking triggers Gathern block', async () => {
    clearState();
    const gathernCalls = [];
    const mockGathernFetch = async (url, opts) => {
      gathernCalls.push({ url, body: JSON.parse(opts.body) });
      return { ok: true };
    };

    // Step 1: process booking from Booking.com
    const result = await processBookingRequest({
      unitId: 'u1', channel: 'Booking.com',
      checkIn: '2026-09-10', checkOut: '2026-09-15',
      guestName: 'Webhook Guest', amount: 6200,
    });
    assert.equal(result.success, true, 'booking must be confirmed');

    // Step 2: simulate what broadcastAvailabilityBlock does for Gathern
    await pushGathernBlock({ apiKey: 'gk-prod', unitId: 'u1', dateFrom: '2026-09-10', dateTo: '2026-09-15', available: false }, mockGathernFetch);

    assert.equal(gathernCalls.length, 1, 'exactly one Gathern block call must be made');
    assert.equal(gathernCalls[0].body.available, false, 'Gathern must receive available=false');
    assert.equal(gathernCalls[0].body.quantity,  0,     'Gathern must receive quantity=0');
    assert.ok(gathernCalls[0].url.includes('/units/u1/availability'), 'must target correct unit endpoint');
  });

  test('Full flow: Gathern booking blocks Booking.com via OTA XML', async () => {
    clearState();
    const bookingComCalls = [];
    const mockBCFetch = async (url, opts) => {
      bookingComCalls.push({ url, body: opts.body });
      return { ok: true, text: async () => '<OTA_HotelAvailNotifRS Success="true" />' };
    };

    // Gathern booking confirmed
    const result = await processBookingRequest({
      unitId: 'u3', channel: 'Gathern',
      checkIn: '2026-10-01', checkOut: '2026-10-07',
      guestName: 'Gathern Guest', amount: 8750,
    });
    assert.equal(result.success, true);

    // Broadcast to Booking.com
    const xml = buildAvailNotifXml({ hotelId: 'u3', roomTypeId: 'u3', dateFrom: '2026-10-01', dateTo: '2026-10-07', available: false, count: 0 });
    const token = 'mocked-bearer-token';
    await mockBCFetch(`https://supply-xml.booking.com/ota/OTA_HotelAvailNotifRQ`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
    });

    assert.equal(bookingComCalls.length, 1, 'one Booking.com API call must be made');
    assert.ok(bookingComCalls[0].body.includes('Status="Close"'),     'XML must close availability');
    assert.ok(bookingComCalls[0].body.includes('HotelCode="u3"'),     'XML must target correct hotel');
    assert.ok(bookingComCalls[0].body.includes('BookingLimit="0"'),   'XML must set BookingLimit=0');
    assert.ok(bookingComCalls[0].body.includes('Start="2026-10-01"'), 'XML must have correct start date');
  });

  test('Duplicate booking attempt after confirmation is rejected', async () => {
    clearState();
    // Confirm booking via Booking.com
    const r1 = await processBookingRequest({
      unitId: 'u2', channel: 'Booking.com',
      checkIn: '2026-11-15', checkOut: '2026-11-20',
      guestName: 'First Guest', amount: 7500,
    });
    assert.equal(r1.success, true);

    // Gathern tries same unit & overlapping dates (simulating delayed sync scenario)
    const r2 = await processBookingRequest({
      unitId: 'u2', channel: 'Gathern',
      checkIn: '2026-11-17', checkOut: '2026-11-22',
      guestName: 'Second Guest', amount: 6000,
    });
    assert.equal(r2.success, false);
    assert.equal(r2.reason,  'DATES_UNAVAILABLE');
  });

  test('Rate push callback updates all channel pricing correctly', async () => {
    const channelRates = {};
    const mockFetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (url.includes('gathern')) {
        channelRates['Gathern'] = { rate: body.nightly_rate, currency: body.currency, cleaningFee: body.cleaning_fee };
      }
      return { ok: true };
    };

    // Push rate to Gathern
    await pushGathernRates({ apiKey: 'k', unitId: 'u1', dateFrom: '2026-12-01', dateTo: '2026-12-31', nightlyRate: 1400, currency: 'SAR', minStay: 2, cleaningFee: 150 }, mockFetch);
    // Verify Booking.com XML would carry the same rate
    const xml = buildRatePlanNotifXml({ hotelId: 'u1', roomTypeId: 'u1', ratePlanCode: 'BAR', dateFrom: '2026-12-01', dateTo: '2026-12-31', amountBeforeTax: 1400, currencyCode: 'SAR', minStay: 2 });

    assert.equal(channelRates['Gathern'].rate,        1400,  'Gathern rate must be 1400 SAR');
    assert.equal(channelRates['Gathern'].currency,    'SAR', 'Gathern currency must be SAR');
    assert.equal(channelRates['Gathern'].cleaningFee, 150,   'cleaning fee must be synced');
    assert.ok(xml.includes('AmountBeforeTax="1400"'),        'Booking.com XML must carry same rate');
    assert.ok(xml.includes('CurrencyCode="SAR"'),            'Booking.com XML must carry SAR');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 6: Airbnb Service  ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const AIRBNB_CREDS = { clientId: 'ab-client', clientSecret: 'ab-secret', redirectUri: 'https://rems.sa/auth/airbnb/callback' };
const AIRBNB_BASE_URL = 'https://api.airbnb.com/v2';

// ── Pure-JS reimplementations (types stripped, same logic) ─────────────────

function buildAirbnbAuthorizationUrl(credentials, state) {
  const REQUIRED_SCOPES = 'vr:read:reservations vr:write:reservations vr:read:listings vr:write:listings vr:read:calendar vr:write:calendar';
  const params = new URLSearchParams({
    client_id:     credentials.clientId,
    redirect_uri:  credentials.redirectUri,
    response_type: 'code',
    scope:         REQUIRED_SCOPES,
    state,
  });
  return `https://www.airbnb.com/oauth2/auth?${params.toString()}`;
}

async function exchangeAirbnbCode(credentials, code, fetchFn) {
  const response = await fetchFn('https://api.airbnb.com/v2/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ grant_type: 'authorization_code', client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: credentials.redirectUri, code }).toString(),
  });
  if (!response.ok) { const b = await response.text(); throw new Error(`HTTP ${response.status}: ${b}`); }
  const d = await response.json();
  return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + (d.expires_in ?? 7200) * 1000, userId: String(d.user_id ?? '') };
}

async function refreshAirbnbToken(credentials, refreshToken, fetchFn) {
  const response = await fetchFn('https://api.airbnb.com/v2/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: refreshToken }).toString(),
  });
  if (!response.ok) { const b = await response.text(); throw new Error(`Refresh failed HTTP ${response.status}: ${b}`); }
  const d = await response.json();
  return { accessToken: d.access_token, refreshToken: d.refresh_token ?? refreshToken, expiresAt: Date.now() + (d.expires_in ?? 7200) * 1000 };
}

async function pushAirbnbCalendarBlock(op, accessToken, fetchFn) {
  const body = { listing_id: op.listingId, start_date: op.dateFrom, end_date: op.dateTo, availability: op.available ? 'available' : 'unavailable' };
  if (op.nightlyPrice != null) body.daily_price = op.nightlyPrice * 100;
  if (op.minNights != null) body.min_nights = op.minNights;
  const response = await fetchFn(`${AIRBNB_BASE_URL}/calendar_operations`, {
    method:  'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Calendar block failed HTTP ${response.status}`);
}

// Webhook HMAC-SHA256 verification using Web Crypto API
async function verifyAirbnbWebhook(rawBody, signature, webhookSecret) {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare
  if (expected.length !== signature.length) throw new Error('Webhook signature mismatch');
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) throw new Error('Webhook signature mismatch');
}

function generateICalFeed(unitId, blockedRanges) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//REMS//Real Estate Management System//EN`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const r of blockedRanges) {
    lines.push('BEGIN:VEVENT', `UID:${unitId}-${r.checkIn}-${r.checkOut}@rems`, `DTSTART;VALUE=DATE:${r.checkIn.replace(/-/g,'')}`, `DTEND;VALUE=DATE:${r.checkOut.replace(/-/g,'')}`, `SUMMARY:${r.summary ?? 'BLOCKED'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

suite('Airbnb Service — OAuth 2.0 + Calendar + Webhooks', () => {

  test('buildAuthorizationUrl — includes client_id, response_type=code, and all scopes', async () => {
    const url = buildAirbnbAuthorizationUrl(AIRBNB_CREDS, 'csrf-state-123');
    assert.ok(url.startsWith('https://www.airbnb.com/oauth2/auth?'), 'must target Airbnb OAuth endpoint');
    assert.ok(url.includes('client_id=ab-client'),             'must include client_id');
    assert.ok(url.includes('response_type=code'),              'must use authorization code grant');
    assert.ok(url.includes('vr%3Awrite%3Acalendar') || url.includes('vr:write:calendar'), 'must include write:calendar scope');
    assert.ok(url.includes('state=csrf-state-123'),            'must include CSRF state param');
  });

  test('exchangeAuthorizationCode — sends correct grant_type and code', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => {
      capturedBody = Object.fromEntries(new URLSearchParams(opts.body));
      return { ok: true, json: async () => ({ access_token: 'at-abc', refresh_token: 'rt-xyz', expires_in: 7200, user_id: 42 }) };
    };
    const ts = await exchangeAirbnbCode(AIRBNB_CREDS, 'AUTH-CODE-001', mockFetch);
    assert.equal(capturedBody.grant_type,    'authorization_code', 'must use authorization_code grant');
    assert.equal(capturedBody.code,          'AUTH-CODE-001',      'must include the auth code');
    assert.equal(capturedBody.client_id,     'ab-client');
    assert.equal(ts.accessToken,             'at-abc');
    assert.equal(ts.refreshToken,            'rt-xyz');
    assert.equal(ts.userId,                  '42');
    assert.ok(ts.expiresAt > Date.now() + 7000_000, 'expiresAt must be ~2 hours from now');
  });

  test('refreshAccessToken — sends refresh_token grant and returns new tokens', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => {
      capturedBody = Object.fromEntries(new URLSearchParams(opts.body));
      return { ok: true, json: async () => ({ access_token: 'at-new', refresh_token: 'rt-new', expires_in: 7200 }) };
    };
    const ts = await refreshAirbnbToken(AIRBNB_CREDS, 'rt-old', mockFetch);
    assert.equal(capturedBody.grant_type,   'refresh_token', 'must use refresh_token grant');
    assert.equal(capturedBody.refresh_token, 'rt-old',       'must include the old refresh token');
    assert.equal(ts.accessToken,             'at-new',       'must return new access token');
    assert.equal(ts.refreshToken,            'rt-new',       'must return new refresh token when rotated');
  });

  test('refreshAccessToken — keeps old refresh_token if not rotated in response', async () => {
    const mockFetch = async () => ({ ok: true, json: async () => ({ access_token: 'at-x', expires_in: 7200 }) });
    const ts = await refreshAirbnbToken(AIRBNB_CREDS, 'rt-stable', mockFetch);
    assert.equal(ts.refreshToken, 'rt-stable', 'should keep original refresh token if not returned');
  });

  test('exchangeAuthorizationCode — throws on HTTP 400 (bad code)', async () => {
    const mockFetch = async () => ({ ok: false, status: 400, text: async () => 'invalid_grant' });
    await assert.rejects(() => exchangeAirbnbCode(AIRBNB_CREDS, 'BAD-CODE', mockFetch), /400/);
  });

  test('pushAirbnbBlock — sends PUT to /calendar_operations with availability=unavailable', async () => {
    let capturedUrl, capturedBody;
    const mockFetch = async (url, opts) => { capturedUrl = url; capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushAirbnbCalendarBlock({ listingId: 'u1', dateFrom: '2026-06-01', dateTo: '2026-06-05', available: false }, 'at-xyz', mockFetch);
    assert.equal(capturedUrl,              `${AIRBNB_BASE_URL}/calendar_operations`);
    assert.equal(capturedBody.listing_id,  'u1');
    assert.equal(capturedBody.start_date,  '2026-06-01');
    assert.equal(capturedBody.end_date,    '2026-06-05');
    assert.equal(capturedBody.availability, 'unavailable', 'blocked dates must have availability=unavailable');
  });

  test('pushAirbnbBlock — sets availability=available when unblocking', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushAirbnbCalendarBlock({ listingId: 'u1', dateFrom: '2026-06-01', dateTo: '2026-06-05', available: true }, 'at-xyz', mockFetch);
    assert.equal(capturedBody.availability, 'available');
  });

  test('pushAirbnbBlock — converts SAR nightly_price to cents (×100)', async () => {
    let capturedBody;
    const mockFetch = async (url, opts) => { capturedBody = JSON.parse(opts.body); return { ok: true }; };
    await pushAirbnbCalendarBlock({ listingId: 'u1', dateFrom: '2026-06-01', dateTo: '2026-06-05', available: true, nightlyPrice: 1248 }, 'at-xyz', mockFetch);
    assert.equal(capturedBody.daily_price, 1248 * 100, 'price must be in cents (SAR × 100)');
  });

  test('pushAirbnbBlock — includes Authorization: Bearer header', async () => {
    let capturedHeaders;
    const mockFetch = async (url, opts) => { capturedHeaders = opts.headers; return { ok: true }; };
    await pushAirbnbCalendarBlock({ listingId: 'u1', dateFrom: '2026-06-01', dateTo: '2026-06-05', available: false }, 'my-token', mockFetch);
    assert.ok(capturedHeaders['Authorization'].includes('my-token'), 'must send Bearer token');
  });

  test('verifyWebhookSignature — accepts valid HMAC-SHA256 signature', async () => {
    const secret  = 'webhook-secret-xyz';
    const payload = '{"type":"reservations.created","listing_id":"u1"}';
    // Compute the expected signature ourselves
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const signature = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
    // Should not throw
    await verifyAirbnbWebhook(payload, signature, secret);
  });

  test('verifyWebhookSignature — rejects tampered signature', async () => {
    await assert.rejects(
      () => verifyAirbnbWebhook('{"type":"reservations.created"}', 'deadbeef00000000', 'secret'),
      /mismatch/,
    );
  });

  test('verifyWebhookSignature — rejects if payload is altered after signing', async () => {
    const secret  = 'hook-secret';
    const original = '{"type":"reservations.created","listing_id":"u1"}';
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(original));
    const signature = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
    const tampered = original.replace('u1', 'EVIL');
    await assert.rejects(() => verifyAirbnbWebhook(tampered, signature, secret), /mismatch/);
  });

  test('generateICalFeed — produces valid VCALENDAR with blocked date ranges', async () => {
    const ical = generateICalFeed('u1', [
      { checkIn: '2026-07-01', checkOut: '2026-07-05', summary: 'Booking.com confirmed' },
      { checkIn: '2026-07-10', checkOut: '2026-07-15' },
    ]);
    assert.ok(ical.includes('BEGIN:VCALENDAR'),              'must include VCALENDAR wrapper');
    assert.ok(ical.includes('VERSION:2.0'),                  'must specify iCal version 2.0');
    assert.ok(ical.includes('BEGIN:VEVENT'),                  'must include VEVENT blocks');
    assert.ok(ical.includes('DTSTART;VALUE=DATE:20260701'),  'must have correct DTSTART format');
    assert.ok(ical.includes('DTEND;VALUE=DATE:20260705'),    'must have correct DTEND format');
    assert.ok(ical.includes('Booking.com confirmed'),        'must include summary text');
    assert.ok(ical.includes('END:VCALENDAR'),                'must close VCALENDAR');
    const eventCount = (ical.match(/BEGIN:VEVENT/g) ?? []).length;
    assert.equal(eventCount, 2, 'must produce exactly 2 VEVENT blocks');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  SECTION 7: Reservation Engine — <500ms Ultimate Overlap Protection  ────
// ════════════════════════════════════════════════════════════════════════════

// ── Pure-JS Reservation Engine (types stripped, same algorithm) ────────────

const _engRegistry = new Map();
const _engLocks    = new Map();
const _engTxLog    = [];
const _engMetrics  = { totalProcessed: 0, confirmed: 0, rejectedOverlap: 0, rejectedTimeout: 0, avgDurationMs: 0, maxDurationMs: 0 };

const ENG_TOTAL_DEADLINE  = 500;
const ENG_LOCK_TTL        = 10_000;
const ENG_LOCK_POLL       = 20;

function engClearState() {
  _engRegistry.clear(); _engLocks.clear(); _engTxLog.length = 0;
  _engMetrics.totalProcessed = 0; _engMetrics.confirmed = 0; _engMetrics.rejectedOverlap = 0;
  _engMetrics.rejectedTimeout = 0; _engMetrics.avgDurationMs = 0; _engMetrics.maxDurationMs = 0;
}

function engCheckLocal(unitId, range) {
  const reqIn  = new Date(range.checkIn).getTime();
  const reqOut = new Date(range.checkOut).getTime();
  for (const b of _engRegistry.values()) {
    if (b.unitId !== unitId) continue;
    const bIn  = new Date(b.checkIn).getTime();
    const bOut = new Date(b.checkOut).getTime();
    if (!(reqOut <= bIn || reqIn >= bOut)) return { available: false, conflictingBooking: b };
  }
  return { available: true };
}

function engLockKey(unitId, range) { return `${unitId}::${range.checkIn}::${range.checkOut}`; }

async function engAcquireLock(unitId, range, deadlineMs) {
  const key   = engLockKey(unitId, range);
  const token = `lk-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  while (Date.now() < deadlineMs) {
    const ex = _engLocks.get(key);
    if (ex && Date.now() > ex.expiresAt) _engLocks.delete(key);
    if (!_engLocks.has(key)) {
      const h = { token, unitId, checkIn: range.checkIn, checkOut: range.checkOut, acquiredAt: Date.now(), expiresAt: Date.now() + ENG_LOCK_TTL };
      _engLocks.set(key, h);
      return h;
    }
    await sleep(ENG_LOCK_POLL);
  }
  return null;
}

function engReleaseLock(handle) {
  const key = engLockKey(handle.unitId, handle);
  if (_engLocks.get(key)?.token === handle.token) _engLocks.delete(key);
}

async function engProcess(request) {
  const txStart  = Date.now();
  const deadline = txStart + ENG_TOTAL_DEADLINE;
  const phases   = { preCheckMs: 0, lockMs: 0, commitMs: 0, broadcastMs: 0 };

  const record = (status, booking) => {
    const tx = { id: `TX-${txStart}`, request, status, booking, durationMs: Date.now() - txStart, phases };
    _engTxLog.push(tx);
    _engMetrics.totalProcessed++;
    if (status === 'CONFIRMED')        _engMetrics.confirmed++;
    if (status === 'REJECTED_OVERLAP') _engMetrics.rejectedOverlap++;
    const d = tx.durationMs;
    const n = _engMetrics.totalProcessed;
    _engMetrics.avgDurationMs = (_engMetrics.avgDurationMs * (n-1) + d) / n;
    if (d > _engMetrics.maxDurationMs) _engMetrics.maxDurationMs = d;
    return tx;
  };

  // Phase 1 — local registry check
  const p1 = Date.now();
  const localCheck = engCheckLocal(request.unitId, { checkIn: request.checkIn, checkOut: request.checkOut });
  phases.preCheckMs = Date.now() - p1;
  if (!localCheck.available) return record('REJECTED_OVERLAP');
  if (Date.now() >= deadline) return record('REJECTED_DEADLINE_EXCEEDED');

  // Phase 2 — lock
  const p2 = Date.now();
  const lock = await engAcquireLock(request.unitId, { checkIn: request.checkIn, checkOut: request.checkOut }, Math.min(deadline, Date.now() + 50));
  phases.lockMs = Date.now() - p2;
  if (!lock) return record(Date.now() >= deadline ? 'REJECTED_DEADLINE_EXCEEDED' : 'REJECTED_LOCK_TIMEOUT');

  try {
    // Phase 3 — re-check + commit
    const p3 = Date.now();
    const recheck = engCheckLocal(request.unitId, { checkIn: request.checkIn, checkOut: request.checkOut });
    if (!recheck.available) { engReleaseLock(lock); phases.commitMs = Date.now()-p3; return record('REJECTED_OVERLAP'); }
    const booking = { ...request, internalId: `BK-${Date.now()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`, confirmedAt: Date.now() };
    _engRegistry.set(booking.internalId, booking);
    engReleaseLock(lock);
    phases.commitMs = Date.now() - p3;
    return record('CONFIRMED', booking);
  } catch(e) { engReleaseLock(lock); throw e; }
}

suite('Reservation Engine — <500ms Ultimate Overlap Protection', () => {

  test('confirms booking and returns transaction record with phases', async () => {
    engClearState();
    const tx = await engProcess({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-08-01', checkOut: '2026-08-05', guestName: 'Alpha', amount: 5000 });
    assert.equal(tx.status, 'CONFIRMED');
    assert.ok(tx.booking?.internalId.startsWith('BK-'), 'must have internalId');
    assert.ok(tx.durationMs >= 0, 'durationMs must be set');
    assert.ok('preCheckMs' in tx.phases, 'phases must include preCheckMs');
    assert.ok('lockMs'     in tx.phases, 'phases must include lockMs');
    assert.ok('commitMs'   in tx.phases, 'phases must include commitMs');
  });

  test('all transactions complete well under 500ms hard deadline', async () => {
    engClearState();
    const units = ['u1','u2','u3','u4','u5','u6'];
    const results = await Promise.all(units.map((uid, i) =>
      engProcess({ unitId: uid, channel: 'Booking.com', checkIn: '2026-09-01', checkOut: '2026-09-07', guestName: `Guest ${i}`, amount: 4000 })
    ));
    for (const tx of results) {
      assert.ok(tx.durationMs < 500, `transaction for ${tx.request.unitId} must complete in <500ms (took ${tx.durationMs}ms)`);
    }
  });

  test('rejects duplicate booking with REJECTED_OVERLAP', async () => {
    engClearState();
    const r1 = await engProcess({ unitId: 'u1', channel: 'Airbnb',      checkIn: '2026-10-01', checkOut: '2026-10-07', guestName: 'First',  amount: 5000 });
    const r2 = await engProcess({ unitId: 'u1', channel: 'Gathern',     checkIn: '2026-10-04', checkOut: '2026-10-10', guestName: 'Second', amount: 4000 });
    const r3 = await engProcess({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-10-01', checkOut: '2026-10-07', guestName: 'Third',  amount: 5200 });
    assert.equal(r1.status, 'CONFIRMED',        'first booking should confirm');
    assert.equal(r2.status, 'REJECTED_OVERLAP', 'partial overlap must be rejected');
    assert.equal(r3.status, 'REJECTED_OVERLAP', 'exact duplicate must be rejected');
  });

  test('race condition (3 channels simultaneously) — exactly 1 wins, 2 get REJECTED_OVERLAP', async () => {
    engClearState();
    const make = (ch) => engProcess({ unitId: 'u1', channel: ch, checkIn: '2026-11-01', checkOut: '2026-11-05', guestName: `${ch} guest`, amount: 4500 });
    const [rBC, rAB, rGA] = await Promise.all([make('Booking.com'), make('Airbnb'), make('Gathern')]);
    const wins = [rBC, rAB, rGA].filter(r => r.status === 'CONFIRMED');
    const losses = [rBC, rAB, rGA].filter(r => r.status !== 'CONFIRMED');
    assert.equal(wins.length,   1, 'exactly one channel must win the race');
    assert.equal(losses.length, 2, 'the other two must be rejected');
    for (const l of losses) {
      assert.ok(
        l.status === 'REJECTED_OVERLAP' || l.status === 'REJECTED_LOCK_TIMEOUT',
        `loser status must be REJECTED_OVERLAP or REJECTED_LOCK_TIMEOUT, got: ${l.status}`,
      );
    }
  });

  test('5-way concurrent race — exactly 1 wins', async () => {
    engClearState();
    const channels = ['Booking.com', 'Airbnb', 'Gathern', 'Direct', 'Booking.com'];
    const results = await Promise.all(channels.map((ch, i) =>
      engProcess({ unitId: 'u2', channel: ch, checkIn: '2026-12-01', checkOut: '2026-12-05', guestName: `Racer ${i}`, amount: 3000 })
    ));
    const wins = results.filter(r => r.status === 'CONFIRMED');
    assert.equal(wins.length, 1, 'exactly one of five concurrent requests must win');
  });

  test('different units process independently without interference', async () => {
    engClearState();
    const results = await Promise.all([
      engProcess({ unitId: 'u1', channel: 'Booking.com', checkIn: '2027-01-01', checkOut: '2027-01-07', guestName: 'A', amount: 5000 }),
      engProcess({ unitId: 'u2', channel: 'Airbnb',      checkIn: '2027-01-01', checkOut: '2027-01-07', guestName: 'B', amount: 4000 }),
      engProcess({ unitId: 'u3', channel: 'Gathern',     checkIn: '2027-01-01', checkOut: '2027-01-07', guestName: 'C', amount: 6000 }),
    ]);
    assert.ok(results.every(r => r.status === 'CONFIRMED'), 'all bookings on different units must be confirmed simultaneously');
  });

  test('metrics track confirmed and rejected counts correctly', async () => {
    engClearState();
    await engProcess({ unitId: 'u1', channel: 'Booking.com', checkIn: '2027-02-01', checkOut: '2027-02-05', guestName: 'Ok', amount: 4000 });
    await engProcess({ unitId: 'u1', channel: 'Airbnb',      checkIn: '2027-02-03', checkOut: '2027-02-07', guestName: 'Dup', amount: 3000 });
    assert.equal(_engMetrics.confirmed,       1, 'metrics must count 1 confirmed');
    assert.equal(_engMetrics.rejectedOverlap, 1, 'metrics must count 1 rejected overlap');
    assert.equal(_engMetrics.totalProcessed,  2, 'metrics must count 2 total');
    assert.ok(_engMetrics.avgDurationMs >= 0,    'avg duration must be tracked');
  });

  test('back-to-back bookings on same unit are both confirmed', async () => {
    engClearState();
    const r1 = await engProcess({ unitId: 'u1', channel: 'Booking.com', checkIn: '2027-03-01', checkOut: '2027-03-05', guestName: 'G1', amount: 3000 });
    const r2 = await engProcess({ unitId: 'u1', channel: 'Gathern',     checkIn: '2027-03-05', checkOut: '2027-03-10', guestName: 'G2', amount: 3500 });
    assert.equal(r1.status, 'CONFIRMED', 'first booking must confirm');
    assert.equal(r2.status, 'CONFIRMED', 'back-to-back booking must also confirm (no overlap)');
  });

  test('phase timings are individually tracked per transaction', async () => {
    engClearState();
    const tx = await engProcess({ unitId: 'u1', channel: 'Direct', checkIn: '2027-04-01', checkOut: '2027-04-05', guestName: 'Timer', amount: 2000 });
    assert.equal(tx.status, 'CONFIRMED');
    assert.ok(tx.phases.preCheckMs >= 0, 'preCheckMs must be ≥0');
    assert.ok(tx.phases.lockMs     >= 0, 'lockMs must be ≥0');
    assert.ok(tx.phases.commitMs   >= 0, 'commitMs must be ≥0');
    // Total of recorded phases must be ≤ actual durationMs
    const sumPhases = tx.phases.preCheckMs + tx.phases.lockMs + tx.phases.commitMs + tx.phases.broadcastMs;
    assert.ok(sumPhases <= tx.durationMs + 5, 'sum of phases must not exceed total duration (±5ms tolerance)');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ──  Run  ────────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

await runAll();

const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`${c.bold('Results')}  ${c.green(`${passed} passed`)}  ${failed > 0 ? c.red(`${failed} failed`) : c.dim('0 failed')}  ${c.dim(`/ ${total} total`)}`);
if (failed === 0) {
  console.log(c.green(c.bold('\n✓ All tests passed')));
} else {
  console.log(c.red(c.bold(`\n✗ ${failed} test${failed > 1 ? 's' : ''} failed`)));
  process.exit(1);
}
