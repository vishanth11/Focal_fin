// Hermetic: no database, no network. The env vars are assigned BEFORE the
// modules that read them are required (env.js reads process.env at import
// time), and the Student model is replaced with a mock.
//
// Note the file-local ordering: jest hoists the jest.mock() call above these
// assignments, but its factory only runs when the module is first required —
// which happens after them.
process.env.JWT_SECRET = 'test-admin-secret';
process.env.STUDENT_JWT_SECRET = 'test-student-secret';

jest.mock('../src/models/Student', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn()
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const Student = require('../src/models/Student');
const env = require('../src/config/env');
const {
  BCRYPT_ROUNDS,
  loginStudent,
  registerStudent
} = require('../src/controllers/studentController');
const { verifyStudent } = require('../src/middleware/studentAuth');
const { generateStudentToken } = require('../src/utils/studentToken');
const { verifyToken, isAdmin } = require('../src/middleware/auth');
const { registerValidation } = require('../src/routes/studentRoutes');

function mockReq({ body = {}, headers = {} } = {}) {
  return { body, headers };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function jsonPayload(res) {
  return res.json.mock.calls[0][0];
}

// Login looks the account up with .select('+password') because the schema marks
// the hash select:false, so the mock has to return a chainable query.
function studentQueryResolving(student) {
  return { select: jest.fn().mockResolvedValue(student) };
}

describe('registerStudent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hashes the password and never stores or returns it in plaintext', async () => {
    Student.findOne.mockResolvedValue(null);
    Student.create.mockImplementation(async (doc) => ({
      _id: 'student-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...doc
    }));

    const res = mockRes();
    const next = jest.fn();
    await registerStudent(
      mockReq({ body: { name: 'Ada', email: 'ada@college.edu', password: 'plaintext123' } }),
      res,
      next
    );

    expect(next).not.toHaveBeenCalled();
    const stored = Student.create.mock.calls[0][0];
    expect(stored.password).not.toBe('plaintext123');
    expect(stored.password.startsWith('$2')).toBe(true);
    await expect(bcrypt.compare('plaintext123', stored.password)).resolves.toBe(true);

    expect(res.status).toHaveBeenCalledWith(201);
    const { student } = jsonPayload(res).data;
    expect(student.password).toBeUndefined();
    expect(JSON.stringify(jsonPayload(res))).not.toContain('plaintext123');
  });

  test('normalizes the email before storing it', async () => {
    Student.findOne.mockResolvedValue(null);
    Student.create.mockResolvedValue({ _id: 'student-1', name: 'Ada', email: 'ada@college.edu' });

    await registerStudent(
      mockReq({ body: { name: 'Ada', email: '  Ada@College.EDU ', password: 'plaintext123' } }),
      mockRes(),
      jest.fn()
    );

    expect(Student.findOne).toHaveBeenCalledWith({ email: 'ada@college.edu' });
    expect(Student.create.mock.calls[0][0].email).toBe('ada@college.edu');
  });

  test('returns 409 for a duplicate email rather than letting Mongo surface a 500', async () => {
    Student.findOne.mockResolvedValue({ _id: 'existing' });

    const res = mockRes();
    await registerStudent(
      mockReq({ body: { name: 'Ada', email: 'ada@college.edu', password: 'plaintext123' } }),
      res,
      jest.fn()
    );

    expect(Student.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(jsonPayload(res).success).toBe(false);
  });

  test('issues no token — token minting belongs to login alone', async () => {
    Student.findOne.mockResolvedValue(null);
    Student.create.mockResolvedValue({ _id: 'student-1', name: 'Ada', email: 'ada@college.edu' });

    const res = mockRes();
    await registerStudent(
      mockReq({ body: { name: 'Ada', email: 'ada@college.edu', password: 'plaintext123' } }),
      res,
      jest.fn()
    );

    expect(jsonPayload(res).data.token).toBeUndefined();
  });
});

describe('loginStudent', () => {
  beforeEach(() => jest.clearAllMocks());

  async function arrangeAccount(plainPassword) {
    const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
    const student = {
      _id: 'student-1',
      name: 'Ada',
      email: 'ada@college.edu',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      password: passwordHash
    };
    Student.findOne.mockReturnValue(studentQueryResolving(student));
    return { student, passwordHash };
  }

  test('returns a token whose payload carries role "student"', async () => {
    await arrangeAccount('correct-horse-battery');

    const res = mockRes();
    await loginStudent(
      mockReq({ body: { email: 'ada@college.edu', password: 'correct-horse-battery' } }),
      res,
      jest.fn()
    );

    const { token } = jsonPayload(res).data;
    const decoded = jwt.verify(token, env.studentJwtSecret);
    expect(decoded.role).toBe('student');
    expect(decoded.id).toBe('student-1');
    // The secret separation is only meaningful if it is a different secret.
    expect(env.studentJwtSecret).not.toBe(env.jwtSecret);
  });

  test('never returns the password hash', async () => {
    const { passwordHash } = await arrangeAccount('correct-horse-battery');

    const res = mockRes();
    await loginStudent(
      mockReq({ body: { email: 'ada@college.edu', password: 'correct-horse-battery' } }),
      res,
      jest.fn()
    );

    const { student } = jsonPayload(res).data;
    expect(student.password).toBeUndefined();
    expect(JSON.stringify(jsonPayload(res))).not.toContain(passwordHash);
  });

  test('rejects a wrong password with a message that does not reveal which field was wrong', async () => {
    await arrangeAccount('correct-horse-battery');

    const res = mockRes();
    await loginStudent(
      mockReq({ body: { email: 'ada@college.edu', password: 'wrong-password' } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonPayload(res).message).toBe('Invalid email or password');
  });

  test('uses the identical message for an unknown email, so accounts cannot be enumerated', async () => {
    const { student } = await arrangeAccount('correct-horse-battery');
    Student.findOne.mockReturnValue(studentQueryResolving(null));

    const res = mockRes();
    await loginStudent(
      mockReq({ body: { email: 'nobody@college.edu', password: 'correct-horse-battery' } }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonPayload(res).message).toBe('Invalid email or password');
    expect(student).toBeDefined();
  });
});

describe('student / admin token isolation', () => {
  test('a student token is rejected by isAdmin with 403', () => {
    // The key regression test: even if a student token somehow reached admin
    // middleware, the role check stops it.
    const req = { user: jwt.verify(generateStudentToken('student-1'), env.studentJwtSecret) };
    const res = mockRes();
    const next = jest.fn();

    isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken cannot even verify a student token — the signing secrets differ', () => {
    const req = mockReq({ headers: { authorization: `Bearer ${generateStudentToken('student-1')}` } });
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('an admin token is rejected by student middleware', () => {
    const adminToken = jwt.sign({ id: 'focal-admin', role: 'admin' }, env.jwtSecret, { expiresIn: '7d' });
    const req = mockReq({ headers: { authorization: `Bearer ${adminToken}` } });
    const res = mockRes();
    const next = jest.fn();

    return verifyStudent(req, res, next).then(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  test('even with identical secrets, the role check alone rejects an admin token', async () => {
    // Proves the second, independent barrier: a token that DOES verify against
    // the student secret still fails because its role is not 'student'.
    const tokenWithAdminRole = jwt.sign({ id: 's1', role: 'admin' }, env.studentJwtSecret, {
      expiresIn: '7d'
    });
    const req = mockReq({ headers: { authorization: `Bearer ${tokenWithAdminRole}` } });
    const res = mockRes();
    const next = jest.fn();

    await verifyStudent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('verifyStudent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects a missing Authorization header', async () => {
    const res = mockRes();
    const next = jest.fn();

    await verifyStudent(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a malformed Authorization header', async () => {
    const res = mockRes();
    const next = jest.fn();

    await verifyStudent(
      mockReq({ headers: { authorization: `Token ${generateStudentToken('student-1')}` } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a token whose account no longer exists', async () => {
    Student.findById.mockResolvedValue(null);
    const res = mockRes();
    const next = jest.fn();

    await verifyStudent(
      mockReq({ headers: { authorization: `Bearer ${generateStudentToken('student-1')}` } }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token and loads the account onto req.student', async () => {
    const account = { _id: 'student-1', name: 'Ada', email: 'ada@college.edu' };
    Student.findById.mockResolvedValue(account);
    const req = mockReq({ headers: { authorization: `Bearer ${generateStudentToken('student-1')}` } });
    const res = mockRes();
    const next = jest.fn();

    await verifyStudent(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.student).toBe(account);
    // req.user belongs to admin middleware — student auth must not claim it.
    expect(req.user).toBeUndefined();
  });
});

describe('student route validation', () => {
  async function collectErrors(chains, body) {
    const req = { body };
    for (const chain of chains) {
      await chain.run(req);
    }
    return validationResult(req)
      .array()
      .map((error) => error.path);
  }

  test('registration rejects a malformed email and a too-short password', async () => {
    const fields = await collectErrors(registerValidation, {
      name: '',
      email: 'not-an-email',
      password: 'short'
    });

    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  test('registration accepts a well-formed payload', async () => {
    const fields = await collectErrors(registerValidation, {
      name: 'Ada',
      email: 'ada@college.edu',
      password: 'long-enough-password'
    });

    expect(fields).toEqual([]);
  });
});

// The headline constraint of the student feature: adding an optional account
// layer must not gate anything that was public before. These are the
// regression guards for that — they assert the HTTP status a request reaches,
// since a new auth guard would turn these into 401s.
describe('public access is unchanged (HTTP level)', () => {
  const request = require('supertest');
  const app = require('../src/app');

  test('POST /api/check reaches its validators with no auth header', async () => {
    // 400 comes from express-validator, which runs AFTER any auth middleware
    // would have. A 401 here would mean the public check route got gated.
    const res = await request(app).post('/api/check').send({ input: 'x' });

    expect(res.status).toBe(400);
    expect(res.status).not.toBe(401);
  });

  test('POST /api/reports reaches its validators with no auth header', async () => {
    const res = await request(app).post('/api/reports').send({});

    expect(res.status).toBe(400);
    expect(res.status).not.toBe(401);
  });

  test('POST /api/students/register validates before doing any work', async () => {
    const res = await request(app).post('/api/students/register').send({ email: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password'])
    );
  });

  test('admin routes are still gated', async () => {
    const res = await request(app).get('/api/admin/companies');

    expect(res.status).toBe(401);
  });

  test('a student token cannot reach an admin route', async () => {
    const res = await request(app)
      .get('/api/admin/companies')
      .set('Authorization', `Bearer ${generateStudentToken('student-1')}`);

    expect(res.status).toBe(401);
    expect(res.status).not.toBe(200);
  });

  test('the student account route is gated, then reachable with a valid token', async () => {
    const account = {
      _id: 'student-1',
      name: 'Ada',
      email: 'ada@college.edu',
      createdAt: new Date('2026-01-01T00:00:00Z')
    };
    Student.findById.mockResolvedValue(account);

    const anonymous = await request(app).get('/api/students/me');
    expect(anonymous.status).toBe(401);

    const withStudentToken = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${generateStudentToken('student-1')}`);

    expect(withStudentToken.status).toBe(200);
    expect(withStudentToken.body.data.student.email).toBe('ada@college.edu');
    expect(withStudentToken.body.data.student.password).toBeUndefined();
  });
});
